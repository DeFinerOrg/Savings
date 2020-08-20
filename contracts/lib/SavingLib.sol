pragma solidity 0.5.14;

import "../config/GlobalConfig.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import { ICToken } from "../compound/ICompound.sol";
import { ICETH } from "../compound/ICompound.sol";

library SavingLib {
    using SafeERC20 for IERC20;

    /**
     * Deposit token to Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function toCompound(GlobalConfig globalConfig, address _token, uint _amount) public {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        if (globalConfig.tokenInfoRegistry()._isETH(_token)) {
            ICETH(cToken).mint.value(_amount)();
        } else {
            // uint256 success = ICToken(cToken).mint(_amount);
            require(ICToken(cToken).mint(_amount) == 0, "mint failed");
        }
    }

    /**
     * Withdraw token from Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function fromCompound(GlobalConfig globalConfig, address _token, uint _amount) public {
        // address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        // uint256 success = ICToken(cToken).redeemUnderlying(_amount);
        require(ICToken(globalConfig.tokenInfoRegistry().getCToken(_token)).redeemUnderlying(_amount) == 0, "redeemUnderlying failed");
    }

    /**
     * Receive the amount of token from msg.sender
     * @param _amount amount of token
     * @param _token token address
     */
    function receive(GlobalConfig globalConfig, uint256 _amount, address _token) public {
        if (globalConfig.tokenInfoRegistry()._isETH(_token)) {
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
    function send(GlobalConfig globalConfig, uint256 _amount, address _token) public {
        if (globalConfig.tokenInfoRegistry()._isETH(_token)) {
            msg.sender.transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _to the account that the token deposit to.
     * @param _token the address of the deposited token
     * @param _amount the amount of the deposited token
     */
     // sichaoy: should not be public, why cannot we find _tokenIndex from token address?
    function deposit(GlobalConfig globalConfig, address _to, address _token, uint256 _amount) public {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Update tokenInfo. Add the _amount to principal, and update the last deposit block in tokenInfo
        globalConfig.accounts().deposit(_to, _token, _amount, address(this).getBlockNumber());

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
//        globalConfig.bank().updateTotalCompound(_token);
//        globalConfig.bank().updateTotalLoan(_token);
//        uint compoundAmount = globalConfig.bank().updateTotalReserve(_token, _amount, globalConfig.bank().Deposit()); // Last parameter false means deposit token
        uint compoundAmount = globalConfig.bank().update(_token, _amount, globalConfig.bank().Deposit());
        SavingLib.toCompound(globalConfig, _token, compoundAmount);
    }

}