pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../registry/TokenInfoRegistry.sol";

contract GlobalConfig is Ownable {
    uint256 public communityFundRatio = 10;
    uint256 public minReserveRatio = 10;
    uint256 public maxReserveRatio = 20;
    uint256 public liquidationThreshold = 85;
    uint256 public liquidationDiscountRatio = 95;

    mapping(address => bool) public isTokenFeeCharged;

    function updateCommunityFundRatio(uint256 _communityFundRatio) external onlyOwner {
        require(_communityFundRatio != 0, "Community fund is zero");
        communityFundRatio = _communityFundRatio;
    }

    function updateMinReserveRatio(uint256 _minReserveRatio) external onlyOwner {
        require(_minReserveRatio != 0, "Min Reserve Ratio is zero");
        require(_minReserveRatio < maxReserveRatio, "Min reserve greater or equal to Max reserve");
        minReserveRatio = _minReserveRatio;
    }

    function updateMaxReserveRatio(uint256 _maxReserveRatio) external onlyOwner {
        require(_maxReserveRatio != 0, "Max Reserve Ratio is zero");
        require(_maxReserveRatio > minReserveRatio, "Max reserve less than or equal to Min reserve");
        maxReserveRatio = _maxReserveRatio;
    }

    function updateLiquidationThreshold(uint256 _liquidationThreshold) external onlyOwner {
        require(_liquidationThreshold != 0, "LiquidationThreshold is zero");
        liquidationThreshold = _liquidationThreshold;
    }

    function updateLiquidationDiscountRatio(uint256 _liquidationDiscountRatio) external onlyOwner {
        require(_liquidationDiscountRatio != 0, "LiquidationDiscountRatio is zero");
        liquidationDiscountRatio = _liquidationDiscountRatio;
    }

    function midReserveRatio() public view returns(uint256){
        return (minReserveRatio + maxReserveRatio) / 2;
    }

    function updateTokenFeeCharged(address _token, bool _tokenFeeCharged) external onlyOwner {
        isTokenFeeCharged[_token] = _tokenFeeCharged;
    }

}