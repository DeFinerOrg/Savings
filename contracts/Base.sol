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
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) depositRateRecord;
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) borrowRateRecord;
        mapping(address => uint) depositRateLastModifiedBlockNumber;
        mapping(address => uint) borrowRateLastModifiedBlockNumber;
        // Store per account info
        mapping(address => Account) accounts;
        address payable deFinerCommunityFund;
        mapping(address => int) deFinerFund;
    }

    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    int256 public constant INT_UNIT = int256(10 ** uint256(18));

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

    function getTotalDepositsNow(BaseVariable storage self, address _token) public view returns(int) {
        address cToken = self.cTokenAddress[_token];
        int256 totalLoans = self.totalLoans[_token];
        int256 totalReserve = self.totalReserve[_token];
        return self.totalCompound[cToken].add(totalLoans).add(totalReserve);
        // totalAmount = U + C + R
        // totalReserve = R
        // totalCompound = C
        // totalLoans = U
        // Total amount of tokens that DeFiner has
        // TODO Are all of these variables are in same token decimals?
    }

    /**
     * Get total amount of token in Compound protocal
     * @param _token token address
     */
    function getTotalCompoundNow(BaseVariable storage self, address _token) public {
        address cToken = self.cTokenAddress[_token];
        if(cToken != address(0)) {
            self.totalCompound[cToken] = int(ICToken(cToken).balanceOfUnderlying(address(this)));
        }
    }

    /**
     * Get total amount of token lended
     * @param _token token address
     */
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
        int256 totalDepositsNow = getTotalDepositsNow(self, _token);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return uint(self.totalLoans[_token].mul(SafeDecimalMath.getINT_UNIT()).div(totalDepositsNow));
        }
    }

    //存入comound的资金率 C  The scaling is 10 ** 18
    function getCapitalCompoundRate(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = self.cTokenAddress[_token];
        if(self.totalCompound[cToken] == 0 ) {
            return 0;
        } else {
            return uint(self.totalCompound[cToken].mul(SafeDecimalMath.getINT_UNIT()).div(getTotalDepositsNow(self, _token)));
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
        if (depositRate == 0) {
            return 0;
        } else if(
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
        // borrow index rate
        // As per the index concept on Compound
        uint256 borrowRate = self.borrowRateRecord[_token][_borrowRateRecordStart];
        if (borrowRate == 0) {
            return 0;
        } else if(
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

    /**
     * Update Deposit Rate. depositRate = 1 + blockChangeValue * rate
     * @param _token token address
     */
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
        int256 deposits,
        int256 loans,
        int256 collateral,
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

    function toCompound(BaseVariable storage self, address _token, int _totalAmount, bool _isEth) public {
        int _amount = _totalAmount.mul(15).div(100);
        address cToken = self.cTokenAddress[_token];
        int256 totalReserve = self.totalReserve[_token];
        if (_isEth) {
            // TODO Why we need to put gas here?
            // TODO Without gas tx was failing? Even when gas is 100000 it was failing.
            ICETH(cToken).mint.value(uint(totalReserve.sub(_amount))).gas(250000)();
        } else {
            ICToken(cToken).mint(uint(totalReserve.sub(_amount)));
        }
        self.totalCompound[cToken] = self.totalCompound[cToken].add(totalReserve.sub(_amount));
        self.totalReserve[_token] = _amount;
    }

    function fromCompound(BaseVariable storage self, address _token, int _compoundAmount) public {
        ICToken cToken = ICToken(self.cTokenAddress[_token]);
        int256 totalReserve = self.totalReserve[_token];
        int _amount = _compoundAmount.add(self.totalLoans[_token].add(totalReserve))
        .mul(15).div(100).sub(totalReserve);
        int256 totalCompound = self.totalCompound[address(cToken)];
        if(_amount >= _compoundAmount) {
            cToken.redeem(cToken.balanceOf(address(this)));
            self.totalReserve[_token] = totalReserve.add(totalCompound);
            self.totalCompound[address(cToken)] = 0;
        } else {
            cToken.redeemUnderlying(uint(_amount));
            self.totalCompound[address(cToken)] = totalCompound.sub(_amount);
            self.totalReserve[_token] = totalReserve.add(_amount);
        }
    }

    function tokenBalanceOfAndInterestOf(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns (int256 totalBalance, int256 totalInterest) {
        // TODO Why need storage
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[_accountAddr].tokenInfos[_token];
        uint rate;
        if(tokenInfo.getCurrentTotalAmount() == 0) {
            return (0, 0);
        } else {
            if(tokenInfo.getStartBlockNumber() == block.number) {
                rate = 0;
            } else if (tokenInfo.getCurrentTotalAmount() > 0) {
                if(self.depositRateRecord[_token][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowDepositRate(self, _token);
                } else {
                    rate = getNowDepositRate(self, _token)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.depositRateRecord[_token][tokenInfo.getStartBlockNumber()]);
                }
            } else {
                if(self.borrowRateRecord[_token][tokenInfo.getStartBlockNumber()] == 0) {
                    rate = getNowBorrowRate(self, _token);
                } else {
                    rate = getNowBorrowRate(self, _token)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.borrowRateRecord[_token][tokenInfo.getStartBlockNumber()]);
                }
            }
            return (tokenInfo.totalBalance(), tokenInfo.viewInterest(rate));
        }
    }

    function tokenBalanceAdd(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns(int) {
        (int totalBalance, int interest) = tokenBalanceOfAndInterestOf(self, _token, _accountAddr);
        return totalBalance + interest;
    }

    // Total = principal + interest
    // TODO Sichao to explain the logic here
    function totalBalance(
        BaseVariable storage self,
        address _accountAddr,
        SymbolsLib.Symbols storage _symbols,
        bool _isPositive // true = deposits balance AND false = borrow balance
    ) public view returns (int256 balance) {
        //TODO Why need to pass symbols ?
        for(uint i = 0;i < _symbols.getCoinLength();i++) {
            address tokenAddress = _symbols.addressFromIndex(i);
            TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[_accountAddr].tokenInfos[tokenAddress];
            uint256 startBlockNum = tokenInfo.getStartBlockNumber();
            uint rate;
            if(startBlockNum == block.number) {
                rate = 0;
            } else if(_isPositive && tokenInfo.getCurrentTotalAmount() >= 0) {
                if(self.depositRateRecord[tokenAddress][startBlockNum] == 0) {
                    rate = getNowDepositRate(self, tokenAddress);
                } else {
                    rate = getNowDepositRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.depositRateRecord[tokenAddress][startBlockNum]);
                }
            } else if(!_isPositive && tokenInfo.getCurrentTotalAmount() < 0) {
                if(self.borrowRateRecord[tokenAddress][startBlockNum] == 0) {
                    rate = getNowBorrowRate(self, tokenAddress);
                } else {
                    rate = getNowBorrowRate(self, tokenAddress)
                    .mul(SafeDecimalMath.getUNIT())
                    .div(self.borrowRateRecord[tokenAddress][startBlockNum]);
                }
            }
            int divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = int(10**uint256(IERC20Extended(tokenAddress).decimals()));
            }
            balance = balance.add(tokenInfo.totalBalance().add(tokenInfo.viewInterest(rate)).mul(int(_symbols.priceFromIndex(i))).div(divisor));
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
        int interest = tokenInfo.viewInterest(rate);
        require(tokenInfo.totalAmount(rate) >= int256(_amount), "Insufficient balance.");

        // 仅供无价格测试使用
        // int totalBorrow = totalBalance(self, msg.sender, symbols, false) < 0
        // ? totalBalance(self, msg.sender, symbols, false).mul(-1) : totalBalance(self, msg.sender, symbols, false);
        // int totalDeposit = totalBalance(self, msg.sender, symbols, true);
        // int amountValue = int(amount.mul(symbols.priceFromAddress(tokenAddress)));
        // require(totalDeposit.sub(amountValue) > 0 && totalBorrow.mul(100).div(totalDeposit.sub(amountValue)) <= 60);
        tokenInfo.minusAmount(_amount, rate, block.number);
        if(interest > 0) {
            int256 _money = interest <= int(_amount) ? interest.div(10) : int(_amount.div(10));
            _amount = _amount.sub(uint(_money));
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }
        transfer1(self, _activeAccount, _token, _amount);

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

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     * @param _tokenIndex the index of the deposited token, which is spesified in TokenInfo struct.
     */
    function deposit(BaseVariable storage self, address _token, uint256 _amount, uint8 _tokenIndex) public {
        Account storage account = self.accounts[msg.sender];
        TokenInfoLib.TokenInfo storage tokenInfo = account.tokenInfos[_token];

        int256 currentBalance = tokenInfo.getCurrentTotalAmount();

        require(currentBalance >= 0, "Token balance must be zero or positive.");

        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalDepositRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        // Add principa + interest (on borrows/on deposits)
        tokenInfo.addAmount(_amount, rate, block.number);
        // Total reserve of the token deposited to
        // TODO Why we need to maintain reserve?
        self.totalReserve[_token] = self.totalReserve[_token].add(int(_amount));
        int totalAmount = getTotalDepositsNow(self, _token);
        if(
            self.totalReserve[_token].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
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
            tokenInfo.getCurrentTotalAmount() <= 0,
            "Deposit is greater than or equal to zero, please use withdraw instead."
        );
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalBorrowRateRecord(self, _token, tokenInfo.getStartBlockNumber());
        tokenInfo.minusAmount(amount, rate, block.number);
        int _amount = int(amount);
        // TODO Issue: @Wanggy would look into this
        // get tokens from Compound when Reserve does not have enough balance
        // Again maintain the reserve
        self.totalReserve[_token] = self.totalReserve[_token].sub(_amount);
        self.totalLoans[_token] = self.totalLoans[_token].add(_amount);
        int compoundAmount = self.totalCompound[self.cTokenAddress[_token]];
        int totalAmount = compoundAmount.add(self.totalLoans[_token]).add(self.totalReserve[_token]);
        if(
            self.totalReserve[_token].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[_token] != address(0)
        ) {
            fromCompound(self, _token, compoundAmount);
        }
        // TODO When borrow:
        // TODO Sichao + Wanggy need to have a look
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
    }

    function repay(BaseVariable storage self, address _token, address activeAccount, uint256 amount) public returns(int) {
        TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[activeAccount].tokenInfos[_token];
        getTotalCompoundNow(self, _token);
        getTotalLoansNow(self, _token);
        updateDepositRate(self, _token);
        updateBorrowRate(self, _token);
        uint rate = getBlockIntervalBorrowRateRecord(self, _token,tokenInfo.getStartBlockNumber());

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
        self.totalReserve[_token] = self.totalReserve[_token].add(_amount);
        self.totalLoans[_token] = self.totalLoans[_token].sub(_amount);
        int totalAmount = getTotalDepositsNow(self, _token);
        if(
            self.totalReserve[_token].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            >
            20 * 10**16
            &&
            self.cTokenAddress[_token] != address(0)
        ) {
            toCompound(self, _token, totalAmount, _token == ETH_ADDR);
        }
        self.depositRateLastModifiedBlockNumber[_token] = block.number;
        self.borrowRateLastModifiedBlockNumber[_token] = block.number;
        return int256(amount) > amountOwedWithInterest.mul(-1) ? int256(amount).sub(amountOwedWithInterest.mul(-1)) : 0;
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
        require(tokenInfo.totalAmount(rate) >= int256(_amount), "Insufficient balance.");
        int interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(_amount, rate, block.number);
        if(interest > 0) {
            int256 _money = interest <= int(_amount) ? interest.div(10) : int(_amount.div(10));
            _amount = _amount.sub(uint(_money));
            self.totalReserve[_token] = self.totalReserve[_token].sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }
        
        self.totalReserve[_token] = self.totalReserve[_token].sub(int(_amount));
        
        int compoundAmount = self.totalCompound[self.cTokenAddress[_token]];
        int totalAmount = compoundAmount.add(self.totalLoans[_token]).add(self.totalReserve[_token]);
        if(
            totalAmount <= 0
            ||
            self.totalReserve[_token].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[_token] != address(0)
        ) {
            fromCompound(self, _token, compoundAmount);
        }
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
        uint amount = uint(tokenInfo.totalAmount(rate));
        int interest = tokenInfo.viewInterest(rate);
        tokenInfo.minusAmount(amount, rate, block.number);
        if(interest > 0) {
            int256 _money = interest.div(10);
            amount = amount.sub(uint(_money));
            self.totalReserve[_token] = self.totalReserve[_token].sub(_money);
            self.deFinerFund[_token] = self.deFinerFund[_token].add(_money);
        }
        self.totalReserve[_token] = self.totalReserve[_token].sub(int(amount));
        int compoundAmount = self.totalCompound[self.cTokenAddress[_token]];
        int totalAmount = compoundAmount.add(self.totalLoans[_token]).add(self.totalReserve[_token]);
        if(
            totalAmount <= 0
            ||
            self.totalReserve[_token].mul(SafeDecimalMath.getINT_UNIT()).div(totalAmount)
            <
            10 * 10**16
            &&
            self.cTokenAddress[_token] != address(0)
        ) {
            fromCompound(self, _token, compoundAmount);
        }
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

    function getDeFinerCommunityFund(BaseVariable storage self, address _token) public view returns(int256){
        return self.deFinerFund[_token];
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


    function borrowInterest(BaseVariable storage self, address _token) public view returns(int256) {
        int balance = self.totalLoans[_token];
        // TODO COMMENT uint256(-balance) Change to positive
        uint _balance = balance >= 0 ? uint256(balance) : uint256(-balance);
        uint rate = getBlockIntervalBorrowRateRecord(self, _token, self.borrowRateLastModifiedBlockNumber[_token]);
        if(rate == 0 || _balance == 0) {
            return 0;
        } else if(SafeDecimalMath.getUNIT() > rate) {
            return balance;
        } else {
            return int256(_balance.mul(rate).div(SafeDecimalMath.getUNIT()));
        }
    }
}

interface IERC20Extended {
    function decimals() external view returns (uint8);
}