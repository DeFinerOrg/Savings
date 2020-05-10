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
        mapping(address => int256) totalLoans;
        mapping(address => int256) totalReserve;
        mapping(address => int256) totalCompound;
        mapping(address => address) cTokenAddress;
        mapping(address => mapping(uint => uint)) depositRateRecord;
        mapping(address => mapping(uint => uint)) borrowRateRecord;
        mapping(address => uint) depositRateLastModifiedBlockNumber;
        mapping(address => uint) borrowRateLastModifiedBlockNumber;
        mapping(address => Account) accounts;
        address[] activeAccounts;
        address payable deFinerCommunityFund;
        mapping(address => int) deFinerFund;
    }

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
        require(self.cTokenAddress[tokenAddress] != address(0x0));
        IERC20(tokenAddress).safeApprove(
            self.cTokenAddress[tokenAddress],
            115792089237316195423570985008687907853269984665640564039457584007913129639935
        );
    }

    function getTotalDepositsNow(BaseVariable storage self, address tokenAddress) public view returns(int) {
        return self.totalCompound[self.cTokenAddress[tokenAddress]].add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
    }

    function getTotalCompoundNow(BaseVariable storage self, address tokenAddress) public {
        if(self.cTokenAddress[tokenAddress] != address(0)) {
            self.totalCompound[self.cTokenAddress[tokenAddress]] = int(ICToken(self.cTokenAddress[tokenAddress]).balanceOfUnderlying(address(this)));
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
        if(self.cTokenAddress[tokenAddress] == address(0)){
            return getCapitalUtilizationRate(self, tokenAddress).mul(15*10**16).add(3*10**16).div(2102400);
        } else {
            return getCompoundSupplyRatePerBlock(self.cTokenAddress[tokenAddress])
            .add(getCompoundBorrowRatePerBlock(self.cTokenAddress[tokenAddress])).div(2);
        }
    }

    //Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
    //Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
    function getDepositRatePerBlock(BaseVariable storage self, address tokenAddress) public view returns(uint depositAPR) {
        if(self.cTokenAddress[tokenAddress] == address(0)) {
            return getBorrowRatePerBlock(self, tokenAddress).mul(getCapitalUtilizationRate(self, tokenAddress)).div(SafeDecimalMath.getUNIT()).div(2102400);
        } else {
            uint d1 = getBorrowRatePerBlock(self, tokenAddress).mul(getCapitalUtilizationRate(self, tokenAddress));
            uint d2 = getCompoundSupplyRatePerBlock(self.cTokenAddress[tokenAddress]).mul(getCapitalCompoundRate(self, tokenAddress));
            return d1.add(d2).div(SafeDecimalMath.getUNIT()); // 要改
        }
    }

    //Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
    //The scaling is 10 ** 18  U
    function getCapitalUtilizationRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        if(getTotalDepositsNow(self, tokenAddress) == 0) {
            return 0;
        } else {
            return uint(self.totalLoans[tokenAddress].mul(SafeDecimalMath.getINT_UNIT()).div(getTotalDepositsNow(self, tokenAddress)));
        }
    }

    //存入comound的资金率 C  The scaling is 10 ** 18
    function getCapitalCompoundRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        if(self.totalCompound[self.cTokenAddress[tokenAddress]] == 0 ) {
            return 0;
        } else {
            return uint(self.totalCompound[self.cTokenAddress[tokenAddress]].mul(SafeDecimalMath.getINT_UNIT()).div(getTotalDepositsNow(self, tokenAddress)));
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
        if (self.depositRateRecord[tokenAddress][depositRateRecordStart] == 0) {
            return 0;
        } else if(
            self.depositRateRecord[tokenAddress][depositRateRecordStart]
            ==
            self.depositRateRecord[tokenAddress][block.number]
            ||
            depositRateRecordStart == block.number
        ) {
            return self.depositRateRecord[tokenAddress][depositRateRecordStart];
        } else {
            return self.depositRateRecord[tokenAddress][block.number]
            .mul(SafeDecimalMath.getUNIT())
            .div(self.depositRateRecord[tokenAddress][depositRateRecordStart]);
        }
    }

    function getBlockIntervalBorrowRateRecord(
        BaseVariable storage self,
        address tokenAddress,
        uint borrowRateRecordStart
    ) internal view returns (uint256) {
        if (self.borrowRateRecord[tokenAddress][borrowRateRecordStart] == 0) {
            return 0;
        } else if(
            self.borrowRateRecord[tokenAddress][borrowRateRecordStart]
            ==
            self.borrowRateRecord[tokenAddress][block.number]
            ||
            borrowRateRecordStart == block.number
        ) {
            return self.borrowRateRecord[tokenAddress][borrowRateRecordStart];
        } else {
            return self.borrowRateRecord[tokenAddress][block.number]
            .mul(SafeDecimalMath.getUNIT())
            .div(self.borrowRateRecord[tokenAddress][borrowRateRecordStart]);
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
        if(getDepositRatePerBlock(self, tokenAddress) == 0) {
            return SafeDecimalMath.getUNIT();
        } else if(
            self.depositRateLastModifiedBlockNumber[tokenAddress] == 0
            ||
            self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]] == 0
        ) {
            return getDepositRatePerBlock(self, tokenAddress).add(SafeDecimalMath.getUNIT());
        } else if(block.number == self.depositRateLastModifiedBlockNumber[tokenAddress]) {
            return self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]];
        } else {
            return self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]]
            .mul(block.number.sub(self.depositRateLastModifiedBlockNumber[tokenAddress])
            .mul(getDepositRatePerBlock(self, tokenAddress)).add(SafeDecimalMath.getUNIT())
            )
            .div(SafeDecimalMath.getUNIT());
        }
    }

    //Update borrow rates. borrowRate = 1 + blockChangeValue * rate
    //TODO:getBorrowRatePerBlock如果是0需要考虑
    function updateBorrowRate(BaseVariable storage self, address tokenAddress) public {
        self.borrowRateRecord[tokenAddress][block.number] = getNowBorrowRate(self, tokenAddress);
    }

    function getNowBorrowRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        if(self.borrowRateLastModifiedBlockNumber[tokenAddress] == 0) {
            return getBorrowRatePerBlock(self, tokenAddress).add(SafeDecimalMath.getUNIT());
        } else if(block.number == self.borrowRateLastModifiedBlockNumber[tokenAddress]) {
            return self.borrowRateRecord[tokenAddress][self.borrowRateLastModifiedBlockNumber[tokenAddress]];
        } else {
            return self.borrowRateRecord[tokenAddress][self.borrowRateLastModifiedBlockNumber[tokenAddress]]
            .mul(block.number.sub(self.borrowRateLastModifiedBlockNumber[tokenAddress])
            .mul(getBorrowRatePerBlock(self, tokenAddress)).add(SafeDecimalMath.getUNIT())
            )
            .div(SafeDecimalMath.getUNIT());
        }
    }

    /*
	 * Get the state of the given token
	 */
    function getTokenState(BaseVariable storage self, address tokenAddress) public view returns (
        int256 deposits,
        int256 loans,
        int256 collateral,
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

    function toCompound(BaseVariable storage self, address tokenAddress, int totalAmount, bool isEth) public {
        int _amount = totalAmount.mul(15).div(100);
        if (isEth) {
            ICETH(self.cTokenAddress[tokenAddress]).mint.value(uint(self.totalReserve[tokenAddress].sub(_amount))).gas(250000)();
        } else {
            ICToken(self.cTokenAddress[tokenAddress]).mint(uint(self.totalReserve[tokenAddress].sub(_amount)));
        }
        self.totalCompound[self.cTokenAddress[tokenAddress]] = self.totalCompound[self.cTokenAddress[tokenAddress]].add(self.totalReserve[tokenAddress].sub(_amount));
        self.totalReserve[tokenAddress] = _amount;
    }

    function fromCompound(BaseVariable storage self, address tokenAddress, int compoundAmount) public {
        ICToken cToken = ICToken(self.cTokenAddress[tokenAddress]);
        int _amount = compoundAmount.add(self.totalLoans[tokenAddress].add(self.totalReserve[tokenAddress]))
        .mul(15).div(100).sub(self.totalReserve[tokenAddress]);
        if(_amount >= compoundAmount) {
            cToken.redeem(cToken.balanceOf(address(this)));
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].add(self.totalCompound[self.cTokenAddress[tokenAddress]]);
            self.totalCompound[self.cTokenAddress[tokenAddress]] = 0;
        } else {
            cToken.redeemUnderlying(uint(_amount));
            self.totalCompound[self.cTokenAddress[tokenAddress]] = self.totalCompound[self.cTokenAddress[tokenAddress]].sub(_amount);
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].add(_amount);
        }
    }

    function tokenBalanceOfAndInterestOf(
        BaseVariable storage self,
        address tokenAddress,
        address accountAddr
    ) public view returns (int256 totalBalance, int256 totalInterest) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[accountAddr].tokenInfos[tokenAddress];
        uint rate;
        if(tokenInfo.getCurrentTotalAmount() == 0) {
            return (0, 0);
        } else {
            if(tokenInfo.getCurrentTotalAmount() > 0) {
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
    ) public view returns(int) {
        (int totalBalance, int interest) = tokenBalanceOfAndInterestOf(self, tokenAddress, accountAddr);
        return totalBalance + interest;
    }

    function totalBalance(
        BaseVariable storage self,
        address accountAddr,
        SymbolsLib.Symbols storage symbols,
        bool isPositive
    ) public view returns (int256 balance) {
        for(uint i = 0;i < symbols.getCoinLength();i++) {
            address tokenAddress = symbols.addressFromIndex(i);
            TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[accountAddr].tokenInfos[tokenAddress];
            uint rate;
            if(isPositive && tokenInfo.getCurrentTotalAmount() >= 0) {
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
            } else if(!isPositive && tokenInfo.getCurrentTotalAmount() < 0) {
                if(
                    tokenInfo.getStartBlockNumber() == block.number
                ) {
                    rate = self.borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()];
                }else if(self.borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowBorrowRate(self, tokenAddress);
                } else {
                    rate = getNowBorrowRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()]);
                }
            }
            balance = balance.add(tokenInfo.totalBalance().add(tokenInfo.viewInterest(rate)).mul(int(symbols.priceFromIndex(i))));
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
        int interest = tokenInfo.viewInterest(rate);
        require(tokenInfo.totalAmount(rate) >= int256(amount), "Insufficient balance.");

        // 仅供无价格测试使用
        // int totalBorrow = totalBalance(self, msg.sender, symbols, false) < 0
        // ? totalBalance(self, msg.sender, symbols, false).mul(-1) : totalBalance(self, msg.sender, symbols, false);
        // int totalDeposit = totalBalance(self, msg.sender, symbols, true);
        // int amountValue = int(amount.mul(symbols.priceFromAddress(tokenAddress)));
        // require(totalDeposit.sub(amountValue) > 0 && totalBorrow.mul(100).div(totalDeposit.sub(amountValue)) <= 60);
        tokenInfo.minusAmount(amount, rate, block.number);
        if(interest > 0) {
            int256 _money = interest <= int(amount) ? interest.div(10) : int(amount.div(10));
            amount = amount.sub(uint(_money));
            self.deFinerFund[tokenAddress] = self.deFinerFund[tokenAddress].add(_money);
        }
        transfer1(self, activeAccount, tokenAddress, amount);

    }

    function transfer1(BaseVariable storage self, address activeAccount, address tokenAddress, uint amount) public {
        TokenInfoLib.TokenInfo storage activeTokenInfo = self.accounts[activeAccount].tokenInfos[tokenAddress];
        if(amount > 0 && activeTokenInfo.getCurrentTotalAmount() < 0) {
            uint bRate = getBlockIntervalBorrowRateRecord(self, tokenAddress,activeTokenInfo.getStartBlockNumber());
            int256 amountOwedWithInterest = activeTokenInfo.totalAmount(bRate);
            int256 amountBorrowed = amountOwedWithInterest.mul(-1);
            int256 amountToRepay = int256(amount);
            int _amount = amountToRepay > amountBorrowed ? amountBorrowed : amountToRepay;
            activeTokenInfo.addAmount(uint(_amount), bRate, block.number);
            self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].sub(_amount);
            self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(int(_amount));
            self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
            amount = uint(amountToRepay > amountBorrowed ? amountToRepay.sub(amountBorrowed) : 0);
        }

        if(amount > 0 && activeTokenInfo.getCurrentTotalAmount() >= 0) {
            uint dRate = getBlockIntervalDepositRateRecord(self, tokenAddress, activeTokenInfo.getStartBlockNumber());
            activeTokenInfo.addAmount(amount, dRate, block.number);
        }
    }

    function depositToken(BaseVariable storage self, address tokenAddress, uint256 amount) public {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        if (!self.accounts[msg.sender].active) {
            self.accounts[msg.sender].active = true;
            self.activeAccounts.push(msg.sender);
        }

        int256 currentBalance = tokenInfo.getCurrentTotalAmount();

        require(
            currentBalance >= 0,
            "Balance of the token must be zero or positive. To pay negative balance, please use repay button."
        );
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        tokenInfo.addAmount(amount, rate, block.number);
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].add(int(amount));
        int totalAmount = getTotalDepositsNow(self, tokenAddress);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            >
            20 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            toCompound(self, tokenAddress, totalAmount, tokenAddress == 0x000000000000000000000000000000000000000E);
        }
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
    }

    function borrow(BaseVariable storage self, address tokenAddress, uint256 amount) public {
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        require(
            tokenInfo.getCurrentTotalAmount() <= 0,
            "Deposit is greater than or equal to zero, please use withdraw instead."
        );
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        tokenInfo.minusAmount(amount, rate, block.number);
        int _amount = int(amount);
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(_amount);
        self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].add(_amount);
        int compoundAmount = self.totalCompound[self.cTokenAddress[tokenAddress]];
        int totalAmount = compoundAmount.add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            fromCompound(self, tokenAddress, compoundAmount);
        }
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
    }

    function repay(BaseVariable storage self, address tokenAddress, address activeAccount, uint256 amount) public returns(int) {
        require(self.accounts[activeAccount].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[activeAccount].tokenInfos[tokenAddress];
        getTotalCompoundNow(self, tokenAddress);
        getTotalLoansNow(self, tokenAddress);
        updateDepositRate(self, tokenAddress);
        updateBorrowRate(self, tokenAddress);
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress,tokenInfo.getStartBlockNumber());

        int256 amountOwedWithInterest = tokenInfo.totalAmount(rate);
        require(
            amountOwedWithInterest < 0,
            "Balance of the token must be negative. To deposit balance, please use deposit button."
        );

//        int256 amountBorrowed = amountOwedWithInterest.mul(-1); // get the actual amount that was borrowed (abs)
//        int256 amountToRepay = int256(amount);
        //        int _amountToRepay = tokenInfo.totalBalance().mul(-1) < amountToRepay ? tokenInfo.totalBalance().mul(-1) : amountToRepay;
        int _amount = int256(amount) > amountOwedWithInterest.mul(-1) ? amountOwedWithInterest.mul(-1) : int256(amount);
        tokenInfo.addAmount(uint(_amount), rate, block.number);
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].add(_amount);
        self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].sub(_amount);
        int totalAmount = getTotalDepositsNow(self, tokenAddress);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            >
            20 * 10**16
            &&
            self.cTokenAddress[tokenAddress] != address(0)
        ) {
            toCompound(self, tokenAddress, totalAmount, tokenAddress == 0x000000000000000000000000000000000000000E);
        }
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
        return int256(amount) > amountOwedWithInterest.mul(-1) ? int256(amount).sub(amountOwedWithInterest.mul(-1)) : 0;
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
        require(tokenInfo.totalAmount(rate) >= int256(amount), "Insufficient balance.");
        int interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(amount, rate, block.number);
        if(interest > 0) {
            int256 _money = interest <= int(amount) ? interest.div(10) : int(amount.div(10));
            amount = amount.sub(uint(_money));
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(_money);
            self.deFinerFund[tokenAddress] = self.deFinerFund[tokenAddress].add(_money);
        }
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(int(amount));
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        int compoundAmount = self.totalCompound[self.cTokenAddress[tokenAddress]];
        int totalAmount = compoundAmount.add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
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
        uint amount = uint(tokenInfo.totalAmount(rate));
        int interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(amount, rate, block.number);
        if(interest > 0) {
            int256 _money = interest.div(10);
            amount = amount.sub(uint(_money));
            self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(_money);
            self.deFinerFund[tokenAddress] = self.deFinerFund[tokenAddress].add(_money);
        }
        self.borrowRateLastModifiedBlockNumber[tokenAddress] = block.number;
        self.totalReserve[tokenAddress] = self.totalReserve[tokenAddress].sub(int(amount));
        self.depositRateLastModifiedBlockNumber[tokenAddress] = block.number;
        int compoundAmount = self.totalCompound[self.cTokenAddress[tokenAddress]];
        int totalAmount = compoundAmount.add(self.totalLoans[tokenAddress]).add(self.totalReserve[tokenAddress]);
        if(
            self.totalReserve[tokenAddress].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
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
        uint tokenAmount =coinValue.div(u[1]);
        uint targetTokenAmount = coinValue.mul(95).div(100).div(u[0]);
        msgTargetTokenInfo.minusAmount(targetTokenAmount.mul(95).div(100), msgTargetTokenRate, block.number);
        targetTokenInfo.addAmount(targetTokenAmount, targetTokenRate, block.number);
        tokenInfo.minusAmount(tokenAmount, tokenRate, block.number);
        msgTokenInfo.addAmount(tokenAmount, msgTokenRate, block.number);
        return u[2];
    }

    function recycleCommunityFund(BaseVariable storage self, address tokenAddress) public {
        require(msg.sender == self.deFinerCommunityFund);
        self.deFinerCommunityFund.transfer(uint256(self.deFinerFund[tokenAddress]));
        self.deFinerFund[tokenAddress] == 0;
    }

    function setDeFinerCommunityFund(BaseVariable storage self, address payable _DeFinerCommunityFund) public {
        require(msg.sender == self.deFinerCommunityFund);
        self.deFinerCommunityFund = _DeFinerCommunityFund;
    }

    function getDeFinerCommunityFund(BaseVariable storage self, address tokenAddress) public view returns(int256){
        return self.deFinerFund[tokenAddress];
    }

//    function getAccountTotalUsdValue(
//        BaseVariable storage self,
//        address accountAddr,
//        SymbolsLib.Symbols storage symbols
//    ) public view returns (int256 usdValue) {
//        int256 totalUsdValue = 0;
//        for(uint i = 0; i < symbols.getCoinLength(); i++) {
//            address tokenAddress = symbols.addressFromIndex(i);
//            (int balance, int interest) = tokenBalanceOfAndInterestOf(self, tokenAddress, accountAddr);
//            if(balance != 0 && interest != 0) {
//                totalUsdValue = totalUsdValue.add(getTotalUsdValue(
//                        tokenAddress,
//                        balance.add(interest),
//                        symbols.priceFromIndex(i)
//                    ));
//            }
//        }
//        return totalUsdValue;
//    }

    function getActiveAccounts(BaseVariable storage self) public view returns (address[] memory) {
        return self.activeAccounts;
    }

    function borrowInterest(BaseVariable storage self, address tokenAddress) public view returns(int256) {
        int balance = self.totalLoans[tokenAddress];
        uint _balance = balance >= 0 ? uint256(balance) : uint256(-balance);
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress, self.borrowRateLastModifiedBlockNumber[tokenAddress]);
        if(rate == 0 || _balance == 0) {
            return 0;
        } else if(SafeDecimalMath.getUNIT() > rate) {
            return balance;
        } else {
            return int256(_balance.mul(rate).div(SafeDecimalMath.getUNIT()));
        }
    }
}
