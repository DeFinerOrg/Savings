pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./lib/SymbolsLib.sol";
import "./lib/BitmapLib.sol";
import "./lib/SafeDecimalMath.sol";
import "./config/GlobalConfig.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";

contract Base {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;
    using SymbolsLib for SymbolsLib.Symbols;
    using BitmapLib for uint128;

    SymbolsLib.Symbols symbols;

    // The amount for the whole saving pool
    mapping(address => uint256) totalLoans;     // amount of lended tokens
    mapping(address => uint256) public totalReserve;   // amount of tokens in reservation
    mapping(address => uint256) public totalCompound;  // amount of tokens in compound
    mapping(address => address) public cTokenAddress;  // cToken addresses
    // Token => block-num => rate
    mapping(address => mapping(uint => uint)) public depositeRateIndex;
    // Token => block-num => rate
    mapping(address => mapping(uint => uint)) public borrowRateIndex;
    // token address => block number
    mapping(address => uint) lastCheckpoint;            // last checkpoint on the index curve
    // cToken address => rate
    mapping(address => uint) lastCTokenExchangeRate;    // last compound cToken exchange rate
    // Store per account info
    //mapping(address => Account) accounts;
    mapping(address => Bitmap) bitmaps;
    address globalConfigAddress;
    // Third Party Pools
    mapping(address => ThirdPartyPool) compoundPool;    // the compound pool

    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;

    struct Bitmap {
        uint128 depositBitmap;
        uint128 borrowBitmap;
    }

    enum ActionChoices  { Deposit, Withdraw, Borrow, Repay }

    struct ThirdPartyPool {
        bool supported;             // if the token is supported by the third party platforms such as Compound
        uint capitalRatio;          // the ratio of the capital in third party to the total asset
        uint depositRatePerBlock;   // the deposit rate of the token in third party
        uint borrowRatePerBlock;    // the borrow rate of the token in third party
    }

    /**
     * Initialize
     */
    function initialize(address[] memory _tokens, address[] memory _cTokens, address _globalConfigAddress, string memory _tokenNames, address _chainlinkAddress) public {

        symbols.initialize(_tokenNames, _tokens, _chainlinkAddress);

        globalConfigAddress = _globalConfigAddress;
        for(uint i = 0;i < _tokens.length;i++) {
            cTokenAddress[_tokens[i]] = _cTokens[i];
        }
    }

    function isUserHasAnyDeposits(address _account) public view returns (bool) {
        Bitmap storage bitmap = bitmaps[_account];
        return bitmap.depositBitmap > 0;
    }

    function isUserHasDeposits(address _account, uint8 _index) public view returns (bool) {
        Bitmap storage bitmap = bitmaps[_account];
        return bitmap.depositBitmap.isBitSet(_index);
    }

    function isUserHasBorrows(address _account, uint8 _index) public view returns (bool) {
        Bitmap storage bitmap = bitmaps[_account];
        return bitmap.borrowBitmap.isBitSet(_index);
    }

    function setInDepositBitmap(address _account, uint8 _index) public {
        Bitmap storage bitmap = bitmaps[_account];
        bitmap.depositBitmap = bitmap.depositBitmap.setBit(_index);
    }

    function unsetFromDepositBitmap(address _account, uint8 _index) public {
        Bitmap storage bitmap = bitmaps[_account];
        bitmap.depositBitmap = bitmap.depositBitmap.unsetBit(_index);
    }

    function setInBorrowBitmap(address _account, uint8 _index) public {
        Bitmap storage bitmap = bitmaps[_account];
        bitmap.borrowBitmap = bitmap.borrowBitmap.setBit(_index);
    }

    function unsetFromBorrowBitmap(address _account, uint8 _index) public {
        Bitmap storage bitmap = bitmaps[_account];
        bitmap.borrowBitmap = bitmap.borrowBitmap.unsetBit(_index);
    }

    function getCoinLength() public view returns(uint256 length) {
        return symbols.getCoinLength();
    }

    function getCoinAddress(uint256 _coinIndex) public view returns(address) {
        return symbols.addressFromIndex(_coinIndex);
    }

    function getCoinToETHRate(uint256 _coinIndex) public view returns(uint256) {
        return symbols.priceFromIndex(_coinIndex);
    }

    function getPriceFromAddress(address _token) public view returns(uint256) {
        return symbols.priceFromAddress(_token);
    }

    /**
     * Total amount of the token in Saving Pool
     * sichaoy: This is not right since the cToken rate has changed
     * @param _token token address
     */
    function getTotalDepositsNow(address _token) public view returns(uint) {
        address cToken = cTokenAddress[_token];                    // totalReserve = R
        return totalCompound[cToken].add(totalLoans[_token]).add(totalReserve[_token]); // return totalAmount = C + U + R
        // TODO Are all of these variables are in same token decimals?
    }

    /**
     * Total amount of available tokens for withdraw and borrow
     */
    // function getTotalAvailableNow(BaseVariable storage self, address _token) public view returns(uint) {
    //     address cToken = self.cTokenAddress[_token];
    //     uint256 totalReserve = self.totalReserve[_token];
    //     return self.totalCompound[cToken].add(totalReserve);
    // }

    /**
     * Update total amount of token in Compound as the cToken price changed
     * @param _token token address
     */
    function updateTotalCompound(address _token) public {
        address cToken = cTokenAddress[_token];
        if(cToken != address(0)) {
            totalCompound[cToken] = ICToken(cToken).balanceOfUnderlying(address(this));
        }
    }

    /**
     * Update total amount of token lended as the intersted earned from the borrower
     * @param _token token address
     */
    function updateTotalLoan(address _token) public {
        uint balance = totalLoans[_token];
        uint rate = getBorrowAccruedRate(_token, lastCheckpoint[_token]);
        if(
            rate == 0 ||
            balance == 0 ||
            SafeDecimalMath.getUNIT() > rate
        ) {
            totalLoans[_token] = balance;
        } else {
            totalLoans[_token] = balance.mul(rate).div(SafeDecimalMath.getUNIT());
        }
    }

    /**
     * Update the total reservation. Before run this function, make sure that totalCompound has been updated
     * by calling updateTotalCompound. Otherwise, self.totalCompound may not equal to the exact amount of the
     * token in Compound.
     * @return the actuall amount deposit/withdraw from the saving pool
     */
    function updateTotalReserve(address _token, uint _amount, uint8 _action) public {
        address cToken = cTokenAddress[_token];
        if (_action == uint8(ActionChoices.Deposit) || _action == uint8(ActionChoices.Repay)) {
            // Total amount of token after deposit or repay
            uint totalAmount = getTotalDepositsNow(_token);
            if (_action == uint8(ActionChoices.Deposit))
                totalAmount = totalAmount.add(_amount);
            else
                totalLoans[_token] = totalLoans[_token].sub(_amount);

            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = totalReserve[_token].add(_amount);

            if (cTokenAddress[_token] != address(0) &&
            totalReserveBeforeAdjust > totalAmount.mul(GlobalConfig(globalConfigAddress).maxReserveRatio()).div(100)) { // sichaoy: 20 and 15 should be defined as constants
                uint toCompoundAmount = totalReserveBeforeAdjust - totalAmount.mul(GlobalConfig(globalConfigAddress).midReserveRatio()).div(100);
                toCompound(_token, toCompoundAmount);
                totalCompound[cToken] = totalCompound[cToken].add(toCompoundAmount);
                totalReserve[_token] = totalReserve[_token].add(_amount.sub(toCompoundAmount));
            }
            else {
                totalReserve[_token] = totalReserve[_token].add(_amount);
            }
        } else {
            require(
                totalReserve[_token].add(totalCompound[cToken]) >= _amount,
                "Not enough tokens in the pool."
            );

            // Total amount of token after withdraw or borrow
            uint totalAmount = getTotalDepositsNow(_token);
            if (_action == uint8(ActionChoices.Withdraw))
                totalAmount = totalAmount.sub(_amount);
            else
                totalLoans[_token] = totalLoans[_token].add(_amount);
            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = totalReserve[_token] > _amount ? totalReserve[_token].sub(_amount) : 0;

            // Trigger fromCompound if the new reservation ratio is less than 10%
            if(cTokenAddress[_token] != address(0) &&
            (totalAmount == 0 || totalReserveBeforeAdjust < totalAmount.mul(GlobalConfig(globalConfigAddress).minReserveRatio()).div(100))) {

                uint totalAvailable = totalReserve[_token].add(totalCompound[cToken]).sub(_amount);
                if (totalAvailable < totalAmount.mul(GlobalConfig(globalConfigAddress).midReserveRatio()).div(100)){
                    // Withdraw all the tokens from Compound
                    fromCompound(_token, totalCompound[cToken]);
                    totalCompound[cToken] = 0;
                    totalReserve[_token] = totalAvailable;
                } else {
                    // Withdraw partial tokens from Compound
                    uint totalInCompound = totalAvailable - totalAmount.mul(GlobalConfig(globalConfigAddress).midReserveRatio()).div(100);
                    fromCompound(_token, totalCompound[cToken]-totalInCompound);
                    totalCompound[cToken] = totalInCompound;
                    totalReserve[_token] = totalAvailable.sub(totalInCompound);
                }
            }
            else {
                totalReserve[_token] = totalReserve[_token].sub(_amount);
            }
        }
    }

    // sichaoy: these two functions should be moved to a seperate library
    /**
     * Get compound supply rate.
     * @param _cToken cToken address
     */
    function getCompoundSupplyRatePerBlock(address _cToken) public view returns(uint) {
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
    function getBorrowRatePerBlock(address _token) public view returns(uint) {
        if(!compoundPool[_token].supported)
            // If the token is NOT supported by the third party, borrowing rate = 3% + U * 15%.
            // sichaoy: move the constant
            return getCapitalUtilizationRatio(_token).mul(15*10**16).add(3*10**16).div(2102400).div(SafeDecimalMath.getUNIT());

        // if the token is suppored in third party, borrowing rate = Compound Supply Rate * 0.4 + Compound Borrow Rate * 0.6
        // sichaoy: confirm the formula
        return (compoundPool[_token].depositRatePerBlock).mul(4).
            add((compoundPool[_token].borrowRatePerBlock).mul(6)).div(10);
    }

    /**
     * Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
     * Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
     * sichaoy: make sure the ratePerBlock is zero if both U and C are zero.
     * @param _token token address
     * @return deposite rate of blocks before the current block
     */
    function getDepositRatePerBlock(address _token) public view returns(uint) {
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(_token);
        uint256 capitalUtilRatio = getCapitalUtilizationRatio(_token);
        if(!compoundPool[_token].supported)
            return borrowRatePerBlock.mul(capitalUtilRatio).div(SafeDecimalMath.getUNIT());

        return borrowRatePerBlock.mul(capitalUtilRatio).add(compoundPool[_token].depositRatePerBlock
            .mul(compoundPool[_token].capitalRatio)).div(SafeDecimalMath.getUNIT());
    }

    /**
     * Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
     * @param _token token address
     */
    function getCapitalUtilizationRatio(address _token) public view returns(uint) {
        uint256 totalDepositsNow = getTotalDepositsNow(_token);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return totalLoans[_token].mul(SafeDecimalMath.getUINT_UNIT()).div(totalDepositsNow);
        }
    }

    /**
     * Ratio of the capital in Compound
     */
    function getCapitalCompoundRatio(address _token) public view returns(uint) {
        address cToken = cTokenAddress[_token];
        if(totalCompound[cToken] == 0 ) {
            return 0;
        } else {
            return uint(totalCompound[cToken].mul(SafeDecimalMath.getUINT_UNIT()).div(getTotalDepositsNow(_token)));
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
        address _token,
        uint _depositRateRecordStart
    ) public view returns (uint256) {
        uint256 depositRate = depositeRateIndex[_token][_depositRateRecordStart];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if (depositRate == 0) {
            return UNIT;    // return UNIT if the checkpoint doesn't exist
        } else {
            // sichaoy: to check that the current block rate index already exist
            return depositeRateIndex[_token][block.number].mul(UNIT).div(depositRate); // index(current block)/index(start block)
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
        address _token,
        uint _borrowRateRecordStart
    ) public view returns (uint256) {
        uint256 borrowRate = borrowRateIndex[_token][_borrowRateRecordStart];
        uint256 UNIT = SafeDecimalMath.getUNIT();
        if (borrowRate == 0) {
            // when block is same
            return UNIT;
        } else {
            // rate change
            return borrowRateIndex[_token][block.number].mul(UNIT).div(borrowRate);
        }
    }

    /**
     * @dev The rate set at the checkpoint is the rate from the last checkpoint to this checkpoint
     */
    function newRateIndexCheckpoint(address _token) public {

        if (block.number == lastCheckpoint[_token])
            return;

        uint256 UNIT = SafeDecimalMath.getUNIT();

        // If it is the first check point, initialize the rate index
        if (lastCheckpoint[_token] == 0) {
            borrowRateIndex[_token][block.number] = UNIT;
            depositeRateIndex[_token][block.number] = UNIT;
        } else {
            address cToken = cTokenAddress[_token];
            if(cToken == address(0)) {
                compoundPool[_token].supported = false;

                borrowRateIndex[_token][block.number] = borrowRateIndexNow(_token);
                depositeRateIndex[_token][block.number] = depositRateIndexNow(_token);

                // Update the last checkpoint
                lastCheckpoint[_token] = block.number;
            } else {
                compoundPool[_token].supported = true;
                uint cTokenExchangeRate = ICToken(cToken).exchangeRateCurrent();
                // Get the curretn cToken exchange rate in Compound
                compoundPool[_token].capitalRatio = getCapitalCompoundRatio(_token);
                compoundPool[_token].borrowRatePerBlock = ICToken(cToken).borrowRatePerBlock();
                compoundPool[_token].depositRatePerBlock = cTokenExchangeRate.mul(UNIT).div(lastCTokenExchangeRate[cToken])
                    .sub(UNIT).div(block.number.sub(lastCheckpoint[_token]));

                borrowRateIndex[_token][block.number] = borrowRateIndexNow(_token);
                depositeRateIndex[_token][block.number] = depositRateIndexNow(_token);

                // Update the last checkpoint
                lastCheckpoint[_token] = block.number;
                lastCTokenExchangeRate[cTokenAddress[_token]] = cTokenExchangeRate;
            }
        }
    }

    /**
     * Calculate a token deposite rate of current block
     * @param _token token address
     */
    function depositRateIndexNow(address _token) public view returns(uint) {
        uint256 lcp = lastCheckpoint[_token]; //lcp is lastCheckpoint
        uint256 UNIT = SafeDecimalMath.getUNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lcp == 0)
            return UNIT;
        uint256 lastDepositeRateIndex = depositeRateIndex[_token][lcp];
        uint256 depositRatePerBlock = getDepositRatePerBlock(_token);
        return lastDepositeRateIndex.mul(block.number.sub(lcp).mul(depositRatePerBlock).add(UNIT)).div(UNIT);
    }

    /**
     * Calculate a token borrow rate of current block
     * @param _token token address
     */
    function borrowRateIndexNow(address _token) public view returns(uint) {
        uint256 lcp = lastCheckpoint[_token]; //lcp is lastCheckpoint
        uint256 UNIT = SafeDecimalMath.getUNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lcp == 0)
            return UNIT;
        uint256 lastBorrowRateIndex = borrowRateIndex[_token][lcp];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(_token);
        return lastBorrowRateIndex.mul(block.number.sub(lcp).mul(borrowRatePerBlock).add(UNIT)).div(UNIT);
    }

    /*
	 * Get the state of the given token
	 */
    function getTokenState(address _token) public view returns (
        uint256 deposits,
        uint256 loans,
        uint256 collateral,
        uint256 depositRatePerBlock,
        uint256 borrowRatePerBlock
    )
    {
        return (
        getTotalDepositsNow(_token),
        totalLoans[_token],
        totalReserve[_token].add(totalCompound[cTokenAddress[_token]]),
        getDepositRatePerBlock(_token),
        getBorrowRatePerBlock(_token)
        );
    }

    /**
     * Deposit token to Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function toCompound(address _token, uint _amount) public {
        address cToken = cTokenAddress[_token];
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
    function fromCompound(address _token, uint _amount) public {
        ICToken cToken = ICToken(cTokenAddress[_token]);
        cToken.redeemUnderlying(_amount);
    }
}