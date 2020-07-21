pragma solidity 0.5.14;

import "./lib/TokenInfoLib.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./params/SavingAccountParameters.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "./Base.sol";
import "./registry/TokenInfoRegistry.sol";
import "./config/GlobalConfig.sol";

contract SavingAccount {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using TokenInfoLib for TokenInfoLib.TokenInfo;
    using BitmapLib for uint128;

    // TODO This is emergency address to allow withdrawal of funds from the contract
    address payable public constant EMERGENCY_ADDR = 0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c;
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;

    Base public base;
    TokenInfoRegistry public tokenRegistry;
    GlobalConfig public globalConfig;

    uint256 ACCURACY = 10**18;
    // uint256 BLOCKS_PER_YEAR = 2102400;
    uint256 public constant UINT_UNIT = 10 ** 18;

    mapping(address => Account) accounts;
    address payable deFinerCommunityFund;
    mapping(address => uint) public deFinerFund;

    struct Account {
            // Note, it's best practice to use functions minusAmount, addAmount, totalAmount
            // to operate tokenInfos instead of changing it directly.
            mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
        }

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

    constructor(
        address[] memory tokenAddresses,
        address[] memory cTokenAddresses,
        address _chainlinkAddress,
        Base  _base,
        TokenInfoRegistry _tokenRegistry,
        GlobalConfig _globalConfig
    )
        public
    {
        SavingAccountParameters params = new SavingAccountParameters();
        base = _base;
        tokenRegistry = _tokenRegistry;
        globalConfig = _globalConfig;

        //TODO This needs improvement as it could go out of gas
        base.initialize(tokenAddresses, cTokenAddresses, address(_globalConfig), params.tokenNames(), _chainlinkAddress);
        for(uint i = 0;i < tokenAddresses.length;i++) {
            if(cTokenAddresses[i] != address(0x0) && tokenAddresses[i] != ETH_ADDR) {
                require(cTokenAddresses[i] != address(0x0), "cToken address is zero");
                IERC20(tokenAddresses[i]).safeApprove(cTokenAddresses[i], 0);
                IERC20(tokenAddresses[i]).safeApprove(cTokenAddresses[i], uint256(-1));
            }
        }
    }

    // TODO Security issue, as this function is open for all
	//Update borrow rates. borrowRate = 1 + blockChangeValue * rate
//    function updateDefinerRate(address _token) public {
//        base.newRateIndexCheckpoint(_token);
//    }

    /**
     * Get current deposit balance of a token
     * @param _token token address
     */
    // sichaoy: maybe I should switch the order of the parameters
    // sichaoy: change the name to getTokenDepositBalance()
    function getDepositBalance(
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
        // TODO Why need storage
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = SafeDecimalMath.getUNIT();
        uint accruedRate;
        if(tokenInfo.getDepositPrincipal() == 0) {
            return 0;
        } else {
            if(base.depositeRateIndex(_token, tokenInfo.getLastDepositBlock()) == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = base.depositRateIndexNow(_token)
                .mul(UNIT)
                .div(base.depositeRateIndex(_token, tokenInfo.getLastDepositBlock()));
            }
            return tokenInfo.getDepositBalance(accruedRate);
        }
    }

    /**
     * Get current deposit balance of a token
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    function getDepositETH(
        address _accountAddr
    ) public view returns (uint256 depositETH) {
        for(uint i = 0; i < base.getCoinLength(); i++) {
            if(base.isUserHasDeposits(_accountAddr, uint8(i))) {
                address tokenAddress = base.getCoinAddress(i);
                uint divisor = UINT_UNIT;
                if(tokenAddress != ETH_ADDR) {
                    divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
                }
                depositETH = depositETH.add(getDepositBalance(tokenAddress, _accountAddr).mul(base.getCoinToETHRate(i)).div(divisor));
            }
        }
        return depositETH;
    }

    /**
     * Get current borrow balance of a token
     * @param _token token address
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    // sichaoy: What's the diff of getBorrowBalance with getBorrowAcruedRate?
    function getBorrowBalance(
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        // TODO Why need storage
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = SafeDecimalMath.getUNIT();
        uint accruedRate;
        if(tokenInfo.getBorrowPrincipal() == 0) {
            return 0;
        } else {
            if(base.borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()) == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = base.borrowRateIndexNow(_token)
                .mul(UNIT)
                .div(base.borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()));
            }
            return tokenInfo.getBorrowBalance(accruedRate);
        }
    }

    /**
     * Get borrowed balance of a token in the uint of Wei
     */
    // sichaoy: change name to getTotalBorrowInETH()
    function getBorrowETH(
        address _accountAddr
    ) public view returns (uint256 borrowETH) {
        for(uint i = 0; i < base.getCoinLength(); i++) {
            if(base.isUserHasBorrows(_accountAddr, uint8(i))) {
                address tokenAddress = base.getCoinAddress(i);
                uint divisor = UINT_UNIT;
                if(tokenAddress != ETH_ADDR) {
                    divisor = 10**uint256(IERC20Extended(tokenAddress).decimals());
                }
                borrowETH = borrowETH.add(getBorrowBalance(tokenAddress, _accountAddr).mul(base.getCoinToETHRate(i)).div(divisor));
            }
        }
        return borrowETH;
    }

	/*
	 * Get the state of the given token
	 */
//    function getTokenState(address _token) public view returns (
//        uint256 deposits,
//        uint256 loans,
//        uint256 collateral,
//        uint256 depositRatePerBlock,
//        uint256 borrowRatePerBlock
//    )
//    {
//        return base.getTokenState(_token);
//    }

    function isAccountLiquidatable(address _borrower) public view returns (bool) {
        uint256 liquidationThreshold = globalConfig.liquidationThreshold();
        uint256 liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();
        uint256 totalBalance = getBorrowETH(_borrower);
        uint256 totalETHValue = getDepositETH(_borrower);
        if (
            totalBalance.mul(100) > totalETHValue.mul(liquidationThreshold) &&
            totalBalance.mul(liquidationDiscountRatio) <= totalETHValue.mul(100)
        ) {
            return true;
        }
        return false;
    }

//    function tokenBalance(address _token) public view returns(
//        uint256 depositBalance,
//        uint256 borrowBalance
//    ) {
//        return (getDepositBalance(_token, msg.sender), getBorrowBalance(_token, msg.sender));
//    }

    /**
     * Transfer the token between users inside DeFiner
     * @param _to the address that the token be transfered to
     * @param _token token address
     * @param _amount amout of tokens transfer
     */
    function transfer(address _to, address _token, uint _amount) public {
        withdraw(msg.sender, _token, _amount);
        deposit(_to, _token, _amount);
    }

    /**
     * Borrow the amount of token from the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     */
    function borrow(address _token, uint256 _amount) public onlySupported(_token) {

        require(_amount != 0, "Amount is zero");
        require(base.isUserHasAnyDeposits(msg.sender), "The user doesn't have any deposits.");

        // Add a new checkpoint on the index curve.
        base.newRateIndexCheckpoint(_token);

        // Check if there are enough collaterals after withdraw
        uint256 borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint divisor = SafeDecimalMath.getUINT_UNIT();
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(IERC20Extended(_token).decimals());
        }
        require(getBorrowETH(msg.sender).add(_amount.mul(base.getPriceFromAddress(_token))).mul(100)
            <= getDepositETH(msg.sender).mul(divisor).mul(borrowLTV), "Insufficient collateral.");

        // sichaoy: all the sanity checks should be before the operations???
        // Check if there are enough tokens in the pool.
        address cToken = base.cTokenAddress(_token);
        require(base.totalReserve(_token).add(base.totalCompound(cToken)) >= _amount, "Lack of liquidity.");

        // Update tokenInfo for the user
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[_token];
        uint accruedRate = base.getBorrowAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.borrow(_amount, accruedRate);

        // Set the borrow bitmap
        base.setInBorrowBitmap(msg.sender, tokenRegistry.getTokenIndex(_token));

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        base.updateTotalCompound(_token);
        base.updateTotalLoan(_token);
        base.updateTotalReserve(_token, _amount, uint8(2)); // Last parameter false means withdraw token

        // Transfer the token on Ethereum
        send(msg.sender, _amount, _token);
    }

    /**
     * Repay the amount of token back to the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     * @dev If the repay amount is larger than the borrowed balance, the extra will be returned.
     */
    function repay(address _token, uint256 _amount) public payable onlySupported(_token) {

        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);

        // Add a new checkpoint on the index curve.
        base.newRateIndexCheckpoint(_token);

        // Sanity check
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[_token];
        require(tokenInfo.getBorrowPrincipal() > 0,
            "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
        );

        // Update tokenInfo
        uint rate = base.getBorrowAccruedRate(_token,tokenInfo.getLastBorrowBlock());
        uint256 amountOwedWithInterest = tokenInfo.getBorrowBalance(rate);
        uint amount = _amount > amountOwedWithInterest ? amountOwedWithInterest : _amount;
        tokenInfo.repay(amount, rate);

        // Unset borrow bitmap if the balance is fully repaid
        if(tokenInfo.getBorrowPrincipal() == 0)
            base.unsetFromBorrowBitmap(msg.sender, tokenRegistry.getTokenIndex(_token));

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        base.updateTotalCompound(_token);
        base.updateTotalLoan(_token);
        base.updateTotalReserve(_token, amount, uint8(3));

        // Send the remain money back
        uint256 remain =  _amount > amountOwedWithInterest ? _amount.sub(amountOwedWithInterest) : 0;
        if(remain != 0) {
            send(msg.sender, remain, _token);
        }
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     */
    function deposit(address _token, uint256 _amount) public payable onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);
        deposit(msg.sender, _token, _amount);
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
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_to].tokenInfos[_token];

        // Add a new checkpoint on the index curve.
        base.newRateIndexCheckpoint(_token);

        // Update tokenInfo. Add the _amount to principal, and update the last deposit block in tokenInfo
        uint accruedRate = base.getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.deposit(_amount, accruedRate);

        // Set the deposit bitmap
        base.setInDepositBitmap(_to, tokenRegistry.getTokenIndex(_token));

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        base.updateTotalCompound(_token);
        base.updateTotalLoan(_token);
        base.updateTotalReserve(_token, _amount, uint8(0)); // Last parameter false means deposit token
    }

    function withdraw(address _token, uint256 _amount) public onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        uint256 amount = withdraw(msg.sender, _token, _amount);
        send(msg.sender, amount, _token);
    }

    /**
     * @return The actually amount withdrawed, which will be the amount requested minus the commission fee.
     */
    function withdraw(address _from, address _token, uint256 _amount) internal returns(uint) {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        base.newRateIndexCheckpoint(_token);

        // Check if withdraw amount is less than user's balance
        require(_amount <= getDepositBalance(_token, _from), "Insufficient balance.");

        // Check if there are enough collaterals after withdraw
        uint256 borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint divisor = SafeDecimalMath.getUINT_UNIT();
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(IERC20Extended(_token).decimals());
        }
        require(getBorrowETH(_from).mul(100) <= getDepositETH(_from)
            .sub(_amount.mul(base.getPriceFromAddress(_token)).div(divisor)).mul(borrowLTV), "Insufficient collateral.");

        // sichaoy: all the sanity checks should be before the operations???
        // Check if there are enough tokens in the pool.
        address cToken = base.cTokenAddress(_token);
        require(base.totalReserve(_token).add(base.totalCompound(cToken)) >= _amount, "Lack of liquidity.");

        // Update tokenInfo for the user
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_from].tokenInfos[_token];
        uint accruedRate = base.getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.withdraw(_amount, accruedRate);

        // Unset deposit bitmap if the deposit is fully withdrawn
        if(tokenInfo.getDepositPrincipal() == 0)
            base.unsetFromDepositBitmap(msg.sender, tokenRegistry.getTokenIndex(_token));

        // DeFiner takes 10% commission on the interest a user earn
        // sichaoy: 10 percent is a constant?
        uint256 commission = tokenInfo.depositInterest <= _amount ? tokenInfo.depositInterest.div(10) : _amount.div(10);
        deFinerFund[_token] = deFinerFund[_token].add(commission);
        _amount = _amount.sub(commission);

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        base.updateTotalCompound(_token);
        base.updateTotalLoan(_token);
        base.updateTotalReserve(_token, _amount, uint8(1)); // Last parameter false means withdraw token

        return _amount;
    }

    /**
     * Withdraw all tokens from the saving pool.
     * @param _token the address of the withdrawn token
     */
    function withdrawAll(address _token) public onlySupported(_token) {

        // Add a new checkpoint on the index curve.
        base.newRateIndexCheckpoint(_token);

        // Sanity check
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[_token];
        require(tokenInfo.getDepositPrincipal() > 0, "Token depositPrincipal must be greater than 0");

        // Get the total amount of token for the account
        uint accruedRate = base.getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        uint amount = tokenInfo.getDepositBalance(accruedRate);

        withdraw(msg.sender, _token, amount);
        send(msg.sender, amount, _token);
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
     */
    function liquidate(address targetAccountAddr, address _targetToken) public {
        require(tokenRegistry.isTokenExist(_targetToken), "Unsupported token");
        LiquidationVars memory vars;
        vars.totalBorrow = getBorrowETH(targetAccountAddr);
        vars.totalCollateral = getDepositETH(targetAccountAddr);

        vars.msgTotalBorrow = getBorrowETH(msg.sender);
        vars.msgTotalCollateral = getDepositETH(msg.sender);

        vars.targetTokenBalance = getDepositBalance(_targetToken, msg.sender);

        uint liquidationThreshold =  globalConfig.liquidationThreshold();
        uint liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();

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
        vars.targetTokenPrice = base.getPriceFromAddress(_targetToken);
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

        TokenInfoLib.TokenInfo storage targetTokenInfo = accounts[targetAccountAddr].tokenInfos[_targetToken];
        TokenInfoLib.TokenInfo storage msgTargetTokenInfo = accounts[msg.sender].tokenInfos[_targetToken];
        // Target token rate of the liquidator
        vars.msgTargetTokenAccruedRate = base.getDepositAccruedRate(_targetToken, msgTargetTokenInfo.getLastDepositBlock());
        // Target token rate of the user to be liquidated
        vars.targetTokenAccruedRate = base.getBorrowAccruedRate(_targetToken, targetTokenInfo.getLastBorrowBlock());

        vars.targetTokenAmount = vars.liquidationDebtValue.mul(divisor).div(vars.targetTokenPrice).mul(liquidationDiscountRatio).div(100);
        msgTargetTokenInfo.withdraw(vars.targetTokenAmount, vars.msgTargetTokenAccruedRate);
        if(msgTargetTokenInfo.getDepositPrincipal() == 0) {
            base.unsetFromDepositBitmap(msg.sender, vars.tokenIndex);
        }

        targetTokenInfo.repay(vars.targetTokenAmount, vars.targetTokenAccruedRate);
        if(targetTokenInfo.getBorrowPrincipal() == 0) {
            base.unsetFromBorrowBitmap(targetAccountAddr, vars.tokenIndex);
        }

        // The collaterals are liquidate in the order of their market liquidity
        for(uint i = 0; i < base.getCoinLength(); i++) {
            vars.token = base.getCoinAddress(i);
            if(base.isUserHasDeposits(targetAccountAddr, uint8(i))) {
                vars.tokenPrice = base.getCoinToETHRate(i);

                vars.tokenDivisor = vars.token == ETH_ADDR ? UINT_UNIT : 10**uint256(IERC20Extended(vars.token).decimals());

                TokenInfoLib.TokenInfo storage tokenInfo = accounts[targetAccountAddr].tokenInfos[vars.token];

                if(tokenInfo.getBorrowPrincipal() == 0) {
                    TokenInfoLib.TokenInfo storage msgTokenInfo = accounts[msg.sender].tokenInfos[vars.token];
                    base.newRateIndexCheckpoint(vars.token);

                    // Token rate of the liquidator
                    vars.msgTokenAccruedRate =
                    msgTokenInfo.getBorrowPrincipal() > 0 ?
                    base.getBorrowAccruedRate(vars.token, msgTokenInfo.getLastBorrowBlock())
                    :
                    base.getDepositAccruedRate(vars.token, msgTokenInfo.getLastDepositBlock());

                    // Token rate of the user to be liquidated
                    vars.tokenAccruedRate = base.getDepositAccruedRate(vars.token, tokenInfo.getLastDepositBlock());
                    vars.coinValue = tokenInfo.getDepositBalance(vars.tokenAccruedRate).mul(vars.tokenPrice).div(vars.tokenDivisor);
                    if(vars.coinValue > vars.liquidationDebtValue) {
                        vars.coinValue = vars.liquidationDebtValue;
                        vars.liquidationDebtValue = 0;
                    } else {
                        vars.liquidationDebtValue = vars.liquidationDebtValue.sub(vars.coinValue);
                    }
                    vars.tokenAmount = vars.coinValue.mul(vars.tokenDivisor).div(vars.tokenPrice);
                    tokenInfo.withdraw(vars.tokenAmount, vars.tokenAccruedRate);
                    if(tokenInfo.getDepositPrincipal() == 0) {
                        base.unsetFromDepositBitmap(targetAccountAddr, vars.tokenIndex);
                    }

                    if(msgTokenInfo.getDepositPrincipal() == 0 && vars.tokenAmount > 0) {
                        base.setInDepositBitmap(msg.sender, vars.tokenIndex);
                    }
                    msgTokenInfo.deposit(vars.tokenAmount, vars.msgTokenAccruedRate);
                }
            }

            if(vars.liquidationDebtValue == 0) {
                break;
            }
        }
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

    function send(address _to, uint256 _amount, address _token) private {
        if (_isETH(_token)) {
            //TODO need to check for re-entrancy security attack
            //TODO Can this ETH be received by a contract?
            msg.sender.transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }

    function _isETH(address _token) internal pure returns (bool) {
        return ETH_ADDR == _token;
    }

    // ============================================
    // EMERGENCY WITHDRAWAL FUNCTIONS
    // TODO Needs to be removed when final version deployed
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
        ICToken(_cToken).redeem(_amount);
    }

    function emergencyRedeemUnderlying(address _cToken, uint256 _amount) external onlyEmergencyAddress {
        ICToken(_cToken).redeemUnderlying(_amount);
    }

    function recycleCommunityFund(address _token) public {
        require(msg.sender == deFinerCommunityFund, "Unauthorized call");
        deFinerCommunityFund.transfer(uint256(deFinerFund[_token]));
        deFinerFund[_token] == 0;
    }

    function setDeFinerCommunityFund(address payable _DeFinerCommunityFund) public {
        require(msg.sender == deFinerCommunityFund, "Unauthorized call");
        deFinerCommunityFund = _DeFinerCommunityFund;
    }

//    function getDeFinerCommunityFund(address _token) public view returns(uint256){
//        return deFinerFund[_token];
//    }
}

interface IERC20Extended {
    function decimals() external view returns (uint8);
}