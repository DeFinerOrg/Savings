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
//        mapping(address => int256) totalLoans;
        mapping(address => uint256) totalLoans;
//        mapping(address => int256) totalReserve;
        mapping(address => uint256) totalReserve;
//        mapping(address => int256) totalCompound;
        mapping(address => uint256) totalCompound;
        mapping(address => address) cTokenAddress;
        mapping(address => mapping(uint => uint)) depositRateRecord;
        mapping(address => mapping(uint => uint)) borrowRateRecord;
        mapping(address => uint) depositRateLastModifiedBlockNumber;
        mapping(address => uint) borrowRateLastModifiedBlockNumber;
        mapping(address => Account) accounts;
        address[] activeAccounts;
        address payable deFinerCommunityFund;
//        mapping(address => int) deFinerFund;
        mapping(address => uint) deFinerFund;
    }

    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
//    int256 public constant INT_UNIT = int256(10 ** uint256(18));
    uint256 public constant INT_UNIT = 10 ** uint256(18);

    struct Account {
        // Note, it's best practice to use functions minusAmount, addAmount, totalAmount
        // to operate tokenInfos instead of changing it directly.
        mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
        bool active;
    }

    //初始化
    function initialize(BaseVariable storage self, address[] memory tokenAddresses, address[] memory cTokenAddresses) public {
        for(uint i = 0;i < tokenAddresses.length;i++) {
            self.cTokenAddress[tokenAddresses[i]] = cTokenAddresses[i];
        }
    }

    function approveAll(BaseVariable storage self, address tokenAddress) public {
        address cToken = self.cTokenAddress[tokenAddress];
        require(cToken != address(0x0), "cToken address is zero");
        IERC20(tokenAddress).safeApprove(cToken, 0);
        IERC20(tokenAddress).safeApprove(cToken, uint256(-1));
    }

    function getTotalDepositsNow(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        return self.totalCompound[self.cTokenAddress[tokenAddress]]
        .add(self.totalLoans[tokenAddress])
        .add(self.totalReserve[tokenAddress]);
    }

    function getTotalCompoundNow(BaseVariable storage self, address tokenAddress) public {
        address cToken = self.cTokenAddress[tokenAddress];
        if(cToken != address(0)) {
            self.totalCompound[cToken] = ICToken(cToken).balanceOfUnderlying(address(this));
        }
    }

    function getTotalLoansNow(BaseVariable storage self, address tokenAddress) public {
        self.totalLoans[tokenAddress] = borrowInterest(self, tokenAddress);
    }

    //Get compound deposit rate. The scale is 10 ** 18
    function getCompoundSupplyRatePerBlock(address cTokenAddress) public view returns(uint) {
        ICToken cToken = ICToken(cTokenAddress);
        return cToken.supplyRatePerBlock();
    }

    //Get compound borrowing interest rate. The scale is 10 ** 18
    function getCompoundBorrowRatePerBlock(address cTokenAddress) public view returns(uint) {
        ICToken cToken = ICToken(cTokenAddress);
        return cToken.borrowRatePerBlock();
    }

    //Get the borrowing interest rate Borrowing interest rate.
    //(compound deposit rate + compound borrowing rate) / 2. The scaling is 10 ** 18
    function getBorrowRatePerBlock(BaseVariable storage self, address tokenAddress) public view returns(uint borrowRatePerBlock) {
        address cToken = self.cTokenAddress[tokenAddress];
        if(cToken == address(0)){
            return getCapitalUtilizationRate(self, tokenAddress).mul(15*10**16).add(3*10**16).div(2102400);
        } else {
            return getCompoundSupplyRatePerBlock(cToken)
            .add(getCompoundBorrowRatePerBlock(cToken)).div(2);
        }
    }

    //Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
    //Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
    function getDepositRatePerBlock(BaseVariable storage self, address tokenAddress) public view returns(uint depositAPR) {
        address cToken = self.cTokenAddress[tokenAddress];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, tokenAddress);
        uint256 capitalUtilRate = getCapitalUtilizationRate(self, tokenAddress);
        if(cToken == address(0)) {
            return borrowRatePerBlock.mul(capitalUtilRate).div(SafeDecimalMath.getUNIT()).div(2102400);
        } else {
            uint d1 = borrowRatePerBlock.mul(capitalUtilRate);
            uint d2 = getCompoundSupplyRatePerBlock(cToken).mul(getCapitalCompoundRate(self, tokenAddress));
            return d1.add(d2).div(SafeDecimalMath.getUNIT()); // 要改
        }
    }

    //Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
    //The scaling is 10 ** 18  U
    function getCapitalUtilizationRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        uint256 totalDepositsNow = getTotalDepositsNow(self, tokenAddress);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return uint(self.totalLoans[tokenAddress].mul(SafeDecimalMath.getUINT_UNIT()).div(totalDepositsNow));
        }
    }

    //存入comound的资金率 C  The scaling is 10 ** 18
    function getCapitalCompoundRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        address cToken = self.cTokenAddress[tokenAddress];
        if(self.totalCompound[cToken] == 0 ) {
            return 0;
        } else {
            return uint(self.totalCompound[cToken].mul(SafeDecimalMath.getUINT_UNIT()).div(getTotalDepositsNow(self, tokenAddress)));
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
        address tokenAddress,
        uint depositRateRecordStart
    ) internal view returns (uint256) {
        uint256 depositRate = self.depositRateRecord[tokenAddress][depositRateRecordStart];
        if (
            depositRate == 0 ||
            depositRate == self.depositRateRecord[tokenAddress][block.number] ||
            depositRateRecordStart == block.number
        ) {
            return depositRate;
        } else {
            return self.depositRateRecord[tokenAddress][block.number]
            .mul(SafeDecimalMath.getUNIT())
            .div(depositRate);
        }
    }

    function getBlockIntervalBorrowRateRecord(
        BaseVariable storage self,
        address tokenAddress,
        uint borrowRateRecordStart
    ) internal view returns (uint256) {
        uint256 borrowRate = self.borrowRateRecord[tokenAddress][borrowRateRecordStart];
        if (
            borrowRate == 0 ||
            borrowRate == self.borrowRateRecord[tokenAddress][block.number] ||
            borrowRateRecordStart == block.number
        ) {
            return borrowRate;
        } else {
            return self.borrowRateRecord[tokenAddress][block.number]
            .mul(SafeDecimalMath.getUNIT())
            .div(borrowRate);
        }
    }

//    function getTotalUsdValue(address tokenAddress, int256 amount, uint price) public view returns(int) {
//        return amount.mul(int(price)).div(int(10**ERC20(tokenAddress).decimals()));
//    }

    //Update Deposit Rate. depositRate = 1 + blockChangeValue * rate
    function updateDepositRate(BaseVariable storage self, address tokenAddress) public {
        self.depositRateRecord[tokenAddress][block.number] = getNowDepositRate(self, tokenAddress);
    }

    function getNowDepositRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        uint256 depositRatePerBlock = getDepositRatePerBlock(self, tokenAddress);
        // "depositRateLMBN" => "DepositRateLastModifiedBlockNumber"
        uint256 depositRateLMBN = self.depositRateLastModifiedBlockNumber[tokenAddress];
        uint256 depositRateRecord = self.depositRateRecord[tokenAddress][depositRateLMBN];
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
    function updateBorrowRate(BaseVariable storage self, address tokenAddress) public {
        self.borrowRateRecord[tokenAddress][block.number] = getNowBorrowRate(self, tokenAddress);
    }

    function getNowBorrowRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        uint256 borrowRateLMBN = self.borrowRateLastModifiedBlockNumber[tokenAddress];
        uint256 borrowRateRecord = self.borrowRateRecord[tokenAddress][borrowRateLMBN];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, tokenAddress);
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
    function getTokenState(BaseVariable storage self, address tokenAddress) public view returns (
        uint256 deposits,
        uint256 loans,
        uint256 collateral,
        uint256 depositRatePerBlock,
        uint256 borrowRatePerBlock
    )
    {
        return (
        getTotalDepositsNow(self, tokenAddress),
        self.totalLoans[tokenAddress],
        self.totalReserve[tokenAddress].add(self.totalCompound[self.cTokenAddress[tokenAddress]]),
        getDepositRatePerBlock(self, tokenAddress),
        getBorrowRatePerBlock(self, tokenAddress)
        );
    }

    function toCompound(BaseVariable storage self, address tokenAddress, uint totalAmount, bool isEth) public {
        uint _amount = totalAmount.mul(15).div(100);
        address cToken = self.cTokenAddress[tokenAddress];
        uint256 toCompoundAmount = self.totalReserve[tokenAddress].sub(_amount);
        if (isEth) {
            ICETH(cToken).mint.value(toCompoundAmount).gas(250000)();
        } else {
            ICToken(cToken).mint(toCompoundAmount);
        }
        self.totalCompound[cToken] = self.totalCompound[cToken].add(toCompoundAmount);
        self.totalReserve[tokenAddress] = _amount;
    }

    function fromCompound(BaseVariable storage self, address tokenAddress, uint compoundAmount) public {
        ICToken cToken = ICToken(self.cTokenAddress[tokenAddress]);
        uint256 totalReserve = self.totalReserve[tokenAddress];
        uint _amount = compoundAmount.add(self.totalLoans[tokenAddress].add(totalReserve))
        .mul(15).div(100).sub(totalReserve);
        uint256 totalCompound = self.totalCompound[address(cToken)];
        if(_amount >= compoundAmount) {
            cToken.redeem(cToken.balanceOf(address(this)));
            self.totalReserve[tokenAddress] = totalReserve.add(totalCompound);
            self.totalCompound[address(cToken)] = 0;
        } else {
            cToken.redeemUnderlying(_amount);
            self.totalCompound[address(cToken)] = totalCompound.sub(_amount);
            self.totalReserve[tokenAddress] = totalReserve.add(_amount);
        }
    }

    function tokenBalanceOfAndInterestOf(
        BaseVariable storage self,
        address tokenAddress,
        address accountAddr
    ) public view returns (uint256 totalBalance, uint256 totalInterest) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[accountAddr].tokenInfos[tokenAddress];
        uint rate;
        if(tokenInfo.getCurrentTotalAmount() == 0) {
            return (0, 0);
        } else {
            if(tokenInfo.isDeposit()) {
                if(
                    tokenInfo.getStartBlockNumber() == block.number
                ) {
                    rate = self.depositRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()];
                } else if(self.depositRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowDepositRate(self, tokenAddress);
                } else {
                    rate = getNowDepositRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.depositRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()]);
                }
            } else {
                if(
                    tokenInfo.getStartBlockNumber() == block.number
                ) {
                    rate = self.borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()];
                } else if(self.borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowBorrowRate(self, tokenAddress);
                } else {
                    rate = getNowBorrowRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()]);
                }
            }
            return (tokenInfo.totalBalance(), tokenInfo.viewInterest(rate));
        }
    }

    function tokenBalanceAdd(
        BaseVariable storage self,
        address tokenAddress,
        address accountAddr
    ) public view returns(uint) {
        (uint totalBalance, uint interest) = tokenBalanceOfAndInterestOf(self, tokenAddress, accountAddr);
        return totalBalance + interest;
    }

    function totalBalance(
        BaseVariable storage self,
        address accountAddr,
        SymbolsLib.Symbols storage symbols,
        bool isPositive
    ) public view returns (uint256 balance) {
        for(uint i = 0;i < symbols.getCoinLength();i++) {
            address tokenAddress = symbols.addressFromIndex(i);
            TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[accountAddr].tokenInfos[tokenAddress];
            uint256 startBlockNum = tokenInfo.getStartBlockNumber();
            uint rate;
            uint divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
            }
            if(isPositive && tokenInfo.isDeposit()) {
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
                balance = balance.add(tokenInfo.totalBalance().add(tokenInfo.viewInterest(rate)).mul(symbols.priceFromIndex(i)).div(divisor));
            } else if(!isPositive && !tokenInfo.isDeposit()) {
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
                balance = balance.add(tokenInfo.totalBalance().add(tokenInfo.viewInterest(rate)).mul(symbols.priceFromIndex(i)).div(divisor));
            }
        }
        return balance;
    }

    function transfer(
        BaseVariable storage self,
        address activeAccount,
        address tokenAddress,
        uint amount,
        SymbolsLib.Symbols storage symbols
    ) public {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        uint interest = tokenInfo.viewInterest(rate);
        require(tokenInfo.totalAmount(rate) >= amount, "Insufficient balance.");

        // 仅供无价格测试使用
        // uint totalBorrow = totalBalance(self, msg.sender, symbols, false) < 0
        // ? totalBalance(self, msg.sender, symbols, false).mul(-1) : totalBalance(self, msg.sender, symbols, false);
        // uint totalDeposit = totalBalance(self, msg.sender, symbols, true);
        // uint amountValue = amount.mul(symbols.priceFromAddress(tokenAddress));
        // require(totalDeposit.sub(amountValue) > 0 && totalBorrow.mul(100).div(totalDeposit.sub(amountValue)) <= 60);
        tokenInfo.minusAmount(amount, rate, block.number);
        if(interest > 0) {
            uint256 _money = interest <= amount ? interest.div(10) : amount.div(10);
            amount = amount.sub(_money);
            self.deFinerFund[tokenAddress] = self.deFinerFund[tokenAddress].add(_money);
        }
        transfer1(self, activeAccount, tokenAddress, amount);

    }

    function transfer1(BaseVariable storage self, address activeAccount, address tokenAddress, uint amount) public {
        TokenInfoLib.TokenInfo storage activeTokenInfo = self.accounts[activeAccount].tokenInfos[tokenAddress];
        if(amount > 0 && activeTokenInfo.getCurrentTotalAmount() < 0) {
            uint bRate = getBlockIntervalBorrowRateRecord(self, tokenAddress,activeTokenInfo.getStartBlockNumber());
            uint256 amountBorrowed = activeTokenInfo.totalAmount(bRate);
            uint _amount = amount > amountBorrowed ? amountBorrowed : amount;
            require(self.totalReserve[tokenAddress] >= amount, "Lack of liquidity.");
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

    function depositToken(BaseVariable storage self, address tokenAddress, uint256 amount) public {
        Account storage account = self.accounts[msg.sender];
        TokenInfoLib.TokenInfo storage tokenInfo = account.tokenInfos[tokenAddress];
        if (!account.active) {
            account.active = true;
            self.activeAccounts.push(msg.sender);
        }

        require(tokenInfo.isDeposit(), "Token balance must be zero or positive.");

        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        tokenInfo.addAmount(amount, rate, block.number);
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].add(amount);
        uint totalAmount = getTotalDepositsNow(self, tokenAddress);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            >
            20 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            toCompound(self, tokenAddress, totalAmount, tokenAddress == ETH_ADDR);
        }
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
    }

    function borrow(BaseVariable storage self, address tokenAddress, uint256 amount) public {
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        require(
            tokenInfo.getCurrentTotalAmount() == 0 || !tokenInfo.isDeposit(),
            "Deposit is greater than or equal to zero, please use withdraw instead."
        );
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        tokenInfo.minusAmount(amount, rate, block.number);
        require(self.totalReserve[tokenAddress] >= amount, "Lack of liquidity.");
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(amount);
        self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].add(amount);
        uint compoundAmount = self.totalCompound[self.cTokenAddress[tokenAddress]];
        uint totalAmount = compoundAmount.add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            fromCompound(self, tokenAddress, compoundAmount);
        }
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
    }

    function repay(BaseVariable storage self, address tokenAddress, address activeAccount, uint256 amount) public returns(uint) {
        require(self.accounts[activeAccount].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[activeAccount].tokenInfos[tokenAddress];
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress,tokenInfo.getStartBlockNumber());

        require(
            !tokenInfo.isDeposit(),
            "Balance of the token must be negative. To deposit balance, please use deposit button."
        );

        uint256 amountOwedWithInterest = tokenInfo.totalAmount(rate);
        uint _amount = amount > amountOwedWithInterest ? amountOwedWithInterest : amount;
        tokenInfo.addAmount(_amount, rate, block.number);
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].add(_amount);
        self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].sub(_amount);
        uint totalAmount = getTotalDepositsNow(self, tokenAddress);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            >
            20 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            toCompound(self, tokenAddress, totalAmount, tokenAddress == ETH_ADDR);
        }
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
        return amount > amountOwedWithInterest ? amount.sub(amountOwedWithInterest) : 0;
    }

    /**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
    function withdrawToken(BaseVariable storage self, address tokenAddress, uint256 amount) public returns(uint){
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        require(tokenInfo.isDeposit() && tokenInfo.totalAmount(rate) >= amount, "Insufficient balance.");
        uint interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(amount, rate, block.number);
        require(self.totalReserve[tokenAddress] >= amount, "Lack of liquidity.");
        if(interest > 0) {
            uint256 _money = interest <= amount ? interest.div(10) : amount.div(10);
            amount = amount.sub(_money);
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(_money);
            self.deFinerFund[tokenAddress] = self.deFinerFund[tokenAddress].add(_money);
        }
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(amount);
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        uint compoundAmount = self.totalCompound[self.cTokenAddress[tokenAddress]];
        uint totalAmount = compoundAmount.add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
        if(
            totalAmount <= 0
            ||
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            fromCompound(self, tokenAddress, compoundAmount);
        }
        return amount;
    }

    function withdrawAllToken(BaseVariable storage self, address tokenAddress) public returns(uint){
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        require(tokenInfo.isDeposit(), "Insufficient balance.");
        uint amount = tokenInfo.totalAmount(rate);
        uint interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(amount, rate, block.number);
        require(self.totalReserve[tokenAddress] >= amount, "Lack of liquidity.");
        if(interest > 0) {
            uint256 _money = interest.div(10);
            amount = amount.sub(_money);
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(_money);
            self.deFinerFund[tokenAddress] = self.deFinerFund[tokenAddress].add(_money);
        }
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(amount);
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        uint compoundAmount = self.totalCompound[self.cTokenAddress[tokenAddress]];
        uint totalAmount = compoundAmount.add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
        if(
            totalAmount <= 0
            ||
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getUINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            fromCompound(self, tokenAddress, compoundAmount);
        }
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

    function recycleCommunityFund(BaseVariable storage self, address tokenAddress) public {
        require(msg.sender == self.deFinerCommunityFund, "Unauthorized call");
        self.deFinerCommunityFund.transfer(uint256(self.deFinerFund[tokenAddress]));
        self.deFinerFund[tokenAddress] == 0;
    }

    function setDeFinerCommunityFund(BaseVariable storage self, address payable _DeFinerCommunityFund) public {
        require(msg.sender == self.deFinerCommunityFund, "Unauthorized call");
        self.deFinerCommunityFund = _DeFinerCommunityFund;
    }

    function getDeFinerCommunityFund(BaseVariable storage self, address tokenAddress) public view returns(uint256){
        return self.deFinerFund[tokenAddress];
    }

    function getActiveAccounts(BaseVariable storage self) public view returns (address[] memory) {
        return self.activeAccounts;
    }

    function borrowInterest(BaseVariable storage self, address tokenAddress) public view returns(uint256) {
        uint balance = self.totalLoans[tokenAddress];
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress, self.borrowRateLastModifiedBlockNumber[tokenAddress]);
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