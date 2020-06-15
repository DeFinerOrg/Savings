pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract GlobalConfig is Ownable {
    uint256 public communityFundRatio = 10;
    uint256 public minReserveRatio = 10;
    uint256 public maxReserveRatio = 20;

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

}