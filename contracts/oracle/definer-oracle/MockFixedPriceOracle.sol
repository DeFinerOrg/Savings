pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract MockFixedPriceOracle is Ownable {

    uint256 public price;

    constructor(uint256 _price) public {
        price = _price;
    }

    function updatePrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    function latestAnswer() public view returns (int256) {
        return toInt256(price);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        require(value < uint256(-1), "value doesn\'t fit in 256 bits");
        return int256(value);
    }
}