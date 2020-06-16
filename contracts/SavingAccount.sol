pragma solidity 0.5.14;

import "./lib/SymbolsLib.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./params/SavingAccountParameters.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "./Base.sol";
import "./registry/TokenInfoRegistry.sol";

contract SavingAccount {
    using SymbolsLib for SymbolsLib.Symbols;
    using Base for Base.BaseVariable;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    SymbolsLib.Symbols symbols;
    Base.BaseVariable baseVariable;

    // TODO This is emergency address to allow withdrawal of funds from the contract
    address payable public constant EMERGENCY_ADDR = 0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c;
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    TokenInfoRegistry public tokenRegistry;

    uint256 ACCURACY = 10**18;
    uint BLOCKS_PER_YEAR = 2102400;

    uint COMMUNITY_FUND_RATIO = 10;
    uint256 MIN_RESERVE_RATIO = 10;
    uint256 MAX_RESERVE_RATIO = 20;

    int256 public constant INT_UNIT = int256(10 ** uint256(18));

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
        TokenInfoRegistry _tokenRegistry
    )
        public
    {
        SavingAccountParameters params = new SavingAccountParameters();
        tokenRegistry = _tokenRegistry;

        //TODO This needs improvement as it could go out of gas
        symbols.initialize(params.tokenNames(), tokenAddresses, _chainlinkAddress);
        baseVariable.initialize(tokenAddresses, cTokenAddresses);
        for(uint i = 0;i < tokenAddresses.length;i++) {
            if(cTokenAddresses[i] != address(0x0) && tokenAddresses[i] != ETH_ADDR) {
                baseVariable.approveAll(tokenAddresses[i]);
            }
        }
    }

    function approveAll(address _token) public {
        baseVariable.approveAll(_token);
    }

    // TODO Security issue, as this function is open for all
	//Update borrow rates. borrowRate = 1 + blockChangeValue * rate
    function updateDefinerRate(address _token) public {
        baseVariable.updateBorrowRate(_token);
        baseVariable.updateDepositRate(_token);
    }

	/**
	 * Gets the total amount of balance that give accountAddr stored in saving pool.
	 */
    function getAccountTotalUsdValue(address _accountAddr) public view returns (int256 usdValue) {
        int256 totalUsdValue = 0;
        for(uint i = 0; i < symbols.getCoinLength(); i++) {
            address token = symbols.addressFromIndex(i);
            int balance = baseVariable.tokenBalanceAdd(token, _accountAddr);
            if(balance != 0) {
                totalUsdValue = totalUsdValue.add(
                    getTotalUsdValue(token, balance, symbols.priceFromIndex(i))
                );
            }
        }
        return totalUsdValue;
    }

    function getTotalUsdValue(address _token, int256 _amount, uint _price) public view returns(int) {
        if(_isETH(_token)) {
            return _amount.mul(int(_price)).div(INT_UNIT);
        } else {
            return _amount.mul(int(_price)).div(int(10**uint256(IERC20Extended(_token).decimals())));
        }
    }

	/**
	 * Get the overall state of the saving pool
	 */
    function getMarketState() public view returns (
        address[] memory addresses,
        int256[] memory deposits,
        int256[] memory loans,
        int256[] memory collateral,
        uint256[] memory depositRatePerBlock,
        uint256[] memory borrowRatePerBlock
    )
    {
        uint coinsLen = getCoinLength();

        addresses = new address[](coinsLen);
        deposits = new int256[](coinsLen);
        loans = new int256[](coinsLen);
        collateral = new int256[](coinsLen);
        depositRatePerBlock = new uint256[](coinsLen);
        borrowRatePerBlock = new uint256[](coinsLen);

        for (uint i = 0; i < coinsLen; i++) {
            address tokenAddress = symbols.addressFromIndex(i);
            addresses[i] = tokenAddress;
            (
            deposits[i],
            loans[i],
            collateral[i],
            depositRatePerBlock[i],
            borrowRatePerBlock[i]
            ) = baseVariable.getTokenState(tokenAddress);
        }
        return (addresses, deposits, loans, collateral, depositRatePerBlock, borrowRatePerBlock);
    }

	/*
	 * Get the state of the given token
	 */
    function getTokenState(address _token) public view returns (
        int256 deposits,
        int256 loans,
        int256 collateral,
        uint256 depositRatePerBlock,
        uint256 borrowRatePerBlock
    )
    {
        return baseVariable.getTokenState(_token);
    }

	/**
	 * Get all balances for the sender's account
	 */
    function getBalances() public view returns (
        address[] memory addresses,
        int256[] memory totalBalance,
        int256[] memory totalInterest
    )
    {
        uint coinsLen = getCoinLength();

        addresses = new address[](coinsLen);
        totalBalance = new int256[](coinsLen);
        totalInterest = new int256[](coinsLen);

        for (uint i = 0; i < coinsLen; i++) {
            address tokenAddress = symbols.addressFromIndex(i);
            addresses[i] = tokenAddress;
            (totalBalance[i], totalInterest[i]) = tokenBalanceOfAndInterestOf(tokenAddress);
        }

        return (addresses, totalBalance, totalInterest);
    }

    function isAccountLiquidatable(address _borrower, address _token) public view returns (bool) {
        int256 liquidationThreshold = tokenRegistry.getLiquidationThreshold(_token);
        int256 liquidationDiscountRatio = tokenRegistry.getLiquidationDiscountRatio(_token);
        int256 totalBalance = baseVariable.totalBalance(_borrower, symbols, false);
        int256 totalUSDValue = getAccountTotalUsdValue(_borrower);
        if (
            totalBalance.mul(-1).mul(100) > totalUSDValue.mul(liquidationThreshold) &&
            totalBalance.mul(-1).mul(liquidationDiscountRatio) <= totalUSDValue.mul(100)
        ) {
            return true;
        }

        return false;
    }


    function getCoinLength() public view returns(uint256 length){
        return symbols.getCoinLength();
    }

    function tokenBalanceOfAndInterestOf(address _token) public view returns(
        int256 totalBalance,
        int256 totalInterest
    ) {
        return baseVariable.tokenBalanceOfAndInterestOf(_token, msg.sender);
    }

    function getCoinAddress(uint256 _coinIndex) public view returns(address) {
        return symbols.addressFromIndex(_coinIndex);
    }

    function getCoinToUsdRate(uint256 _coinIndex) public view returns(uint256) {
        return symbols.priceFromIndex(_coinIndex);
    }

    function transfer(address _activeAccount, address _token, uint _amount) public {
        baseVariable.transfer(_activeAccount, _token, _amount, symbols);
    }

    /**
     * Borrow the amount of token to the saving pool.
     */
    function borrow(address _token, uint256 _amount) public onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        //baseVariable.
        int256 borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint8 decimals = tokenRegistry.getTokenDecimals(_token);
        int divisor = INT_UNIT;
        if(_token != ETH_ADDR) {
            divisor = int(10**uint256(decimals));
        }
        // TODO Understand this logic
        // totalBorrow = (-totalBalance + amountInETH) / 1e18 * 100
        // TODO How much a user wants to borrow?
        // mul(100) == 100%
        int totalBorrow = baseVariable.totalBalance(msg.sender, symbols, false).mul(-1)
        .add(int256(_amount.mul(symbols.priceFromAddress(_token))).div(divisor));

        // borrowAmount <= borrowPower
        require(totalBorrow.mul(100) <= getAccountTotalUsdValue(msg.sender).mul(borrowLTV), "Insufficient collateral.");
        baseVariable.borrow(_token, _amount);
        send(msg.sender, _amount, _token);
    }

    /**
     * Repay the amount of token back to the saving pool.
     */
    function repay(address _token, uint256 _amount) public payable onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);
        uint money = uint(baseVariable.repay(_token, msg.sender, _amount));
        if(money != 0) {
            send(msg.sender, money, _token);
        }
    }

    /**
     * Deposit the amount of token to the saving pool.
     */
    function deposit(address _token, uint256 _amount) public payable onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);
        baseVariable.deposit(_token, _amount, tokenRegistry.getTokenIndex(_token));
        // Update depositBitmap
    }

    /**
     * Withdraw tokens from the saving pool. If the interest is not empty, the interest
     * will be deducted first.
     */
    function withdraw(address _token, uint256 _amount) public onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        //require(amount <= (address(this).balance) / (10**18), "Requested withdraw amount is more than available balance");
        uint amount = baseVariable.withdraw(_token, _amount);
        send(msg.sender, amount, _token);
    }

    /**
     * Withdraw all tokens from the saving pool.
     */
    function withdrawAll(address _token) public onlySupported(_token) {
        uint amount = baseVariable.withdrawAll(_token);
        send(msg.sender, amount, _token);
    }

    struct LiquidationVars {
        int256 totalBorrow;
        int256 totalCollateral;
        int256 msgTotalBorrow;
        int256 msgTotalCollateral;

        int256 borrowLTV;
        int256 liquidationThreshold;
        int256 liquidationDiscountRatio;
        uint8 decimals;
    }

    /**
     * Liquidate function
     */
    function liquidate(address targetAccountAddr, address _token) public payable {
        LiquidationVars memory vars;
        vars.totalBorrow = baseVariable.totalBalance(targetAccountAddr, symbols, false).mul(-1);
        vars.totalCollateral = baseVariable.totalBalance(targetAccountAddr, symbols, true);
        vars.msgTotalBorrow = baseVariable.totalBalance(msg.sender, symbols, false).mul(-1);
        vars.msgTotalCollateral = baseVariable.totalBalance(msg.sender, symbols, true);

        vars.decimals = tokenRegistry.getTokenDecimals(_token);
        vars.borrowLTV = tokenRegistry.getBorrowLTV(_token);
        vars.liquidationThreshold = tokenRegistry.getLiquidationThreshold(_token);
        vars.liquidationDiscountRatio = tokenRegistry.getLiquidationDiscountRatio(_token);

        require(_token != address(0), "Token address is zero");
        require(tokenRegistry.isTokenExist(_token), "Unsupported token");

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
            vars.msgTotalBorrow.mul(100)
            <
            vars.msgTotalCollateral.mul(vars.borrowLTV),
            "No extra funds are used for liquidation."
        );

        require(
            baseVariable.tokenBalanceAdd(_token, msg.sender) > 0,
            "The account amount must be greater than zero."
        );

        int divisor = INT_UNIT;
        if(_token != ETH_ADDR) {
            divisor = int(10**uint256(vars.decimals));
        }

        //被清算者需要清算掉的资产  (Liquidated assets that need to be liquidated)
        uint liquidationDebtValue = uint(
            vars.totalBorrow.sub(vars.totalCollateral.mul(vars.borrowLTV)).div(vars.liquidationDiscountRatio - vars.borrowLTV)
        );
        //清算者需要付的钱 (Liquidators need to pay)
        uint paymentOfLiquidationAmount = uint(baseVariable.tokenBalanceAdd(_token, msg.sender)).mul(symbols.priceFromAddress(_token)).div(uint(divisor));

        if(paymentOfLiquidationAmount > uint(vars.msgTotalCollateral.sub(vars.msgTotalBorrow))) {
            paymentOfLiquidationAmount = uint(vars.msgTotalCollateral.sub(vars.msgTotalBorrow));
        }

        if(paymentOfLiquidationAmount.mul(100) < liquidationDebtValue.mul(uint(vars.liquidationDiscountRatio))) {
            liquidationDebtValue = paymentOfLiquidationAmount.mul(100).div(uint(vars.liquidationDiscountRatio));
        }

        // The collaterals are liquidate in the order of their market liquidity
        for(uint i = 0; i < getCoinLength(); i++) {
            address[] memory addr;
            uint[] memory u;
            addr[0] = targetAccountAddr;
            addr[1] = _token;
            addr[2] = symbols.addressFromIndex(i);
            u[0] = symbols.priceFromAddress(_token);
            u[1] = symbols.priceFromIndex(i);
            u[2] = liquidationDebtValue;
            (uint _liquidationDebtValue) = baseVariable.liquidate(
                addr, u
            );
            if(_liquidationDebtValue == 0){
                break;
            } else {
                liquidationDebtValue = _liquidationDebtValue;
            }
        }
    }

    function recycleCommunityFund(address _token) public {
        baseVariable.recycleCommunityFund(_token);
    }

    function setDeFinerCommunityFund(address payable _deFinerCommunityFund) public {
        baseVariable.setDeFinerCommunityFund(_deFinerCommunityFund);
    }

    function getDeFinerCommunityFund(address _token) public view returns(int256) {
        return baseVariable.getDeFinerCommunityFund(_token);
    }

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
}