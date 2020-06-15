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
        mapping(address => uint256) totalLoans;
        mapping(address => uint256) totalReserve;
        mapping(address => uint256) totalCompound;
        mapping(address => address) cTokenAddress;
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) depositRateRecord;
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) borrowRateRecord;
        mapping(address => uint) depositRateLastModifiedBlockNumber;
        mapping(address => uint) borrowRateLastModifiedBlockNumber;
        // Store per account info
        mapping(address => Account) accounts;
        address payable deFinerCommunityFund;
        mapping(address => uint) deFinerFund;
    }

    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    //    int256 public constant INT_UNIT = int256(10 ** uint256(18));
    uint256 public constant INT_UNIT = 10 ** uint256(18);

    struct Account {
        // Note, it's best practice to use functions minusAmount, addAmount, totalAmount
        // to operate tokenInfos instead of changing it directly.
        mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
        uint128 depositBitmap;
        uint128 borrowBitmap;
    }

    //初始化
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

    function getTotalCompoundNow(BaseVariable storage self, address _token) public {
        address cToken = self.cTokenAddress[_token];
        if(cToken != address(0)) {
            self.totalCompound[cToken] = ICToken(cToken).balanceOfUnderlying(address(this));
        }
    }

    function getTotalLoansNow(BaseVariable storage self, address _token) public {
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
    function getDepositRatePerBlock(BaseVariable storage self, address _token) public view returns(uint depositAPR) {
        address cToken = self.cTokenAddress[_token];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, _token);
        uint256 capitalUtilRate = getCapitalUtilizationRate(self, _token);
        if(cToken == address(0)) {
            return borrowRatePerBlock.mul(capitalUtilRate).div(SafeDecimalMath.getUNIT()).div(2102400);
        } else {
            uint d1 = borrowRatePerBlock.mul(capitalUtilRate);
            uint d2 = getCompoundSupplyRatePerBlock(cToken).mul(getCapitalCompoundRate(self, _token));
            return d1.add(d2).div(SafeDecimalMath.getUNIT()); // 要改
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

    //Get the deposit rate of the block interval.
    function getBlockIntervalDepositRateRecord(
        BaseVariable storage self,
        address _token,
        uint _depositRateRecordStart
    ) internal view returns (uint256) {
        uint256 depositRate = self.depositRateRecord[_token][_depositRateRecordStart];
        if (
            depositRate == 0 ||
            depositRate == self.depositRateRecord[_token][block.number] ||
            _depositRateRecordStart == block.number
        ) {
            return depositRate;
        } else {
            return self.depositRateRecord[_token][block.number]
            .mul(SafeDecimalMath.getUNIT())
            .div(depositRate);
        }
    }

    function getBlockIntervalBorrowRateRecord(
        BaseVariable storage self,
        address _token,
        uint _borrowRateRecordStart
    ) internal view returns (uint256) {
        uint256 borrowRate = self.borrowRateRecord[_token][_borrowRateRecordStart];
        if (
            borrowRate == 0 ||
            borrowRate == self.borrowRateRecord[_token][block.number] ||
            _borrowRateRecordStart == block.number
        ) {
            // when block is same
            return borrowRate;
        } else {
            // rate change
            return self.borrowRateRecord[_token][block.number]
            .mul(SafeDecimalMath.getUNIT())
            .div(borrowRate);
        }
    }

    //    function getTotalUsdValue(address tokenAddress, int256 amount, uint price) public view returns(int) {
    //        return amount.mul(int(price)).div(int(10**ERC20(tokenAddress).decimals()));
    //    }

    //Update Deposit Rate. depositRate = 1 + blockChangeValue * rate
    function updateDepositRate(BaseVariable storage self, address _token) public {
        self.depositRateRecord[_token][block.number] = getNowDepositRate(self, _token);
    }

    function getNowDepositRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 depositRatePerBlock = getDepositRatePerBlock(self, _token);
        // "depositRateLMBN" => "DepositRateLastModifiedBlockNumber"
        uint256 depositRateLMBN = self.depositRateLastModifiedBlockNumber[_token];
        uint256 depositRateRecord = self.depositRateRecord[_token][depositRateLMBN];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if(depositRatePerBlock == 0) {
            return UNIT;
        } else if(depositRateLMBN == 0 || depositRateRecord == 0) {
            return depositRatePerBlock.add(UNIT);
        } else if(block.number == depositRateLMBN) {
            return depositRateRecord;
        } else {
            return depositRateRecord
            .mul(block.number.sub(depositRateLMBN)
            .mul(depositRatePerBlock).add(UNIT)
            )
            .div(UNIT);
        }
    }

    //Update borrow rates. borrowRate = 1 + blockChangeValue * rate
    //TODO:getBorrowRatePerBlock如果是0需要考虑
    function updateBorrowRate(BaseVariable storage self, address _token) public {
        self.borrowRateRecord[_token][block.number] = getNowBorrowRate(self, _token);
    }

    function getNowBorrowRate(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 borrowRateLMBN = self.borrowRateLastModifiedBlockNumber[_token];
        uint256 borrowRateRecord = self.borrowRateRecord[_token][borrowRateLMBN];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, _token);
        if(borrowRateLMBN == 0) {
            return borrowRatePerBlock.add(SafeDecimalMath.getUNIT());
        } else if(block.number == borrowRateLMBN) {
            return borrowRateRecord;
        } else {
            return borrowRateRecord
            .mul(block.number.sub(borrowRateLMBN)
            .mul(borrowRatePerBlock).add(SafeDecimalMath.getUNIT())
            )
            .div(SafeDecimalMath.getUNIT());
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

    function tokenBalanceOfAndInterestOf(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns (uint256 totalBalance, uint256 totalInterest, bool sign) {
        // TODO Why need storage
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[_accountAddr].tokenInfos[_token];
        uint rate;
        if(tokenInfo.getCurrentTotalAmount() == 0) {
            return (0, 0, true);
        } else {
            if(tokenInfo.isDeposit()) {
                if(
                    tokenInfo.getStartBlockNumber() == block.number
                ) {
                    rate = self.depositRateRecord[_token][tokenInfo.getStartBlockNumber()];
                } else if(self.depositRateRecord[_token][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowDepositRate(self, _token);
                } else {
                    rate = getNowDepositRate(self, _token)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.depositRateRecord[_token][tokenInfo.getStartBlockNumber()]);
                }
                sign = true;
            } else {
                if(self.borrowRateRecord[_token][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowBorrowRate(self, _token);
                } else {
                    rate = getNowBorrowRate(self, _token)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.borrowRateRecord[_token][tokenInfo.getStartBlockNumber()]);
                }
                sign = false;
            }
            return (tokenInfo.totalBalance(), tokenInfo.viewInterest(rate), sign);
        }
    }

    function tokenBalanceAdd(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns(uint, bool) {
        (uint totalBalance, uint interest, bool sign) = tokenBalanceOfAndInterestOf(self, _token, _accountAddr);
        return (totalBalance + interest, sign);
    }

    // Total = principal + interest
    // TODO Sichao to explain the logic here
    function totalBalance(
        BaseVariable storage self,
        address _accountAddr,
        SymbolsLib.Symbols storage _symbols,
        bool _isPositive // true = deposits balance AND false = borrow balance
    ) public view returns (uint256 balance) {
        //TODO Why need to pass symbols ?
        for(uint i = 0; i < _symbols.getCoinLength(); i++) {
            address tokenAddress = _symbols.addressFromIndex(i);
            TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[_accountAddr].tokenInfos[tokenAddress];
            uint256 startBlockNum = tokenInfo.getStartBlockNumber();
            uint rate;
            uint divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
            }
            if(_isPositive && tokenInfo.isDeposit()) {
                if(
                    startBlockNum == block.number
                ) {
                    rate = self.depositRateRecord[tokenAddress][startBlockNum];
                } else if(self.depositRateRecord[tokenAddress][startBlockNum] == 0) {
                    rate = getNowDepositRate(self, tokenAddress);
                } else {
                    rate = getNowDepositRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.depositRateRecord[tokenAddress][startBlockNum]);
                }
                balance = balance.add(tokenInfo.totalBalance().add(tokenInfo.viewInterest(rate)).mul(_symbols.priceFromIndex(i)).div(divisor));
            } else if(!_isPositive && !tokenInfo.isDeposit()) {
                if(
                    startBlockNum == block.number
                ) {
                    rate = self.borrowRateRecord[tokenAddress][startBlockNum];
                }else if(self.borrowRateRecord[tokenAddress][startBlockNum] == 0) {
                    rate = getNowBorrowRate(self, tokenAddress);
                } else {
                    rate = getNowBorrowRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.borrowRateRecord[tokenAddress][startBlockNum]);
                }
                balance = balance.add(tokenInfo.totalBalance().add(tokenInfo.viewInterest(rate)).mul(_symbols.priceFromIndex(i)).div(divisor));
            }
        }
        return balance;
    }

    function transfer(
        BaseVariable storage self,
        address _activeAccount,
        address _token,
        uint _amount,
        SymbolsLib.Symbols storage symbols
    ) public {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalDepositRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        uint interest = tokenInfo.viewInterest(rate);
        require(tokenInfo.totalAmount(rate) >= _amount, "Insufficient balance.");

        // 仅供无价格测试使用
        // uint totalBorrow = totalBalance(self, msg.sender, symbols, false) < 0
        // ? totalBalance(self, msg.sender, symbols, false).mul(-1) : totalBalance(self, msg.sender, symbols, false);
        // uint totalDeposit = totalBalance(self, msg.sender, symbols, true);
        // uint amountValue = _amount.mul(symbols.priceFromAddress(_token));
        // require(totalDeposit.sub(amountValue) > 0 && totalBorrow.mul(100).div(totalDeposit.sub(amountValue)) <= 60);
        tokenInfo.minusAmount(_amount, rate, block.number);
        if(interest > 0) {
            uint256 _money = interest <= _amount ? interest.div(10) : _amount.div(10);
            _amount = _amount.sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }
        transfer1(self, _activeAccount, _token, _amount);

    }

    function transfer1(BaseVariable storage self, address activeAccount, address tokenAddress, uint amount) public {
        TokenInfoLib.TokenInfo storage activeTokenInfo = self.accounts[activeAccount].tokenInfos[tokenAddress];
        if(amount > 0 && activeTokenInfo.getCurrentTotalAmount() < 0) {
            uint bRate = getBlockIntervalBorrowRateRecord(self, tokenAddress,activeTokenInfo.getStartBlockNumber());
            uint256 amountBorrowed = activeTokenInfo.totalAmount(bRate);
            uint _amount = amount > amountBorrowed ? amountBorrowed : amount;
            require(self.totalReserve[tokenAddress].add(self.totalCompound[self.cTokenAddress[tokenAddress]]) >= amount, "Lack of liquidity.");
            activeTokenInfo.addAmount(_amount, bRate, block.number);
            self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].add(_amount);
            self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(_amount);
            self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
            amount = amount > amountBorrowed ? amount.sub(amountBorrowed) : 0;
        }

        if(amount > 0 && activeTokenInfo.getCurrentTotalAmount() >= 0) {
            uint dRate = getBlockIntervalDepositRateRecord(self, tokenAddress, activeTokenInfo.getStartBlockNumber());
            activeTokenInfo.addAmount(amount, dRate, block.number);
        }
    }

    function deposit(BaseVariable storage self, address _token, uint256 _amount, uint8 _tokenIndex) public {
        Account storage account = self.accounts[msg.sender];
        TokenInfoLib.TokenInfo storage tokenInfo = account.tokenInfos[_token];

        require(tokenInfo.isDeposit(), "Token balance must be zero or positive.");

        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalDepositRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        // Add principa + interest (on borrows/on deposits)
        tokenInfo.addAmount(_amount, rate, block.number);
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
        self.depositRateLastModifiedBlockNumber[_token] = block.number;
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;

        setInDepositBitmap(account, _tokenIndex);
    }

    function borrow(BaseVariable storage self, address _token, uint256 amount) public {
        require(isUserHasAnyDeposits(self.accounts[msg.sender]), "User not have any deposits");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        require(
            tokenInfo.getCurrentTotalAmount() == 0 || !tokenInfo.isDeposit(),
            "Deposit is greater than or equal to zero, please use withdraw instead."
        );
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalBorrowRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        tokenInfo.minusAmount(amount, rate, block.number);
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
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
    }

    function repay(BaseVariable storage self, address _token, address activeAccount, uint256 amount) public returns(uint) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[activeAccount].tokenInfos[_token];
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalBorrowRateRecord(self, _token,tokenInfo.getStartBlockNumber());
        require(
            !tokenInfo.isDeposit(),
            "Balance of the token must be negative. To deposit balance, please use deposit button."
        );

        uint256 amountOwedWithInterest = tokenInfo.totalAmount(rate);
        uint _amount = amount > amountOwedWithInterest ? amountOwedWithInterest : amount;
        tokenInfo.addAmount(_amount, rate, block.number);
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
        self.depositRateLastModifiedBlockNumber[_token] = block.number;
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
        return amount > amountOwedWithInterest ? amount.sub(amountOwedWithInterest) : 0;
    }

    /**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */

    function withdraw(BaseVariable storage self, address _token, uint256 _amount) public returns(uint){
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalDepositRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        require(tokenInfo.isDeposit() && tokenInfo.totalAmount(rate) >= _amount, "Insufficient balance.");
        uint interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(_amount, rate, block.number);
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
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
        self.depositRateLastModifiedBlockNumber[_token] = block.number;
        return _amount;
    }

    function withdrawAll(BaseVariable storage self, address _token) public returns(uint){
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[_token];
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalDepositRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        require(tokenInfo.isDeposit(), "Insufficient balance.");
        uint amount = tokenInfo.totalAmount(rate);
        uint interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(amount, rate, block.number);
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
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
        self.depositRateLastModifiedBlockNumber[_token] = block.number;
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
        if(tokenInfo.getCurrentTotalAmount() <= 0){
            return u[2];
        }
        TokenInfoLib.TokenInfo storage targetTokenInfo = self.accounts[addr[0]].tokenInfos[addr[1]];
        TokenInfoLib.TokenInfo storage msgTokenInfo = self.accounts[msg.sender].tokenInfos[addr[2]];
        TokenInfoLib.TokenInfo storage msgTargetTokenInfo = self.accounts[msg.sender].tokenInfos[addr[1]];
        updateDepositRate(self, addr[2]);
        updateDepositRate(self, addr[1]);
        updateBorrowRate(self, addr[2]);
        updateBorrowRate(self, addr[1]);
        //清算者当前tokenRate
        uint msgTokenRate =
        msgTokenInfo.getCurrentTotalAmount() < 0 ?
        getBlockIntervalBorrowRateRecord(self, addr[2],msgTokenInfo.getStartBlockNumber())
        :
        getBlockIntervalDepositRateRecord(self, addr[2], msgTokenInfo.getStartBlockNumber());
        //清算者目标tokenRate
        uint msgTargetTokenRate = getBlockIntervalDepositRateRecord(self, addr[1], msgTargetTokenInfo.getStartBlockNumber());
        //被清算者当前tokenRate
        uint tokenRate = getBlockIntervalDepositRateRecord(self, addr[2], tokenInfo.getStartBlockNumber());
        //被清算者目标tokenRate
        uint targetTokenRate = getBlockIntervalBorrowRateRecord(self, addr[1], targetTokenInfo.getStartBlockNumber());
        uint coinValue = uint(tokenInfo.totalAmount(tokenRate)).mul(u[1]);
        if(coinValue > u[2]) {
            coinValue = u[2];
            u[2] = 0;
        } else {
            u[2] = u[2].sub(coinValue);
        }
        uint tokenAmount = coinValue.div(u[1]);
        uint targetTokenAmount = coinValue.mul(95).div(100).div(u[0]);
        msgTargetTokenInfo.minusAmount(targetTokenAmount.mul(95).div(100), msgTargetTokenRate, block.number);
        targetTokenInfo.addAmount(targetTokenAmount, targetTokenRate, block.number);
        tokenInfo.minusAmount(tokenAmount, tokenRate, block.number);
        msgTokenInfo.addAmount(tokenAmount, msgTokenRate, block.number);
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

    function borrowInterest(BaseVariable storage self, address _token) public view returns(uint256) {
        uint balance = self.totalLoans[_token];
        uint rate = getBlockIntervalBorrowRateRecord(self, _token, self.borrowRateLastModifiedBlockNumber[_token]);
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