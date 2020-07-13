pragma solidity 0.5.14;

// import { CToken } from "../Base.sol";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract MockCToken is ERC20Mintable, ERC20Burnable {
    using SafeMath for uint256;
    IERC20 public token;

    // TODO we can add Token name, symbol, decimals
    constructor(address _token) public {
        token = IERC20(_token);
    }

    function mint(uint mintAmount) external returns (uint) {
        token.transferFrom(msg.sender, address(this), mintAmount);

        _mint(msg.sender, mintAmount.div(1)); // mintAmount / exchangeRate
    }

    // TODO need to improve
    function redeemUnderlying(uint redeemAmount) external returns (uint) {
        burn(redeemAmount);
        // redeemAmount * exchangeRate
        uint256 finalRedeemAmount = redeemAmount.mul(1);
        token.transfer(msg.sender, finalRedeemAmount);
    }

    // TODO need to improve
    function redeem(uint redeemAmount) external returns (uint) {
        burn(redeemAmount);
        // redeemAmount * exchangeRate
        uint256 finalRedeemAmount = redeemAmount.mul(1);
        token.transfer(msg.sender, finalRedeemAmount);
    }

    function supplyRatePerBlock() external view returns (uint) {
        // Per block increase by 1
        return 1;
    }

    function borrowRatePerBlock() external view returns (uint) {
        return 1;
    }

    function exchangeRateStored() external view returns (uint) {
        return 1;
    }

    function getInterest() internal view returns (uint) {
        // TODO need to calculate interest according to block number
        return 1;
    }

    function balanceOfUnderlying(address owner) external returns (uint) {
        // TODO Need to improve
        return balanceOf(owner);
    }
}