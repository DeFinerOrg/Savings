pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

interface IERC20{
    function balanceOf(address owner) external view returns (uint);
    function totalSupply() external view returns (uint256);
}

contract OKTPerLPToken {
    using SafeMath for uint256;
    uint256 public constant UNIT = 10 ** 18;

    address public WOKT = 0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15;
    // FIN-SushiSwap_LP Token
    address public FIN_LP = 0x2bE36b6D2153444061E66F43f151aE8d9af7F93C;

    function latestAnswer() public view returns (int256){
        uint balance = IERC20(WOKT).balanceOf(FIN_LP);
        uint totalSupply = IERC20(FIN_LP).totalSupply();
        return int(balance.mul(2).mul(UNIT).div(totalSupply));
    }
}