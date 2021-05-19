pragma solidity 0.5.14;

import "../BankV2.sol";
import { IController } from "../compound/ICompoundV2.sol";

contract BankWithControllerV2 is BankV2 {

    address comptroller;

    function initialize(
        GlobalConfigV2 _globalConfig,
        address _comptroller
    ) external initializer {
        super.initialize(_globalConfig); // expected 3 passed 5 args
        comptroller = _comptroller;
    }

    function getBlockNumber() private view returns (uint) {
        return IController(comptroller).getBlockNumber();
    }
}