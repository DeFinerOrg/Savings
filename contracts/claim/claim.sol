pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract Receive is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    mapping(address => uint256) public winner;
    address public FIN = 0x054f76beED60AB6dBEb23502178C52d6C5dEbE40;
    address admin = msg.sender;
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "The caller is not the admin.");
        _;
    }
    
    function addWinners(address[] memory _winners, uint256[] memory _amounts) public onlyAdmin{
        require(_winners.length == _amounts.length, "_winners and _amounts are not equal in length.");
        for(uint i; i < _winners.length; i++){
            winner[_winners[i]] = winner[_winners[i]].add(_amounts[i]);
        }
    }
    
    function receive() public nonReentrant{
        require(tx.origin == msg.sender, "The caller does not exist.");
        uint256 amount = winner[msg.sender];
        if(amount == 0) return;
        IERC20(FIN).safeTransfer(msg.sender, amount);
        winner[msg.sender] = 0;
    }
    
    function emergencyExit() public onlyAdmin{
        IERC20(FIN).safeTransfer(msg.sender, IERC20(FIN).balanceOf(address(this)));
    }
    
    function changeAdmin(address _admin) public onlyAdmin{
        admin = _admin;
    }
}