pragma solidity 0.5.14;

interface IBlockNumber {
    function getBlockNumber() external view returns (uint);
    function toCompound(address _token, uint _amount) external;
    function fromCompound(address _token, uint _amount) external;
}