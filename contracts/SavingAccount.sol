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

    uint256 public constant UINT_UNIT = 10 ** 18;

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
        baseVariable.newRateIndexCheckpoint(_token);
    }

	/**
	 * Gets the total amount of balance that give accountAddr stored in saving pool.
	 */
    function getAccountTotalETHValue(address _accountAddr) public view returns (uint256 ETHValue) {
        uint256 borrowETHValue = baseVariable.getBorrowETH(_accountAddr, symbols);
        uint256 mortgageETHValue = baseVariable.getDepositETH(_accountAddr, symbols);
        if(borrowETHValue > mortgageETHValue) {
            ETHValue = borrowETHValue.sub(mortgageETHValue);
        } else {
            ETHValue = mortgageETHValue.sub(borrowETHValue);
        }
        return ETHValue;
    }

	/**
	 * Get the overall state of the saving pool
	 */
    function getMarketState() public view returns (
        address[] memory addresses,
        uint256[] memory deposits,
        uint256[] memory loans,
        uint256[] memory collateral,
        uint256[] memory depositRatePerBlock,
        uint256[] memory borrowRatePerBlock
    )
    {
        uint coinsLen = getCoinLength();

        addresses = new address[](coinsLen);
        deposits = new uint256[](coinsLen);
        loans = new uint256[](coinsLen);
        collateral = new uint256[](coinsLen);
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
        uint256 deposits,
        uint256 loans,
        uint256 collateral,
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
        uint256[] memory depositBalance,
        uint256[] memory borrowBalance
    )
    {
        uint coinsLen = getCoinLength();

        addresses = new address[](coinsLen);
        depositBalance = new uint256[](coinsLen);
        borrowBalance = new uint256[](coinsLen);

        for (uint i = 0; i < coinsLen; i++) {
            address tokenAddress = symbols.addressFromIndex(i);
            addresses[i] = tokenAddress;
            depositBalance[i] = baseVariable.getDepositBalance(tokenAddress, msg.sender);
            borrowBalance[i] = baseVariable.getBorrowBalance(tokenAddress, msg.sender);
        }

        return (addresses, depositBalance, borrowBalance);
    }

    function isAccountLiquidatable(address _borrower) public view returns (bool) {
        uint256 liquidationThreshold = tokenRegistry.getLiquidationThreshold();
        uint256 liquidationDiscountRatio = tokenRegistry.getLiquidationDiscountRatio();
        uint256 totalBalance = baseVariable.getBorrowETH(_borrower, symbols);
        uint256 totalETHValue = baseVariable.getDepositETH(_borrower, symbols);
        if (
            totalBalance.mul(100) > totalETHValue.mul(liquidationThreshold) &&
            totalBalance.mul(liquidationDiscountRatio) <= totalETHValue.mul(100)
        ) {
            return true;
        }
        return false;
    }

    function getCoinLength() public view returns(uint256 length) {
        return symbols.getCoinLength();
    }

    function tokenBalance(address _token) public view returns(
        uint256 depositBalance,
        uint256 borrowBalance
    ) {
        return (baseVariable.getDepositBalance(_token, msg.sender), baseVariable.getBorrowBalance(_token, msg.sender));
    }

    function getCoinAddress(uint256 _coinIndex) public view returns(address) {
        return symbols.addressFromIndex(_coinIndex);
    }

    function getCoinToETHRate(uint256 _coinIndex) public view returns(uint256) {
        return symbols.priceFromIndex(_coinIndex);
    }

    function transfer(address _activeAccount, address _token, uint _amount) public {
        baseVariable.transfer(_activeAccount, _token, _amount, tokenRegistry.getTokenIndex(_token), symbols);
    }


    /**
     * Borrow the amount of token to the saving pool.
     */
    function borrow(address _token, uint256 _amount) public onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        uint256 borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint divisor = UINT_UNIT;
        if(_token != ETH_ADDR) {
            divisor = 10 ** uint256(IERC20Extended(_token).decimals());
        }
        uint totalBorrow = baseVariable.getBorrowETH(msg.sender, symbols)
        .add(_amount.mul(symbols.priceFromAddress(_token)).div(divisor)).mul(100);
        uint ETHValue = baseVariable.getDepositETH(msg.sender, symbols);
        require(totalBorrow <= ETHValue.mul(borrowLTV), "Insufficient collateral.");
        baseVariable.borrow(_token, _amount);
        send(msg.sender, _amount, _token);
    }

    /**
     * Repay the amount of token back to the saving pool.
     */
    function repay(address _token, uint256 _amount) public payable onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        receive(msg.sender, _amount, _token);
        uint money = baseVariable.repay(_token, _amount);
        if(money != 0) {
            send(msg.sender, money, _token);
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
        baseVariable.deposit(_token, _amount, tokenRegistry.getTokenIndex(_token));
        // Update depositBitmap
    }

    /**
     * Withdraw the amount of token from the saving pool.
     * @param _token the address of the withdrawed token
     * @param _amount the mount of the withdrawed token
     * @dev If the token earned any interest from the pool, the interest will be withdrawed first.
     */
    function withdraw(address _token, uint256 _amount) public onlySupported(_token) {
        require(_amount != 0, "Amount is zero");
        //require(amount <= (address(this).balance) / (10**18), "Requested withdraw amount is more than available balance");
        uint borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint divisor = _token == ETH_ADDR ? UINT_UNIT : 10 ** uint256(IERC20Extended(_token).decimals());
        uint totalBorrow = baseVariable.getBorrowETH(msg.sender, symbols);
        uint ETHValue = baseVariable.getDepositETH(msg.sender, symbols)
        .add(_amount.mul(symbols.priceFromAddress(_token)).div(divisor));
        require(totalBorrow.mul(100) <= ETHValue.mul(borrowLTV), "Insufficient collateral.");
        uint amount = baseVariable.withdraw(_token, _amount);
        send(msg.sender, amount, _token);
    }

    /**
     * Withdraw all tokens from the saving pool.
     */
    function withdrawAll(address _token) public onlySupported(_token) {
        uint borrowLTV = tokenRegistry.getBorrowLTV(_token);
        uint amount = baseVariable.withdrawAll(_token);
        send(msg.sender, amount, _token);
    }

    /**
     * Liquidate function
     */
    function liquidate(address targetAccountAddr, address _targetToken) public {
        require(tokenRegistry.isTokenExist(_targetToken), "Unsupported token");
        uint borrowLTV = tokenRegistry.getBorrowLTV(_targetToken);
        uint liquidationThreshold = tokenRegistry.getLiquidationThreshold();
        uint liquidationDiscountRatio = tokenRegistry.getLiquidationDiscountRatio();
        baseVariable.liquidate(targetAccountAddr, _targetToken, borrowLTV, liquidationThreshold, liquidationDiscountRatio, symbols);
    }

    function recycleCommunityFund(address _token) public {
        baseVariable.recycleCommunityFund(_token);
    }

    function setDeFinerCommunityFund(address payable _deFinerCommunityFund) public {
        baseVariable.setDeFinerCommunityFund(_deFinerCommunityFund);
    }


    function getDeFinerCommunityFund(address _token) public view returns(uint256) {
        return baseVariable.getDeFinerCommunityFund(_token);
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
}