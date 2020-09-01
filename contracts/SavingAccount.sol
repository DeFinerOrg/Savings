pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./config/GlobalConfig.sol";
import "./lib/SavingLib.sol";
import "./lib/Utils.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./InitializableReentrancyGuard.sol";
import { ICToken } from "./compound/ICompound.sol";
import { ICETH } from "./compound/ICompound.sol";

contract SavingAccount is Initializable, InitializableReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    GlobalConfig public globalConfig;
    // mapping(address => uint256) public deFinerFund;

    // Following are the constants, initialized via upgradable proxy contract
    // This is emergency address to allow withdrawal of funds from the contract

    event Transfer(address indexed token, address from, address to, uint256 amount);
    event Borrow(address indexed token, address from, uint256 amount);
    event Repay(address indexed token, address from, uint256 amount);
    event Deposit(address indexed token, address from, uint256 amount);
    event Withdraw(address indexed token, address from, uint256 amount);
    event WithdrawAll(address indexed token, address from, uint256 amount);

    modifier onlyEmergencyAddress() {
        require(msg.sender ==  globalConfig.constants().EMERGENCY_ADDR(), "User not authorized");
        _;
    }

    modifier onlyValidToken(address _token) {
        if(!Utils._isETH(address(globalConfig), _token)) {
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
            if(_cTokenAddresses[i] != address(0x0) && _tokenAddresses[i] != globalConfig.constants().ETH_ADDR()) {
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
        SavingLib.withdraw(globalConfig, msg.sender, _token, _amount, getBlockNumber());
        SavingLib.deposit(globalConfig, _to, _token, _amount, getBlockNumber());

        emit Transfer(_token, msg.sender, _to, _amount);
    }

    /**
     * Borrow the amount of token from the saving pool.
     * @param _token token address
     * @param _amount amout of tokens to borrow
     */
    function borrow(address _token, uint256 _amount) public onlyValidToken(_token) whenNotPaused nonReentrant {

        require(_amount != 0, "Amount is zero");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Update tokenInfo for the user
        globalConfig.accounts().borrow(msg.sender, _token, _amount, getBlockNumber());

        // Update pool balance
        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        uint compoundAmount = globalConfig.bank().update(_token, _amount, uint8(2));

        require(globalConfig.bank().getPoolAmount(_token) >= _amount, "Lack of liquidity.");

        if(compoundAmount > 0) {
            SavingLib.fromCompound(globalConfig, _token, compoundAmount);
        }

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
    function repay(address _token, uint256 _amount) public payable onlyValidToken(_token) nonReentrant {

        require(_amount != 0, "Amount is zero");
        SavingLib.receive(globalConfig, _amount, _token);

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);
        uint256 remain = globalConfig.accounts().repay(msg.sender, _token, _amount, getBlockNumber());

        // Update the amount of tokens in compound and loans, i.e. derive the new values
        // of C (Compound Ratio) and U (Utilization Ratio).
        uint compoundAmount = globalConfig.bank().update(_token,  _amount.sub(remain), uint8(3));
        if(compoundAmount > 0) {
            SavingLib.toCompound(globalConfig, _token, compoundAmount);
        }
        // Send the remain money back
        if(remain != 0) {
            SavingLib.send(globalConfig, remain, _token);
        }

        emit Repay(_token, msg.sender, _amount.sub(remain));
    }

    /**
     * Deposit the amount of token to the saving pool.
     * @param _token the address of the deposited token
     * @param _amount the mount of the deposited token
     */
    function deposit(address _token, uint256 _amount) public payable onlyValidToken(_token) nonReentrant {
        require(_amount != 0, "Amount is zero");
        SavingLib.receive(globalConfig, _amount, _token);
        SavingLib.deposit(globalConfig, msg.sender, _token, _amount, getBlockNumber());

        emit Deposit(_token, msg.sender, _amount);
    }

    /**
     * Withdraw a token from an address
     * @param _token token address
     * @param _amount amount to be withdrawn
     */
    function withdraw(address _token, uint256 _amount) public onlyValidToken(_token) whenNotPaused nonReentrant {
        require(_amount != 0, "Amount is zero");
        uint256 amount = SavingLib.withdraw(globalConfig, msg.sender, _token, _amount, getBlockNumber());
        SavingLib.send(globalConfig, _amount, _token);

        emit Withdraw(_token, msg.sender, amount);
    }

    /**
     * Withdraw all tokens from the saving pool.
     * @param _token the address of the withdrawn token
     */
    function withdrawAll(address _token) public onlyValidToken(_token) whenNotPaused nonReentrant {

        // Sanity check
        require(globalConfig.accounts().getDepositPrincipal(msg.sender, _token) > 0, "Token depositPrincipal must be greater than 0");

        // Add a new checkpoint on the index curve.
        globalConfig.bank().newRateIndexCheckpoint(_token);

        // Get the total amount of token for the account
        uint amount = globalConfig.accounts().getDepositBalanceStore(_token, msg.sender);

        SavingLib.withdraw(globalConfig, msg.sender, _token, amount, getBlockNumber());
        if(amount != 0) {
            SavingLib.send(globalConfig, amount, _token);
        }
        emit WithdrawAll(_token, msg.sender, amount);
    }

    struct LiquidationVars {
        address token;
        uint256 tokenPrice;
        uint256 coinValue;
        uint256 targetTokenAmount;
        uint256 liquidationDebtValue;
        uint256 tokenAmount;
        uint256 tokenDivisor;
    }

    /**
     * Liquidate function
     * @param _targetAccountAddr account to be liquidated
     * @param _targetToken token used for purchasing collaterals
     */
    function liquidate(address _targetAccountAddr, address _targetToken) public onlyValidToken(_targetToken) whenNotPaused nonReentrant {
        LiquidationVars memory vars;
        (vars.liquidationDebtValue, vars.targetTokenAmount) = globalConfig.accounts().liquidateLogic(msg.sender, _targetAccountAddr, _targetToken);
        globalConfig.accounts().withdraw(msg.sender, _targetToken, vars.targetTokenAmount, getBlockNumber());
        globalConfig.accounts().repay(_targetAccountAddr, _targetToken, vars.targetTokenAmount, getBlockNumber());

        // The collaterals are liquidate in the order of their market liquidity
        for(uint i = 0; i < globalConfig.tokenInfoRegistry().getCoinLength(); i++) {
            vars.token = globalConfig.tokenInfoRegistry().addressFromIndex(i);
            if(globalConfig.accounts().isUserHasDeposits(_targetAccountAddr, uint8(i))) {
                vars.tokenPrice = globalConfig.tokenInfoRegistry().priceFromIndex(i);

                vars.tokenDivisor = Utils.getDivisor(address(globalConfig), vars.token);

                if(globalConfig.accounts().getBorrowPrincipal(_targetAccountAddr, vars.token) == 0) {
                    globalConfig.bank().newRateIndexCheckpoint(vars.token);
                    vars.coinValue = globalConfig.accounts().getDepositBalanceStore(vars.token, _targetAccountAddr).mul(vars.tokenPrice).div(vars.tokenDivisor);
                    if(vars.coinValue > vars.liquidationDebtValue) {
                        vars.coinValue = vars.liquidationDebtValue;
                        vars.liquidationDebtValue = 0;
                    } else {
                        vars.liquidationDebtValue = vars.liquidationDebtValue.sub(vars.coinValue);
                    }
                    vars.tokenAmount = vars.coinValue.mul(vars.tokenDivisor).div(vars.tokenPrice);
                    globalConfig.accounts().withdraw(_targetAccountAddr, vars.token, vars.tokenAmount, getBlockNumber());
                    globalConfig.accounts().deposit(msg.sender, vars.token, vars.tokenAmount, getBlockNumber());
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
         require(msg.sender == globalConfig.deFinerCommunityFund(), "Unauthorized call");
         uint256 amount = globalConfig.accounts().deFinerFund(_token);
         if (amount > 0) {
             globalConfig.accounts().clearDeFinerFund(_token);
             SavingLib.send(globalConfig, amount, _token);
         }
     }

    function() external payable{}

    function emergencyWithdraw(address _token) external onlyEmergencyAddress {
        SavingLib.emergencyWithdraw(globalConfig, _token);
    }
}
