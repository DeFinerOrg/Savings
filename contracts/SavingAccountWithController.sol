pragma solidity 0.5.14;

import "./SavingAccount.sol";
import { IController } from "./compound/ICompound.sol";

contract SavingAccountWithController  is SavingAccount {

    address comptroller;

    constructor(address[] memory tokenAddresses,
                address[] memory cTokenAddresses,
                address _chainlinkAddress,
                TokenInfoRegistry _tokenRegistry,
                GlobalConfig _globalConfig,
                address _comptroller
        ) SavingAccount(tokenAddresses, cTokenAddresses, _chainlinkAddress, _tokenRegistry, _globalConfig) public {
        comptroller = _comptroller;
    }

    function fastForward(uint blocks) public returns (uint) {
        return IController(comptroller).fastForward(blocks);
    }

    function getBlockNumber() public view returns (uint) {
        return IController(comptroller).getBlockNumber();
    }
}