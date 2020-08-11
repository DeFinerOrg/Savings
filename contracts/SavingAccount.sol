pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "./Base.sol";
import "./registry/TokenInfoRegistry.sol";
import "./config/GlobalConfig.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./InitializableReentrancyGuard.sol";

contract SavingAccount is Initializable, InitializableReentrancyGuard {
    using Base for Base.BaseVariable;
    using Base for Base.Account;
    using Base for Base.ActionChoices;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using TokenInfoLib for TokenInfoLib.TokenInfo;
    using BitmapLib for uint128;

    Base.BaseVariable baseVariable;

    TokenInfoRegistry public tokenRegistry;
    GlobalConfig public globalConfig;

    // Following are the constants, initialized via upgradable proxy contract
    // This is emergency address to allow withdrawal of funds from the contract
    address payable public EMERGENCY_ADDR;
    address public ETH_ADDR;
    uint256 public ACCURACY;
    uint256 public BLOCKS_PER_YEAR;
    uint256 public UINT_UNIT;

    event DepositorOperations(uint256 indexed code, address token, address from, address to, uint256 amount);   

    modifier onlyEmergencyAddress() {
        require(msg.sender == EMERGENCY_ADDR, "User not authorized");
        _;
    }

    modifier onlySupported(address _token) {
        if(!_isETH(_token)) {
            require(tokenRegistry.isTokenExist(_token), "Unsupported token");
        }
        _;
    }

    constructor() public {
        // THIS SHOULD BE EMPTY FOR UPGRADABLE CONTRACTS
    }

    /**
     * Initialize function to be called by the Deployer for the first time
     * @param _tokenAddresses list of token addresses
     * @param _cTokenAddresses list of corresponding cToken addresses
     * @param _tokenRegistry token registry contract
     * @param _globalConfig global configuration contract
     */
    function initialize(
        address[] memory _tokenAddresses,
        address[] memory _cTokenAddresses,
        TokenInfoRegistry _tokenRegistry,
        GlobalConfig _globalConfig
    )
        public
        initializer
    {
        // Initialize InitializableReentrancyGuard
        super._initialize();

        tokenRegistry = _tokenRegistry;
        globalConfig = _globalConfig;

        baseVariable.initialize(address(_globalConfig), address(this), address(_tokenRegistry));
        for(uint i = 0;i < _tokenAddresses.length;i++) {
            if(_cTokenAddresses[i] != address(0x0) && _tokenAddresses[i] != ETH_ADDR) {
                baseVariable.approveAll(_tokenAddresses[i]);
            }
        }

        //Initialize constants defined in this contract
        EMERGENCY_ADDR = 0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c;
        ETH_ADDR = 0x000000000000000000000000000000000000000E;
        ACCURACY = 10**18;
        BLOCKS_PER_YEAR = 2102400;
        UINT_UNIT = 10 ** 18;
    }

    /**
     * Approve transfer of all available tokens
     * @param _token token address
     */
    function approveAll(address _token) public {
        baseVariable.approveAll(_token);
    }

	/**
	 * Get the state of a given token
     * @param _token token addrss
     * @return the current deposits, loans, and collateral ratio of the token
	 */
    function getTokenState(address _token) public returns (
        uint256 deposits,
        uint256 loans,
        uint256 collateral
    )
    {
        return baseVariable.getTokenState(_token);
    }

	/**
	 * Check if the account is liquidatable
     * @param _borrower borrower's account
     * @return true if the account is liquidatable
	 */
    function isAccountLiquidatable(address _borrower) public view returns (bool) {
        uint256 liquidationThreshold = globalConfig.liquidationThreshold();
        uint256 liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();
        uint256 totalBalance = baseVariable.getBorrowETH(_borrower);
        uint256 totalETHValue = baseVariable.getDepositETH(_borrower);
        if (
            totalBalance.mul(100) > totalETHValue.mul(liquidationThreshold) &&
            totalBalance.mul(liquidationDiscountRatio) <= totalETHValue.mul(100)
        ) {
            return true;
        }
        return false;
    }

    /**
	 * Get token balances for the sender's account
     * @param _token token address
     * @return the deposit balance and borrow balance of the token
	 */
    function tokenBalance(address _token) public view returns(
        uint256 depositBalance,
        uint256 borrowBalance
    ) {
        return (baseVariable.getDepositBalance(_token, msg.sender), baseVariable.getBorrowBalance(_token, msg.sender));
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
    function transfer(address _to, address _token, uint _amount) public nonReentrant {
        // sichaoy: what if withdraw fails?
        // baseVariable.withdraw(msg.sender, _token, _amount, symbols);
        withdraw(msg.sender, _token, _amount);
        deposit(_to, _token, _amount);

        emit DepositorOperations(5, _token, msg.sender, _to, _amount);
    }

    /**
     * Borrow the amount of token from the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     */
    function borrow(address _token, uint256 _amount) public onlySupported(_token) nonReentrant {

        require(_amount != 0, "Amount is zero");
        require(baseVariable.isUserHasAnyDeposits(msg.sender), "The user doesn't have any deposits.");

        // Add a new checkpoint on the index curve.
        baseVariable.newRateIndexCheckpoint(_token);

        // Check if there are enough collaterals after withdraw
        uint256 borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint divisor = SafeDecimalMath.getUINT_UNIT();
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(IERC20Extended(_token).decimals());
        }
        require(baseVariable.getBorrowETH(msg.sender).add(_amount.mul(tokenRegistry.priceFromAddress(_token))).mul(100)
            <= baseVariable.getDepositETH(msg.sender).mul(divisor).mul(borrowLTV), "Insufficient collateral.");

        // sichaoy: all the sanity checks should be before the operations???
        // Check if there are enough tokens in the pool.
        address cToken = tokenRegistry.getCToken(_token);
        require(baseVariable.totalReserve[_token].add(baseVariable.totalCompound[cToken]) >= _amount, "Lack of liquidity.");

        // Update tokenInfo for the user
        TokenInfoLib.TokenInfo storage tokenInfo = baseVariable.accounts[msg.sender].tokenInfos[_token];
        uint accruedRate = baseVariable.getBorrowAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.borrow(_amount, accruedRate, this.getBlockNumber());

        // Set the borrow bitmap
        baseVariable.setInBorrowBitmap(msg.sender, tokenRegistry.getTokenIndex(_token));

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        baseVariable.updateTotalCompound(_token);
        baseVariable.updateTotalLoan(_token);
        baseVariable.updateTotalReserve(_token, _amount, Base.ActionChoices.Borrow); // Last parameter false means withdraw token

        // Transfer the token on Ethereum
        send(msg.sender, _amount, _token);

        emit DepositorOperations(3, _token, msg.sender, address(0), _amount);
    }

    /**
     * Repay the amount of token back to the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     * @dev If the repay amount is larger than the borrowed balance, the extra will be returned.
     */
    function repay(address _token, uint256 _amount) public payable onlySupported(_token) nonReentrant {

        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);

        // Add a new checkpoint on the index curve.
        baseVariable.newRateIndexCheckpoint(_token);

        // Sanity check
        TokenInfoLib.TokenInfo storage tokenInfo = baseVariable.accounts[msg.sender].tokenInfos[_token];
        require(tokenInfo.getBorrowPrincipal() > 0,
            "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
        );

        // Update tokenInfo
        uint rate = baseVariable.getBorrowAccruedRate(_token,tokenInfo.getLastBorrowBlock());
        uint256 amountOwedWithInterest = tokenInfo.getBorrowBalance(rate);
        uint amount = _amount > amountOwedWithInterest ? amountOwedWithInterest : _amount;
        tokenInfo.repay(amount, rate, this.getBlockNumber());

        // Unset borrow bitmap if the balance is fully repaid
        if(tokenInfo.getBorrowPrincipal() == 0)
            baseVariable.unsetFromBorrowBitmap(msg.sender, tokenRegistry.getTokenIndex(_token));

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        baseVariable.updateTotalCompound(_token);
        baseVariable.updateTotalLoan(_token);
        baseVariable.updateTotalReserve(_token, amount, Base.ActionChoices.Repay);

        // Send the remain money back
        uint256 remain =  _amount > amountOwedWithInterest ? _amount.sub(amountOwedWithInterest) : 0;
        if(remain != 0) {
            send(msg.sender, remain, _token);
        }

        emit DepositorOperations(4, _token, msg.sender, address(0), _amount.sub(remain));
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     */
    function deposit(address _token, uint256 _amount) public payable onlySupported(_token) nonReentrant {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);
        deposit(msg.sender, _token, _amount);

        emit DepositorOperations(0, _token, msg.sender, address(0), _amount);
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _to the account that the token deposit to.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     */
     // sichaoy: should not be public, why cannot we find _tokenIndex from token address?
    function deposit(address _to, address _token, uint256 _amount) internal {

        require(_amount != 0, "Amount is zero");
        TokenInfoLib.TokenInfo storage tokenInfo = baseVariable.accounts[_to].tokenInfos[_token];

        // Add a new checkpoint on the index curve.
        baseVariable.newRateIndexCheckpoint(_token);

        // Update tokenInfo. Add the _amount to principal, and update the last deposit block in tokenInfo
        uint accruedRate = baseVariable.getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.deposit(_amount, accruedRate, this.getBlockNumber());

        // Set the deposit bitmap
        baseVariable.setInDepositBitmap(_to, tokenRegistry.getTokenIndex(_token));

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        baseVariable.updateTotalCompound(_token);
        baseVariable.updateTotalLoan(_token);
        baseVariable.updateTotalReserve(_token, _amount, Base.ActionChoices.Deposit); // Last parameter false means deposit token
    }

    /**
     * Withdraw a token from an address
     * @param _token token address
     * @param _amount amount to be withdrawn
     */
    function withdraw(address _token, uint256 _amount) public onlySupported(_token) nonReentrant {
        require(_amount != 0, "Amount is zero");
        uint256 amount = withdraw(msg.sender, _token, _amount);
//        send(msg.sender, _amount, _token);

        emit DepositorOperations(1, _token, msg.sender, address(0), _amount);
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
        baseVariable.newRateIndexCheckpoint(_token);

        // Check if withdraw amount is less than user's balance
        require(_amount <= baseVariable.getDepositBalance(_token, _from), "Insufficient balance.");

        // Check if there are enough collaterals after withdraw
        uint256 borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint divisor = SafeDecimalMath.getUINT_UNIT();
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(IERC20Extended(_token).decimals());
        }
        require(baseVariable.getBorrowETH(_from).mul(100) <= baseVariable.getDepositETH(_from)
            .sub(_amount.mul(tokenRegistry.priceFromAddress(_token)).div(divisor)).mul(borrowLTV), "Insufficient collateral.");

        // sichaoy: all the sanity checks should be before the operations???
        // Check if there are enough tokens in the pool.
        address cToken = tokenRegistry.getCToken(_token);
        require(baseVariable.totalReserve[_token].add(baseVariable.totalCompound[cToken]) >= _amount, "Lack of liquidity.");

        // Update tokenInfo for the user
        TokenInfoLib.TokenInfo storage tokenInfo = baseVariable.accounts[_from].tokenInfos[_token];
        uint accruedRate = baseVariable.getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.withdraw(_amount, accruedRate, this.getBlockNumber());

        // Unset deposit bitmap if the deposit is fully withdrawn
        if(tokenInfo.getDepositPrincipal() == 0)
            baseVariable.unsetFromDepositBitmap(msg.sender, tokenRegistry.getTokenIndex(_token));

        // DeFiner takes 10% commission on the interest a user earn
        // sichaoy: 10 percent is a constant?
        uint256 commission = tokenInfo.depositInterest <= _amount ? tokenInfo.depositInterest.div(10) : _amount.div(10);
        baseVariable.deFinerFund[_token] = baseVariable.deFinerFund[_token].add(commission);
        uint256 amount = _amount.sub(commission);

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
//        baseVariable.updateTotalCompound(_token);
//        baseVariable.updateTotalLoan(_token);
//        baseVariable.updateTotalReserve(_token, amount, Base.ActionChoices.Withdraw); // Last parameter false means withdraw token

        return amount;
    }

    /**
     * Withdraw all tokens from the saving pool.
     * @param _token the address of the withdrawn token
     */
    function withdrawAll(address _token) public onlySupported(_token) nonReentrant {

        // Add a new checkpoint on the index curve.
        baseVariable.newRateIndexCheckpoint(_token);

        // Sanity check
        TokenInfoLib.TokenInfo storage tokenInfo = baseVariable.accounts[msg.sender].tokenInfos[_token];
        require(tokenInfo.getDepositPrincipal() > 0, "Token depositPrincipal must be greater than 0");

        // Get the total amount of token for the account
        uint accruedRate = baseVariable.getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        uint amount = tokenInfo.getDepositBalance(accruedRate);

        withdraw(msg.sender, _token, amount);
        send(msg.sender, amount, _token);

        emit DepositorOperations(2, _token, msg.sender, address(0), amount);
    }

    struct LiquidationVars {
        uint256 totalBorrow;
        uint256 totalCollateral;
        uint256 msgTotalBorrow;
        uint256 msgTotalCollateral;

        uint256 targetTokenBalance;
        uint256 liquidationDebtValue;
        uint256 targetTokenPrice;
        uint256 paymentOfLiquidationValue;
        uint256 msgTargetTokenAccruedRate;
        uint256 targetTokenAccruedRate;
        address token;
        uint256 tokenPrice;
        uint256 tokenAccruedRate;
        uint256 coinValue;
        uint256 targetTokenAmount;
        uint256 tokenAmount;
        uint256 tokenDivisor;
        uint256 msgTokenAccruedRate;

        uint8 tokenIndex;
        uint borrowLTV;
    }

    /**
     * Liquidate function
     * @param _targetAccountAddr account to be liquidated
     * @param _targetToken token used for purchasing collaterals
     */
    function liquidate(address _targetAccountAddr, address _targetToken) public nonReentrant {
        require(tokenRegistry.isTokenExist(_targetToken), "Unsupported token");
        LiquidationVars memory vars;
        vars.totalBorrow = baseVariable.getBorrowETH(_targetAccountAddr);
        vars.totalCollateral = baseVariable.getDepositETH(_targetAccountAddr);

        vars.msgTotalBorrow = baseVariable.getBorrowETH(msg.sender);
        vars.msgTotalCollateral = baseVariable.getDepositETH(msg.sender);

        vars.targetTokenBalance = baseVariable.getDepositBalance(_targetToken, msg.sender);

        uint liquidationThreshold =  GlobalConfig(baseVariable.globalConfigAddress).liquidationThreshold();
        uint liquidationDiscountRatio = GlobalConfig(baseVariable.globalConfigAddress).liquidationDiscountRatio();

        require(_targetToken != address(0), "Token address is zero");
        vars.tokenIndex = tokenRegistry.getTokenIndex(_targetToken);
        vars.borrowLTV = tokenRegistry.getBorrowLTV(_targetToken);

        // It is required that LTV is larger than LIQUIDATE_THREADHOLD for liquidation
        require(
            vars.totalBorrow.mul(100) > vars.totalCollateral.mul(liquidationThreshold),
            "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
        );

        // The value of discounted collateral should be never less than the borrow amount.
        // We assume this will never happen as the market will not drop extreamly fast so that
        // the LTV changes from 85% to 95%, an 10% drop within one block.
        require(
            vars.totalBorrow.mul(100) <= vars.totalCollateral.mul(liquidationDiscountRatio),
            "Collateral is not sufficient to be liquidated."
        );

        require(
            vars.msgTotalBorrow.mul(100) < vars.msgTotalCollateral.mul(vars.borrowLTV),
            "No extra funds are used for liquidation."
        );

        require(
            vars.targetTokenBalance > 0,
            "The account amount must be greater than zero."
        );

        uint divisor = _targetToken == ETH_ADDR ? UINT_UNIT : 10**uint256(IERC20Extended(_targetToken).decimals());

        // Amount of assets that need to be liquidated
        vars.liquidationDebtValue = vars.totalBorrow.sub(
            vars.totalCollateral.mul(vars.borrowLTV).div(100)
        ).mul(liquidationDiscountRatio).div(liquidationDiscountRatio - vars.borrowLTV);

        // Liquidators need to pay
        vars.targetTokenPrice = tokenRegistry.priceFromAddress(_targetToken);
        vars.paymentOfLiquidationValue = vars.targetTokenBalance.mul(vars.targetTokenPrice).div(divisor);

        if(
            vars.msgTotalBorrow != 0 &&
            vars.paymentOfLiquidationValue > (vars.msgTotalCollateral).mul(vars.borrowLTV).div(100).sub(vars.msgTotalBorrow)
         ) {
            vars.paymentOfLiquidationValue = (vars.msgTotalCollateral).mul(vars.borrowLTV).div(100).sub(vars.msgTotalBorrow);
        }

        if(vars.paymentOfLiquidationValue.mul(100) < vars.liquidationDebtValue.mul(liquidationDiscountRatio)) {
            vars.liquidationDebtValue = vars.paymentOfLiquidationValue.mul(100).div(liquidationDiscountRatio);
        }

        TokenInfoLib.TokenInfo storage targetTokenInfo = baseVariable.accounts[_targetAccountAddr].tokenInfos[_targetToken];
        TokenInfoLib.TokenInfo storage msgTargetTokenInfo = baseVariable.accounts[msg.sender].tokenInfos[_targetToken];
        // Target token rate of the liquidator
        vars.msgTargetTokenAccruedRate = baseVariable.getDepositAccruedRate(_targetToken, msgTargetTokenInfo.getLastDepositBlock());
        // Target token rate of the user to be liquidated
        vars.targetTokenAccruedRate = baseVariable.getBorrowAccruedRate(_targetToken, targetTokenInfo.getLastBorrowBlock());

        vars.targetTokenAmount = vars.liquidationDebtValue.mul(divisor).div(vars.targetTokenPrice).mul(liquidationDiscountRatio).div(100);
        msgTargetTokenInfo.withdraw(vars.targetTokenAmount, vars.msgTargetTokenAccruedRate, this.getBlockNumber());
        if(msgTargetTokenInfo.getDepositPrincipal() == 0) {
            baseVariable.unsetFromDepositBitmap(msg.sender, vars.tokenIndex);
        }

        targetTokenInfo.repay(vars.targetTokenAmount, vars.targetTokenAccruedRate, this.getBlockNumber());
        if(targetTokenInfo.getBorrowPrincipal() == 0) {
            baseVariable.unsetFromBorrowBitmap(_targetAccountAddr, vars.tokenIndex);
        }

        // The collaterals are liquidate in the order of their market liquidity
        for(uint i = 0; i < tokenRegistry.getCoinLength(); i++) {
            vars.token = tokenRegistry.addressFromIndex(i);
            if(baseVariable.isUserHasDeposits(_targetAccountAddr, uint8(i))) {
                vars.tokenPrice = tokenRegistry.priceFromIndex(i);

                vars.tokenDivisor = vars.token == ETH_ADDR ? UINT_UNIT : 10**uint256(IERC20Extended(vars.token).decimals());

                TokenInfoLib.TokenInfo storage tokenInfo = baseVariable.accounts[_targetAccountAddr].tokenInfos[vars.token];

                if(tokenInfo.getBorrowPrincipal() == 0) {
                    TokenInfoLib.TokenInfo storage msgTokenInfo = baseVariable.accounts[msg.sender].tokenInfos[vars.token];
                    baseVariable.newRateIndexCheckpoint(vars.token);

                    // Token rate of the liquidator
                    vars.msgTokenAccruedRate =
                    msgTokenInfo.getBorrowPrincipal() > 0 ?
                    baseVariable.getBorrowAccruedRate(vars.token, msgTokenInfo.getLastBorrowBlock())
                    :
                    baseVariable.getDepositAccruedRate(vars.token, msgTokenInfo.getLastDepositBlock());

                    // Token rate of the user to be liquidated
                    vars.tokenAccruedRate = baseVariable.getDepositAccruedRate(vars.token, tokenInfo.getLastDepositBlock());
                    vars.coinValue = tokenInfo.getDepositBalance(vars.tokenAccruedRate).mul(vars.tokenPrice).div(vars.tokenDivisor);
                    if(vars.coinValue > vars.liquidationDebtValue) {
                        vars.coinValue = vars.liquidationDebtValue;
                        vars.liquidationDebtValue = 0;
                    } else {
                        vars.liquidationDebtValue = vars.liquidationDebtValue.sub(vars.coinValue);
                    }
                    vars.tokenAmount = vars.coinValue.mul(vars.tokenDivisor).div(vars.tokenPrice);
                    tokenInfo.withdraw(vars.tokenAmount, vars.tokenAccruedRate, this.getBlockNumber());
                    if(tokenInfo.getDepositPrincipal() == 0) {
                        baseVariable.unsetFromDepositBitmap(_targetAccountAddr, vars.tokenIndex);
                    }

                    if(msgTokenInfo.getDepositPrincipal() == 0 && vars.tokenAmount > 0) {
                        baseVariable.setInDepositBitmap(msg.sender, vars.tokenIndex);
                    }
                    msgTokenInfo.deposit(vars.tokenAmount, vars.msgTokenAccruedRate, this.getBlockNumber());
                }
            }

            if(vars.liquidationDebtValue == 0) {
                break;
            }
        }
    }

    /**
     * Withdraw the community fund (commission fee)
     * @param _token token address
     */
    function recycleCommunityFund(address _token) public {
        require(msg.sender == baseVariable.deFinerCommunityFund, "Unauthorized call");
        baseVariable.deFinerCommunityFund.transfer(uint256(baseVariable.deFinerFund[_token]));
        baseVariable.deFinerFund[_token] == 0;
    }

    /**
     * Change the communitiy fund address
     * @param _DeFinerCommunityFund the new community fund address
     */
    function setDeFinerCommunityFund(address payable _DeFinerCommunityFund) public {
        require(msg.sender == baseVariable.deFinerCommunityFund, "Unauthorized call");
        baseVariable.deFinerCommunityFund = _DeFinerCommunityFund;
    }

    /**
     * The current community fund address
     */
    function getDeFinerCommunityFund( address _token) public view returns(uint256){
        return baseVariable.deFinerFund[_token];
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