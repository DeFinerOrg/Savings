<<<<<<< HEAD
=======
// SPDX-License-Identifier: BUSL-1.1
>>>>>>> master-fork
pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../registry/TokenRegistryV1_1.sol";
import "../SavingAccountV1_1.sol";
import "../BankV1_1.sol";
import "../AccountsV1_1.sol";
import "./ConstantV1_1.sol";
// import "@nomiclabs/buidler/console.sol";
import "../oracle/ChainLinkAggregatorV1_1.sol";

contract GlobalConfigV1_1 is Ownable {
    using SafeMath for uint256;

    uint256 public communityFundRatio = 10;
    uint256 public minReserveRatio = 10;
    uint256 public maxReserveRatio = 20;
    uint256 public liquidationThreshold = 85;
    uint256 public liquidationDiscountRatio = 95;
    uint256 public compoundSupplyRateWeights = 4;
    uint256 public compoundBorrowRateWeights = 6;
    uint256 public rateCurveSlope = 15 * 10 ** 16;
    uint256 public rateCurveConstant = 3 * 10 ** 16;
    uint256 public deFinerRate = 10;
    address payable public deFinerCommunityFund = msg.sender;

    BankV1_1 public bank;                               // the Bank contract
    SavingAccountV1_1 public savingAccount;             // the SavingAccount contract
    TokenRegistryV1_1 public tokenInfoRegistry;     // the TokenRegistry contract
    AccountsV1_1 public accounts;                       // the Accounts contract
    ConstantV1_1 public constants;                      // the constants contract
    ChainLinkAggregatorV1_1 public chainLink;

    event CommunityFundRatioUpdated(uint256 indexed communityFundRatio);
    event MinReserveRatioUpdated(uint256 indexed minReserveRatio);
    event MaxReserveRatioUpdated(uint256 indexed maxReserveRatio);
    event LiquidationThresholdUpdated(uint256 indexed liquidationThreshold);
    event LiquidationDiscountRatioUpdated(uint256 indexed liquidationDiscountRatio);
    event CompoundSupplyRateWeightsUpdated(uint256 indexed compoundSupplyRateWeights);
    event CompoundBorrowRateWeightsUpdated(uint256 indexed compoundBorrowRateWeights);
    event rateCurveSlopeUpdated(uint256 indexed rateCurveSlope);
    event rateCurveConstantUpdated(uint256 indexed rateCurveConstant);
    event ConstantUpdated(address indexed constants);
    event BankUpdated(address indexed bank);
    event SavingAccountUpdated(address indexed savingAccount);
    event TokenInfoRegistryUpdated(address indexed tokenInfoRegistry);
    event AccountsUpdated(address indexed accounts);
    event DeFinerCommunityFundUpdated(address indexed deFinerCommunityFund);
    event DeFinerRateUpdated(uint256 indexed deFinerRate);
    event ChainLinkUpdated(address indexed chainLink);


    function initialize(
        BankV1_1 _bank,
        SavingAccountV1_1 _savingAccount,
        TokenRegistryV1_1 _tokenInfoRegistry,
        AccountsV1_1 _accounts,
        ConstantV1_1 _constants,
        ChainLinkAggregatorV1_1 _chainLink
    ) public onlyOwner {
        bank = _bank;
        savingAccount = _savingAccount;
        tokenInfoRegistry = _tokenInfoRegistry;
        accounts = _accounts;
        constants = _constants;
        chainLink = _chainLink;
    }

    /**
     * Update the community fund (commision fee) ratio.
     * @param _communityFundRatio the new ratio
     */
    function updateCommunityFundRatio(uint256 _communityFundRatio) external onlyOwner {
        if (_communityFundRatio == communityFundRatio)
            return;

        require(_communityFundRatio > 0 && _communityFundRatio < 100,
            "Invalid community fund ratio.");
        communityFundRatio = _communityFundRatio;

        emit CommunityFundRatioUpdated(_communityFundRatio);
    }

    /**
     * Update the minimum reservation reatio
     * @param _minReserveRatio the new value of the minimum reservation ratio
     */
    function updateMinReserveRatio(uint256 _minReserveRatio) external onlyOwner {
        if (_minReserveRatio == minReserveRatio)
            return;

        require(_minReserveRatio > 0 && _minReserveRatio < maxReserveRatio,
            "Invalid min reserve ratio.");
        minReserveRatio = _minReserveRatio;

        emit MinReserveRatioUpdated(_minReserveRatio);
    }

    /**
     * Update the maximum reservation reatio
     * @param _maxReserveRatio the new value of the maximum reservation ratio
     */
    function updateMaxReserveRatio(uint256 _maxReserveRatio) external onlyOwner {
        if (_maxReserveRatio == maxReserveRatio)
            return;

        require(_maxReserveRatio > minReserveRatio && _maxReserveRatio < 100,
            "Invalid max reserve ratio.");
        maxReserveRatio = _maxReserveRatio;

        emit MaxReserveRatioUpdated(_maxReserveRatio);
    }

    /**
     * Update the liquidation threshold, i.e. the LTV that will trigger the liquidation.
     * @param _liquidationThreshold the new threshhold value
     */
    function updateLiquidationThreshold(uint256 _liquidationThreshold) external onlyOwner {
        if (_liquidationThreshold == liquidationThreshold)
            return;

        require(_liquidationThreshold > 0 && _liquidationThreshold < liquidationDiscountRatio,
            "Invalid liquidation threshold.");
        liquidationThreshold = _liquidationThreshold;

        emit LiquidationThresholdUpdated(_liquidationThreshold);
    }

    /**
     * Update the liquidation discount
     * @param _liquidationDiscountRatio the new liquidation discount
     */
    function updateLiquidationDiscountRatio(uint256 _liquidationDiscountRatio) external onlyOwner {
        if (_liquidationDiscountRatio == liquidationDiscountRatio)
            return;

        require(_liquidationDiscountRatio > liquidationThreshold && _liquidationDiscountRatio < 100,
            "Invalid liquidation discount ratio.");
        liquidationDiscountRatio = _liquidationDiscountRatio;

        emit LiquidationDiscountRatioUpdated(_liquidationDiscountRatio);
    }

    /**
     * Medium value of the reservation ratio, which is the value that the pool try to maintain.
     */
    function midReserveRatio() public view returns(uint256){
        return minReserveRatio.add(maxReserveRatio).div(2);
    }

    function updateCompoundSupplyRateWeights(uint256 _compoundSupplyRateWeights) external onlyOwner{
        compoundSupplyRateWeights = _compoundSupplyRateWeights;

        emit CompoundSupplyRateWeightsUpdated(_compoundSupplyRateWeights);
    }

    function updateCompoundBorrowRateWeights(uint256 _compoundBorrowRateWeights) external onlyOwner{
        compoundBorrowRateWeights = _compoundBorrowRateWeights;

        emit CompoundBorrowRateWeightsUpdated(_compoundBorrowRateWeights);
    }

    function updaterateCurveSlope(uint256 _rateCurveSlope) external onlyOwner{
        rateCurveSlope = _rateCurveSlope;

        emit rateCurveSlopeUpdated(_rateCurveSlope);
    }

    function updaterateCurveConstant(uint256 _rateCurveConstant) external onlyOwner{
        rateCurveConstant = _rateCurveConstant;

        emit rateCurveConstantUpdated(_rateCurveConstant);
    }

    function updateBank(BankV1_1 _bank) external onlyOwner{
        bank = _bank;

        emit BankUpdated(address(_bank));
    }

    function updateSavingAccount(SavingAccountV1_1 _savingAccount) external onlyOwner{
        savingAccount = _savingAccount;

        emit SavingAccountUpdated(address(_savingAccount));
    }

    function updateTokenInfoRegistry(TokenRegistryV1_1 _tokenInfoRegistry) external onlyOwner{
        tokenInfoRegistry = _tokenInfoRegistry;

        emit TokenInfoRegistryUpdated(address(_tokenInfoRegistry));
    }

    function updateAccounts(AccountsV1_1 _accounts) external onlyOwner{
        accounts = _accounts;

        emit AccountsUpdated(address(_accounts));
    }

    function updateConstant(ConstantV1_1 _constants) external onlyOwner{
        constants = _constants;

        emit ConstantUpdated(address(_constants));
    }

    function updatedeFinerCommunityFund(address payable _deFinerCommunityFund) external onlyOwner{
        deFinerCommunityFund = _deFinerCommunityFund;

        emit DeFinerCommunityFundUpdated(_deFinerCommunityFund);
    }

    function updatedeFinerRate(uint256 _deFinerRate) external onlyOwner{
        require(_deFinerRate <= 100,"_deFinerRate cannot exceed 100");
        deFinerRate = _deFinerRate;

        emit DeFinerRateUpdated(_deFinerRate);
    }

    function updateChainLink(ChainLinkAggregatorV1_1 _chainLink) external onlyOwner{
        chainLink = _chainLink;

        emit ChainLinkUpdated(address(_chainLink));
    }

}