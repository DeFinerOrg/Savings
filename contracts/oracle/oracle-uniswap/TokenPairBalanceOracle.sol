pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

interface IERC20 {
    function balanceOf(address owner) external view returns (uint);
}

contract TokenPairBalanceOracle {
    using SafeMath for uint256;

    // Oracle return the price of the `priceforToken` in `priceInToken` reference.
    // Example: priceInToken = WOKT
    //          priceforToken = DAI
    address public priceInToken;
    address public priceforToken;

    // Pair contract address
    address public pairContract;

    constructor(address _priceInToken, address _priceforToken, address _pairContract) public {
        priceInToken = _priceInToken;
        priceforToken = _priceforToken;
        pairContract = _pairContract;
    }

    function latestAnswer() public view returns (int256) {
        // Example: priceInToken = WOKT
        //          priceforToken = DAI
        uint priceInBal = IERC20(priceInToken).balanceOf(pairContract);
        uint priceForBal = IERC20(priceforToken).balanceOf(pairContract);
        // Example: `pairContract` contract has 2 WOKT and 200 DAI tokens.
        // 1 WOKT = $100, 1 DAI = $1
        // hence `latestAnswer` would return
        // balanceOf-WOKT / balanceOf-DAI
        // (2*(10^18)) * (10^18)  / (200 * (10^18)) = 10000000000000000 WOKT = 0.1 WOKT ( which is $1 in USD )
        // `latestAnswer` would return 10000000000000000 WOKT = 0.1 WOKT
        return int(priceInBal.mul(10 ** 18).div(priceForBal));
    }
}