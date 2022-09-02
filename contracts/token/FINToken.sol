// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

import { ERC20Detailed } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import { ERC20 } from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract FINToken is ERC20Detailed, ERC20 {

    uint256 constant TOTAL_SUPPLY = 168_000_000 ether;

    constructor() public ERC20Detailed("DeFiner", "FIN", 18) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}