pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract Claim is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;
    
    bytes32 public SYMBOL_FIN = keccak256(abi.encode("FIN"));
    bytes32 public NAME_FIN = keccak256(abi.encode("DeFiner"));

    mapping(address => uint256) public winner;
    IERC20 public FIN;

    constructor(address _finAddr) public {
        require(_finAddr.isContract(), "_finAddr not a contract");
        ERC20Detailed FINToken = ERC20Detailed(_finAddr);

        bytes32 symbol_fin_keccak = keccak256(abi.encode(FINToken.symbol()));
        require(symbol_fin_keccak == SYMBOL_FIN, "FIN token symbol doesn't match");

        bytes32 name_fin_keccak = keccak256(abi.encode(FINToken.name()));
        require(name_fin_keccak == NAME_FIN, "FIN token name doesn't match");

        uint256 decimals = FINToken.decimals();
        require(decimals == 18, "decimals doesn't match");
        
        FIN = IERC20(_finAddr);
    }
        
    function addWinners(address[] memory _winners, uint256[] memory _amounts) public onlyOwner {
        require(_winners.length == _amounts.length, "array length not match");
        for(uint i; i < _winners.length; i++){
            winner[_winners[i]] = winner[_winners[i]].add(_amounts[i]);
        }
    }
    
    function receive() public {
        require(tx.origin == msg.sender, "Contract not allowed");
        uint256 amount = winner[msg.sender];
        if(amount == 0) return;
        winner[msg.sender] = 0;
        FIN.safeTransfer(msg.sender, amount);
    }
    
    function emergencyExit() public onlyOwner {
        FIN.safeTransfer(owner(), FIN.balanceOf(address(this)));
    }

    function emergencyExit(address _token, uint256 _amount) public onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    function emergencyExitETH() public onlyOwner {
        address payable payableOwner = address(uint160(owner()));
        payableOwner.transfer(address(this).balance);
    }
}