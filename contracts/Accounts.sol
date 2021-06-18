// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

import "./lib/AccountTokenLib.sol";
import "./lib/BitmapLib.sol";
import "./config/Constant.sol";
import "./config/GlobalConfig.sol";
import "./registry/TokenRegistry.sol";
import "./Bank.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";

contract Accounts is Constant, Initializable{
    using AccountTokenLib for AccountTokenLib.TokenInfo;
    using BitmapLib for uint128;
    using SafeMath for uint256;
    using Math for uint256;

    mapping(address => Account) public accounts;
    GlobalConfig globalConfig;
    mapping(address => uint256) public FINAmount;

    modifier onlyAuthorized() {
        require(msg.sender == address(globalConfig.savingAccount()) || msg.sender == address(globalConfig.bank()),
            "Only authorized to call from DeFiner internal contracts.");
        _;
    }

    struct Account {
        // Note, it's best practice to use functions minusAmount, addAmount, totalAmount
        // to operate tokenInfos instead of changing it directly.
        mapping(address => AccountTokenLib.TokenInfo) tokenInfos;
        uint128 depositBitmap;
        uint128 borrowBitmap;
    }

    /**
     * Initialize the Accounts
     * @param _globalConfig the global configuration contract
     */
    function initialize(
        GlobalConfig _globalConfig
    ) public initializer {
        globalConfig = _globalConfig;
    }

    /**
     * Check if the user has deposit for any tokens
     * @param _account address of the user
     * @return true if the user has positive deposit balance
     */
    function isUserHasAnyDeposits(address _account) public view returns (bool) {
        Account storage account = accounts[_account];
        return account.depositBitmap > 0;
    }

    /**
     * Check if the user has deposit for a token
     * @param _account address of the user
     * @param _index index of the token
     * @return true if the user has positive deposit balance for the token
     */
    function isUserHasDeposits(address _account, uint8 _index) public view returns (bool) {
        Account storage account = accounts[_account];
        return account.depositBitmap.isBitSet(_index);
    }

    /**
     * Check if the user has borrowed a token
     * @param _account address of the user
     * @param _index index of the token
     * @return true if the user has borrowed the token
     */
    function isUserHasBorrows(address _account, uint8 _index) public view returns (bool) {
        Account storage account = accounts[_account];
        return account.borrowBitmap.isBitSet(_index);
    }

    /**
     * Set the deposit bitmap for a token.
     * @param _account address of the user
     * @param _index index of the token
     */
    function setInDepositBitmap(address _account, uint8 _index) internal {
        Account storage account = accounts[_account];
        account.depositBitmap = account.depositBitmap.setBit(_index);
    }

    /**
     * Unset the deposit bitmap for a token
     * @param _account address of the user
     * @param _index index of the token
     */
    function unsetFromDepositBitmap(address _account, uint8 _index) internal {
        Account storage account = accounts[_account];
        account.depositBitmap = account.depositBitmap.unsetBit(_index);
    }

    /**
     * Set the borrow bitmap for a token.
     * @param _account address of the user
     * @param _index index of the token
     */
    function setInBorrowBitmap(address _account, uint8 _index) internal {
        Account storage account = accounts[_account];
        account.borrowBitmap = account.borrowBitmap.setBit(_index);
    }

    /**
     * Unset the borrow bitmap for a token
     * @param _account address of the user
     * @param _index index of the token
     */
    function unsetFromBorrowBitmap(address _account, uint8 _index) internal {
        Account storage account = accounts[_account];
        account.borrowBitmap = account.borrowBitmap.unsetBit(_index);
    }

    function getDepositPrincipal(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getDepositPrincipal();
    }

    function getBorrowPrincipal(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getBorrowPrincipal();
    }

    function getLastDepositBlock(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getLastDepositBlock();
    }

    function getLastBorrowBlock(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getLastBorrowBlock();
    }

    /**
     * Get deposit interest of an account for a specific token
     * @param _account account address
     * @param _token token address
     * @dev The deposit interest may not have been updated in AccountTokenLib, so we need to explicited calcuate it.
     */
    function getDepositInterest(address _account, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_account].tokenInfos[_token];
        // If the account has never deposited the token, return 0.
        if (tokenInfo.getLastDepositBlock() == 0)
            return 0;
        else {
            // As the last deposit block exists, the block is also a check point on index curve.
            uint256 accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
            return tokenInfo.calculateDepositInterest(accruedRate);
        }
    }

    function getBorrowInterest(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        // If the account has never borrowed the token, return 0
        if (tokenInfo.getLastBorrowBlock() == 0)
            return 0;
        else {
            // As the last borrow block exists, the block is also a check point on index curve.
            uint256 accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
            return tokenInfo.calculateBorrowInterest(accruedRate);
        }
    }

    function borrow(address _accountAddr, address _token, uint256 _amount) external onlyAuthorized {
        require(_amount != 0, "Borrow zero amount of token is not allowed.");
        require(isUserHasAnyDeposits(_accountAddr), "The user doesn't have any deposits.");
        (uint8 tokenIndex, uint256 tokenDivisor, uint256 tokenPrice,) = globalConfig.tokenInfoRegistry().getTokenInfoFromAddress(_token);
        require(
            getBorrowETH(_accountAddr).add(_amount.mul(tokenPrice).div(tokenDivisor))
            <= getBorrowPower(_accountAddr), "Insufficient collateral when borrow."
        );

        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];

        if(tokenInfo.getLastBorrowBlock() == 0)
            tokenInfo.borrow(_amount, INT_UNIT, getBlockNumber());
        else {
            calculateBorrowFIN(tokenInfo.getLastBorrowBlock(), _token, _accountAddr, getBlockNumber());
            uint256 accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
            // Update the token principla and interest
            tokenInfo.borrow(_amount, accruedRate, getBlockNumber());
        }

        // Since we have checked that borrow amount is larget than zero. We can set the borrow
        // map directly without checking the borrow balance.
        setInBorrowBitmap(_accountAddr, tokenIndex);
    }

    /**
     * Update token info for withdraw. The interest will be withdrawn with higher priority.
     */
    function withdraw(address _accountAddr, address _token, uint256 _amount) public onlyAuthorized returns (uint256) {
        (, uint256 tokenDivisor, uint256 tokenPrice, uint256 borrowLTV) = globalConfig.tokenInfoRegistry().getTokenInfoFromAddress(_token);

        uint256 withdrawETH = _amount.mul(tokenPrice).mul(borrowLTV).div(tokenDivisor).div(100);
        require(getBorrowETH(_accountAddr) <= getBorrowPower(_accountAddr).sub(withdrawETH), "Insufficient collateral when withdraw.");

        (uint256 amountAfterCommission, ) = _withdraw(_accountAddr, _token, _amount, true);

        return amountAfterCommission;
    }

    /**
     * This function is called in liquidation function. There two difference between this function and
     * the Account.withdraw function: 1) It doesn't check the user's borrow power, because the user
     * is already borrowed more than it's borrowing power. 2) It doesn't take commissions.
     */
    function withdraw_liquidate(address _accountAddr, address _token, uint256 _amount) internal {
        _withdraw(_accountAddr, _token, _amount, false);
    }

    function _withdraw(address _accountAddr, address _token, uint256 _amount, bool _isCommission) internal returns (uint256, uint256) {
        // Check if withdraw amount is less than user's balance
        require(_amount <= getDepositBalanceCurrent(_token, _accountAddr), "Insufficient balance.");

        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint256 lastBlock = tokenInfo.getLastDepositBlock();
        uint256 currentBlock = getBlockNumber();
        calculateDepositFIN(lastBlock, _token, _accountAddr, currentBlock);

        uint256 principalBeforeWithdraw = tokenInfo.getDepositPrincipal();

        if (tokenInfo.getLastDepositBlock() == 0)
            tokenInfo.withdraw(_amount, INT_UNIT, getBlockNumber());
        else {
            // As the last deposit block exists, the block is also a check point on index curve.
            uint256 accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
            tokenInfo.withdraw(_amount, accruedRate, getBlockNumber());
        }

        uint256 principalAfterWithdraw = tokenInfo.getDepositPrincipal();
        if(tokenInfo.getDepositPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            unsetFromDepositBitmap(_accountAddr, tokenIndex);
        }

        uint256 commission = 0;
        if (_isCommission && _accountAddr != globalConfig.deFinerCommunityFund()) {
            // DeFiner takes 10% commission on the interest a user earn
            commission = _amount.sub(principalBeforeWithdraw.sub(principalAfterWithdraw)).mul(globalConfig.deFinerRate()).div(100);
            deposit(globalConfig.deFinerCommunityFund(), _token, commission);
            _amount = _amount.sub(commission);
        }

        return (_amount, commission);
    }

    /**
     * Update token info for deposit
     */
    function deposit(address _accountAddr, address _token, uint256 _amount) public onlyAuthorized {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        if(tokenInfo.getDepositPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            setInDepositBitmap(_accountAddr, tokenIndex);
        }

        if(tokenInfo.getLastDepositBlock() == 0)
            tokenInfo.deposit(_amount, INT_UNIT, getBlockNumber());
        else {
            calculateDepositFIN(tokenInfo.getLastDepositBlock(), _token, _accountAddr, getBlockNumber());
            uint256 accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
            tokenInfo.deposit(_amount, accruedRate, getBlockNumber());
        }
    }

    function repay(address _accountAddr, address _token, uint256 _amount) public onlyAuthorized returns(uint256){
        // Update tokenInfo
        uint256 amountOwedWithInterest = getBorrowBalanceCurrent(_token, _accountAddr);
        uint256 amount = _amount > amountOwedWithInterest ? amountOwedWithInterest : _amount;
        uint256 remain =  _amount > amountOwedWithInterest ? _amount.sub(amountOwedWithInterest) : 0;
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        // Sanity check
        require(tokenInfo.getBorrowPrincipal() > 0, "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button.");
        if(tokenInfo.getLastBorrowBlock() == 0)
            tokenInfo.repay(amount, INT_UNIT, getBlockNumber());
        else {
            calculateBorrowFIN(tokenInfo.getLastBorrowBlock(), _token, _accountAddr, getBlockNumber());
            uint256 accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
            tokenInfo.repay(amount, accruedRate, getBlockNumber());
        }

        if(tokenInfo.getBorrowPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            unsetFromBorrowBitmap(_accountAddr, tokenIndex);
        }
        return remain;
    }

    function getDepositBalanceCurrent(
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        Bank bank = globalConfig.bank();
        uint256 accruedRate;
        if(tokenInfo.getDepositPrincipal() == 0) {
            return 0;
        } else {
            if(bank.depositeRateIndex(_token, tokenInfo.getLastDepositBlock()) == 0) {
                accruedRate = INT_UNIT;
            } else {
                accruedRate = bank.depositeRateIndexNow(_token)
                .mul(INT_UNIT)
                .div(bank.depositeRateIndex(_token, tokenInfo.getLastDepositBlock()));
            }
            return tokenInfo.getDepositBalance(accruedRate);
        }
    }

    /**
     * Get current borrow balance of a token
     * @param _token token address
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    function getBorrowBalanceCurrent(
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        Bank bank = globalConfig.bank();
        uint256 accruedRate;
        if(tokenInfo.getBorrowPrincipal() == 0) {
            return 0;
        } else {
            if(bank.borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()) == 0) {
                accruedRate = INT_UNIT;
            } else {
                accruedRate = bank.borrowRateIndexNow(_token)
                .mul(INT_UNIT)
                .div(bank.borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()));
            }
            return tokenInfo.getBorrowBalance(accruedRate);
        }
    }

    /**
     * Calculate an account's borrow power based on token's LTV
     */
    function getBorrowPower(address _borrower) public view returns (uint256 power) {
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
        uint256 tokenNum = tokenRegistry.getCoinLength();
        for(uint256 i = 0; i < tokenNum; i++) {
            if (isUserHasDeposits(_borrower, uint8(i))) {
                (address token, uint256 divisor, uint256 price, uint256 borrowLTV) = tokenRegistry.getTokenInfoFromIndex(i);

                uint256 depositBalanceCurrent = getDepositBalanceCurrent(token, _borrower);
                power = power.add(depositBalanceCurrent.mul(price).mul(borrowLTV).div(100).div(divisor));
            }
        }
        return power;
    }

    /**
     * Get current deposit balance of a token
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    function getDepositETH(
        address _accountAddr
    ) public view returns (uint256 depositETH) {
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
        uint256 tokenNum = tokenRegistry.getCoinLength();
        for(uint256 i = 0; i < tokenNum; i++) {
            if(isUserHasDeposits(_accountAddr, uint8(i))) {
                (address token, uint256 divisor, uint256 price, ) = tokenRegistry.getTokenInfoFromIndex(i);

                uint256 depositBalanceCurrent = getDepositBalanceCurrent(token, _accountAddr);
                depositETH = depositETH.add(depositBalanceCurrent.mul(price).div(divisor));
            }
        }
        return depositETH;
    }
    /**
     * Get borrowed balance of a token in the uint256 of Wei
     */
    function getBorrowETH(
        address _accountAddr
    ) public view returns (uint256 borrowETH) {
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
        uint256 tokenNum = tokenRegistry.getCoinLength();
        for(uint256 i = 0; i < tokenNum; i++) {
            if(isUserHasBorrows(_accountAddr, uint8(i))) {
                (address token, uint256 divisor, uint256 price, ) = tokenRegistry.getTokenInfoFromIndex(i);

                uint256 borrowBalanceCurrent = getBorrowBalanceCurrent(token, _accountAddr);
                borrowETH = borrowETH.add(borrowBalanceCurrent.mul(price).div(divisor));
            }
        }
        return borrowETH;
    }

    /**
     * Check if the account is liquidatable
     * @param _borrower borrower's account
     * @return true if the account is liquidatable
     */
    function isAccountLiquidatable(address _borrower) public returns (bool) {
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
        Bank bank = globalConfig.bank();

        // Add new rate check points for all the collateral tokens from borrower in order to
        // have accurate calculation of liquidation oppotunites.
        uint256 tokenNum = tokenRegistry.getCoinLength();
        for(uint8 i = 0; i < tokenNum; i++) {
            if (isUserHasDeposits(_borrower, i) || isUserHasBorrows(_borrower, i)) {
                address token = tokenRegistry.addressFromIndex(i);
                bank.newRateIndexCheckpoint(token);
            }
        }

        uint256 liquidationThreshold = globalConfig.liquidationThreshold();
        uint256 liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();

        uint256 totalBorrow = getBorrowETH(_borrower);
        uint256 totalCollateral = getDepositETH(_borrower);

        // It is required that LTV is larger than LIQUIDATE_THREADHOLD for liquidation
        // return totalBorrow.mul(100) > totalCollateral.mul(liquidationThreshold);
        return totalBorrow.mul(100) > totalCollateral.mul(liquidationThreshold) && totalBorrow.mul(100) <= totalCollateral.mul(liquidationDiscountRatio);
    }

    struct LiquidationVars {
        uint256 borrowerCollateralValue;
        uint256 targetTokenBalance;
        uint256 targetTokenBalanceBorrowed;
        uint256 targetTokenPrice;
        uint256 liquidationDiscountRatio;
        uint256 totalBorrow;
        uint256 borrowPower;
        uint256 liquidateTokenBalance;
        uint256 liquidateTokenPrice;
        uint256 limitRepaymentValue;
        uint256 borrowTokenLTV;
        uint256 repayAmount;
        uint256 payAmount;
    }

    function liquidate(
        address _liquidator,
        address _borrower,
        address _borrowedToken,
        address _collateralToken
    )
        external
        onlyAuthorized
        returns (
            uint256,
            uint256
        )
    {
        require(isAccountLiquidatable(_borrower), "The borrower is not liquidatable.");

        // It is required that the liquidator doesn't exceed it's borrow power.
        require(
            getBorrowETH(_liquidator) < getBorrowPower(_liquidator),
            "No extra funds are used for liquidation."
        );

        LiquidationVars memory vars;

        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();

        // _borrowedToken balance of the liquidator (deposit balance)
        vars.targetTokenBalance = getDepositBalanceCurrent(_borrowedToken, _liquidator);
        require(vars.targetTokenBalance > 0, "The account amount must be greater than zero.");

        // _borrowedToken balance of the borrower (borrow balance)
        vars.targetTokenBalanceBorrowed = getBorrowBalanceCurrent(_borrowedToken, _borrower);
        require(vars.targetTokenBalanceBorrowed > 0, "The borrower doesn't own any debt token specified by the liquidator.");

        // _borrowedToken available for liquidation
        uint256 borrowedTokenAmountForLiquidation = vars.targetTokenBalance.min(vars.targetTokenBalanceBorrowed);

        // _collateralToken balance of the borrower (deposit balance)
        vars.liquidateTokenBalance = getDepositBalanceCurrent(_collateralToken, _borrower);
        vars.liquidateTokenPrice = tokenRegistry.priceFromAddress(_collateralToken);

        uint256 divisor = 10 ** uint256(tokenRegistry.getTokenDecimals(_borrowedToken));
        uint256 liquidateTokendivisor = 10 ** uint256(tokenRegistry.getTokenDecimals(_collateralToken));

        // _collateralToken to purchase so that borrower's balance matches its borrow power
        vars.totalBorrow = getBorrowETH(_borrower);
        vars.borrowPower = getBorrowPower(_borrower);
        vars.liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();
        vars.borrowTokenLTV = tokenRegistry.getBorrowLTV(_borrowedToken);
        vars.limitRepaymentValue = vars.totalBorrow.sub(vars.borrowPower).mul(100).div(vars.liquidationDiscountRatio.sub(vars.borrowTokenLTV));

        uint256 collateralTokenValueForLiquidation = vars.limitRepaymentValue.min(vars.liquidateTokenBalance.mul(vars.liquidateTokenPrice).div(liquidateTokendivisor));

        vars.targetTokenPrice = tokenRegistry.priceFromAddress(_borrowedToken);
        uint256 liquidationValue = collateralTokenValueForLiquidation.min(borrowedTokenAmountForLiquidation.mul(vars.targetTokenPrice).mul(100).div(divisor).div(vars.liquidationDiscountRatio));

        vars.repayAmount = liquidationValue.mul(vars.liquidationDiscountRatio).mul(divisor).div(100).div(vars.targetTokenPrice);
        vars.payAmount = vars.repayAmount.mul(liquidateTokendivisor).mul(100).mul(vars.targetTokenPrice);
        vars.payAmount = vars.payAmount.div(divisor).div(vars.liquidationDiscountRatio).div(vars.liquidateTokenPrice);

        deposit(_liquidator, _collateralToken, vars.payAmount);
        withdraw_liquidate(_liquidator, _borrowedToken, vars.repayAmount);
        withdraw_liquidate(_borrower, _collateralToken, vars.payAmount);
        repay(_borrower, _borrowedToken, vars.repayAmount);

        return (vars.repayAmount, vars.payAmount);
    }


    /**
     * Get current block number
     * @return the current block number
     */
    function getBlockNumber() private view returns (uint256) {
        return block.number;
    }

    /**
     * An account claim all mined FIN token.
     * @dev If the FIN mining index point doesn't exist, we have to calculate the FIN amount 
     * accurately. So the user can withdraw all available FIN tokens.
     */
    function claim(address _account) public onlyAuthorized returns(uint256){
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
        Bank bank = globalConfig.bank();
        uint256 coinLength = tokenRegistry.getCoinLength();
        for(uint8 i = 0; i < coinLength; i++) {
            if (isUserHasDeposits(_account, i) || isUserHasBorrows(_account, i)) {
                address token = tokenRegistry.addressFromIndex(i);
                AccountTokenLib.TokenInfo storage tokenInfo = accounts[_account].tokenInfos[token];
                uint256 currentBlock = getBlockNumber();
                bank.updateMining(token);

                if (isUserHasDeposits(_account, i)) {
                    bank.updateDepositFINIndex(token);
                    uint256 accruedRate = bank.getDepositAccruedRate(token, tokenInfo.getLastDepositBlock());
                    calculateDepositFIN(tokenInfo.getLastDepositBlock(), token, _account, currentBlock);
                    tokenInfo.deposit(0, accruedRate, currentBlock);
                }

                if (isUserHasBorrows(_account, i)) {
                    bank.updateBorrowFINIndex(token);
                    uint256 accruedRate = bank.getBorrowAccruedRate(token, tokenInfo.getLastBorrowBlock());
                    calculateBorrowFIN(tokenInfo.getLastBorrowBlock(), token, _account, currentBlock);
                    tokenInfo.borrow(0, accruedRate, currentBlock);
                }
            }
        }
        uint256 _FINAmount = FINAmount[_account];
        FINAmount[_account] = 0;
        return _FINAmount;
    }

    /**
     * Accumulate the amount FIN mined by depositing between _lastBlock and _currentBlock
     */
    function calculateDepositFIN(uint256 _lastBlock, address _token, address _accountAddr, uint256 _currentBlock) internal {
        Bank bank = globalConfig.bank();

        uint256 indexDifference = bank.depositFINRateIndex(_token, _currentBlock)
                                .sub(bank.depositFINRateIndex(_token, _lastBlock));
        uint256 getFIN = getDepositBalanceCurrent(_token, _accountAddr)
                        .mul(indexDifference)
                        .div(bank.depositeRateIndex(_token, _currentBlock));
        FINAmount[_accountAddr] = FINAmount[_accountAddr].add(getFIN);
    }

    /**
     * Accumulate the amount FIN mined by borrowing between _lastBlock and _currentBlock
     */
    function calculateBorrowFIN(uint256 _lastBlock, address _token, address _accountAddr, uint256 _currentBlock) internal {
        Bank bank = globalConfig.bank();

        uint256 indexDifference = bank.borrowFINRateIndex(_token, _currentBlock)
                                .sub(bank.borrowFINRateIndex(_token, _lastBlock));
        uint256 getFIN = getBorrowBalanceCurrent(_token, _accountAddr)
                        .mul(indexDifference)
                        .div(bank.borrowRateIndex(_token, _currentBlock));
        FINAmount[_accountAddr] = FINAmount[_accountAddr].add(getFIN);
    }
}
