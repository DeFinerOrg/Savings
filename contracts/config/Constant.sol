// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

contract Constant {
    enum ActionType { DepositAction, WithdrawAction, BorrowAction, RepayAction }
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    uint256 public constant INT_UNIT = 10 ** uint256(18);
    uint256 public constant ACCURACY = 10 ** 18;
    // OKExChain blocks per year as per 3 sec per block
    uint256 public constant BLOCKS_PER_YEAR = 10512000;
}
