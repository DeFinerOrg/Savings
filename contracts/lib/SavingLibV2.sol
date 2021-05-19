pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "../config/GlobalConfigV2.sol";
import "./UtilsV2.sol";

library SavingLibV2 {
    using SafeERC20 for IERC20;

    /**
     * Receive the amount of token from msg.sender
     * @param _amount amount of token
     * @param _token token address
     */
    function receive(GlobalConfigV2 globalConfig, uint256 _amount, address _token) public {
        if (UtilsV2._isETH(address(globalConfig), _token)) {
            require(msg.value == _amount, "The amount is not sent from address.");
        } else {
            //When only tokens received, msg.value must be 0
            require(msg.value == 0, "msg.value must be 0 when receiving tokens");
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }
    }

    /**
     * Send the amount of token to an address
     * @param _amount amount of token
     * @param _token token address
     */
    function send(GlobalConfigV2 globalConfig, uint256 _amount, address _token) public {
        if (UtilsV2._isETH(address(globalConfig), _token)) {
            msg.sender.transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

}