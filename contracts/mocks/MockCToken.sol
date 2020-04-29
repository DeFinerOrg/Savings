pragma solidity 0.5.11;

// import { CToken } from "../Base.sol";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

contract MockCToken is ERC20Mintable, ERC20Burnable {

    constructor() public {

    }

    function mint(uint mintAmount) external returns (uint) {
        mint(msg.sender, mintAmount);
        //TODO
    }

    function redeemUnderlying(uint redeemAmount) external returns (uint) {
        //TODO
    }

    function redeem(uint redeemAmount) external returns (uint) {
        burn(redeemAmount);
        //TODO
    }

    function balanceOf(address owner) public view returns (uint256) {
        //TODO
    }

    function supplyRatePerBlock() external view returns (uint) {
        //TODO
    }

    function borrowRatePerBlock() external view returns (uint) {
        //TODO
    }

    function exchangeRateStored() external view returns (uint) {
        //TODO
    }
}