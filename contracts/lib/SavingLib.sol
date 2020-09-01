pragma solidity 0.5.14;

import "../config/GlobalConfig.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./Utils.sol";
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
        if (Utils._isETH(address(globalConfig), _token)) {
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
        if (Utils._isETH(address(globalConfig), _token)) {
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
        if (Utils._isETH(address(globalConfig), _token)) {
            msg.sender.transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

    
     // sichaoy: should not be public, why cannot we find _tokenIndex from token address?
    function deposit(GlobalConfig globalConfig, address _to, address _token, uint256 _amount, uint256 _blockNumber) public {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Update tokenInfo. Add the _amount to principal, and update the last deposit block in tokenInfo
        globalConfig.accounts().deposit(_to, _token, _amount, _blockNumber);

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        uint compoundAmount = globalConfig.bank().update(_token, _amount, uint8(0));
        if(compoundAmount > 0) {
            toCompound(globalConfig, _token, compoundAmount);   
        }
    }

    /**
     * Withdraw a token from an address
     * @param _from address to be withdrawn from
     * @param _token token address
     * @param _amount amount to be withdrawn
     * @return The actually amount withdrawed, which will be the amount requested minus the commission fee.
     */
    function withdraw(GlobalConfig globalConfig, address _from, address _token, uint256 _amount, uint256 _blockNumber) public returns(uint) {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Withdraw from the account
        uint amount = globalConfig.accounts().withdraw(_from, _token, _amount, _blockNumber);

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        uint compoundAmount = globalConfig.bank().update(_token, _amount, uint8(1));

        // Check if there are enough tokens in the pool.
        require(globalConfig.bank().getPoolAmount(_token) >= _amount, "Lack of liquidity.");
        if(compoundAmount > 0) {
            fromCompound(globalConfig, _token, compoundAmount);
        }

        return amount;
    }

    // ============================================
    // EMERGENCY WITHDRAWAL FUNCTIONS
    // Needs to be removed when final version deployed
    // ============================================
    function emergencyWithdraw(GlobalConfig globalConfig, address _token) public {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        if(Utils._isETH(address(globalConfig), _token)) {
            // uint256 success = ICToken(cToken).redeem(ICToken(cToken).balanceOf(address(this)));
            require(ICToken(cToken).redeem(ICToken(cToken).balanceOf(address(this))) == 0, "redeem ETH failed");
            globalConfig.constants().EMERGENCY_ADDR().transfer(address(this).balance);
        } else {
            // uint256 success = ICToken(cToken).redeem(ICToken(cToken).balanceOf(address(this)));
            if(cToken != address(0)) {
                require(ICToken(cToken).redeem(ICToken(cToken).balanceOf(address(this))) == 0, "redeem Token failed");
            }
            // uint256 amount = IERC20(_token).balanceOf(address(this));
            require(IERC20(_token).transfer(globalConfig.constants().EMERGENCY_ADDR(), IERC20(_token).balanceOf(address(this))), "transfer failed");
        }
    }

}