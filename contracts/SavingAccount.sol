// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./config/Constant.sol";
import "./config/GlobalConfig.sol";
import "./lib/SavingLib.sol";
import "./lib/Utils.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./InitializableReentrancyGuard.sol";
import "./InitializablePausable.sol";
import {ICToken} from "./compound/ICompound.sol";
import {ICETH} from "./compound/ICompound.sol";

contract SavingAccount is
    Initializable,
    InitializableReentrancyGuard,
    Constant,
    InitializablePausable
{
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    GlobalConfig public globalConfig;

    // FIN token contract on OEC
    address public constant FIN_ADDR = 0x8D3573f24c0aa3819A2f5b02b2985dD82B487715;
    // WePiggy does not have its token ok OEC
    address public constant COMP_ADDR = 0x0000000000000000000000000000000000000000;

    event Transfer(address indexed token, address from, address to, uint256 amount);
    event Borrow(address indexed token, address from, uint256 amount);
    event Repay(address indexed token, address from, uint256 amount);
    event Deposit(address indexed token, address from, uint256 amount);
    event Withdraw(address indexed token, address from, uint256 amount);
    event WithdrawAll(address indexed token, address from, uint256 amount);
    event Liquidate(
        address liquidator,
        address borrower,
        address borrowedToken,
        uint256 repayAmount,
        address collateralToken,
        uint256 payAmount
    );
    event Claim(address from, uint256 amount);
    event WithdrawCOMP(address beneficiary, uint256 amount);

    modifier onlySupportedToken(address _token) {
        if(_token != ETH_ADDR) {
            require(globalConfig.tokenInfoRegistry().isTokenExist(_token), "Unsupported token");
        }
        _;
    }

    modifier onlyEnabledToken(address _token) {
        require(
            globalConfig.tokenInfoRegistry().isTokenEnabled(_token),
            "The token is not enabled"
        );
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == address(globalConfig.bank()),
            "Only authorized to call from DeFiner internal contracts."
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == GlobalConfig(globalConfig).owner(), "Only owner");
        _;
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
    ) public initializer {
        // Initialize InitializableReentrancyGuard
        super._initialize();
        super._initialize(address(_globalConfig));

        globalConfig = _globalConfig;

        require(
            _tokenAddresses.length == _cTokenAddresses.length,
            "Token and cToken length don't match."
        );
        uint256 tokenNum = _tokenAddresses.length;
        for (uint256 i = 0; i < tokenNum; i++) {
            if (_cTokenAddresses[i] != address(0x0) && _tokenAddresses[i] != ETH_ADDR) {
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
    function getBlockNumber() internal view returns (uint256) {
        return block.number;
    }

    /**
     * Transfer the token between users inside DeFiner
     * @param _to the address that the token be transfered to
     * @param _token token address
     * @param _amount amout of tokens transfer
     */
    function transfer(
        address _to,
        address _token,
        uint256 _amount
    ) external onlySupportedToken(_token) onlyEnabledToken(_token) whenNotPaused nonReentrant {
        globalConfig.bank().newRateIndexCheckpoint(_token);
        uint256 amount = globalConfig.accounts().withdraw(msg.sender, _token, _amount);
        globalConfig.accounts().deposit(_to, _token, amount);

        emit Transfer(_token, msg.sender, _to, amount);
    }

    /**
     * Borrow the amount of token from the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     */
    function borrow(address _token, uint256 _amount)
        external
        onlySupportedToken(_token)
        onlyEnabledToken(_token)
        whenNotPaused
        nonReentrant
    {
        require(_amount != 0, "Borrow zero amount of token is not allowed.");

        globalConfig.bank().borrow(msg.sender, _token, _amount);

        // Transfer the token on Ethereum
        SavingLib.send(globalConfig, _amount, _token);

        emit Borrow(_token, msg.sender, _amount);
    }

    /**
     * Repay the amount of token back to the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     * @dev If the repay amount is larger than the borrowed balance, the extra will be returned.
     */
    function repay(address _token, uint256 _amount)
        public
        payable
        onlySupportedToken(_token)
        nonReentrant
    {
        require(_amount != 0, "Amount is zero");
        SavingLib.receive(globalConfig, _amount, _token);

        // Add a new checkpoint on the index curve.
        uint256 amount = globalConfig.bank().repay(msg.sender, _token, _amount);

        // Send the remain money back
        if (amount < _amount) {
            SavingLib.send(globalConfig, _amount.sub(amount), _token);
        }

        emit Repay(_token, msg.sender, amount);
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     */
    function deposit(address _token, uint256 _amount)
        public
        payable
        onlySupportedToken(_token)
        onlyEnabledToken(_token)
        nonReentrant
    {
        require(_amount != 0, "Amount is zero");
        SavingLib.receive(globalConfig, _amount, _token);
        globalConfig.bank().deposit(msg.sender, _token, _amount);

        emit Deposit(_token, msg.sender, _amount);
    }

    /**
     * Withdraw a token from an address
     * @param _token token address
     * @param _amount amount to be withdrawn
     */
    function withdraw(address _token, uint256 _amount)
        external
        onlySupportedToken(_token)
        whenNotPaused
        nonReentrant
    {
        require(_amount != 0, "Amount is zero");
        uint256 amount = globalConfig.bank().withdraw(msg.sender, _token, _amount);
        SavingLib.send(globalConfig, amount, _token);

        emit Withdraw(_token, msg.sender, amount);
    }

    /**
     * Withdraw all tokens from the saving pool.
     * @param _token the address of the withdrawn token
     */
    function withdrawAll(address _token)
        external
        onlySupportedToken(_token)
        whenNotPaused
        nonReentrant
    {
        // Sanity check
        require(
            globalConfig.accounts().getDepositPrincipal(msg.sender, _token) > 0,
            "Token depositPrincipal must be greater than 0"
        );

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Get the total amount of token for the account
        uint256 amount = globalConfig.accounts().getDepositBalanceCurrent(_token, msg.sender);

        uint256 actualAmount = globalConfig.bank().withdraw(msg.sender, _token, amount);
        if (actualAmount != 0) {
            SavingLib.send(globalConfig, actualAmount, _token);
        }
        emit WithdrawAll(_token, msg.sender, actualAmount);
    }

    function liquidate(address _borrower, address _borrowedToken, address _collateralToken) public onlySupportedToken(_borrowedToken) onlySupportedToken(_collateralToken) whenNotPaused nonReentrant {
        IBank bank = IBank(address(globalConfig.bank()));
        bank.newRateIndexCheckpoint(_borrowedToken);
        bank.newRateIndexCheckpoint(_collateralToken);
        bank.updateDepositFINIndex(_borrowedToken);
        bank.updateDepositFINIndex(_collateralToken);
        bank.updateBorrowFINIndex(_borrowedToken);
        bank.updateBorrowFINIndex(_collateralToken);
        
        (uint256 repayAmount, uint256 payAmount) = globalConfig.accounts().liquidate(msg.sender, _borrower, _borrowedToken, _collateralToken);
        bank.update(_borrowedToken, repayAmount, ActionType.LiquidateRepayAction);

        emit Liquidate(
            msg.sender,
            _borrower,
            _borrowedToken,
            repayAmount,
            _collateralToken,
            payAmount
        );
    }

    /**
     * Withdraw token from Compound
     * @param _token token address
     * @param _amount amount of token
     */
    function fromCompound(address _token, uint256 _amount) external onlyAuthorized {
        require(
            ICToken(globalConfig.tokenInfoRegistry().getCToken(_token)).redeemUnderlying(_amount) ==
                0,
            "redeemUnderlying failed"
        );
    }

    function toCompound(address _token, uint256 _amount) external onlyAuthorized {
        address cToken = globalConfig.tokenInfoRegistry().getCToken(_token);
        if (Utils._isETH(address(globalConfig), _token)) {
            ICETH(cToken).mint.value(_amount)();
        } else {
            // uint256 success = ICToken(cToken).mint(_amount);
            require(ICToken(cToken).mint(_amount) == 0, "mint failed");
        }
    }

    function() external payable {}

    /**
     * An account claim all mined FIN token
     */
    function claim() public nonReentrant returns (uint256) {
        uint256 finAmount = globalConfig.accounts().claim(msg.sender);
        IERC20(FIN_ADDR).safeTransfer(msg.sender, finAmount);
        emit Claim(msg.sender, finAmount);
        return finAmount;
    }

    function claimForToken(address _token) public nonReentrant returns (uint256) {
        uint256 finAmount = globalConfig.accounts().claimForToken(msg.sender, _token);
        if(finAmount > 0) IERC20(FIN_ADDR).safeTransfer(msg.sender, finAmount);
        emit Claim(msg.sender, finAmount);
        return finAmount;
    }

    /**
     * Withdraw COMP token to beneficiary
     */
    // NOTICE: No token for WePiggy on OEC
    /*
    function withdrawCOMP(address _beneficiary) external onlyOwner {
        uint256 compBalance = IERC20(COMP_ADDR).balanceOf(address(this));
        IERC20(COMP_ADDR).safeTransfer(_beneficiary, compBalance);

        emit WithdrawCOMP(_beneficiary, compBalance);
    }
    */

    function version() public pure returns(string memory) {
        return "v1.2.0";
    }
}

interface IBank {
    function update(address _token, uint _amount, Constant.ActionType _action) external;
    function newRateIndexCheckpoint(address) external;
    function updateDepositFINIndex(address) external;
    function updateBorrowFINIndex(address) external;
}