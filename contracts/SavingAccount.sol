pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./registry/TokenRegistry.sol";
import "./config/Constant.sol";
import "./config/GlobalConfig.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./InitializableReentrancyGuard.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";

contract SavingAccount is Initializable, InitializableReentrancyGuard, Pausable, Constant {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    GlobalConfig public globalConfig;
    mapping(address => uint256) public deFinerFund;

    // Following are the constants, initialized via upgradable proxy contract
    // This is emergency address to allow withdrawal of funds from the contract

    event Transfer(address indexed token, address from, address to, uint256 amount);
    event Borrow(address indexed token, address from, address to, uint256 amount);
    event Repay(address indexed token, address from, address to, uint256 amount);
    event Deposit(address indexed token, address from, address to, uint256 amount);
    event Withdraw(address indexed token, address from, address to, uint256 amount);
    event WithdrawAll(address indexed token, address from, address to, uint256 amount);

    modifier onlyEmergencyAddress() {
        require(msg.sender == EMERGENCY_ADDR, "User not authorized");
        _;
    }

    modifier onlyValidToken(address _token) {
        if(!_isETH(_token)) {
            require(globalConfig.tokenInfoRegistry().isTokenExist(_token), "Unsupported token");
        }
        require(globalConfig.tokenInfoRegistry().isTokenEnabled(_token), "The token is not enabled");
        _;
    }

    constructor() public {
        // THIS SHOULD BE EMPTY FOR UPGRADABLE CONTRACTS
    }

    /**
     * Initialize function to be called by the Deployer for the first time
     * @param _tokenAddresses list of token addresses
     * @param _cTokenAddresses list of corresponding cToken addresses
     * @param _globalConfig global configuration contract
     */
    function initialize(
        address[] memory _tokenAddresses,
        address[] memory _cTokenAddresses,
        GlobalConfig _globalConfig
    )
        public
        initializer
    {
        // Initialize InitializableReentrancyGuard
        super._initialize();

        globalConfig = _globalConfig;

        require(_tokenAddresses.length == _cTokenAddresses.length, "Token and cToken length don't match.");
        for(uint i = 0;i < _tokenAddresses.length;i++) {
            if(_cTokenAddresses[i] != address(0x0) && _tokenAddresses[i] != ETH_ADDR) {
                approveAll(_tokenAddresses[i]);
            }
        }
    }

    /**
     * Approve transfer of all available tokens
     * @param _token token address
     */
    function approveAll(address _token) public {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        require(cToken != address(0x0), "cToken address is zero");
        IERC20(_token).safeApprove(cToken, 0);
        IERC20(_token).safeApprove(cToken, uint256(-1));
    }

    /**
     * Get current block number
     * @return the current block number
     */
    function getBlockNumber() public view returns (uint) {
        return block.number;
    }

    /**
     * Transfer the token between users inside DeFiner
     * @param _to the address that the token be transfered to
     * @param _token token address
     * @param _amount amout of tokens transfer
     */
    function transfer(address _to, address _token, uint _amount) public onlyValidToken(_token) whenNotPaused nonReentrant {
        // sichaoy: what if withdraw fails?
        // baseVariable.withdraw(msg.sender, _token, _amount, symbols);
        uint256 amount =  withdraw(msg.sender, _token, _amount);
        deposit(_to, _token, amount);

        emit Transfer(_token, msg.sender, _to, amount);
    }

    /**
     * Borrow the amount of token from the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     */
    function borrow(address _token, uint256 _amount) public onlyValidToken(_token) whenNotPaused nonReentrant {

        require(_amount != 0, "Amount is zero");
        require(globalConfig.accounts().isUserHasAnyDeposits(msg.sender), "The user doesn't have any deposits.");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Check if there are enough collaterals after withdraw
        uint divisor = INT_UNIT;
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(_token));
        }
        require(
            globalConfig.accounts().getBorrowETH(msg.sender).add(
                _amount.mul(globalConfig.tokenInfoRegistry().priceFromAddress(_token)).div(divisor)
            )
            <= globalConfig.accounts().getBorrowPower(msg.sender), "Insufficient collateral when borrow.");

        // sichaoy: all the sanity checks should be before the operations???
        // Check if there are enough tokens in the pool.
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        require(globalConfig.bank().totalReserve(_token).add(globalConfig.bank().totalCompound(cToken)) >= _amount, "Lack of liquidity.");

        // Update tokenInfo for the user
        globalConfig.accounts().borrow(msg.sender, _token, _amount, getBlockNumber());

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        globalConfig.bank().updateTotalCompound(_token);
        globalConfig.bank().updateTotalLoan(_token);
        uint compoundAmount = globalConfig.bank().updateTotalReserve(_token, _amount, globalConfig.bank().Borrow()); // Last parameter false means withdraw token
        fromCompound(_token, compoundAmount);

        // Transfer the token on Ethereum
        send(msg.sender, _amount, _token);

        emit Borrow(_token, msg.sender, address(0), _amount);
    }

    /**
     * Repay the amount of token back to the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     * @dev If the repay amount is larger than the borrowed balance, the extra will be returned.
     */
    function repay(address _token, uint256 _amount) public payable onlyValidToken(_token) nonReentrant {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);

        uint256 amount = repay(msg.sender, _token, _amount);

        // Send the remain money back
        uint256 remain =  _amount.sub(amount);
        if(remain != 0) {
            send(msg.sender, remain, _token);
        }

        emit Repay(_token, msg.sender, address(0), amount);
    }

    function repay(address _to, address _token, uint256 _amount) internal returns(uint) {

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Sanity check
        require(globalConfig.accounts().getBorrowPrincipal(_to, _token) > 0,
            "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
        );

        // Update tokenInfo
        uint256 amountOwedWithInterest = globalConfig.accounts().getBorrowBalanceStore(_token, _to);
        uint amount = _amount > amountOwedWithInterest ? amountOwedWithInterest : _amount;
        globalConfig.accounts().repay(_to, _token, amount, getBlockNumber());

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        globalConfig.bank().updateTotalCompound(_token);
        globalConfig.bank().updateTotalLoan(_token);
        uint compoundAmount = globalConfig.bank().updateTotalReserve(_token, amount, globalConfig.bank().Repay());
        toCompound(_token, compoundAmount);

        // Return actual amount repaid
        return amount;
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     */
    function deposit(address _token, uint256 _amount) public payable onlyValidToken(_token) nonReentrant {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);
        deposit(msg.sender, _token, _amount);

        emit Deposit(_token, msg.sender, address(0), _amount);
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _to the account that the token deposit to.
     * @param _token the address of the deposited token
     * @param _amount the amount of the deposited token
     */
     // sichaoy: should not be public, why cannot we find _tokenIndex from token address?
    function deposit(address _to, address _token, uint256 _amount) internal {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Update tokenInfo. Add the _amount to principal, and update the last deposit block in tokenInfo
        globalConfig.accounts().deposit(_to, _token, _amount, getBlockNumber());

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        globalConfig.bank().updateTotalCompound(_token);
        globalConfig.bank().updateTotalLoan(_token);
        uint compoundAmount = globalConfig.bank().updateTotalReserve(_token, _amount, globalConfig.bank().Deposit()); // Last parameter false means deposit token
        toCompound(_token, compoundAmount);
    }

    /**
     * Withdraw a token from an address
     * @param _token token address
     * @param _amount amount to be withdrawn
     */
    function withdraw(address _token, uint256 _amount) public onlyValidToken(_token) whenNotPaused nonReentrant {
        require(_amount != 0, "Amount is zero");
        uint256 amount = withdraw(msg.sender, _token, _amount);
        send(msg.sender, amount, _token);

        emit Withdraw(_token, msg.sender, address(0), amount);
    }

    /**
     * Withdraw a token from an address
     * @param _from address to be withdrawn from
     * @param _token token address
     * @param _amount amount to be withdrawn
     * @return The actually amount withdrawed, which will be the amount requested minus the commission fee.
     */
    function withdraw(address _from, address _token, uint256 _amount) internal returns(uint) {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Check if withdraw amount is less than user's balance
        require(_amount <= globalConfig.accounts().getDepositBalanceCurrent(_token, _from), "Insufficient balance.");

        // Check if there are enough collaterals after withdraw
        uint256 borrowLTV = globalConfig.tokenInfoRegistry().getBorrowLTV(_token);
        uint divisor = INT_UNIT;
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(_token));
        }
        require(
            globalConfig.accounts().getBorrowETH(_from) <=
            globalConfig.accounts().getBorrowPower(_from).sub(
                _amount.mul(globalConfig.tokenInfoRegistry().priceFromAddress(_token)).mul(borrowLTV).div(divisor).div(100)
            ), "Insufficient collateral when withdraw.");

        // sichaoy: all the sanity checks should be before the operations???
        // Check if there are enough tokens in the pool.
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        require(globalConfig.bank().totalReserve(_token).add(globalConfig.bank().totalCompound(cToken)) >= _amount, "Lack of liquidity.");

        // Withdraw from the account
        uint256 principalBeforeWithdraw = globalConfig.accounts().getDepositPrincipal(msg.sender, _token);
        globalConfig.accounts().withdraw(_from, _token, _amount, getBlockNumber());
        uint256 principalAfterWithdraw = globalConfig.accounts().getDepositPrincipal(msg.sender, _token);

        // DeFiner takes 10% commission on the interest a user earn
        uint256 commission = _amount.sub(principalBeforeWithdraw.sub(principalAfterWithdraw)).mul(globalConfig.deFinerRate()).div(100);
        deFinerFund[_token] = deFinerFund[_token].add(commission);
        uint256 amount = _amount.sub(commission);

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        globalConfig.bank().updateTotalCompound(_token);
        globalConfig.bank().updateTotalLoan(_token);
        uint compoundAmount = globalConfig.bank().updateTotalReserve(_token, _amount, globalConfig.bank().Withdraw());
        fromCompound(_token, compoundAmount);

        return amount;
    }

    /**
     * Withdraw all tokens from the saving pool.
     * @param _token the address of the withdrawn token
     */
    function withdrawAll(address _token) public onlyValidToken(_token) whenNotPaused nonReentrant {

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Sanity check
        require(globalConfig.accounts().getDepositPrincipal(msg.sender, _token) > 0, "Token depositPrincipal must be greater than 0");

        // Get the total amount of token for the account
        uint amount = globalConfig.accounts().getDepositBalanceStore(_token, msg.sender);

        uint256 actualAmount = withdraw(msg.sender, _token, amount);
        send(msg.sender, actualAmount, _token);

        emit WithdrawAll(_token, msg.sender, address(0), actualAmount);
    }

    struct LiquidationVars {
        uint256 totalBorrow;
        uint256 borrowPower;
        uint256 msgTotalBorrow;

        uint256 targetTokenBalance;
        uint256 targetTokenBalanceBorrowed;
        uint256 liquidationDebtValue;
        uint256 targetTokenPrice;
        address token;
        uint256 tokenPrice;
        uint256 coinValue;
        uint256 targetTokenAmount;
        uint256 tokenAmount;
        uint256 tokenDivisor;

        uint256 liquidationDiscountRatio;
    }

    /**
     * Liquidate function
     * @param _targetAccountAddr account to be liquidated
     * @param _targetToken token used for purchasing collaterals
     */
    function liquidate(address _targetAccountAddr, address _targetToken) public onlyValidToken(_targetToken) whenNotPaused nonReentrant {

        require(globalConfig.accounts().isAccountLiquidatable(_targetAccountAddr), "The borrower is not liquidatable.");
        LiquidationVars memory vars;

        // It is required that the liquidator doesn't exceed it's borrow power.
        vars.msgTotalBorrow = globalConfig.accounts().getBorrowETH(msg.sender);
        require(
            vars.msgTotalBorrow.mul(100) < globalConfig.accounts().getBorrowPower(msg.sender),
            "No extra funds are used for liquidation."
        );

        // Get the available amount of debt token for liquidation. It equals to the amount of target token
        // that the liquidator has, or the amount of target token that the borrower has borrowed, whichever
        // is smaller.
        vars.targetTokenBalance = globalConfig.accounts().getDepositBalanceCurrent(_targetToken, msg.sender);
        require(vars.targetTokenBalance > 0, "The account amount must be greater than zero.");

        vars.targetTokenBalanceBorrowed = globalConfig.accounts().getBorrowBalanceStore(_targetToken, _targetAccountAddr);
        require(vars.targetTokenBalanceBorrowed > 0, "The borrower doesn't own any debt token specified by the liquidator.");

        if (vars.targetTokenBalance > vars.targetTokenBalanceBorrowed)
            vars.targetTokenBalance = vars.targetTokenBalanceBorrowed;

        // The value of the maximum amount of debt token that could transfered from the liquidator to the borrower
        uint divisor = _targetToken == ETH_ADDR ? INT_UNIT : 10 ** uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(_targetToken));
        vars.targetTokenPrice = globalConfig.tokenInfoRegistry().priceFromAddress(_targetToken);
        vars.liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();
        vars.liquidationDebtValue = vars.targetTokenBalance.mul(vars.targetTokenPrice).mul(100).div(vars.liquidationDiscountRatio).div(divisor);

        // The collaterals are liquidate in the order of their market liquidity. The liquidation would stop if one
        // of the following conditions are true. 1) The maximum amount of debt token has transfered from the
        // liquidator to the borrower, which we call a partial liquidation. 2) The mount of loan reaches the
        // borrowPower, which we call a full liquidation.
        // Here we assume that there are always enough collaterals to be purchased to finish the liquidation process,
        // given the 15% margin set by the liquidation threshold.
        vars.totalBorrow = globalConfig.accounts().getBorrowETH(_targetAccountAddr);
        vars.borrowPower = globalConfig.accounts().getBorrowPower(_targetAccountAddr);

        uint256 totalBorrowBeforeLiquidation = vars.totalBorrow;
        for(uint i = 0; i < globalConfig.tokenInfoRegistry().getCoinLength(); i++) {
            vars.token = globalConfig.tokenInfoRegistry().addressFromIndex(i);
            if(globalConfig.accounts().isUserHasDeposits(_targetAccountAddr, uint8(i))) {
                // Get the collateral token price and divisor
                vars.tokenPrice = globalConfig.tokenInfoRegistry().priceFromIndex(i);
                vars.tokenDivisor = vars.token == ETH_ADDR ? INT_UNIT : 10**uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(vars.token));

                // Get the collateral token value
                vars.coinValue = globalConfig.accounts().getDepositBalanceCurrent(vars.token, _targetAccountAddr).mul(vars.tokenPrice).div(vars.tokenDivisor);

                // Checkout if the coin value is enough to set the borrow amount back to borrow power
                uint256 fullLiquidationValue = vars.totalBorrow.sub(vars.borrowPower).mul(100).div(
                            vars.liquidationDiscountRatio.sub(globalConfig.tokenInfoRegistry().getBorrowLTV(vars.token)));

                // Derive the true liquidation value.
                if (vars.coinValue > fullLiquidationValue)
                    vars.coinValue = fullLiquidationValue;
                if(vars.coinValue > vars.liquidationDebtValue)
                    vars.coinValue = vars.liquidationDebtValue;

                // Update the totalBorrow and borrowPower
                vars.totalBorrow = vars.totalBorrow.sub(vars.coinValue.mul(vars.liquidationDiscountRatio).div(100));
                vars.borrowPower = vars.borrowPower.sub(vars.coinValue.mul(globalConfig.tokenInfoRegistry().getBorrowLTV(vars.token)).div(100));
                vars.liquidationDebtValue = vars.liquidationDebtValue.sub(vars.coinValue);

                // Update the account balance after the collateral is transfered.
                vars.tokenAmount = vars.coinValue.mul(vars.tokenDivisor).div(vars.tokenPrice);
                globalConfig.accounts().withdraw(_targetAccountAddr, vars.token, vars.tokenAmount, getBlockNumber());
                globalConfig.accounts().deposit(msg.sender, vars.token, vars.tokenAmount, getBlockNumber());
            }

            if(vars.totalBorrow <= vars.borrowPower || vars.liquidationDebtValue == 0) {
                break;
            }
        }

        // Trasfer the debt token from borrower to the liquidator
        // We call the withdraw/repay functions in SavingAccount instead of in Accounts because the total amount
        // of loan in SavingAccount should be updated though the reservation and compound parts will not changed.
        uint256 targetTokenTransfer = totalBorrowBeforeLiquidation.sub(vars.totalBorrow).mul(divisor).div(vars.targetTokenPrice);
        withdraw(msg.sender, _targetToken, targetTokenTransfer);
        repay(_targetAccountAddr, _targetToken, targetTokenTransfer);
    }

    /**
     * Withdraw the community fund (commission fee)
     * @param _token token address
     */
     function recycleCommunityFund(address _token) public {
         require(msg.sender == globalConfig.deFinerCommunityFund(), "Unauthorized call");
         uint256 amount = deFinerFund[_token];
         if (amount > 0) {
             deFinerFund[_token] = 0;
             send(globalConfig.deFinerCommunityFund(), amount, _token);
         }
     }

    /**
     * Deposit token to Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function toCompound(address _token, uint _amount) public {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        if (_token == ETH_ADDR) {
            ICETH(cToken).mint.value(_amount)();
        } else {
            uint256 success = ICToken(cToken).mint(_amount);
            require(success == 0, "mint failed");
        }
    }

    /**
     * Withdraw token from Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function fromCompound(address _token, uint _amount) public {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        uint256 success = ICToken(cToken).redeemUnderlying(_amount);
        require(success == 0, "redeemUnderlying failed");
    }

    /**
     * Receive the amount of token from msg.sender
     * @param _from from address
     * @param _amount amount of token
     * @param _token token address
     */
    function receive(address _from, uint256 _amount, address _token) private {
        if (_isETH(_token)) {
            require(msg.value == _amount, "The amount is not sent from address.");
        } else {
            //When only tokens received, msg.value must be 0
            require(msg.value == 0, "msg.value must be 0 when receiving tokens");
            IERC20(_token).safeTransferFrom(_from, address(this), _amount);
        }
    }

    /**
     * Send the amount of token to an address
     * @param _to address of the token receiver
     * @param _amount amount of token
     * @param _token token address
     */
    function send(address _to, uint256 _amount, address _token) private {
        if (_isETH(_token)) {
            msg.sender.transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }

    function() external payable{}

    /**
     * Check if the token is Ether
     * @param _token token address
     * @return true if the token is Ether
     */
    function _isETH(address _token) internal view returns (bool) {
        return ETH_ADDR == _token;
    }

    // ============================================
    // EMERGENCY WITHDRAWAL FUNCTIONS
    // Needs to be removed when final version deployed
    // ============================================
    function emergencyWithdraw(address _token) external onlyEmergencyAddress {
        if(_token == ETH_ADDR) {
            EMERGENCY_ADDR.transfer(address(this).balance);
        } else {
            uint256 amount = IERC20(_token).balanceOf(address(this));
            require(IERC20(_token).transfer(EMERGENCY_ADDR, amount), "transfer failed");
        }
    }

    function emergencyRedeem(address _cToken, uint256 _amount) external onlyEmergencyAddress {
        uint256 success = ICToken(_cToken).redeem(_amount);
        require(success == 0, "redeem failed");
    }

    function emergencyRedeemUnderlying(address _cToken, uint256 _amount) external onlyEmergencyAddress {
        uint256 success = ICToken(_cToken).redeemUnderlying(_amount);
        require(success == 0, "redeemUnderlying failed");
    }
}