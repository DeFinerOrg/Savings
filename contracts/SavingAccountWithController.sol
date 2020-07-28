pragma solidity 0.5.14;

import "./SavingAccount.sol";
import { IController } from "./compound/ICompound.sol";

contract SavingAccountWithController  is SavingAccount {

    address comptroller;

    constructor() public {
        // DO NOT ADD ANY LOGIC HERE.
        // THIS IS AN UPGRADABLE CONTRACT
    }

    function initialize(
        address[] memory tokenAddresses,
        address _chainlinkAddress,
        TokenInfoRegistry _tokenRegistry,
        GlobalConfig _globalConfig,
        address _comptroller
    ) public initializer {
        super.initialize(tokenAddresses, _chainlinkAddress, _tokenRegistry, _globalConfig);
        comptroller = _comptroller;
    }

    function fastForward(uint blocks) public returns (uint) {
        return IController(comptroller).fastForward(blocks);
    }

    function getBlockNumber() public view returns (uint) {
        return IController(comptroller).getBlockNumber();
    }
}