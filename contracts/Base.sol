pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./lib/TokenInfoLib.sol";
import "./lib/SymbolsLib.sol";
import "./lib/SafeDecimalMath.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";

library Base {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;
    using TokenInfoLib for TokenInfoLib.TokenInfo;
    using SymbolsLib for SymbolsLib.Symbols;

    struct BaseVariable {
        // The amount for the whole saving pool
        mapping(address => uint256) totalLoans;     // amount of lended tokens
        mapping(address => uint256) totalReserve;   // amount of tokens in reservation
        mapping(address => uint256) totalCompound;  // amount of tokens in compound
        mapping(address => address) cTokenAddress;  // cToken addresses
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) depositeRateIndex;
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) borrowRateIndex;
        mapping(address => uint) lastCheckpoint;    // last checkpoint on the index curve
        mapping(address => uint) depositRateLastModifiedBlockNumber;
        mapping(address => uint) borrowRateLastModifiedBlockNumber;
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
        // 0001 0100 = represents third(_index == 2) and fifth(_index == 4) token is deposited
        uint128 currDepositBitmap = account.depositBitmap;
        // 0000 0100 = Left shift to create mask to find third bit status
        uint128 mask = uint128(1) << _index;
        // Example-1: 0001 0100 AND 0000 0100 => 0000 0100 (isDeposited > 0)
        // Example-2: 0001 0000 AND 0000 0100 => 0000 0000 (isDeposited == 0)
        uint128 isDeposited = currDepositBitmap & mask;
        // Not deposited before, hence, set the bit in depositBitmap
        if(isDeposited == 0) {
            // Corrospending bit is set in depositBitmap
            // Example-2: 0001 0000 OR 0000 0100 => 0001 0100 (depositBitmap)
            account.depositBitmap = currDepositBitmap | mask;
        }
    }

    function unsetFromDepositBitmap(BaseVariable storage self, address _sender) public {
        // TODO still working on
    }

    function getDepositTokenIndexes(BaseVariable storage self, address _sender)
        public
        view
        returns (uint8[] memory)
    {
        uint128 currDepositBitmap = self.accounts[_sender].depositBitmap;
        for(uint8 i = 0; i < 256; i++) {
            uint128 mask = uint128(1) << i;
            uint128 isSet = currDepositBitmap & mask;
            if(isSet > 0) {
                // TODO Still working on
            }
        }
    }

    function approveAll(BaseVariable storage self, address _token) public {
        address cToken = self.cTokenAddress[_token];
        require(cToken != address(0x0), "cToken address is zero");
        IERC20(_token).safeApprove(cToken, 0);
        IERC20(_token).safeApprove(cToken, uint256(-1));
    }

    /**
     * Total amount of the token in Saving Pool
     * sichaoy: This is not right since the cToken rate has changed
     * @param _token token address
     */
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
     * Total amount of available tokens for withdraw and borrow
     */
    function getTotalAvailableNow(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = self.cTokenAddress[_token];
        uint256 totalReserve = self.totalReserve[_token];
        return self.totalCompound[cToken].add(totalReserve);
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
        uint balance = self.totalLoans[_token];
        uint rate = getBorrowAccruedRate(self, _token, self.borrowRateLastModifiedBlockNumber[_token]);
        if(
            rate == 0 ||
            balance == 0 ||
            SafeDecimalMath.getUNIT() > rate
        ) {
            self.totalLoans[_token]  = balance;
        } else {
            self.totalLoans[_token] = balance.mul(rate).div(SafeDecimalMath.getUNIT());
        }
    }

    /**
     * Update the total reservation. Before run this function, make sure that totalCompound has been updated
     * by calling updateTotalCompound. Otherwise, self.totalCompound may not equal to the exact amount of the
     * token in Compound.
     * @param _isPositive True if the function is called in deposit or repay. Otherwise, it is false.
     * @return the actuall amount deposit/withdraw from the saving pool
     */
    function updateTotalReserve(BaseVariable storage self, address _token, uint _amount, bool _isPositive) public {
        address cToken = self.cTokenAddress[_token];
        if (_isPositive) {
            // Total amount of token after deposit or repay
            uint totalAmount = getTotalDepositsNow(self, _token).add(_amount);
            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = self.totalReserve[_token].add(_amount);

            if (self.cTokenAddress[_token] != address(0) &&
                totalReserveBeforeAdjust > totalAmount.mul(20).div(100)) { // sichaoy: 20 and 15 should be defined as constants
                uint toCompoundAmount = totalReserveBeforeAdjust - totalAmount.mul(15).div(100);
                toCompound(self, _token, toCompoundAmount);
                self.totalCompound[cToken] = self.totalCompound[cToken].add(toCompoundAmount);
                self.totalReserve[_token] = self.totalReserve[_token].add(_amount.sub(toCompoundAmount));
            }
            else {
                self.totalReserve[_token] = self.totalReserve[_token].add(_amount);
            }
        } else {
            require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= _amount,
                "Not enough tokens in the pool.");

            // Total amount of token after deposit or repay
            uint totalAmount = getTotalDepositsNow(self, _token).sub(_amount);
            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = self.totalReserve[_token] > _amount ? self.totalReserve[_token].sub(_amount) : 0;

            // Trigger fromCompound if the new reservation ratio is less than 10%
            if(self.cTokenAddress[_token] != address(0) &&
                (totalAmount == 0 || totalReserveBeforeAdjust < totalAmount.mul(10).div(100))) {

                uint totalAvailable = self.totalReserve[_token].add(self.totalCompound[cToken]).sub(_amount);
                if (totalAvailable < totalAmount.mul(15).div(100)){
                    // Withdraw all the tokens from Compound
                    fromCompound(self, _token, self.totalCompound[cToken]);
                    self.totalCompound[cToken] = 0;
                    self.totalReserve[_token] = totalAvailable.sub(_amount);
                } else {
                    // Withdraw partial tokens from Compound
                    uint totalInCompound = totalAvailable - totalAmount.mul(15).div(100);
                    fromCompound(self, _token, self.totalCompound[cToken]-totalInCompound);
                    self.totalCompound[cToken] = totalInCompound;
                    self.totalReserve[_token] = totalAvailable.sub(totalInCompound);
                }
            }
            else {
                self.totalReserve[_token] = self.totalReserve[_token].sub(_amount);
            }
        }
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

    /**
     * Get the borrowing interest rate Borrowing interest rate.
     * @param _token token address
     * @return the borrow rate for the current block
     */
    function getBorrowRatePerBlock(BaseVariable storage self, address _token) public view returns(uint borrowRatePerBlock) {
        address cToken = self.cTokenAddress[_token];
        if(cToken == address(0)){
            // if the token is NOT supported in Compound
            return getCapitalUtilizationRate(self, _token).mul(15*10**16).add(3*10**16).div(2102400);
        } else {
            // if the token is suppored in Compound
            return getCompoundSupplyRatePerBlock(cToken).add(getCompoundBorrowRatePerBlock(cToken)).div(2);
        }
    }

    /**
     * Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
     * Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
     * sichaoy: make sure the ratePerBlock is zero if both U and C are zero.
     * @param _token token address
     * @return deposite rate of blocks before the current block
     */
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
            // sichaoy: to check that the current block rate index already exist
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
     * @param _token token address
     */
    // sichaoy: rateIndex?
    function newDepositRateIndexCheckpoint(BaseVariable storage self, address _token) public {
        self.depositeRateIndex[_token][block.number] = getNowDepositRate(self, _token);
    }

    function newRateIndexCheckpoint(BaseVariable storage self, address _token) public {
        self.borrowRateIndex[_token][block.number] = getNowBorrowRate(self, _token);
        self.depositeRateIndex[_token][block.number] = getNowDepositRate(self, _token);
        self.lastCheckpoint[_token] = block.number;
    }

    /**
     * Calculate a token deposite rate of current block
     * @param _token token address
     */
    // sichaoy: this function returns 1+r*block_delta, better to replace the name to index
    function getNowDepositRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 depositRatePerBlock = getDepositRatePerBlock(self, _token);     // returns r
        // "depositRateLMBN" => "DepositRateLastModifiedBlockNumber"
        uint256 depositRateLMBN = self.depositRateLastModifiedBlockNumber[_token];
        uint256 depositeRateIndex = self.depositeRateIndex[_token][depositRateLMBN];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if(depositRateLMBN == 0) {
            return UNIT;
        } else {
            return depositeRateIndex.mul(block.number.sub(depositRateLMBN).mul(depositRatePerBlock).add(UNIT)).div(UNIT);
        }
    }

    //Update borrow rates. borrowRate = 1 + blockChangeValue * rate
    function newBorrowRateIndexCheckpoint(BaseVariable storage self, address _token) public {
        self.borrowRateIndex[_token][block.number] = getNowBorrowRate(self, _token);
    }

    function getNowBorrowRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 borrowRateLMBN = self.borrowRateLastModifiedBlockNumber[_token];
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

    function toCompound(BaseVariable storage self, address _token, uint _amount) public {
        address cToken = self.cTokenAddress[_token];
        if (_token == ETH_ADDR) {
            // TODO Why we need to put gas here?
            // TODO Without gas tx was failing? Even when gas is 100000 it was failing.
            ICETH(cToken).mint.value(_amount).gas(250000)();
        } else {
            ICToken(cToken).mint(_amount);
        }
    }

    function fromCompound(BaseVariable storage self, address _token, uint _amount) public {
        ICToken cToken = ICToken(self.cTokenAddress[_token]);
        cToken.redeemUnderlying(_amount);
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
            if(self.depositeRateIndex[_token][tokenInfo.getLastDepositBlock()] == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = getNowDepositRate(self, _token)
                .mul(UNIT)
                .div(self.depositeRateIndex[_token][tokenInfo.getLastDepositBlock()]);
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
            if(self.borrowRateIndex[_token][tokenInfo.getLastBorrowBlock()] == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = getNowBorrowRate(self, _token)
                .mul(UNIT)
                .div(self.borrowRateIndex[_token][tokenInfo.getLastBorrowBlock()]);
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
        require(
            vars.totalBorrow.add(vars.amountValue).mul(100) <= vars.totalDeposit.mul(60),
            "Insufficient collateral."
        );

        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        newDepositRateIndexCheckpoint(self, _token);
        newBorrowRateIndexCheckpoint(self, _token);
        vars.accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getLastDepositBlock());
        vars.interest = tokenInfo.viewDepositInterest(vars.accruedRate);

        tokenInfo.withdraw(_amount, vars.accruedRate);
        if(vars.interest > 0) {
            uint256 _money = vars.interest <= _amount ? vars.interest.div(10) : _amount.div(10);
            _amount = _amount.sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }

        if(_amount > 0 && activeTokenInfo.getBorrowPrincipal() > 0) {
            uint bAccruedRate = getBorrowAccruedRate(self, _token, activeTokenInfo.getLastBorrowBlock());
            uint256 amountBorrowed = activeTokenInfo.getBorrowBalance(bAccruedRate);
            uint __amount = _amount > amountBorrowed ? amountBorrowed : _amount;
            require(self.totalReserve[_token].add(self.totalCompound[self.cTokenAddress[_token]]) >= _amount, "Lack of liquidity.");
            activeTokenInfo.deposit(__amount, bAccruedRate);
            self.totalLoans[_token] = self.totalLoans[_token].add(__amount);
            self.borrowRateLastModifiedBlockNumber[_token] = block.number;
            self.totalReserve[_token] = self.totalReserve[_token].sub(__amount);
            self.depositRateLastModifiedBlockNumber[_token] = block.number;
            _amount = _amount > amountBorrowed ? _amount.sub(amountBorrowed) : 0;
        }

        if(_amount > 0 && activeTokenInfo.getDepositPrincipal() >= 0) {
            uint dAccruedRate = getDepositAccruedRate(self, _token, activeTokenInfo.getLastDepositBlock());
            activeTokenInfo.deposit(_amount, dAccruedRate);
        }

        self.depositRateLastModifiedBlockNumber[_token] = block.number;
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
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

        // Add a new checkpoint on the index curve.
        newRateIndexCheckpoint(self, _token);

        // Update tokenInfo. Add the _amount to principal, and update the last deposit block in tokenInfo
        uint accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getLastDepositBlock());
        tokenInfo.deposit(_amount, accruedRate);

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        updateTotalReserve(self, _token, _amount, true); // Last parameter false means deposit token

        // Set the deposit bitmap
        setInDepositBitmap(account, _tokenIndex);
    }

    /**
     * Borrow the amount of token from the saving pool.
     * @param _token the address of the borrowed token
     * @param _amount the mount of the borrowed token
     */
    function borrow(BaseVariable storage self, address _token, uint256 _amount) public {
        require(isUserHasAnyDeposits(self.accounts[msg.sender]), "User not have any deposits");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        require(tokenInfo.getDepositPrincipal() == 0, "Token depositPrincipal must be zero.");

        // Add a new checkpoint on the index curve.
        newRateIndexCheckpoint(self, _token);

        // Sanity check
        // sichaoy: Sanity check should be the first step in a function
        address cToken = self.cTokenAddress[_token];
        require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= _amount, "Lack of liquidity.");

        // Update tokenInfo
        uint rate = getBorrowAccruedRate(self, _token, tokenInfo.getLastBorrowBlock());
        tokenInfo.borrow(_amount, rate);

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        updateTotalReserve(self, _token, _amount, false); // Last parameter false means borrow token
    }

    /**
     * Repay the amount of token to the saving pool.
     * @param _token the address of the repaid token
     * @param _amount the mount of the repaid token
     */
    function repay(BaseVariable storage self, address _token, uint256 _amount) public returns(uint) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];

        // Sanity check
        require(tokenInfo.getBorrowPrincipal() > 0,
            "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
        );

        // Add a new checkpoint on the index curve.
        newRateIndexCheckpoint(self, _token);

        // Update tokenInfo
        uint rate = getBorrowAccruedRate(self, _token,tokenInfo.getLastBorrowBlock());
        uint256 amountOwedWithInterest = tokenInfo.getBorrowBalance(rate);
        uint amount = _amount > amountOwedWithInterest ? amountOwedWithInterest : _amount;
        tokenInfo.repay(amount, rate);

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        updateTotalReserve(self, _token, amount, true); // Last parameter true means repay token

        return _amount > amountOwedWithInterest ? _amount.sub(amountOwedWithInterest) : 0; // Return the remainders
    }

    /**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
     * @param _token token address
     * @param _amount amount of token to withdraw
     * @return amount of token actually withdrew
	 */
    function withdraw(BaseVariable storage self, address _token, uint256 _amount) public returns(uint) {

        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];

        // Add a new checkpoint on the index curve.
        newRateIndexCheckpoint(self, _token);

        // sichaoy: all the sanity checks should be before the operations
        uint accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getLastDepositBlock());
        require(tokenInfo.getDepositBalance(accruedRate) >= _amount, "Insufficient balance.");
        address cToken = self.cTokenAddress[_token];
        require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= _amount, "Lack of liquidity.");

        // Update tokenInfo for the user
        tokenInfo.withdraw(_amount, accruedRate);

        // DeFiner takes 10% commission on the interest a user earn
        uint256 commission = tokenInfo.depositInterest <= _amount ? tokenInfo.depositInterest.div(10) : _amount.div(10);
        self.deFinerFund[_token] = self.deFinerFund[_token].add(commission);
        _amount = _amount.sub(commission);

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        updateTotalReserve(self, _token, _amount, false); // Last parameter false means withdraw token

        return _amount;
    }

    function withdrawAll(BaseVariable storage self, address _token) public returns(uint){

        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];

        // Add a new checkpoint on the index curve.
        newRateIndexCheckpoint(self, _token);

        // sichaoy: move sanity check to the begining
        uint accruedRate = getDepositAccruedRate(self, _token, tokenInfo.getLastDepositBlock());
        require(tokenInfo.getDepositPrincipal() > 0, "Token depositPrincipal must be greater than 0");

        uint amount = tokenInfo.getDepositBalance(accruedRate);
        address cToken = self.cTokenAddress[_token];
        require(self.totalReserve[_token].add(self.totalCompound[cToken]) >= amount, "Lack of liquidity.");
        tokenInfo.withdraw(amount, accruedRate);

        // DeFiner takes 10% commission on the interest a user earn
        uint256 commission = tokenInfo.depositInterest.div(10);
        self.deFinerFund[_token] = self.deFinerFund[_token].add(commission);
        amount = amount.sub(commission);

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        updateTotalCompound(self, _token);
        updateTotalLoan(self, _token);
        updateTotalReserve(self, _token, amount, false); // Last parameter false means withdraw token

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
        newDepositRateIndexCheckpoint(self, addr[2]);
        newDepositRateIndexCheckpoint(self, addr[1]);
        newBorrowRateIndexCheckpoint(self, addr[2]);
        newBorrowRateIndexCheckpoint(self, addr[1]);
        //清算者当前tokenRate
        uint msgTokenAccruedRate =
        msgTokenInfo.getBorrowPrincipal() > 0 ?
        getBorrowAccruedRate(self, addr[2],msgTokenInfo.getLastBorrowBlock())
        :
        getDepositAccruedRate(self, addr[2], msgTokenInfo.getLastDepositBlock());
        //清算者目标tokenRate
        uint msgTargetTokenAccruedRate = getDepositAccruedRate(self, addr[1], msgTargetTokenInfo.getLastDepositBlock());
        //被清算者当前tokenRate
        uint tokenAccruedRate= getDepositAccruedRate(self, addr[2], tokenInfo.getLastDepositBlock());
        //被清算者目标tokenRate
        uint targetTokenAccruedRate = getBorrowAccruedRate(self, addr[1], targetTokenInfo.getLastBorrowBlock());
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
}

interface IERC20Extended {
    function decimals() external view returns (uint8);
}