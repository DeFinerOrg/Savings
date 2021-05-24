pragma solidity 0.5.14;

import "../BankV1_1.sol";
import { IControllerV1_1 } from "../compound/ICompoundV1_1.sol";

contract BankWithControllerV1_1 is BankV1_1 {

    address comptroller;

    function initialize(
        GlobalConfigV1_1 _globalConfig,
        address _comptroller
    ) external initializer {
        super.initialize(_globalConfig); // expected 3 passed 5 args
        comptroller = _comptroller;
    }

    function getBlockNumber() private view returns (uint) {
        return IControllerV1_1(comptroller).getBlockNumber();
    }
}