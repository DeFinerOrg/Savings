pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./lib/TokenInfoLib.sol";
import "./lib/SymbolsLib.sol";
import "./lib/BitmapLib.sol";
import "./lib/SafeDecimalMath.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";

library Base {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;
    using TokenInfoLib for TokenInfoLib.TokenInfo;
    using SymbolsLib for SymbolsLib.Symbols;
    using BitmapLib for uint128;

    struct BaseVariable {
        mapping(address => uint256) totalLoans;     // amount of lended tokens
        mapping(address => uint256) totalReserve;   // amount of tokens in reservation
        mapping(address => uint256) totalCompound;  // amount of tokens in compound
        mapping(address => address) cTokenAddress;  // cToken addresses
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) depositeRateIndex;
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) borrowRateIndex;
        mapping(address => uint) lastModifiedBlockNumber;
        // Store per account info
        mapping(address => Account) accounts;
        address payable deFinerCommunityFund;
        mapping(address => uint) deFinerFund;
    }

    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    uint256 public constant INT_UNIT = 10 ** uint256(18);

    struct Account {
        // Note, it's best practice to use functions minusAmount, addAmount, totalAmount
        // to operate tokenInfos instead of changing it directly.
        mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
        uint128 depositBitmap;
        uint128 borrowBitmap;
    }

    /**
     * Initialize
     */
    function initialize(BaseVariable storage self, address[] memory _tokens, address[] memory _cTokens) public {
        for(uint i = 0;i < _tokens.length;i++) {
            self.cTokenAddress[_tokens[i]] = _cTokens[i];
        }
    }

    function getDepositBitmap(Account storage self) public view returns (uint128) {
        return self.depositBitmap;
    }

    function isUserHasAnyDeposits(Account storage self) public view returns (bool) {
        return self.depositBitmap > 0;
    }

    function getBorrowBitmap(Account storage self) public view returns (uint128) {
        return self.borrowBitmap;
    }

    function isUserHasAnyBorrows(Account storage self) public view returns (bool) {
        return self.borrowBitmap > 0;
    }

    function setInDepositBitmap(Account storage account, uint8 _index) public {
        account.depositBitmap = account.depositBitmap.setBit(_index);
    }

    function unsetFromDepositBitmap(Account storage account, uint8 _index) public {
        account.depositBitmap = account.depositBitmap.unsetBit(_index);
    }

    function setInBorrowBitmap(Account storage account, uint8 _index) public {
        account.borrowBitmap = account.borrowBitmap.setBit(_index);
    }

    function unsetFromBorrowBitmap(Account storage account, uint8 _index) public {
        account.borrowBitmap = account.borrowBitmap.unsetBit(_index);
    }


    function approveAll(BaseVariable storage self, address _token) public {
        address cToken = self.cTokenAddress[_token];
        require(cToken != address(0x0), "cToken address is zero");
        IERC20(_token).safeApprove(cToken, 0);
        IERC20(_token).safeApprove(cToken, uint256(-1));
    }

    function getTotalDepositsNow(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = self.cTokenAddress[_token];
        uint256 totalLoans = self.totalLoans[_token];
        uint256 totalReserve = self.totalReserve[_token];
        return self.totalCompound[cToken].add(totalLoans).add(totalReserve);
        // totalAmount = U + C + R
        // totalReserve = R
        // totalCompound = C
        // totalLoans = U
        // Total amount of tokens that DeFiner has
        // TODO Are all of these variables are in same token decimals?
    }

    /**
     * Update total amount of token in Compound as the cToken price changed
     * @param _token token address
     */
    function updateTotalCompound(BaseVariable storage self, address _token) public {
        address cToken = self.cTokenAddress[_token];
        if(cToken != address(0)) {
            self.totalCompound[cToken] = ICToken(cToken).balanceOfUnderlying(address(this));
        }
    }

    /**
     * Update total amount of token lended as the intersted earned from the borrower
     * @param _token token address
     */
    function updateTotalLoan(BaseVariable storage self, address _token) public {
        self.totalLoans[_token] = borrowInterest(self, _token);
    }

    //Get compound deposit rate. The scale is 10 ** 18
    function getCompoundSupplyRatePerBlock(address _cTokenAddress) public view returns(uint) {
        ICToken cToken = ICToken(_cTokenAddress);
        return cToken.supplyRatePerBlock();
    }

    //Get compound borrowing interest rate. The scale is 10 ** 18
    function getCompoundBorrowRatePerBlock(address _cTokenAddress) public view returns(uint) {
        ICToken cToken = ICToken(_cTokenAddress);
        return cToken.borrowRatePerBlock();
    }

    //Get the borrowing interest rate Borrowing interest rate.
    //(compound deposit rate + compound borrowing rate) / 2. The scaling is 10 ** 18
    function getBorrowRatePerBlock(BaseVariable storage self, address _token) public view returns(uint borrowRatePerBlock) {
        address cToken = self.cTokenAddress[_token];
        if(cToken == address(0)){
            return getCapitalUtilizationRate(self, _token).mul(15*10**16).add(3*10**16).div(2102400);
        } else {
            return getCompoundSupplyRatePerBlock(cToken)
            .add(getCompoundBorrowRatePerBlock(cToken)).div(2);
        }
    }

    //Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
    //Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
    // sichaoy: make sure the ratePerBlock is zero if both U and C are zero.
    function getDepositRatePerBlock(BaseVariable storage self, address _token) public view returns(uint depositAPR) {
        address cToken = self.cTokenAddress[_token];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, _token);
        uint256 capitalUtilRate = getCapitalUtilizationRate(self, _token);
        if(cToken == address(0)) {
            return borrowRatePerBlock.mul(capitalUtilRate).div(SafeDecimalMath.getUNIT()).div(2102400);
        } else {
            uint d1 = borrowRatePerBlock.mul(capitalUtilRate);
            uint d2 = getCompoundSupplyRatePerBlock(cToken).mul(getCapitalCompoundRate(self, _token));
            return d1.add(d2).div(SafeDecimalMath.getUNIT());
        }
    }

    //Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
    //The scaling is 10 ** 18  U
    function getCapitalUtilizationRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 totalDepositsNow = getTotalDepositsNow(self, _token);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return self.totalLoans[_token].mul(SafeDecimalMath.getUINT_UNIT()).div(totalDepositsNow);
        }
    }

    //存入comound的资金率 C  The scaling is 10 ** 18
    function getCapitalCompoundRate(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = self.cTokenAddress[_token];
        if(self.totalCompound[cToken] == 0 ) {
            return 0;
        } else {
            return uint(self.totalCompound[cToken].mul(SafeDecimalMath.getUINT_UNIT()).div(getTotalDepositsNow(self, _token)));
        }
    }

    //    //准备金率 R  The scaling is 10 ** 18
    //    function getCapitalReserveRate(BaseVariable storage self, address tokenAddress) public returns(int) {
    //        if(self.totalReserve[tokenAddress] == 0) {
    //            return 0;
    //        } else {
    //            return self.totalReserve[tokenAddress].mul(10**18).div(getTotalDepositsNow(self, tokenAddress));
    //        }
    //    }

    /**
     * Get the cummulative deposit rate in a block interval ending in current block
     * @param _token token address
     * @param _depositRateRecordStart the start block of the interval
     */
    function getDepositAccruedRate(
        BaseVariable storage self,
        address _token,
        uint _depositRateRecordStart
    ) internal view returns (uint256) {
        uint256 depositRate = self.depositeRateIndex[_token][_depositRateRecordStart];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if (depositRate == 0) {
            return UNIT;    // return UNIT if the checkpoint doesn't exist
        } else {
            return self.depositeRateIndex[_token][block.number].mul(UNIT).div(depositRate); // index(current block)/index(start block)
        }
    }

    // sichaoy: actually the rate + 1
    function getBorrowAccruedRate(
        BaseVariable storage self,
        address _token,
        uint _borrowRateRecordStart
    ) internal view returns (uint256) {
        uint256 borrowRate = self.borrowRateIndex[_token][_borrowRateRecordStart];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if (borrowRate == 0) {
            // when block is same
            return UNIT;
        } else {
            // rate change
            return self.borrowRateIndex[_token][block.number].mul(UNIT).div(borrowRate);
        }
    }

    /**
     * Update Deposit Rate. depositRate = 1 + blockChangeValue * rate
     * Update borrow rates. borrowRate = 1 + blockChangeValue * rate
     * @param _token token address
     */
    function newRateIndexCheckpoint(BaseVariable storage self, address _token) public {
        self.depositeRateIndex[_token][block.number] = getNowDepositRate(self, _token);
        self.borrowRateIndex[_token][block.number] = getNowBorrowRate(self, _token);
    }

    /**
     * Calculate a token deposite rate of current block
     * @param _token token address
     */
    // sichaoy: this function returns 1+r*block_delta, better to replace the name to index
    function getNowDepositRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 depositRatePerBlock = getDepositRatePerBlock(self, _token);     // returns r
        // "depositRateLMBN" => "DepositRateLastModifiedBlockNumber"
        uint256 depositRateLMBN = self.lastModifiedBlockNumber[_token];
        uint256 depositeRateIndex = self.depositeRateIndex[_token][depositRateLMBN];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if(depositRateLMBN == 0) {
            return UNIT;
        } else {
            return depositeRateIndex.mul(block.number.sub(depositRateLMBN).mul(depositRatePerBlock).add(UNIT)).div(UNIT);
        }
    }

    function getNowBorrowRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 borrowRateLMBN = self.lastModifiedBlockNumber[_token];
        uint256 borrowRateIndex = self.borrowRateIndex[_token][borrowRateLMBN];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, _token);
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if(borrowRateLMBN == 0) {
            return UNIT;
        } else {
            return borrowRateIndex.mul(block.number.sub(borrowRateLMBN).mul(borrowRatePerBlock).add(UNIT)).div(UNIT);
        }
    }

    /*
	 * Get the state of the given token
	 */
    function getTokenState(BaseVariable storage self, address _token) public view returns (
        uint256 deposits,
        uint256 loans,
        uint256 collateral,
        uint256 depositRatePerBlock,
        uint256 borrowRatePerBlock
    )
    {
        return (
        getTotalDepositsNow(self, _token),
        self.totalLoans[_token],
        self.totalReserve[_token].add(self.totalCompound[self.cTokenAddress[_token]]),
        getDepositRatePerBlock(self, _token),
        getBorrowRatePerBlock(self, _token)
        );
    }

    function toCompound(BaseVariable storage self, address _token, uint totalAmount, bool isEth) public {
        uint _amount = totalAmount.mul(15).div(100);
        address cToken = self.cTokenAddress[_token];
        uint256 toCompoundAmount = self.totalReserve[_token].sub(_amount);
        if (isEth) {
            // TODO Why we need to put gas here?
            // TODO Without gas tx was failing? Even when gas is 100000 it was failing.
            ICETH(cToken).mint.value(toCompoundAmount).gas(250000)();
        } else {
            ICToken(cToken).mint(toCompoundAmount);
        }
        self.totalCompound[cToken] = self.totalCompound[cToken].add(toCompoundAmount);
        self.totalReserve[_token] = _amount;
    }

    function fromCompound(BaseVariable storage self, address _token, uint compoundAmount, uint amount) public {
        ICToken cToken = ICToken(self.cTokenAddress[_token]);
        uint256 totalReserve = self.totalReserve[_token];
        uint _amount1 = compoundAmount.add(self.totalLoans[_token].add(totalReserve)).sub(amount);
        uint _amount2 = _amount1.mul(15).div(100).add(amount).sub(totalReserve);

        uint256 totalCompound = self.totalCompound[address(cToken)];
        if(_amount2 >= compoundAmount) {
            cToken.redeem(cToken.balanceOf(address(this)));
            self.totalReserve[_token] = totalReserve.add(totalCompound);
            self.totalCompound[address(cToken)] = 0;
        } else {
            cToken.redeemUnderlying(_amount2);
            self.totalCompound[address(cToken)] = totalCompound.sub(_amount2);
            self.totalReserve[_token] = totalReserve.add(_amount2);
        }
    }

    function getDepositBalance(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
        // TODO Why need storage
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = SafeDecimalMath.getUNIT();
        uint accruedRate;
        if(tokenInfo.getDepositPrincipal() == 0) {
            return 0;
        } else {
            if(self.depositeRateIndex[_token][tokenInfo.getDepositLastCheckpoint()] == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = getNowDepositRate(self, _token)
                .mul(UNIT)
                .div(self.depositeRateIndex[_token][tokenInfo.getDepositLastCheckpoint()]);
            }
            return tokenInfo.getDepositBalance(accruedRate);
        }
    }

    function getBorrowBalance(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        // TODO Why need storage
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = SafeDecimalMath.getUNIT();
        uint accruedRate;
        if(tokenInfo.getBorrowPrincipal() == 0) {
            return 0;
        } else {
            if(self.borrowRateIndex[_token][tokenInfo.getBorrowLastCheckpoint()] == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = getNowBorrowRate(self, _token)
                .mul(UNIT)
                .div(self.borrowRateIndex[_token][tokenInfo.getBorrowLastCheckpoint()]);
            }
            return tokenInfo.getBorrowBalance(accruedRate);
        }
    }

    function getDepositUsd(
        BaseVariable storage self,
        address _accountAddr,
        SymbolsLib.Symbols storage _symbols
    ) public view returns (uint256 depositUsd) {
        //TODO Why need to pass symbols ?
        for(uint i = 0; i < _symbols.getCoinLength(); i++) {
            address tokenAddress = _symbols.addressFromIndex(i);
            uint divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
            }
            depositUsd = depositUsd.add(getDepositBalance(self, tokenAddress, _accountAddr).mul(_symbols.priceFromIndex(i)).div(divisor));
        }
        return depositUsd;
    }

    function getBorrowUsd(
        BaseVariable storage self,
        address _accountAddr,
        SymbolsLib.Symbols storage _symbols
    ) public view returns (uint256 borrowUsd) {
        //TODO Why need to pass symbols ?
        for(uint i = 0; i < _symbols.getCoinLength(); i++) {
            address tokenAddress = _symbols.addressFromIndex(i);
            uint divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
            }
            borrowUsd = borrowUsd.add(getBorrowBalance(self, tokenAddress, _accountAddr).mul(_symbols.priceFromIndex(i)).div(divisor));
        }
        return borrowUsd;
    }

    struct TransferVars {
        uint totalBorrow;
        uint totalDeposit;
        uint amountValue;
        uint accruedRate;
        uint interest;
    }

    function transfer(
        BaseVariable storage self,
        address _activeAccount,
        address _token,
        uint _amount,
        SymbolsLib.Symbols storage symbols
    ) public {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        TokenInfoLib.TokenInfo storage activeTokenInfo = self.accounts[_activeAccount].tokenInfos[_token];
        TransferVars memory vars;

        uint divisor = INT_UNIT;
        if(_token != ETH_ADDR) {
            divisor = 10**uint256(IERC20Extended(_token).decimals());
        }

        vars.totalBorrow = getBorrowUsd(self, _activeAccount, symbols);
        vars.totalDeposit = getDepositUsd(self, _activeAccount, symbols);
        vars.amountValue = _amount.mul(symbols.priceFromAddress(_token)).div(divisor);
        // if borroBitMap > 0, then only check for this conditon , otherwise dont chack
        // self.accounts.borrowBitmap > 0
        // make sure borrowBitmap is updating as well as deposit at appropriate places
        require(
            vars.totalBorrow.add(vars.amountValue).mul(100) <= vars.totalDeposit.mul(60),
            "Insufficient collateral."
        );

        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        newRateIndexCheckpoint(self, _token);
        vars.accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getDepositLastCheckpoint());
        vars.interest = tokenInfo.calculateDepositInterest(vars.accruedRate);

        tokenInfo.withdraw(_amount, vars.accruedRate);
        if(vars.interest > 0) {
            uint256 _money = vars.interest <= _amount ? vars.interest.div(10) : _amount.div(10);
            _amount = _amount.sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }

        if(_amount > 0 && activeTokenInfo.getBorrowPrincipal() > 0) {
            uint bAccruedRate = getBorrowAccruedRate(self, _token, activeTokenInfo.getBorrowLastCheckpoint());
            uint256 amountBorrowed = activeTokenInfo.getBorrowBalance(bAccruedRate);
            uint repayAmount = _amount > amountBorrowed ? amountBorrowed : _amount;
            require(self.totalReserve[_token].add(self.totalCompound[self.cTokenAddress[_token]]) >= _amount, "Lack of liquidity.");
            activeTokenInfo.repay(repayAmount, bAccruedRate);
            self.totalLoans[_token] = self.totalLoans[_token].add(repayAmount);
            self.totalReserve[_token] = self.totalReserve[_token].sub(repayAmount);
            _amount = _amount > amountBorrowed ? _amount.sub(amountBorrowed) : 0;
        }

        if(_amount > 0 && activeTokenInfo.getDepositPrincipal() >= 0) {
            uint dAccruedRate = getDepositAccruedRate(self, _token, activeTokenInfo.getDepositLastCheckpoint());
            activeTokenInfo.deposit(_amount, dAccruedRate);
        }

        self.lastModifiedBlockNumber[_token] = block.number;
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     * @param _tokenIndex the index of the deposited token, which is spesified in TokenInfo struct.
     */
    function deposit(BaseVariable storage self, address _token, uint256 _amount, uint8 _tokenIndex) public {
        Account storage account = self.accounts[msg.sender];
        TokenInfoLib.TokenInfo storage tokenInfo = account.tokenInfos[_token];

        require(tokenInfo.getBorrowPrincipal() == 0,
            "The user should repay the borrowed token before he or she can deposit.");

        // Update the amount of tokens in compound and loans
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);

        // Add a new checkpoint on the index curve.
        newRateIndexCheckpoint(self, _token);

        // sichaoy: change the name here
        uint accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getDepositLastCheckpoint());

        // Add principa + interest (on borrows/on deposits)
        tokenInfo.deposit(_amount, accruedRate);

        // Total reserve of the token deposited to
        // TODO Why we need to maintain reserve?
        self.totalReserve[_token] = self.totalReserve[_token].add(_amount);
        uint totalAmount = getTotalDepositsNow(self, _token);
        if(
            self.totalReserve[_token].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            >
            20 * 10**16 // 10^18 = 100% , 0.2 * 10^18
            &&
            self.cTokenAddress[_token] != address(0)
        ) {
            toCompound(self, _token, totalAmount, _token == ETH_ADDR);
        }

        // When deposit:
        // Change deposit Rate and borrow Rate
        self.lastModifiedBlockNumber[_token] = block.number;

        setInDepositBitmap(account, _tokenIndex);
    }

    function borrow(BaseVariable storage self, address _token, uint256 amount) public {
        require(isUserHasAnyDeposits(self.accounts[msg.sender]), "User not have any deposits");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        require(tokenInfo.getDepositPrincipal() == 0, "Token depositPrincipal must be zero.");
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        newRateIndexCheckpoint(self, _token);
        uint rate = getBorrowAccruedRate(self, _token, tokenInfo.getBorrowLastCheckpoint());
        tokenInfo.borrow(amount, rate);
        address cToken = self.cTokenAddress[_token];
        require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= amount, "Lack of liquidity.");
        uint compoundAmount = self.totalCompound[self.cTokenAddress[_token]];
        uint totalAmount = compoundAmount.add(self.totalLoans[_token]).add(self.totalReserve[_token]);
        if(
            self.totalReserve[_token] <= amount
            ||
            self.totalReserve[_token].sub(amount).mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount.sub(amount))
            <
            10 * 10**16
            &&
            cToken != address(0)
        ) {
            fromCompound(self, _token, compoundAmount, amount);
        }
        self.totalReserve[_token] = self.totalReserve[_token].sub(amount);
        self.totalLoans[_token] = self.totalLoans[_token].add(amount);
        self.lastModifiedBlockNumber[_token] = block.number;
    }

    function repay(BaseVariable storage self, address _token, address activeAccount, uint256 amount) public returns(uint) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[activeAccount].tokenInfos[_token];
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        newRateIndexCheckpoint(self, _token);
        uint rate = getBorrowAccruedRate(self, _token,tokenInfo.getBorrowLastCheckpoint());
        require(tokenInfo.getBorrowPrincipal() > 0,
            "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
        );

        uint256 amountOwedWithInterest = tokenInfo.getBorrowBalance(rate);
        uint _amount = amount > amountOwedWithInterest ? amountOwedWithInterest : amount;
        tokenInfo.repay(_amount, rate);
        self.totalReserve[_token] = self.totalReserve[_token].add(_amount);
        self.totalLoans[_token] = self.totalLoans[_token].sub(_amount);
        uint totalAmount = getTotalDepositsNow(self, _token);
        if(
            self.totalReserve[_token].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            >
            20 * 10**16
            &&
            self.cTokenAddress[_token] != address(0)
        ) {
            toCompound(self, _token, totalAmount, _token == ETH_ADDR);
        }
        self.lastModifiedBlockNumber[_token] = block.number;
        return amount > amountOwedWithInterest ? amount.sub(amountOwedWithInterest) : 0;
    }

    /**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */

    function withdraw(BaseVariable storage self, address _token, uint256 _amount) public returns(uint){
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        newRateIndexCheckpoint(self, _token);
        uint accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getDepositLastCheckpoint());
        require(tokenInfo.getDepositPrincipal() > 0, "Token depositPrincipal must be greater than 0");
        require(tokenInfo.getDepositBalance(accruedRate) >= _amount, "Insufficient balance.");
        uint interest = tokenInfo.calculateDepositInterest(accruedRate);
        tokenInfo.withdraw(_amount, accruedRate);
        address cToken = self.cTokenAddress[_token];
        require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= _amount, "Lack of liquidity.");
        if(interest > 0) {
            uint256 _money = interest <= _amount ? interest.div(10) : _amount.div(10);
            _amount = _amount.sub(_money);
            self.totalReserve[_token] = self.totalReserve[_token].sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }
        uint reserveAmount = self.totalReserve[_token];
        uint compoundAmount = self.totalCompound[self.cTokenAddress[_token]];
        uint totalAmount = compoundAmount.add(self.totalLoans[_token]).add(reserveAmount);
        if(
            reserveAmount <= _amount
            ||
            reserveAmount.sub(_amount).mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount.sub(_amount))
            <
            10 * 10**16
            &&
            cToken != address(0)
        ) {
            fromCompound(self, _token, compoundAmount, _amount);
        }
        self.totalReserve[_token] = self.totalReserve[_token].sub(_amount);
        self.lastModifiedBlockNumber[_token] = block.number;
        return _amount;
    }

    function withdrawAll(BaseVariable storage self, address _token) public returns(uint){
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        newRateIndexCheckpoint(self, _token);
        uint accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getDepositLastCheckpoint());
        require(tokenInfo.getDepositPrincipal() > 0, "Token depositPrincipal must be greater than 0");
        uint amount = tokenInfo.getDepositBalance(accruedRate);
        uint interest = tokenInfo.calculateDepositInterest(accruedRate);
        tokenInfo.withdraw(amount, accruedRate);
        address cToken = self.cTokenAddress[_token];
        require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= amount, "Lack of liquidity.");
        if(interest > 0) {
            uint256 _money = interest.div(10);
            amount = amount.sub(_money);
            self.totalReserve[_token] = self.totalReserve[_token].sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }
        uint reserveAmount = self.totalReserve[_token];
        uint compoundAmount = self.totalCompound[self.cTokenAddress[_token]];
        uint totalAmount = compoundAmount.add(self.totalLoans[_token]).add(reserveAmount);
        if(
            reserveAmount <= amount
            ||
            reserveAmount.sub(amount).mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount.sub(amount))
            <
            10 * 10**16
            &&
            cToken != address(0)
        ) {
            fromCompound(self, _token, compoundAmount, amount);
        }
        self.totalReserve[_token] = self.totalReserve[_token].sub(amount);
        self.lastModifiedBlockNumber[_token] = block.number;
        return amount;
    }

    /**
    * addr[] = [targetAccountAddr, targetTokenAddress, symbols.addressFromIndex(i)]
    * u[] = [symbols.priceFromAddress(targetTokenAddress), symbols.priceFromIndex(i), liquidationDebtValue]
    */
    function liquidate(
        BaseVariable storage self,
        address[] memory addr,
        uint[] memory u
    ) public returns(uint) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[addr[0]].tokenInfos[addr[2]];
        if(tokenInfo.getBorrowPrincipal() > 0){
            return u[2];
        }
        TokenInfoLib.TokenInfo storage targetTokenInfo = self.accounts[addr[0]].tokenInfos[addr[1]];
        TokenInfoLib.TokenInfo storage msgTokenInfo = self.accounts[msg.sender].tokenInfos[addr[2]];
        TokenInfoLib.TokenInfo storage msgTargetTokenInfo = self.accounts[msg.sender].tokenInfos[addr[1]];
        newRateIndexCheckpoint(self, addr[2]);
        newRateIndexCheckpoint(self, addr[1]);
        //清算者当前tokenRate
        uint msgTokenAccruedRate =
        msgTokenInfo.getBorrowPrincipal() > 0 ?
        getBorrowAccruedRate(self, addr[2],msgTokenInfo.getBorrowLastCheckpoint())
        :
        getDepositAccruedRate(self, addr[2], msgTokenInfo.getDepositLastCheckpoint());
        //清算者目标tokenRate
        uint msgTargetTokenAccruedRate = getDepositAccruedRate(self, addr[1], msgTargetTokenInfo.getDepositLastCheckpoint());
        //被清算者当前tokenRate
        uint tokenAccruedRate= getDepositAccruedRate(self, addr[2], tokenInfo.getDepositLastCheckpoint());
        //被清算者目标tokenRate
        uint targetTokenAccruedRate = getBorrowAccruedRate(self, addr[1], targetTokenInfo.getBorrowLastCheckpoint());
        uint coinValue = tokenInfo.getDepositBalance(tokenAccruedRate).mul(u[1]);
        if(coinValue > u[2]) {
            coinValue = u[2];
            u[2] = 0;
        } else {
            u[2] = u[2].sub(coinValue);
        }
        uint tokenAmount = coinValue.div(u[1]);
        uint targetTokenAmount = coinValue.mul(95).div(100).div(u[0]);
        msgTargetTokenInfo.withdraw(targetTokenAmount.mul(95).div(100), msgTargetTokenAccruedRate);
        targetTokenInfo.deposit(targetTokenAmount, targetTokenAccruedRate);
        tokenInfo.withdraw(tokenAmount, tokenAccruedRate);
        msgTokenInfo.deposit(tokenAmount, msgTokenAccruedRate);
        return u[2];
    }

    function recycleCommunityFund(BaseVariable storage self, address _token) public {
        require(msg.sender == self.deFinerCommunityFund, "Unauthorized call");
        self.deFinerCommunityFund.transfer(uint256(self.deFinerFund[_token]));
        self.deFinerFund[_token] == 0;
    }

    function setDeFinerCommunityFund(BaseVariable storage self, address payable _DeFinerCommunityFund) public {
        require(msg.sender == self.deFinerCommunityFund, "Unauthorized call");
        self.deFinerCommunityFund = _DeFinerCommunityFund;
    }

    function getDeFinerCommunityFund(BaseVariable storage self, address _token) public view returns(uint256){
        return self.deFinerFund[_token];
    }

    /**
     * Borrow interest from the last check point
     * sichaoy: Actually, returns new balance
     */
    function borrowInterest(BaseVariable storage self, address _token) public view returns(uint256) {
        uint balance = self.totalLoans[_token];
        uint rate = getBorrowAccruedRate(self, _token, self.lastModifiedBlockNumber[_token]);
        if(
            rate == 0 ||
            balance == 0 ||
            SafeDecimalMath.getUNIT() > rate
        ) {
            return balance;
        } else {
            return balance.mul(rate).div(SafeDecimalMath.getUNIT());
        }
    }
}

interface IERC20Extended {
    function decimals() external view returns (uint8);
}