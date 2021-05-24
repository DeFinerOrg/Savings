pragma solidity 0.5.14;

import "../BankV1.sol";
import { IController } from "../compound/ICompoundV1.sol";

contract BankWithControllerV1 is BankV1 {

    address comptroller;

    function initialize(
        GlobalConfigV1 _globalConfig,
        address _comptroller
    ) public initializer {
        super.initialize(_globalConfig); // expected 3 passed 5 args
        comptroller = _comptroller;
    }

    function getBlockNumber() private view returns (uint) {
        return IController(comptroller).getBlockNumber();
    }
}