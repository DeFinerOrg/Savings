pragma solidity 0.5.14;

interface ICTokenV1 {
    function supplyRatePerBlock() external view returns (uint);
    function borrowRatePerBlock() external view returns (uint);
    function mint(uint mintAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function redeem(uint redeemAmount) external returns (uint);
    function exchangeRateStore() external view returns (uint);
    function exchangeRateCurrent() external returns (uint);
    function balanceOf(address owner) external view returns (uint256);
    function balanceOfUnderlying(address owner) external returns (uint);
}

interface ICETHV1{
    function mint() external payable;
}

interface IControllerV1 {
    function fastForward(uint blocks) external returns (uint);
    function getBlockNumber() external view returns (uint);
}
