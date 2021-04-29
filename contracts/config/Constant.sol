pragma solidity 0.5.14;

contract Constant {
    enum ActionType { DepositAction, WithdrawAction, BorrowAction, RepayAction }
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    uint256 public constant INT_UNIT = 10 ** uint256(18);
    uint256 public constant ACCURACY = 10 ** 18;
    uint256 public constant BLOCKS_PER_YEAR = 2102400;
    address public constant COMP_ADDR = 0xc00e94Cb662C3520282E6f5717214004A7f26888; // mainnet
}
