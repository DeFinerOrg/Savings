pragma solidity 0.5.14;

import { ERC20Detailed } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import { ERC20Mintable } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract MockERC20 is ERC20Detailed, ERC20Mintable {

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialiSupply
    )
        public
        ERC20Detailed(
            name,
            symbol,
            decimals
        )
    {
        uint256 tokens = initialiSupply * (10 ** uint256(decimals));
        mint(msg.sender, tokens);
    }
}