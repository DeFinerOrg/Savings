// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

contract Constant {
    enum ActionType { DepositAction, WithdrawAction, BorrowAction, RepayAction, LiquidateRepayAction }
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    uint256 public constant INT_UNIT = 10 ** uint256(18);
    uint256 public constant ACCURACY = 10 ** 18;
    // BSC mainnet blocks per year
    uint256 public constant BLOCKS_PER_YEAR = 10512000;
}
