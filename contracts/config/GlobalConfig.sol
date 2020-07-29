pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../registry/TokenInfoRegistry.sol";

contract GlobalConfig is Ownable {
    using SafeMath for uint256;

    uint256 public communityFundRatio = 10;
    uint256 public minReserveRatio = 10;
    uint256 public maxReserveRatio = 20;
    uint256 public liquidationThreshold = 85;
    uint256 public liquidationDiscountRatio = 95;
    address payable public deFinerCommunityFund;
    address public compoundAddress;

    /**
     * Update the community fund (commision fee) ratio.
     * @param _communityFundRatio the new ratio
     */
    function updateCommunityFundRatio(uint256 _communityFundRatio) external onlyOwner {
        require(_communityFundRatio != 0, "Community fund is zero");
        communityFundRatio = _communityFundRatio;
    }

    /**
     * Update the minimum reservation reatio
     * @param _minReserveRatio the new value of the minimum reservation ratio
     */
    function updateMinReserveRatio(uint256 _minReserveRatio) external onlyOwner {
        require(_minReserveRatio != 0, "Min Reserve Ratio is zero");
        require(_minReserveRatio < maxReserveRatio, "Min reserve greater or equal to Max reserve");
        minReserveRatio = _minReserveRatio;
    }

    /**
     * Update the maximum reservation reatio
     * @param _maxReserveRatio the new value of the maximum reservation ratio
     */
    function updateMaxReserveRatio(uint256 _maxReserveRatio) external onlyOwner {
        require(_maxReserveRatio != 0, "Max Reserve Ratio is zero");
        require(_maxReserveRatio > minReserveRatio, "Max reserve less than or equal to Min reserve");
        maxReserveRatio = _maxReserveRatio;
    }

    /**
     * Update the liquidation threshold, i.e. the LTV that will trigger the liquidation.
     * @param _liquidationThreshold the new threshhold value
     */
    function updateLiquidationThreshold(uint256 _liquidationThreshold) external onlyOwner {
        require(_liquidationThreshold != 0, "LiquidationThreshold is zero");
        liquidationThreshold = _liquidationThreshold;
    }

    /**
     * Update the liquidation discount
     * @param _liquidationDiscountRatio the new liquidation discount
     */
    function updateLiquidationDiscountRatio(uint256 _liquidationDiscountRatio) external onlyOwner {
        require(_liquidationDiscountRatio != 0, "LiquidationDiscountRatio is zero");
        liquidationDiscountRatio = _liquidationDiscountRatio;
    }

    /**
     * Medium value of the reservation ratio, which is the value that the pool try to maintain.
     */
    function midReserveRatio() public view returns(uint256){
        return minReserveRatio.add(maxReserveRatio).div(2);
    }

    function updateDeFinerCommunityFund(address _deFinerCommunityFund) external onlyOwner {
        require(_deFinerCommunityFund != address(0x0), "deFinerCommunityFund is zero");
        deFinerCommunityFund = _deFinerCommunityFund;
    }

    function updateCompoundAddress(address _compoundAddress) external onlyOwner {
        require(_compoundAddress != address(0x0), "compoundAddress is zero");
        compoundAddress = _compoundAddress;
    }

}