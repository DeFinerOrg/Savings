// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

contract FixedOracle {
    function latestAnswer() public pure returns (int256) {
        return 1 ether;
    }
}