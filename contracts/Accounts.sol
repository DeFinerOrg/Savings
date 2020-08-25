pragma solidity 0.5.14;

import "./lib/AccountTokenLib.sol";
import "./lib/BitmapLib.sol";
import "./lib/Utils.sol";
import "./config/GlobalConfig.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract Accounts is Ownable, Initializable{
    using AccountTokenLib for AccountTokenLib.TokenInfo;
    using BitmapLib for uint128;
    using SafeMath for uint256;

    mapping(address => Account) public accounts;
    mapping(address => uint256) public deFinerFund;

    GlobalConfig globalConfig;

    modifier onlySavingAccount() {
        require(msg.sender == address(globalConfig.savingAccount()), "Insufficient power");
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

    function getDepositInterest(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getDepositInterest();
    }

    function getBorrowInterest(address _accountAddr, address _token) public view returns(uint256) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getBorrowInterest();
    }

    function borrow(address _accountAddr, address _token, uint256 _amount, uint256 _block) public onlySavingAccount{
        require(isUserHasAnyDeposits(_accountAddr), "The user doesn't have any deposits.");
        uint256 borrowLTV = globalConfig.tokenInfoRegistry().getBorrowLTV(_token);
        uint divisor = Utils.getDivisor(address(globalConfig), _token);
        require(
            getBorrowETH(_accountAddr).add(
                _amount.mul(globalConfig.tokenInfoRegistry().priceFromAddress(_token)).div(divisor)
            ).mul(100)
            <=
            getDepositETH(_accountAddr).mul(borrowLTV),
            "Insufficient collateral."
        );
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint256 accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastDepositBlock());
        if(tokenInfo.getBorrowPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            setInBorrowBitmap(_accountAddr, tokenIndex);
        }
        tokenInfo.borrow(_amount, accruedRate, _block);
    }

    /**
     * Update token info for withdraw. The interest will be withdrawn with higher priority.
     */
    function withdraw(address _accountAddr, address _token, uint256 _amount, uint256 _block) public onlySavingAccount returns(uint256){
        // Check if withdraw amount is less than user's balance
        require(_amount <= getDepositBalanceCurrent(_token, _accountAddr), "Insufficient balance.");
        uint256 borrowLTV = globalConfig.tokenInfoRegistry().getBorrowLTV(_token);
        uint divisor = Utils.getDivisor(address(globalConfig), _token);
        require(getBorrowETH(_accountAddr).mul(100) <= getDepositETH(_accountAddr)
        .sub(_amount.mul(globalConfig.tokenInfoRegistry().priceFromAddress(_token)).div(divisor)).mul(borrowLTV), "Insufficient collateral.");
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint256 principalBeforeWithdraw = tokenInfo.getDepositPrincipal();
        uint256 accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.withdraw(_amount, accruedRate, _block);
        uint256 principalAfterWithdraw = tokenInfo.getDepositPrincipal();
        if(tokenInfo.getDepositPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            unsetFromDepositBitmap(_accountAddr, tokenIndex);
        }
        uint256 commission = _amount.sub(principalBeforeWithdraw.sub(principalAfterWithdraw)).mul(globalConfig.deFinerRate()).div(100);
        deFinerFund[_token] = deFinerFund[_token].add(commission);
        return _amount.sub(commission);
    }

    /**
     * Update token info for deposit
     */
    function deposit(address _accountAddr, address _token, uint256 _amount, uint256 _block) public onlySavingAccount{
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        if(tokenInfo.getDepositPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            setInDepositBitmap(_accountAddr, tokenIndex);
        }
        tokenInfo.deposit(_amount, accruedRate, _block);
    }

    function repay(address _accountAddr, address _token, uint256 _amount, uint256 _block) public onlySavingAccount returns(uint256){
        // Update tokenInfo
        uint256 amountOwedWithInterest = getBorrowBalanceStore(_token, _accountAddr);
        uint amount = _amount > amountOwedWithInterest ? amountOwedWithInterest : _amount;
        uint256 remain =  _amount > amountOwedWithInterest ? _amount.sub(amountOwedWithInterest) : 0;
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        // Sanity check
        require(tokenInfo.getBorrowPrincipal() > 0, "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button.");
        uint accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
        tokenInfo.repay(amount, accruedRate, _block);
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
        uint UNIT = globalConfig.constants().INT_UNIT();
        uint accruedRate;
        if(tokenInfo.getDepositPrincipal() == 0) {
            return 0;
        } else {
            if(globalConfig.bank().depositeRateIndex(_token, tokenInfo.getLastDepositBlock()) == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = globalConfig.bank().depositRateIndexNow(_token)
                .mul(UNIT)
                .div(globalConfig.bank().depositeRateIndex(_token, tokenInfo.getLastDepositBlock()));
            }
            return tokenInfo.getDepositBalance(accruedRate);
        }
    }

    function getDepositBalanceStore(
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        return tokenInfo.getDepositBalance(accruedRate);
    }

    /**
     * Get current borrow balance of a token
     * @param _token token address
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    // sichaoy: What's the diff of getBorrowBalance with getBorrowAcruedRate?
    function getBorrowBalanceCurrent(
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = globalConfig.constants().INT_UNIT();
        uint accruedRate;
        if(tokenInfo.getBorrowPrincipal() == 0) {
            return 0;
        } else {
            if(globalConfig.bank().borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()) == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = globalConfig.bank().borrowRateIndexNow(_token)
                .mul(UNIT)
                .div(globalConfig.bank().borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()));
            }
            return tokenInfo.getBorrowBalance(accruedRate);
        }
    }

    function getBorrowBalanceStore(
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        AccountTokenLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
        return tokenInfo.getBorrowBalance(accruedRate);
    }

    /**
     * Get current deposit balance of a token
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    function getDepositETH(
        address _accountAddr
    ) public view returns (uint256 depositETH) {
        for(uint i = 0; i < globalConfig.tokenInfoRegistry().getCoinLength(); i++) {
            if(isUserHasDeposits(_accountAddr, uint8(i))) {
                address tokenAddress = globalConfig.tokenInfoRegistry().addressFromIndex(i);
                uint divisor = globalConfig.constants().INT_UNIT();
                if(tokenAddress != globalConfig.constants().ETH_ADDR()) {
                    divisor = 10**uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(tokenAddress));
                }
                depositETH = depositETH.add(getDepositBalanceCurrent(tokenAddress, _accountAddr).mul(globalConfig.tokenInfoRegistry().priceFromIndex(i)).div(divisor));
            }
        }
        return depositETH;
    }

    /**
     * Get borrowed balance of a token in the uint of Wei
     */
    // sichaoy: change name to getTotalBorrowInETH()
    function getBorrowETH(
        address _accountAddr
    ) public view returns (uint256 borrowETH) {
        for(uint i = 0; i < globalConfig.tokenInfoRegistry().getCoinLength(); i++) {
            if(isUserHasBorrows(_accountAddr, uint8(i))) {
                address tokenAddress = globalConfig.tokenInfoRegistry().addressFromIndex(i);
                uint divisor = globalConfig.constants().INT_UNIT();
                if(tokenAddress != globalConfig.constants().ETH_ADDR()) {
                    divisor = 10 ** uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(tokenAddress));
                }
                borrowETH = borrowETH.add(getBorrowBalanceCurrent(tokenAddress, _accountAddr).mul(globalConfig.tokenInfoRegistry().priceFromIndex(i)).div(divisor));
            }
        }
        return borrowETH;
    }

    /**
	 * Check if the account is liquidatable
     * @param _borrower borrower's account
     * @return true if the account is liquidatable
	 */
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

    struct LiquidationVars {
        uint256 totalBorrow;
        uint256 totalCollateral;
        uint256 msgTotalBorrow;
        uint256 msgTotalCollateral;

        uint256 targetTokenBalance;
        uint256 liquidationDebtValue;
        uint256 liquidationThreshold;
        uint256 liquidationDiscountRatio;
        uint256 borrowLTV;
        uint256 paymentOfLiquidationValue;
    }

    function liquidateLogic(address _accountAddr, address _targetAccountAddr, address _targetToken) public view returns (uint, uint) {
        LiquidationVars memory vars;
        vars.totalBorrow = getBorrowETH(_targetAccountAddr);
        vars.totalCollateral = getDepositETH(_targetAccountAddr);

        vars.msgTotalBorrow = getBorrowETH(_accountAddr);
        vars.msgTotalCollateral = getDepositETH(_accountAddr);

        vars.targetTokenBalance = getDepositBalanceCurrent(_targetToken, _accountAddr);

        vars.liquidationThreshold =  globalConfig.liquidationThreshold();
        vars.liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();

        vars.borrowLTV = globalConfig.tokenInfoRegistry().getBorrowLTV(_targetToken);

        // It is required that LTV is larger than LIQUIDATE_THREADHOLD for liquidation
        require(
            vars.totalBorrow.mul(100) > vars.totalCollateral.mul(vars.liquidationThreshold),
            "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
        );

        // The value of discounted collateral should be never less than the borrow amount.
        // We assume this will never happen as the market will not drop extreamly fast so that
        // the LTV changes from 85% to 95%, an 10% drop within one block.
        require(
            vars.totalBorrow.mul(100) <= vars.totalCollateral.mul(vars.liquidationDiscountRatio),
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

        uint divisor = Utils.getDivisor(address(globalConfig), _targetToken);

        // Amount of assets that need to be liquidated
        vars.liquidationDebtValue = vars.totalBorrow.sub(
            vars.totalCollateral.mul(vars.borrowLTV).div(100)
        ).mul(vars.liquidationDiscountRatio).div(vars.liquidationDiscountRatio - vars.borrowLTV);

        // Liquidators need to pay
        vars.paymentOfLiquidationValue = vars.targetTokenBalance.mul(globalConfig.tokenInfoRegistry().priceFromAddress(_targetToken)).div(divisor);

        if(
            vars.msgTotalBorrow != 0 &&
            vars.paymentOfLiquidationValue > (vars.msgTotalCollateral).mul(vars.borrowLTV).div(100).sub(vars.msgTotalBorrow)
        ) {
            vars.paymentOfLiquidationValue = (vars.msgTotalCollateral).mul(vars.borrowLTV).div(100).sub(vars.msgTotalBorrow);
        }

        if(vars.paymentOfLiquidationValue.mul(100) < vars.liquidationDebtValue.mul(vars.liquidationDiscountRatio)) {
            vars.liquidationDebtValue = vars.paymentOfLiquidationValue.mul(100).div(vars.liquidationDiscountRatio);
        }

        uint targetTokenAmount = vars.liquidationDebtValue.mul(divisor).div(globalConfig.tokenInfoRegistry().priceFromAddress(_targetToken)).mul(vars.liquidationDiscountRatio).div(100);

        return (vars.liquidationDebtValue, targetTokenAmount);
    }

    function clearDeFinerFund(address _token) public onlySavingAccount{
        deFinerFund[_token] = 0;
    }
}
