pragma solidity >= 0.5.0 < 0.6.0;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "./lib/TokenInfoLib.sol";
import "./config/Config.sol";

interface CToken {
    function supplyRatePerBlock() external view returns (uint);
    function borrowRatePerBlock() external view returns (uint);
    function mint(uint mintAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function redeem(uint redeemAmount) external returns (uint);
    function exchangeRateStored() external view returns (uint);
    function balanceOf(address owner) external view returns (uint256);
}

interface CETH{
    function mint() external payable;
}

interface ERC20{
    function approve(address _spender, uint256 _value) external returns (bool success);
}

library Base {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using TokenInfoLib for TokenInfoLib.TokenInfo;

    struct BaseVariable {
        mapping(address => int256) totalDeposits;
        mapping(address => int256) totalLoans;
        mapping(address => int256) totalCollateral;
        mapping(address => address) cTokenAddress;
        mapping(address => int256) capitalInCompound;
        mapping(address => mapping(uint => uint)) depositRateRecord;
        mapping(address => mapping(uint => uint)) borrowRateRecord;
        mapping(address => uint) depositRateLastModifiedBlockNumber;
        mapping(address => uint) borrowRateLastModifiedBlockNumber;
        mapping(address => Account) accounts;
        address[] activeAccounts;
        address payable deFinerCommunityFund;
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
        ERC20 eRC20 = ERC20(tokenAddress);
        eRC20.approve(self.cTokenAddress[tokenAddress], 115792089237316195423570985008687907853269984665640564039457584007913129639935);
    }

    //Test method
    function getPrincipalAndInterestInCompound(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        CToken cToken = CToken(self.cTokenAddress[tokenAddress]);
        return cToken.balanceOf(address(this));
    }

    //Test method
    function getCToken(BaseVariable storage self, address tokenAddress) public view returns(address) {
        return self.cTokenAddress[tokenAddress];
    }

    //Get compound deposit rate. The scale is 10 ** 18
    function getCompoundSupplyRatePerBlock(address cTokenAddress) public view returns(uint) {
        CToken cToken = CToken(cTokenAddress);
        return cToken.supplyRatePerBlock();
    }

    //Get compound borrowing interest rate. The scale is 10 ** 18
    function getCompoundBorrowRatePerBlock(address cTokenAddress) public view returns(uint) {
        CToken cToken = CToken(cTokenAddress);
        return cToken.borrowRatePerBlock();
    }

    //Get the borrowing interest rate Borrowing interest rate.
    //(compound deposit rate + compound borrowing rate) / 2. The scaling is 10 ** 18
    function getBorrowRatePerBlock(BaseVariable storage self, address tokenAddress) public view returns(uint borrowRatePerBlock) {
        if(self.cTokenAddress[tokenAddress] == address(0)){
            return 0;
        } else {
            return getCompoundSupplyRatePerBlock(self.cTokenAddress[tokenAddress])
            .add(getCompoundBorrowRatePerBlock(self.cTokenAddress[tokenAddress])).div(2);
        }
    }

    //Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
    //Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
    function getDepositRatePerBlock(BaseVariable storage self, address tokenAddress) public view returns(uint depositAPR) {
        uint d1 = getBorrowRatePerBlock(self, tokenAddress).mul(getCapitalUtilizationRate(self, tokenAddress));
        uint d2 = getCompoundSupplyRatePerBlock(self.cTokenAddress[tokenAddress]).mul(getCapitalCompoundRate(self, tokenAddress));
        return d1.add(d2).mul(90).div(100).div(10**18); // 要改
    }

    //Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
    //The scaling is 10 ** 18  U
    function getCapitalUtilizationRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        if(self.totalDeposits[tokenAddress] == 0) {
            return 0;
        } else {
            return uint(self.totalLoans[tokenAddress].mul(10**18).div(self.totalDeposits[tokenAddress]));
        }
    }

    //存入comound的资金率 C  The scaling is 10 ** 18
    function getCapitalCompoundRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        if(self.capitalInCompound[tokenAddress] == 0 || self.totalDeposits[tokenAddress] == 0) {
            return 0;
        } else {
            return uint(self.capitalInCompound[tokenAddress].mul(10**18).div(self.totalDeposits[tokenAddress]));
        }
    }

    //准备金率 R  The scaling is 10 ** 18
    function getCapitalReserveRate(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        if(self.totalDeposits[tokenAddress] == 0) {
            return 0;
        } else {
            return uint(
                self.totalDeposits[tokenAddress]
                .sub(self.capitalInCompound[tokenAddress])
                .sub(self.totalLoans[tokenAddress])
                .mul(10**18)
                .div(self.totalDeposits[tokenAddress])
            );
        }
    }

    //存入compound的资金率列表
    function getCapitalCompoundBalance(BaseVariable storage self, address tokenAddress) public view returns(int) {
            if(self.capitalInCompound[tokenAddress] == 0 || self.totalDeposits[tokenAddress] == 0) {
                return 0;
            } else {
                return self.capitalInCompound[tokenAddress].mul(10**18).div(self.totalDeposits[tokenAddress]);
            }
    }

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
            self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]]
            ||
            depositRateRecordStart == self.depositRateLastModifiedBlockNumber[tokenAddress]
        ) {
            return self.depositRateRecord[tokenAddress][depositRateRecordStart];
        } else {
            return self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]]
            .mul(10**18)
            .div(self.depositRateRecord[tokenAddress][depositRateRecordStart]);
        }
    }

    //Test method
    function getNowRate(BaseVariable storage self, address tokenAddress) public view returns(uint, uint) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        return (
            getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber()),
            getBlockIntervalBorrowRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber())
        );
    }

    //Test method
    function getDepositRateRecord(BaseVariable storage self, address tokenAddress, uint blockNumber) public view returns(uint) {
        return self.depositRateRecord[tokenAddress][blockNumber];
    }

    //Test method
    function getBorrowRateRecord(
        BaseVariable storage self,
        address tokenAddress,
        uint blockNumber
    ) public view returns(uint) {
        return self.borrowRateRecord[tokenAddress][blockNumber];
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
            self.borrowRateRecord[tokenAddress][self.borrowRateLastModifiedBlockNumber[tokenAddress]]
            ||
            borrowRateRecordStart == self.borrowRateLastModifiedBlockNumber[tokenAddress]
        ) {
            return self.borrowRateRecord[tokenAddress][borrowRateRecordStart];
        } else {
            return self.borrowRateRecord[tokenAddress][self.borrowRateLastModifiedBlockNumber[tokenAddress]]
            .mul(10**18)
            .div(self.borrowRateRecord[tokenAddress][borrowRateRecordStart]);
        }
    }

    function getTotalUsdValue(int256 amount, uint price) public pure returns(int) {
        return amount.mul(int(price)).div(10**18);
    }

    function getToCompoundAmount(
        BaseVariable storage self,
        address tokenAddress,
        uint Capital_Reserve_Ratio_Ceiling
    ) public view returns(uint) {
        return uint(
            self.totalDeposits[tokenAddress].mul(85).div(100) //85 要改
            .sub(self.totalLoans[tokenAddress]).sub(self.capitalInCompound[tokenAddress])
        );
    }

    function getFromCompoundAmount(BaseVariable storage self, address tokenAddress) public view returns(uint) {
        return uint(
            self.capitalInCompound[tokenAddress]
            .sub(self.totalDeposits[tokenAddress].mul(85).div(100).sub(self.totalLoans[tokenAddress]))
        );
    }

    //Update Deposit Rate. depositRate = 1 + blockChangeValue * rate
    function updateDepositRate(BaseVariable storage self, address tokenAddress, uint blockNumber, uint accuracy) public {
        if(getDepositRatePerBlock(self, tokenAddress) == 0) {
            self.depositRateRecord[tokenAddress][blockNumber] = 0;
            self.depositRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
        } else if(
            self.depositRateLastModifiedBlockNumber[tokenAddress] == 0
            ||
            self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]] == 0
        ) {
            self.depositRateRecord[tokenAddress][blockNumber] = accuracy.add(getDepositRatePerBlock(self, tokenAddress));
            self.depositRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
        } else if(blockNumber != self.depositRateLastModifiedBlockNumber[tokenAddress]) {
            self.depositRateRecord[tokenAddress][blockNumber] =
                self.depositRateRecord[tokenAddress][self.depositRateLastModifiedBlockNumber[tokenAddress]]
                .mul(accuracy
                    .add(blockNumber.sub(self.depositRateLastModifiedBlockNumber[tokenAddress])
                        .mul(getDepositRatePerBlock(self, tokenAddress))
                    )
                )
                .div(accuracy);
            self.depositRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
            }
    }

    //Update borrow rates. borrowRate = 1 + blockChangeValue * rate
    //TODO:getBorrowRatePerBlock如果是0需要考虑
    function updateBorrowRate(BaseVariable storage self, address tokenAddress, uint blockNumber, uint accuracy) public {
        if(self.borrowRateLastModifiedBlockNumber[tokenAddress] == 0) {
            self.borrowRateRecord[tokenAddress][blockNumber] = accuracy.add(getBorrowRatePerBlock(self, tokenAddress));
            self.borrowRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
        } else if(blockNumber != self.borrowRateLastModifiedBlockNumber[tokenAddress]) {
            self.borrowRateRecord[tokenAddress][blockNumber] =
            self.borrowRateRecord[tokenAddress][self.borrowRateLastModifiedBlockNumber[tokenAddress]]
            .mul(accuracy
                .add(blockNumber.sub(self.borrowRateLastModifiedBlockNumber[tokenAddress])
                    .mul(getBorrowRatePerBlock(self, tokenAddress))
                )
            )
            .div(accuracy);
            self.borrowRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
        }
    }

    /*
	 * Get the state of the given token
	 */
    function getTokenState(BaseVariable storage self, address tokenAddress) public view returns (
        int256 deposits,
        int256 loans,
        int256 collateral,
        int256 capitalInCompound
    )
    {
        return (
        self.totalDeposits[tokenAddress],
        self.totalLoans[tokenAddress],
        self.totalCollateral[tokenAddress],
        self.capitalInCompound[tokenAddress]
        );
    }

    function toCompound(BaseVariable storage self, address tokenAddress, uint maxReserveRatio, bool isEth) public {
        require(getCapitalReserveRate(self, tokenAddress) > 20 * 10**16);//20要改
        uint amount = getToCompoundAmount(self, tokenAddress, maxReserveRatio);
        if (isEth) {
            CETH cETH = CETH(self.cTokenAddress[tokenAddress]);
            cETH.mint.value(amount).gas(250000)();
        } else {
            CToken cToken = CToken(self.cTokenAddress[tokenAddress]);
            cToken.mint(amount);
        }
        self.capitalInCompound[tokenAddress] = self.capitalInCompound[tokenAddress].add(int(amount));
    }

    function fromCompound(BaseVariable storage self, address tokenAddress, uint minReserveRatio, uint accuracy) public {
        require(getCapitalReserveRate(self, tokenAddress) < 10 * 10**16);
        uint amount = getFromCompoundAmount(self, tokenAddress);
        CToken cToken = CToken(self.cTokenAddress[tokenAddress]);
        uint exchangeRate = cToken.exchangeRateStored();
        if(amount.mul(10**18).div(exchangeRate) >= cToken.balanceOf(address(this))) {
            cToken.redeem(cToken.balanceOf(address(this)));
            self.capitalInCompound[tokenAddress] = 0;
        } else {
            cToken.redeemUnderlying(amount);
            self.capitalInCompound[tokenAddress] = self.capitalInCompound[tokenAddress].sub(int(amount));
        }
    }

    function tokenBalanceOf(BaseVariable storage self, address tokenAddress) public view returns (int256 amount) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        if(tokenInfo.getCurrentTotalAmount() >= 0) {
            uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
            return tokenInfo.totalAmount(block.number, rate);
        } else {
            uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
            return tokenInfo.totalAmount(block.number, rate);
        }
    }

    function depositToken(BaseVariable storage self, address tokenAddress, uint256 amount, uint accuracy) public {
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

        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());

        // deposited amount is new balance after addAmount minus previous balance
        int256 depositedAmount = tokenInfo.addAmount(amount, rate, block.number) - currentBalance;
        self.totalDeposits[tokenAddress] = self.totalDeposits[tokenAddress].add(depositedAmount);
        self.totalCollateral[tokenAddress] = self.totalCollateral[tokenAddress].add(depositedAmount);
    }

    function borrow(BaseVariable storage self, address tokenAddress, uint256 amount, uint accuracy) public {
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        require(
            tokenInfo.getCurrentTotalAmount() <= 0,
            "Deposit is greater than or equal to zero, please use withdraw instead."
        );
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        tokenInfo.minusAmount(amount, rate, block.number);
        self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].add(int(amount));
        self.totalCollateral[tokenAddress] = self.totalCollateral[tokenAddress].sub(int(amount));
        if(
            self.totalDeposits[tokenAddress].sub(self.capitalInCompound[tokenAddress]).sub(self.totalLoans[tokenAddress]) <= 0
            ||
            getCapitalReserveRate(self, tokenAddress) < 10 * 10**16
        ) {
            fromCompound(self, tokenAddress, 10, accuracy);
        }
        updateDepositRate(self, tokenAddress, block.number, accuracy);
        updateBorrowRate(self, tokenAddress, block.number, accuracy);
    }

    function repay(BaseVariable storage self, address tokenAddress, uint256 amount, uint accuracy) public {
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        updateDepositRate(self, tokenAddress, block.number, accuracy);
        updateBorrowRate(self, tokenAddress, block.number, accuracy);
        uint rate = getBlockIntervalBorrowRateRecord(self, tokenAddress,tokenInfo.getStartBlockNumber());

        int256 amountOwedWithInterest = tokenInfo.totalAmount(block.number, rate);
        require(
            amountOwedWithInterest < 0,
            "Balance of the token must be negative. To deposit balance, please use deposit button."
        );

        int256 amountBorrowed = tokenInfo.totalAmount(block.number, rate).mul(-1); // get the actual amount that was borrowed (abs)
        int256 amountToRepay = int256(amount);
        tokenInfo.addAmount(amount, rate, block.number);

        // check if paying interest
        if (amountToRepay > amountBorrowed) {
            // add interest (if any) to total deposit
            self.totalDeposits[tokenAddress] = self.totalDeposits[tokenAddress].add(amountToRepay.sub(amountBorrowed));
            // loan are reduced by amount payed
            self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].sub(amountBorrowed);
        }
        else {
            // loan are reduced by amount payed
            self.totalLoans[tokenAddress] = self.totalLoans[tokenAddress].sub(amountToRepay);
        }

        // collateral increased by amount payed
        self.totalCollateral[tokenAddress] = self.totalCollateral[tokenAddress].add(amountToRepay);
    }

    /**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
    function withdrawToken(BaseVariable storage self, address tokenAddress, uint256 amount, uint accuracy) public {
        require(self.accounts[msg.sender].active, "Account not active, please deposit first.");
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[msg.sender].tokenInfos[tokenAddress];
        updateDepositRate(self, tokenAddress, block.number, accuracy);
        updateBorrowRate(self, tokenAddress, block.number, accuracy);
        uint rate = getBlockIntervalDepositRateRecord(self, tokenAddress, tokenInfo.getStartBlockNumber());
        require(tokenInfo.totalAmount(block.number, rate) >= int256(amount), "Insufficient balance.");
        // 		require(int256(getAccountTotalUsdValue(msg.sender, false) * -1) * 100 <= (getAccountTotalUsdValue(msg.sender, true) - int256(amount.mul(symbols.priceFromAddress(tokenAddress))) / BASE) * BORROW_LTV);
        if(tokenInfo.viewInterest(block.number, rate) > 0) {
            int256 _money =
            tokenInfo.viewInterest(block.number, rate)
            .mul(int256(amount).div(tokenInfo.getCurrentTotalAmount().sub(tokenInfo.viewInterest(block.number, rate))))
            .div(10);
            tokenInfo.updateInterest(_money);
            payCommunityFund(self, _money);
        }
        tokenInfo.minusAmount(amount, rate, block.number);
        self.totalDeposits[tokenAddress] = self.totalDeposits[tokenAddress].sub(int(amount));
        self.totalCollateral[tokenAddress] = self.totalCollateral[tokenAddress].sub(int(amount));
        if(
            self.totalDeposits[tokenAddress].sub(self.capitalInCompound[tokenAddress]).sub(self.totalLoans[tokenAddress]) <= 0
            ||
            getCapitalReserveRate(self, tokenAddress) <= 10 * 10**16
        ) {
            fromCompound(self, tokenAddress, 10, accuracy);
        }
    }

    function payCommunityFund(BaseVariable storage self, int256 money) private {
        self.deFinerCommunityFund.transfer(uint256(money));
    }

    function setDeFinerCommunityFund(BaseVariable storage self, address payable _DeFinerCommunityFund) public {
        self.deFinerCommunityFund = _DeFinerCommunityFund;
    }

    function getAccountTotalUsdValue(
        BaseVariable storage self,
        address accountAddr,
        bool isPositive,
        address addressFromIndex,
        uint priceFromIndex
    ) public view returns (int256 usdValue){
        int256 totalUsdValue = 0;
        uint DRate = getBlockIntervalDepositRateRecord(
            self,
            addressFromIndex,
            self.accounts[accountAddr].tokenInfos[addressFromIndex].getStartBlockNumber()
        );

        uint BRate = getBlockIntervalBorrowRateRecord(
            self,
            addressFromIndex,
            self.accounts[accountAddr].tokenInfos[addressFromIndex].getStartBlockNumber()
        );

        if (isPositive && self.accounts[accountAddr].tokenInfos[addressFromIndex].totalAmount(block.number, DRate) >= 0) {
            totalUsdValue = totalUsdValue.add(getTotalUsdValue(
                    self.accounts[accountAddr].tokenInfos[addressFromIndex].totalAmount(block.number, DRate),
                    priceFromIndex
                ));
        }
        if (!isPositive && self.accounts[accountAddr].tokenInfos[addressFromIndex].totalAmount(block.number, BRate) < 0) {
            totalUsdValue = totalUsdValue.add(getTotalUsdValue(
                    self.accounts[accountAddr].tokenInfos[addressFromIndex].totalAmount(block.number, DRate),
                    priceFromIndex
                ));
        }
        return totalUsdValue;
    }

    function getActiveAccounts(BaseVariable storage self) public view returns (address[] memory) {
        return self.activeAccounts;
    }

//    function getCapitalCompoundRatio(BaseVariable storage self, address token) public view returns (uint256 C) {
//        uint256 balance = self.capitalInCompound[token];
//        if(balance == 0) return 0;
//        // C = balance.mul(100).div(self.totalDeposits[token]);
//        return 0;
//    }

//    function getDeFinerReserveRatio(BaseVariable storage self, address token) public view returns (uint256 R) {
//        // ReserveRatio (R) = 1 - UtilizationRate (U) - CapitalCompoundRatio (C)
//        R = uint256(100)
//        .sub(getCapitalUtilizationRate(self, token))
//        .sub(getCapitalCompoundRatio(self, token));
//    }


//    function getCompoundReserverRatio(address token) public view returns (uint256 CR) {
//        uint256 deFinerReservRarioAvg = MIN_RESERVE_RATIO.add(MAX_RESERVE_RATIO).div(2);
//        CR = uint256(100)
//        .sub(getCapitalUtilizationRate(token))
//        .sub(deFinerReservRarioAvg);
//        // CR = SafeMath.max(CR, 0);
//        return CR = 0;
//    }
//
//    function depositToCompound(address token) external {
//        require(getDeFinerReserveRatio(token) >= MAX_RESERVE_RATIO, "Reserve ratio less than MAX");
//
//        // Calculate amount to deposit
//        uint256 amountToDeposit = getCompoundReserverRatio(token);
//        //TODO Deposit to compound
//
//        // capitalInCompound[token] = capitalInCompound.add(amountToDeposit);
//    }
//
//    function withdrawFromCompound(address token) external {
//        require(getDeFinerReserveRatio(token) < MIN_RESERVE_RATIO, "Reserve ratio less than MAX");
//
//        // Calculate amount to withdraw
//        uint256 amountToWithdraw = getCompoundReserverRatio(token);
//        // TODO Withdraw from compound
//
//        // capitalInCompound[token] = capitalInCompound.sub(amountToWithdraw);
//    }

}
