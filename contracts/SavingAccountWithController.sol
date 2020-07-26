pragma solidity 0.5.14;

import "./SavingAccount.sol";
import { IController } from "./compound/ICompound.sol";

contract SavingAccountWithController  is SavingAccount {

    address comptroller;

    constructor(address _comptroller) SavingAccount() public {
        comptroller = _comptroller;
    }

    function fastForward(uint blocks) public returns (uint) {
        return IController(comptroller).fastForward(blocks);
    }

    function getBlockNumber() public view returns (uint) {
        return IController(comptroller).getBlockNumber();
    }
}