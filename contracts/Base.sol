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
        // The amount for the whole saving pool
        mapping(address => uint256) totalLoans;     // amount of lended tokens
        mapping(address => uint256) totalReserve;   // amount of tokens in reservation
        mapping(address => uint256) totalCompound;  // amount of tokens in compound
        mapping(address => address) cTokenAddress;  // cToken addresses
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) depositeRateIndex;
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) borrowRateIndex;
        // token address => block number
        mapping(address => uint) lastCheckpoint;            // last checkpoint on the index curve
        // cToken address => rate
        mapping(address => uint) lastCTokenExchangeRate;    // last compound cToken exchange rate
        // Store per account info
        mapping(address => Account) accounts;
        address payable deFinerCommunityFund;
        mapping(address => uint) deFinerFund;
        // Third Party Pools
        mapping(address => ThirdPartyPool) compoundPool;    // the compound pool
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

    enum ActionChoices { Deposit, Withdraw, Borrow, Repay }

    struct ThirdPartyPool {
        bool supported;             // if the token is supported by the third party platforms such as Compound
        uint capitalRatio;          // the ratio of the capital in third party to the total asset
        uint depositRatePerBlock;   // the deposit rate of the token in third party
        uint borrowRatePerBlock;    // the borrow rate of the token in third party
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

    function setInDepositBitmap(Account storage self, uint8 _index) public {
        self.depositBitmap = self.depositBitmap.setBit(_index);
    }

    /*
    function setInDepositBitmap(Account storage account, uint8 _index) public {
        account.depositBitmap = account.depositBitmap.setBit(_index);
    }
    */

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

    /**
     * Total amount of the token in Saving Pool
     * sichaoy: This is not right since the cToken rate has changed
     * @param _token token address
     */
    function getTotalDepositsNow(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = self.cTokenAddress[_token];
        uint256 totalLoans = self.totalLoans[_token];                        // totalLoans = U
        uint256 totalReserve = self.totalReserve[_token];                    // totalReserve = R
        return self.totalCompound[cToken].add(totalLoans).add(totalReserve); // return totalAmount = C + U + R
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
        uint rate = getBorrowAccruedRate(self, _token, self.lastCheckpoint[_token]);
        if(
            rate == 0 ||
            balance == 0 ||
            SafeDecimalMath.getUNIT() > rate
        ) {
            self.totalLoans[_token] = balance;
        } else {
            self.totalLoans[_token] = balance.mul(rate).div(SafeDecimalMath.getUNIT());
        }
    }

    /**
     * Update the total reservation. Before run this function, make sure that totalCompound has been updated
     * by calling updateTotalCompound. Otherwise, self.totalCompound may not equal to the exact amount of the
     * token in Compound.
     * @return the actuall amount deposit/withdraw from the saving pool
     */
    function updateTotalReserve(BaseVariable storage self, address _token, uint _amount, ActionChoices _action) public {
        address cToken = self.cTokenAddress[_token];
        if (_action == ActionChoices.Deposit || _action == ActionChoices.Repay) {
            // Total amount of token after deposit or repay
            uint totalAmount = getTotalDepositsNow(self, _token);
            if (_action == ActionChoices.Deposit)
                totalAmount = totalAmount.add(_amount);
            else
                self.totalLoans[_token] = self.totalLoans[_token].sub(_amount);

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
            require(
                self.totalReserve[_token].add(self.totalCompound[cToken]) >= _amount,
                "Not enough tokens in the pool."
                );

            // Total amount of token after withdraw or borrow
            uint totalAmount = getTotalDepositsNow(self, _token);
            if (_action == ActionChoices.Withdraw)
                totalAmount = totalAmount.sub(_amount);
            else
                self.totalLoans[_token] = self.totalLoans[_token].add(_amount);
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

    // sichaoy: these two functions should be moved to a seperate library
    /**
     * Get compound supply rate.
     * @param _cToken cToken address
     */
    function getCompoundSupplyRatePerBlock(BaseVariable storage self, address _cToken) public view returns(uint) {
        ICToken cToken = ICToken(_cToken);
        // return cToken.exchangeRateCurrent().mul(SafeDecimalMath.getUNIT()).div(self.lastCTokenExchangeRate[_cToken]);
        return cToken.supplyRatePerBlock();
    }

    /**
     * Get compound borrow rate.
     * @param _cToken cToken adress
     */
    function getCompoundBorrowRatePerBlock(address _cToken) public view returns(uint) {
        ICToken cToken = ICToken(_cToken);
        return cToken.borrowRatePerBlock();
    }

    /**
     * Get the borrowing interest rate Borrowing interest rate.
     * @param _token token address
     * @return the borrow rate for the current block
     */
    function getBorrowRatePerBlock(BaseVariable storage self, address _token) public view returns(uint) {
        if(!self.compoundPool[_token].supported)
            // If the token is NOT supported by the third party, borrowing rate = 3% + U * 15%.
            // sichaoy: move the constant
            return getCapitalUtilizationRatio(self, _token).mul(15*10**16).add(3*10**16).div(2102400).div(SafeDecimalMath.getUNIT());

        // if the token is suppored in third party, borrowing rate = Compound Supply Rate * 0.4 + Compound Borrow Rate * 0.6
        // sichaoy: confirm the formula
        return (self.compoundPool[_token].depositRatePerBlock).mul(4).
            add((self.compoundPool[_token].borrowRatePerBlock).mul(6)).div(10);
    }

    /**
     * Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
     * Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
     * sichaoy: make sure the ratePerBlock is zero if both U and C are zero.
     * @param _token token address
     * @return deposite rate of blocks before the current block
     */
    function getDepositRatePerBlock(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, _token);
        uint256 capitalUtilRatio = getCapitalUtilizationRatio(self, _token);
        if(!self.compoundPool[_token].supported)
            return borrowRatePerBlock.mul(capitalUtilRatio).div(SafeDecimalMath.getUNIT());

        return borrowRatePerBlock.mul(capitalUtilRatio).add(self.compoundPool[_token].depositRatePerBlock
            .mul(self.compoundPool[_token].capitalRatio)).div(SafeDecimalMath.getUNIT());
    }

    /**
     * Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
     * @param _token token address
     */
    function getCapitalUtilizationRatio(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 totalDepositsNow = getTotalDepositsNow(self, _token);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return self.totalLoans[_token].mul(SafeDecimalMath.getUINT_UNIT()).div(totalDepositsNow);
        }
    }

    /**
     * Ratio of the capital in Compound
     */
    function getCapitalCompoundRatio(BaseVariable storage self, address _token) public view returns(uint) {
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
     * @dev This function should always be called after current block is set as a new rateIndex point.
     */
     // sichaoy: this function could be more general to have an end checkpoit as a parameter.
     // sichaoy: require:what if a index point doesn't exist?
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

    /**
     * Get the cummulative borrow rate in a block interval ending in current block
     * @param _token token address
     * @param _borrowRateRecordStart the start block of the interval
     * @dev This function should always be called after current block is set as a new rateIndex point.
     */
    // sichaoy: actually the rate + 1, add a require statement here to make sure
    // the checkpoint for current block exists.
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
     * @dev The rate set at the checkpoint is the rate from the last checkpoint to this checkpoint
     */
    function newRateIndexCheckpoint(BaseVariable storage self, address _token) public {

        if (block.number == self.lastCheckpoint[_token])
            return;

        uint256 UNIT = SafeDecimalMath.getUNIT();
        address cToken = self.cTokenAddress[_token];
        uint cTokenExchangeRate = ICToken(cToken).exchangeRateCurrent();

        // If it is the first check point, initialize the rate index
        if (self.lastCheckpoint[_token] == 0) {
            self.borrowRateIndex[_token][block.number] = UNIT;
            self.depositeRateIndex[_token][block.number] = UNIT;
        } else {
            if(cToken == address(0)) {
                self.compoundPool[_token].supported = false;
            } else {
                self.compoundPool[_token].supported = true;
                // Get the curretn cToken exchange rate in Compound
                self.compoundPool[_token].capitalRatio = getCapitalCompoundRatio(self, _token);
                self.compoundPool[_token].borrowRatePerBlock = ICToken(cToken).borrowRatePerBlock();
                self.compoundPool[_token].depositRatePerBlock = cTokenExchangeRate.mul(UNIT).div(self.lastCTokenExchangeRate[cToken])
                    .sub(UNIT).div(block.number.sub(self.lastCheckpoint[_token]));
            }
            self.borrowRateIndex[_token][block.number] = borrowRateIndexNow(self, _token);
            self.depositeRateIndex[_token][block.number] = depositRateIndexNow(self, _token);
        }

        // Update the last checkpoint
        self.lastCheckpoint[_token] = block.number;
        self.lastCTokenExchangeRate[self.cTokenAddress[_token]] = cTokenExchangeRate;
    }

    /**
     * Calculate a token deposite rate of current block
     * @param _token token address
     */
    function depositRateIndexNow(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 lastCheckpoint = self.lastCheckpoint[_token];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lastCheckpoint == 0)
            return UNIT;
        uint256 lastDepositeRateIndex = self.depositeRateIndex[_token][lastCheckpoint];
        uint256 depositRatePerBlock = getDepositRatePerBlock(self, _token);
        return lastDepositeRateIndex.mul(block.number.sub(lastCheckpoint).mul(depositRatePerBlock).add(UNIT)).div(UNIT);
    }

    /**
     * Calculate a token borrow rate of current block
     * @param _token token address
     */
    function borrowRateIndexNow(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 lastCheckpoint = self.lastCheckpoint[_token];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lastCheckpoint == 0)
            return UNIT;
        uint256 lastBorrowRateIndex = self.borrowRateIndex[_token][lastCheckpoint];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(self, _token);
        return lastBorrowRateIndex.mul(block.number.sub(lastCheckpoint).mul(borrowRatePerBlock).add(UNIT)).div(UNIT);
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

    /**
     * Deposit token to Compound
     * @param _token token address
     * @param _amount amount of token
     */
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

    /**
     * Withdraw token from Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function fromCompound(BaseVariable storage self, address _token, uint _amount) public {
        ICToken cToken = ICToken(self.cTokenAddress[_token]);
        cToken.redeemUnderlying(_amount);
    }

    /**
     * Get current deposit balance of a token
     * @param _token token address
     */
     // sichaoy: maybe I should switch the order of the parameters
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
                accruedRate = depositRateIndexNow(self, _token)
                .mul(UNIT)
                .div(self.depositeRateIndex[_token][tokenInfo.getLastDepositBlock()]);
            }
            return tokenInfo.getDepositBalance(accruedRate);
        }
    }

    /**
     * Get current borrow balance of a token
     * @param _token token address
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    // sichaoy: What's the diff of getBorrowBalance with getBorrowAcruedRate?
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
                accruedRate = borrowRateIndexNow(self, _token)
                .mul(UNIT)
                .div(self.borrowRateIndex[_token][tokenInfo.getLastBorrowBlock()]);
            }
            return tokenInfo.getBorrowBalance(accruedRate);
        }
    }

    /**
     * Get current deposit balance of a token
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    function getDepositETH(
        BaseVariable storage self,
        address _accountAddr,
        SymbolsLib.Symbols storage _symbols
    ) public view returns (uint256 depositETH) {
        //TODO Why need to pass symbols ?
        for(uint i = 0; i < _symbols.getCoinLength(); i++) {
            address tokenAddress = _symbols.addressFromIndex(i);
            uint divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
            }
            depositETH = depositETH.add(getDepositBalance(self, tokenAddress, _accountAddr).mul(_symbols.priceFromIndex(i)).div(divisor));
        }
        return depositETH;
    }

    /**
     * Get borrowed balance of a token in the uint of Wei
     * @param _symbols chainlink symbols
     */
    function getBorrowETH(
        BaseVariable storage self,
        address _accountAddr,
        SymbolsLib.Symbols storage _symbols
    ) public view returns (uint256 borrowETH) {
        //TODO Why need to pass symbols ?
        for(uint i = 0; i < _symbols.getCoinLength(); i++) {
            address tokenAddress = _symbols.addressFromIndex(i);
            uint divisor = INT_UNIT;
            if(tokenAddress != ETH_ADDR) {
                divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
            }
            borrowETH = borrowETH.add(getBorrowBalance(self, tokenAddress, _accountAddr).mul(_symbols.priceFromIndex(i)).div(divisor));
        }
        return borrowETH;
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
        updateTotalReserve(self, _token, _amount, ActionChoices.Borrow); // Last parameter false means borrow token
    }

    /**
     * Repay the amount of token to the saving pool.
     * @param _token the address of the repaid token
     * @param _amount the mount of the repaid token
     * @return the remainders of the token after repay
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
        updateTotalReserve(self, _token, amount, ActionChoices.Repay); // Last parameter true means repay token

        return _amount > amountOwedWithInterest ? _amount.sub(amountOwedWithInterest) : 0; // Return the remainders
    }

    /**
	 * Withdraw all tokens from saving pool.
     * @param _token token address
	 */
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
        // sichaoy: change this function name to accumulateCompoundInterest()
        updateTotalCompound(self, _token);
        // sichaoy: change this function name to accumulateBorrowInterest()
        updateTotalLoan(self, _token);
        // sichaoy: change this function to updateTotalPool(), and call the above two functions inside
        updateTotalReserve(self, _token, amount, ActionChoices.Withdraw); // Last parameter false means withdraw token

        return amount;
    }

    struct LiquidationVars {
        uint256 totalBorrow;
        uint256 totalCollateral;
        uint256 msgTotalBorrow;
        uint256 msgTotalCollateral;

        uint256 targetTokenBalance;
        uint256 liquidationDebtValue;
        uint256 targetTokenPrice;
        uint256 paymentOfLiquidationValue;
        uint256 msgTargetTokenAccruedRate;
        uint256 targetTokenAccruedRate;
        address token;
        uint256 tokenPrice;
        uint256 tokenAccruedRate;
        uint256 coinValue;
        uint256 targetTokenAmount;
        uint256 tokenAmount;
        uint256 tokenDivisor;
    }

    function liquidate(
        BaseVariable storage self,
        address targetAccountAddr,
        address _targetToken,
        uint borrowLTV,
        uint liquidationThreshold,
        uint liquidationDiscountRatio,
        SymbolsLib.Symbols storage symbols
    ) public {
        LiquidationVars memory vars;
        vars.totalBorrow = getBorrowETH(self, targetAccountAddr, symbols);
        vars.totalCollateral = getDepositETH(self, targetAccountAddr, symbols);

        vars.msgTotalBorrow = getBorrowETH(self, msg.sender, symbols);
        vars.msgTotalCollateral = getDepositETH(self, msg.sender, symbols);

        vars.targetTokenBalance = getDepositBalance(self, _targetToken, msg.sender);

        require(_targetToken != address(0), "Token address is zero");

        // It is required that LTV is larger than LIQUIDATE_THREADHOLD for liquidation
        require(
            vars.totalBorrow.mul(100) > vars.totalCollateral.mul(liquidationThreshold),
            "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
        );

        // The value of discounted collateral should be never less than the borrow amount.
        // We assume this will never happen as the market will not drop extreamly fast so that
        // the LTV changes from 85% to 95%, an 10% drop within one block.
        require(
            vars.totalBorrow.mul(100) <= vars.totalCollateral.mul(liquidationDiscountRatio),
            "Collateral is not sufficient to be liquidated."
        );

        require(
            vars.msgTotalBorrow.mul(100) < vars.msgTotalCollateral.mul(borrowLTV),
            "No extra funds are used for liquidation."
        );

        require(
            vars.targetTokenBalance > 0,
            "The account amount must be greater than zero."
        );

        uint divisor = INT_UNIT;
        if(_targetToken != ETH_ADDR) {
            divisor = 10**uint256(IERC20Extended(_targetToken).decimals());
        }

        //被清算者需要清算掉的资产  (Liquidated assets that need to be liquidated)
        vars.liquidationDebtValue = vars.totalBorrow.sub(
            vars.totalCollateral.mul(borrowLTV).div(100)
        ).mul(liquidationDiscountRatio).div(liquidationDiscountRatio - borrowLTV);

        //清算者需要付的钱 (Liquidators need to pay)
        vars.targetTokenPrice = symbols.priceFromAddress(_targetToken);
        vars.paymentOfLiquidationValue = vars.targetTokenBalance.mul(vars.targetTokenPrice).div(divisor);

        if(
            vars.msgTotalBorrow != 0 &&
            vars.paymentOfLiquidationValue > (vars.msgTotalCollateral).mul(borrowLTV).div(100).sub(vars.msgTotalBorrow)
         ) {
            vars.paymentOfLiquidationValue = (vars.msgTotalCollateral).mul(borrowLTV).div(100).sub(vars.msgTotalBorrow);
        }

        if(vars.paymentOfLiquidationValue.mul(100) < vars.liquidationDebtValue.mul(liquidationDiscountRatio)) {
            vars.liquidationDebtValue = vars.paymentOfLiquidationValue.mul(100).div(liquidationDiscountRatio);
        }

        TokenInfoLib.TokenInfo storage targetTokenInfo = self.accounts[targetAccountAddr].tokenInfos[_targetToken];
        TokenInfoLib.TokenInfo storage msgTargetTokenInfo = self.accounts[msg.sender].tokenInfos[_targetToken];
        //清算者目标tokenRate
        vars.msgTargetTokenAccruedRate = getDepositAccruedRate(self, _targetToken, msgTargetTokenInfo.getLastDepositBlock());
        //被清算者目标tokenRate
        vars.targetTokenAccruedRate = getBorrowAccruedRate(self, _targetToken, targetTokenInfo.getLastBorrowBlock());

        vars.targetTokenAmount = vars.liquidationDebtValue.mul(divisor).div(vars.targetTokenPrice).mul(liquidationDiscountRatio).div(100);
        msgTargetTokenInfo.withdraw(vars.targetTokenAmount, vars.msgTargetTokenAccruedRate);
        targetTokenInfo.repay(vars.targetTokenAmount, vars.targetTokenAccruedRate);

        // The collaterals are liquidate in the order of their market liquidity
        for(uint i = 0; i < symbols.getCoinLength(); i++) {
            vars.token = symbols.addressFromIndex(i);
            vars.tokenPrice = symbols.priceFromIndex(i);

            vars.tokenDivisor = vars.token == ETH_ADDR ? INT_UNIT : 10**uint256(IERC20Extended(vars.token).decimals());

            TokenInfoLib.TokenInfo storage tokenInfo = self.accounts[targetAccountAddr].tokenInfos[vars.token];

            if(tokenInfo.getBorrowPrincipal() == 0) {
                TokenInfoLib.TokenInfo storage msgTokenInfo = self.accounts[msg.sender].tokenInfos[vars.token];
                newRateIndexCheckpoint(self, vars.token);

                //清算者当前tokenRate
                uint msgTokenAccruedRate =
                msgTokenInfo.getBorrowPrincipal() > 0 ?
                getBorrowAccruedRate(self, vars.token, msgTokenInfo.getLastBorrowBlock())
                :
                getDepositAccruedRate(self, vars.token, msgTokenInfo.getLastDepositBlock());


                //被清算者当前tokenRate
                vars.tokenAccruedRate = getDepositAccruedRate(self, vars.token, tokenInfo.getLastDepositBlock());
                vars.coinValue = tokenInfo.getDepositBalance(vars.tokenAccruedRate).mul(vars.tokenPrice).div(vars.tokenDivisor);
                if(vars.coinValue > vars.liquidationDebtValue) {
                    vars.coinValue = vars.liquidationDebtValue;
                    vars.liquidationDebtValue = 0;
                } else {
                    vars.liquidationDebtValue = vars.liquidationDebtValue.sub(vars.coinValue);
                }
                vars.tokenAmount = vars.coinValue.mul(vars.tokenDivisor).div(vars.tokenPrice);
                tokenInfo.withdraw(vars.tokenAmount, vars.tokenAccruedRate);
                msgTokenInfo.deposit(vars.tokenAmount, msgTokenAccruedRate);
            }

            if(vars.liquidationDebtValue == 0){
                break;
            }
        }
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