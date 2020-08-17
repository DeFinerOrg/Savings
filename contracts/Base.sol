pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./lib/TokenInfoLib.sol";
import "./lib/BitmapLib.sol";
import "./lib/SafeDecimalMath.sol";
import "./config/GlobalConfig.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";
import { IBlockNumber } from "./ISavingAccount.sol";

library Base {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;
    using TokenInfoLib for TokenInfoLib.TokenInfo;
    using BitmapLib for uint128;

    struct BaseVariable {
        // The amount for the whole saving pool
        mapping(address => uint256) totalLoans;     // amount of lended tokens
        mapping(address => uint256) totalReserve;   // amount of tokens in reservation
        mapping(address => uint256) totalCompound;  // amount of tokens in compound
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) depositeRateIndex; // the index curve of deposit rate
        // Token => block-num => rate
        mapping(address => mapping(uint => uint)) borrowRateIndex;   // the index curve of borrow rate
        // token address => block number
        mapping(address => uint) lastCheckpoint;            // last checkpoint on the index curve
        // cToken address => rate
        mapping(address => uint) lastCTokenExchangeRate;    // last compound cToken exchange rate
        // Store per account info
        mapping(address => Account) accounts;
        address payable deFinerCommunityFund;   // address allowed to withdraw the community fund
        address globalConfigAddress;            // global configuration contract address
        address savingAccountAddress;           // the SavingAccount contract address
        address tokenInfoRegistryAddress;
        mapping(address => uint) deFinerFund;   // Definer community fund for the tokens
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

    event UpdateIndex(address indexed token, uint256 depositeRateIndex, uint256 borrowRateIndex);

    /**
     * Initialize the base library
     * @param _globalConfigAddress the global configuration contract address
     * @param _savingAccountAddress the SavingAccount contract address
     */
    function initialize(
        BaseVariable storage self,
        address _globalConfigAddress,
        address _savingAccountAddress,
        address _tokenInfoRegistryAddress
    ) public {
        self.globalConfigAddress = _globalConfigAddress;
        self.savingAccountAddress = _savingAccountAddress;
        self.tokenInfoRegistryAddress = _tokenInfoRegistryAddress;
    }

    /**
     * Check if the user has deposit for any tokens
     * @param _account address of the user
     * @return true if the user has positive deposit balance
     */
    function isUserHasAnyDeposits(BaseVariable storage self, address _account) public view returns (bool) {
        Account storage account = self.accounts[_account];
        return account.depositBitmap > 0;
    }

    /**
     * Check if the user has deposit for a token
     * @param _account address of the user
     * @param _index index of the token
     * @return true if the user has positive deposit balance for the token
     */
    function isUserHasDeposits(BaseVariable storage self, address _account, uint8 _index) public view returns (bool) {
        Account storage account = self.accounts[_account];
        return account.depositBitmap.isBitSet(_index);
    }

    /**
     * Check if the user has borrowed a token
     * @param _account address of the user
     * @param _index index of the token
     * @return true if the user has borrowed the token
     */
    function isUserHasBorrows(BaseVariable storage self, address _account, uint8 _index) public view returns (bool) {
        Account storage account = self.accounts[_account];
        return account.borrowBitmap.isBitSet(_index);
    }

    /**
     * Set the deposit bitmap for a token.
     * @param _account address of the user
     * @param _index index of the token
     */
    function setInDepositBitmap(BaseVariable storage self, address _account, uint8 _index) public {
        Account storage account = self.accounts[_account];
        account.depositBitmap = account.depositBitmap.setBit(_index);
    }

    /**
     * Unset the deposit bitmap for a token
     * @param _account address of the user
     * @param _index index of the token
     */
    function unsetFromDepositBitmap(BaseVariable storage self, address _account, uint8 _index) public {
        Account storage account = self.accounts[_account];
        account.depositBitmap = account.depositBitmap.unsetBit(_index);
    }

    /**
     * Set the borrow bitmap for a token.
     * @param _account address of the user
     * @param _index index of the token
     */
    function setInBorrowBitmap(BaseVariable storage self, address _account, uint8 _index) public {
        Account storage account = self.accounts[_account];
        account.borrowBitmap = account.borrowBitmap.setBit(_index);
    }

    /**
     * Unset the borrow bitmap for a token
     * @param _account address of the user
     * @param _index index of the token
     */
    function unsetFromBorrowBitmap(BaseVariable storage self, address _account, uint8 _index) public {
        Account storage account = self.accounts[_account];
        account.borrowBitmap = account.borrowBitmap.unsetBit(_index);
    }

    /**
     * Approve transfer of all available tokens
     * @param _token token address
     */
    function approveAll(BaseVariable storage self, address _token) public {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
        require(cToken != address(0x0), "cToken address is zero");
        IERC20(_token).safeApprove(cToken, 0);
        IERC20(_token).safeApprove(cToken, uint256(-1));
    }

    /**
     * Total amount of the token in Saving account
     * @param _token token address
     */
    function getTotalDepositStore(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
        uint256 totalLoans = self.totalLoans[_token];                        // totalLoans = U
        uint256 totalReserve = self.totalReserve[_token];                    // totalReserve = R
        return self.totalCompound[cToken].add(totalLoans).add(totalReserve); // return totalAmount = C + U + R
    }

    /**
     * Update total amount of token in Compound as the cToken price changed
     * @param _token token address
     */
    function updateTotalCompound(BaseVariable storage self, address _token) public {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
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
     * @param _token token address
     * @param _action indicate if user's operation is deposit or withdraw, and borrow or repay.
     * @return the actuall amount deposit/withdraw from the saving pool
     */
    function updateTotalReserve(BaseVariable storage self, address _token, uint _amount, ActionChoices _action) public {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
        uint totalAmount = getTotalDepositStore(self, _token);
        if (_action == ActionChoices.Deposit || _action == ActionChoices.Repay) {
            // Total amount of token after deposit or repay
            if (_action == ActionChoices.Deposit)
                totalAmount = totalAmount.add(_amount);
            else
                self.totalLoans[_token] = self.totalLoans[_token].sub(_amount);

            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = self.totalReserve[_token].add(_amount);

            if (cToken != address(0) &&
                totalReserveBeforeAdjust > totalAmount.mul(GlobalConfig(self.globalConfigAddress).maxReserveRatio()).div(100)) {
                uint toCompoundAmount = totalReserveBeforeAdjust - totalAmount.mul(GlobalConfig(self.globalConfigAddress).midReserveRatio()).div(100);
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
            if (_action == ActionChoices.Withdraw)
                totalAmount = totalAmount.sub(_amount);
            else
                self.totalLoans[_token] = self.totalLoans[_token].add(_amount);
            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = self.totalReserve[_token] > _amount ? self.totalReserve[_token].sub(_amount) : 0;

            // Trigger fromCompound if the new reservation ratio is less than 10%
            if(cToken != address(0) &&
                (totalAmount == 0 || totalReserveBeforeAdjust < totalAmount.mul(GlobalConfig(self.globalConfigAddress).minReserveRatio()).div(100))) {

                uint totalAvailable = self.totalReserve[_token].add(self.totalCompound[cToken]).sub(_amount);
                if (totalAvailable < totalAmount.mul(GlobalConfig(self.globalConfigAddress).midReserveRatio()).div(100)){
                    // Withdraw all the tokens from Compound
                    fromCompound(self, _token, self.totalCompound[cToken]);
                    self.totalCompound[cToken] = 0;
                    self.totalReserve[_token] = totalAvailable;
                } else {
                    // Withdraw partial tokens from Compound
                    uint totalInCompound = totalAvailable - totalAmount.mul(GlobalConfig(self.globalConfigAddress).midReserveRatio()).div(100);
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

    /**
     * Get the borrowing interest rate Borrowing interest rate.
     * @param _token token address
     * @return the borrow rate for the current block
     */
    function getBorrowRatePerBlock(BaseVariable storage self, address _token) public view returns(uint) {
        if(!TokenRegistry(self.tokenInfoRegistryAddress).isSupportedOnCompound(_token))
            // If the token is NOT supported by the third party, borrowing rate = 3% + U * 15%.
            // sichaoy: move the constant
            return getCapitalUtilizationRatio(self, _token).mul(15*10**16).add(3*10**16).div(2102400).div(SafeDecimalMath.getUNIT());

        // if the token is suppored in third party, borrowing rate = Compound Supply Rate * 0.4 + Compound Borrow Rate * 0.6
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
        if(!TokenRegistry(self.tokenInfoRegistryAddress).isSupportedOnCompound(_token))
            return borrowRatePerBlock.mul(capitalUtilRatio).div(SafeDecimalMath.getUNIT());

        return borrowRatePerBlock.mul(capitalUtilRatio).add(self.compoundPool[_token].depositRatePerBlock
            .mul(self.compoundPool[_token].capitalRatio)).div(SafeDecimalMath.getUNIT());
    }

    /**
     * Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
     * @param _token token address
     */
    function getCapitalUtilizationRatio(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 totalDepositsNow = getTotalDepositStore(self, _token);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return self.totalLoans[_token].mul(SafeDecimalMath.getUINT_UNIT()).div(totalDepositsNow);
        }
    }

    /**
     * Ratio of the capital in Compound
     * @param _token token address
     */
    function getCapitalCompoundRatio(BaseVariable storage self, address _token) public view returns(uint) {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
        if(self.totalCompound[cToken] == 0 ) {
            return 0;
        } else {
            return uint(self.totalCompound[cToken].mul(SafeDecimalMath.getUINT_UNIT()).div(getTotalDepositStore(self, _token)));
        }
    }

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
            return self.depositeRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()].mul(UNIT).div(depositRate); // index(current block)/index(start block)
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
            return self.borrowRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()].mul(UNIT).div(borrowRate);
        }
    }

    /**
     * Set a new rate index checkpoint.
     * @param _token token address
     * @dev The rate set at the checkpoint is the rate from the last checkpoint to this checkpoint
     */
    function newRateIndexCheckpoint(BaseVariable storage self, address _token) public {

        if (IBlockNumber(self.savingAccountAddress).getBlockNumber() == self.lastCheckpoint[_token])
            return;

        uint256 UNIT = SafeDecimalMath.getUNIT();
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);

        // If it is the first check point, initialize the rate index
        if (self.lastCheckpoint[_token] == 0) {
            if(cToken == address(0)) {
                self.compoundPool[_token].supported = false;

                self.borrowRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = UNIT;
                self.depositeRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = UNIT;

                // Update the last checkpoint
                self.lastCheckpoint[_token] = IBlockNumber(self.savingAccountAddress).getBlockNumber();
            }
            else {
                self.compoundPool[_token].supported = true;
                uint cTokenExchangeRate = ICToken(cToken).exchangeRateCurrent();

                // Get the curretn cToken exchange rate in Compound, which is need to calculate DeFiner's rate
                // sichaoy: How to deal with the issue capitalRatio is zero if looking forward (An estimation)
                self.compoundPool[_token].capitalRatio = getCapitalCompoundRatio(self, _token);
                self.compoundPool[_token].borrowRatePerBlock = ICToken(cToken).borrowRatePerBlock();  // initial value
                self.compoundPool[_token].depositRatePerBlock = ICToken(cToken).supplyRatePerBlock(); // initial value

                self.borrowRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = UNIT;
                self.depositeRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = UNIT;

                // Update the last checkpoint
                self.lastCheckpoint[_token] = IBlockNumber(self.savingAccountAddress).getBlockNumber();
                self.lastCTokenExchangeRate[cToken] = cTokenExchangeRate;
            }

        } else {
            if(cToken == address(0)) {
                self.compoundPool[_token].supported = false;

                self.borrowRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = borrowRateIndexNow(self, _token);
                self.depositeRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = depositRateIndexNow(self, _token);

                // Update the last checkpoint
                self.lastCheckpoint[_token] = IBlockNumber(self.savingAccountAddress).getBlockNumber();
            } else {
                self.compoundPool[_token].supported = true;
                uint cTokenExchangeRate = ICToken(cToken).exchangeRateCurrent();

                // Get the curretn cToken exchange rate in Compound, which is need to calculate DeFiner's rate
                self.compoundPool[_token].capitalRatio = getCapitalCompoundRatio(self, _token);
                self.compoundPool[_token].borrowRatePerBlock = ICToken(cToken).borrowRatePerBlock();
                self.compoundPool[_token].depositRatePerBlock = cTokenExchangeRate.mul(UNIT).div(self.lastCTokenExchangeRate[cToken])
                    .sub(UNIT).div(IBlockNumber(self.savingAccountAddress).getBlockNumber().sub(self.lastCheckpoint[_token]));

                self.borrowRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = borrowRateIndexNow(self, _token);
                self.depositeRateIndex[_token][IBlockNumber(self.savingAccountAddress).getBlockNumber()] = depositRateIndexNow(self, _token);

                // Update the last checkpoint
                self.lastCheckpoint[_token] = IBlockNumber(self.savingAccountAddress).getBlockNumber();
                self.lastCTokenExchangeRate[cToken] = cTokenExchangeRate;
            }
        }
        emit UpdateIndex(_token, self.depositeRateIndex[_token][block.number], self.borrowRateIndex[_token][block.number]);
    }

    /**
     * Calculate a token deposite rate of current block
     * @param _token token address
     * @dev This is an looking forward estimation from last checkpoint and not the exactly rate that the user will pay or earn.
     * change name to depositRateIndexForward? or EstimateDepositRateIndex?
     */
    function depositRateIndexNow(BaseVariable storage self, address _token) public view returns(uint) {
        uint256 lastCheckpoint = self.lastCheckpoint[_token];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lastCheckpoint == 0)
            return UNIT;

        uint256 lastDepositeRateIndex = self.depositeRateIndex[_token][lastCheckpoint];
        uint256 depositRatePerBlock = getDepositRatePerBlock(self, _token);
        // newIndex = oldIndex*(1+r*delta_block). If delta_block = 0, i.e. the last checkpoint is current block, index doesn't change.
        return lastDepositeRateIndex.mul(IBlockNumber(self.savingAccountAddress).getBlockNumber().sub(lastCheckpoint).mul(depositRatePerBlock).add(UNIT)).div(UNIT);
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
        return lastBorrowRateIndex.mul(IBlockNumber(self.savingAccountAddress).getBlockNumber().sub(lastCheckpoint).mul(borrowRatePerBlock).add(UNIT)).div(UNIT);
    }

    /**
	 * Get the state of the given token
     * @param _token token address
	 */
    function getTokenState(BaseVariable storage self, address _token) public view returns (
        uint256 deposits,
        uint256 loans,
        uint256 collateral
    )
    {
        return (
        getTotalDepositStore(self, _token),
        self.totalLoans[_token],
        self.totalReserve[_token].add(self.totalCompound[TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token)])
        );
    }

    /**
     * Deposit token to Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function toCompound(BaseVariable storage self, address _token, uint _amount) public {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
        if (_token == ETH_ADDR) {
            ICETH(cToken).mint.value(_amount)();
        } else {
            uint256 success = ICToken(cToken).mint(_amount);
            require(success == 0, "mint failed");
        }
    }

    /**
     * Withdraw token from Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function fromCompound(BaseVariable storage self, address _token, uint _amount) public {
        address cToken = TokenRegistry(self.tokenInfoRegistryAddress).getCToken(_token);
        uint256 success = ICToken(cToken).redeemUnderlying(_amount);
        require(success == 0, "redeemUnderlying failed");
    }

    /**
     * Get current deposit balance of a token
     * @param _token token address
     */
     // sichaoy: maybe I should switch the order of the parameters
     // sichaoy: change the name to getTokenDepositBalance()
    function getDepositBalance(
        BaseVariable storage self,
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
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
        address _accountAddr
    ) public view returns (uint256 depositETH) {
        for(uint i = 0; i < TokenRegistry(self.tokenInfoRegistryAddress).getCoinLength(); i++) {
            if(isUserHasDeposits(self, _accountAddr, uint8(i))) {
                address tokenAddress = TokenRegistry(self.tokenInfoRegistryAddress).addressFromIndex(i);
                uint divisor = INT_UNIT;
                if(tokenAddress != ETH_ADDR) {
                    divisor = 10**uint256(TokenRegistry(self.tokenInfoRegistryAddress).getTokenDecimals(tokenAddress));
                }
                depositETH = depositETH.add(getDepositBalance(self, tokenAddress, _accountAddr).mul(TokenRegistry(self.tokenInfoRegistryAddress).priceFromIndex(i)).div(divisor));
            }
        }
        return depositETH;
    }

    /**
     * Get borrowed balance of a token in the uint of Wei
     */
    // sichaoy: change name to getTotalBorrowInETH()
    function getBorrowETH(
        BaseVariable storage self,
        address _accountAddr
    ) public view returns (uint256 borrowETH) {
        for(uint i = 0; i < TokenRegistry(self.tokenInfoRegistryAddress).getCoinLength(); i++) {
            if(isUserHasBorrows(self, _accountAddr, uint8(i))) {
                address tokenAddress = TokenRegistry(self.tokenInfoRegistryAddress).addressFromIndex(i);
                uint divisor = INT_UNIT;
                if(tokenAddress != ETH_ADDR) {
                    divisor = 10**uint256(TokenRegistry(self.tokenInfoRegistryAddress).getTokenDecimals(tokenAddress));
                }
                borrowETH = borrowETH.add(getBorrowBalance(self, tokenAddress, _accountAddr).mul(TokenRegistry(self.tokenInfoRegistryAddress).priceFromIndex(i)).div(divisor));
            }
        }
        return borrowETH;
    }
}

interface IERC20Extended {
    function decimals() external view returns (uint8);
}