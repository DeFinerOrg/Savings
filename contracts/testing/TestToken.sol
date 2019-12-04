pragma solidity >= 0.5.0 < 0.6.0;

import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract TestToken is ERC20Mintable, ERC20Detailed {

    constructor() ERC20Detailed("DefinerTestToken", "DTT", 18) public {
        _mint(msg.sender, 0);
    }
}