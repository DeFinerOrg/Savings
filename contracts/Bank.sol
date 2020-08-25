pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./config/GlobalConfig.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract Bank is Ownable, Initializable{
    using SafeMath for uint256;

    mapping(address => uint256) public totalLoans;     // amount of lended tokens
    mapping(address => uint256) public totalReserve;   // amount of tokens in reservation
    mapping(address => uint256) public totalCompound;  // amount of tokens in compound
    // Token => block-num => rate
    mapping(address => mapping(uint => uint)) public depositeRateIndex; // the index curve of deposit rate
    // Token => block-num => rate
    mapping(address => mapping(uint => uint)) public borrowRateIndex;   // the index curve of borrow rate
    // token address => block number
    mapping(address => uint) public lastCheckpoint;            // last checkpoint on the index curve
    // cToken address => rate
    mapping(address => uint) public lastCTokenExchangeRate;    // last compound cToken exchange rate
    mapping(address => ThirdPartyPool) compoundPool;    // the compound pool

    GlobalConfig globalConfig;            // global configuration contract address

    modifier onlySavingAccount() {
        require(msg.sender == address(globalConfig.savingAccount()), "Insufficient power");
        _;
    }

    enum ActionChoices { Deposit, Withdraw, Borrow, Repay }

    ActionChoices public Deposit = ActionChoices.Deposit;
    ActionChoices public Withdraw = ActionChoices.Withdraw;
    ActionChoices public Borrow = ActionChoices.Borrow;
    ActionChoices public Repay = ActionChoices.Repay;

    struct ThirdPartyPool {
        bool supported;             // if the token is supported by the third party platforms such as Compound
        uint capitalRatio;          // the ratio of the capital in third party to the total asset
        uint depositRatePerBlock;   // the deposit rate of the token in third party
        uint borrowRatePerBlock;    // the borrow rate of the token in third party
    }

    event UpdateIndex(address indexed token, uint256 depositeRateIndex, uint256 borrowRateIndex);

    /**
     * Initialize the Bank
     * @param _globalConfig the global configuration contract
     */
    function initialize(
        GlobalConfig _globalConfig
    ) public initializer {
        globalConfig = _globalConfig;
    }

    /**
     * Total amount of the token in Saving account
     * @param _token token address
     */
    function getTotalDepositStore(address _token) public view returns(uint) {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        // totalLoans[_token] = U   totalReserve[_token] = R
        return totalCompound[cToken].add(totalLoans[_token]).add(totalReserve[_token]); // return totalAmount = C + U + R
    }

    /**
     * Update total amount of token in Compound as the cToken price changed
     * @param _token token address
     */
    function updateTotalCompound(address _token) public onlySavingAccount{
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        if(cToken != address(0)) {
            totalCompound[cToken] = ICToken(cToken).balanceOfUnderlying(address(globalConfig.savingAccount()));
        }
    }

    /**
     * Update total amount of token lended as the intersted earned from the borrower
     * @param _token token address
     */
    function updateTotalLoan(address _token) public onlySavingAccount{
        uint balance = totalLoans[_token];
        uint rate = getBorrowAccruedRate(_token, lastCheckpoint[_token]);
        if(
            rate == 0 ||
            balance == 0 ||
            globalConfig.constants().INT_UNIT() > rate
        ) {
            totalLoans[_token] = balance;
        } else {
            totalLoans[_token] = balance.mul(rate).div(globalConfig.constants().INT_UNIT());
        }
    }

    /**
     * Update the total reservation. Before run this function, make sure that totalCompound has been updated
     * by calling updateTotalCompound. Otherwise, totalCompound may not equal to the exact amount of the
     * token in Compound.
     * @param _token token address
     * @param _action indicate if user's operation is deposit or withdraw, and borrow or repay.
     * @return the actuall amount deposit/withdraw from the saving pool
     */
    function updateTotalReserve(address _token, uint _amount, ActionChoices _action) public onlySavingAccount returns(uint256 compoundAmount){
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        uint totalAmount = getTotalDepositStore(_token);
        if (_action == Deposit || _action == Repay) {
            // Total amount of token after deposit or repay
            if (_action == Deposit)
                totalAmount = totalAmount.add(_amount);
            else
                totalLoans[_token] = totalLoans[_token].sub(_amount);

            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = totalReserve[_token].add(_amount);

            if (cToken != address(0) &&
            totalReserveBeforeAdjust > totalAmount.mul(globalConfig.maxReserveRatio()).div(100)) {
                uint toCompoundAmount = totalReserveBeforeAdjust - totalAmount.mul(globalConfig.midReserveRatio()).div(100);
                //toCompound(_token, toCompoundAmount);
                compoundAmount = toCompoundAmount;
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
            if (_action == Withdraw)
                totalAmount = totalAmount.sub(_amount);
            else
                totalLoans[_token] = totalLoans[_token].add(_amount);
            // Expected total amount of token in reservation after deposit or repay
            uint totalReserveBeforeAdjust = totalReserve[_token] > _amount ? totalReserve[_token].sub(_amount) : 0;

            // Trigger fromCompound if the new reservation ratio is less than 10%
            if(cToken != address(0) &&
            (totalAmount == 0 || totalReserveBeforeAdjust < totalAmount.mul(globalConfig.minReserveRatio()).div(100))) {

                uint totalAvailable = totalReserve[_token].add(totalCompound[cToken]).sub(_amount);
                if (totalAvailable < totalAmount.mul(globalConfig.midReserveRatio()).div(100)){
                    // Withdraw all the tokens from Compound
                    //fromCompound(_token, totalCompound[cToken]);
                    compoundAmount = totalCompound[cToken];
                    totalCompound[cToken] = 0;
                    totalReserve[_token] = totalAvailable;
                } else {
                    // Withdraw partial tokens from Compound
                    uint totalInCompound = totalAvailable - totalAmount.mul(globalConfig.midReserveRatio()).div(100);
                    //fromCompound(_token, totalCompound[cToken]-totalInCompound);
                    compoundAmount = totalCompound[cToken]-totalInCompound;
                    totalCompound[cToken] = totalInCompound;
                    totalReserve[_token] = totalAvailable.sub(totalInCompound);
                }
            }
            else {
                totalReserve[_token] = totalReserve[_token].sub(_amount);
            }
        }
        return compoundAmount;
    }

    /**
     * Get the borrowing interest rate Borrowing interest rate.
     * @param _token token address
     * @return the borrow rate for the current block
     */
    function getBorrowRatePerBlock(address _token) public view returns(uint) {
        if(!globalConfig.tokenInfoRegistry().isSupportedOnCompound(_token))
        // If the token is NOT supported by the third party, borrowing rate = 3% + U * 15%.
            return getCapitalUtilizationRatio(_token).mul(globalConfig.rateCurveSlope()).add(globalConfig.rateCurveConstant()).div(globalConfig.constants().BLOCKS_PER_YEAR()).div(globalConfig.constants().INT_UNIT());

        // if the token is suppored in third party, borrowing rate = Compound Supply Rate * 0.4 + Compound Borrow Rate * 0.6
        return (compoundPool[_token].depositRatePerBlock).mul(globalConfig.compoundSupplyRateWeights()).
            add((compoundPool[_token].borrowRatePerBlock).mul(globalConfig.compoundBorrowRateWeights())).div(10);
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
        if(!globalConfig.tokenInfoRegistry().isSupportedOnCompound(_token))
            return borrowRatePerBlock.mul(capitalUtilRatio).div(globalConfig.constants().INT_UNIT());

        return borrowRatePerBlock.mul(capitalUtilRatio).add(compoundPool[_token].depositRatePerBlock
            .mul(compoundPool[_token].capitalRatio)).div(globalConfig.constants().INT_UNIT());
    }

    /**
     * Get capital utilization. Capital Utilization Rate (U )= total loan outstanding / Total market deposit
     * @param _token token address
     */
    function getCapitalUtilizationRatio(address _token) public view returns(uint) {
        uint256 totalDepositsNow = getTotalDepositStore(_token);
        if(totalDepositsNow == 0) {
            return 0;
        } else {
            return totalLoans[_token].mul(globalConfig.constants().INT_UNIT()).div(totalDepositsNow);
        }
    }

    /**
     * Ratio of the capital in Compound
     * @param _token token address
     */
    function getCapitalCompoundRatio(address _token) public view returns(uint) {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        if(totalCompound[cToken] == 0 ) {
            return 0;
        } else {
            return uint(totalCompound[cToken].mul(globalConfig.constants().INT_UNIT()).div(getTotalDepositStore(_token)));
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
    function getDepositAccruedRate(address _token, uint _depositRateRecordStart) public view returns (uint256) {
        uint256 depositRate = depositeRateIndex[_token][_depositRateRecordStart];
        uint256 UNIT = globalConfig.constants().INT_UNIT();
        if (depositRate == 0) {
            return UNIT;    // return UNIT if the checkpoint doesn't exist
        } else {
            // sichaoy: to check that the current block rate index already exist
            return depositeRateIndex[_token][globalConfig.savingAccount().getBlockNumber()].mul(UNIT).div(depositRate); // index(current block)/index(start block)
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
    function getBorrowAccruedRate(address _token, uint _borrowRateRecordStart) public view returns (uint256) {
        uint256 borrowRate = borrowRateIndex[_token][_borrowRateRecordStart];
        uint256 UNIT = globalConfig.constants().INT_UNIT();
        if (borrowRate == 0) {
            // when block is same
            return UNIT;
        } else {
            // rate change
            return borrowRateIndex[_token][globalConfig.savingAccount().getBlockNumber()].mul(UNIT).div(borrowRate);
        }
    }

    /**
     * Set a new rate index checkpoint.
     * @param _token token address
     * @dev The rate set at the checkpoint is the rate from the last checkpoint to this checkpoint
     */
    function newRateIndexCheckpoint(address _token) public onlySavingAccount{

        uint blockNumber = globalConfig.savingAccount().getBlockNumber();

        if (blockNumber == lastCheckpoint[_token])
            return;

        uint256 UNIT = globalConfig.constants().INT_UNIT();
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);

        // If it is the first check point, initialize the rate index
        if (lastCheckpoint[_token] == 0) {
            if(cToken == address(0)) {
                compoundPool[_token].supported = false;
                borrowRateIndex[_token][blockNumber] = UNIT;
                depositeRateIndex[_token][blockNumber] = UNIT;
                // Update the last checkpoint
                lastCheckpoint[_token] = blockNumber;
            }
            else {
                compoundPool[_token].supported = true;
                uint cTokenExchangeRate = ICToken(cToken).exchangeRateCurrent();
                // Get the curretn cToken exchange rate in Compound, which is need to calculate DeFiner's rate
                // sichaoy: How to deal with the issue capitalRatio is zero if looking forward (An estimation)
                compoundPool[_token].capitalRatio = getCapitalCompoundRatio(_token);
                compoundPool[_token].borrowRatePerBlock = ICToken(cToken).borrowRatePerBlock();  // initial value
                compoundPool[_token].depositRatePerBlock = ICToken(cToken).supplyRatePerBlock(); // initial value
                borrowRateIndex[_token][blockNumber] = UNIT;
                depositeRateIndex[_token][blockNumber] = UNIT;
                // Update the last checkpoint
                lastCheckpoint[_token] = blockNumber;
                lastCTokenExchangeRate[cToken] = cTokenExchangeRate;
            }

        } else {
            if(cToken == address(0)) {
                compoundPool[_token].supported = false;
                borrowRateIndex[_token][blockNumber] = borrowRateIndexNow(_token);
                depositeRateIndex[_token][blockNumber] = depositRateIndexNow(_token);
                // Update the last checkpoint
                lastCheckpoint[_token] = blockNumber;
            } else {
                compoundPool[_token].supported = true;
                uint cTokenExchangeRate = ICToken(cToken).exchangeRateCurrent();
                // Get the curretn cToken exchange rate in Compound, which is need to calculate DeFiner's rate
                compoundPool[_token].capitalRatio = getCapitalCompoundRatio(_token);
                compoundPool[_token].borrowRatePerBlock = ICToken(cToken).borrowRatePerBlock();
                compoundPool[_token].depositRatePerBlock = cTokenExchangeRate.mul(UNIT).div(lastCTokenExchangeRate[cToken])
                .sub(UNIT).div(blockNumber.sub(lastCheckpoint[_token]));
                borrowRateIndex[_token][blockNumber] = borrowRateIndexNow(_token);
                depositeRateIndex[_token][blockNumber] = depositRateIndexNow(_token);
                // Update the last checkpoint
                lastCheckpoint[_token] = blockNumber;
                lastCTokenExchangeRate[cToken] = cTokenExchangeRate;
            }
        }
        emit UpdateIndex(_token, depositeRateIndex[_token][block.number], borrowRateIndex[_token][block.number]);
    }

    /**
     * Calculate a token deposite rate of current block
     * @param _token token address
     * @dev This is an looking forward estimation from last checkpoint and not the exactly rate that the user will pay or earn.
     * change name to depositRateIndexForward? or EstimateDepositRateIndex?
     */
    function depositRateIndexNow(address _token) public view returns(uint) {
        uint256 lcp = lastCheckpoint[_token];
        uint256 UNIT = globalConfig.constants().INT_UNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lcp == 0)
            return UNIT;

        uint256 lastDepositeRateIndex = depositeRateIndex[_token][lcp];
        uint256 depositRatePerBlock = getDepositRatePerBlock(_token);
        // newIndex = oldIndex*(1+r*delta_block). If delta_block = 0, i.e. the last checkpoint is current block, index doesn't change.
        return lastDepositeRateIndex.mul(globalConfig.savingAccount().getBlockNumber().sub(lcp).mul(depositRatePerBlock).add(UNIT)).div(UNIT);
    }

    /**
     * Calculate a token borrow rate of current block
     * @param _token token address
     */
    function borrowRateIndexNow(address _token) public view returns(uint) {
        uint256 lcp = lastCheckpoint[_token];
        uint256 UNIT = globalConfig.constants().INT_UNIT();
        // If this is the first checkpoint, set the index be 1.
        if(lcp == 0)
            return UNIT;
        uint256 lastBorrowRateIndex = borrowRateIndex[_token][lcp];
        uint256 borrowRatePerBlock = getBorrowRatePerBlock(_token);
        return lastBorrowRateIndex.mul(globalConfig.savingAccount().getBlockNumber().sub(lcp).mul(borrowRatePerBlock).add(UNIT)).div(UNIT);
    }

    /**
	 * Get the state of the given token
     * @param _token token address
	 */
    function getTokenState(address _token) public view returns (uint256 deposits, uint256 loans, uint256 collateral){
        return (
        getTotalDepositStore(_token),
        totalLoans[_token],
        totalReserve[_token].add(totalCompound[globalConfig.tokenInfoRegistry().getCToken(_token)])
        );
    }
}
