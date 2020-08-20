pragma solidity 0.5.14;

import "../SavingAccount.sol";
import { IController } from "../compound/ICompound.sol";
//import { TokenRegistry } from "../registry/TokenRegistry.sol";
//import { Bank } from "../Bank.sol";
//import "../config/GlobalConfig.sol";

// This file is only for testing purpose only
contract SavingAccountWithController is SavingAccount {

    //GlobalConfig public globalConfig;
    TokenRegistry.TokenInfo symbols;
    address comptroller;

    constructor() public {
        // DO NOT ADD ANY LOGIC HERE.
        // THIS IS AN UPGRADABLE CONTRACT
    }

    /**
     * Intialize the contract
     * @param _tokenAddresses list of token addresses
     * @param _cTokenAddresses list of corresponding cToken addresses
     * @param _chainlinkAddress chainlink oracle address
     * @param _tokenRegistry token registry contract
     * @param _globalConfig global configuration contract
     * @param _comptroller Compound controller address
     */
    function initialize(
        address[] memory _tokenAddresses,
        address[] memory _cTokenAddresses,
        TokenRegistry _tokenRegistry,
        GlobalConfig _globalConfig,
        address _comptroller
    ) public initializer {
        super.initialize(_tokenAddresses, _cTokenAddresses, _globalConfig);
        comptroller = _comptroller;
    }

    /**
     * Fastfoward for specified block numbers. The block number is synced to compound.
     * @param blocks number of blocks to be forwarded
     */
    function fastForward(uint blocks) public returns (uint) {
        return IController(comptroller).fastForward(blocks);
    }

    /**
     * Get the block number from comound
     */
    function getBlockNumber() public view returns (uint) {
        return IController(comptroller).getBlockNumber();
    }

    function newRateIndexCheckpoint(address _token) public {
        globalConfig.bank().newRateIndexCheckpoint(_token);
    }

    function getDepositPrincipal(address _token) public view returns (uint256) {
        TokenRegistry.TokenInfo storage tokenInfo = globalConfig.accounts().accounts[msg.sender].tokenInfos[_token];
        return tokenInfo.depositPrincipal;
    }

    function getDepositInterest(address _token) public view returns (uint256) {
        TokenRegistry.TokenInfo storage tokenInfo = globalConfig.accounts().accounts[msg.sender].tokenInfos[_token];
        uint256 accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        return tokenInfo.calculateDepositInterest(accruedRate);
    }

    function getDepositBalance(address _token, address _accountAddr) public view returns (uint256) {
        return globalConfig.accounts().getDepositBalanceCurrent(_token, _accountAddr);
    }

    function getBorrowPrincipal(address _token) public view returns (uint256) {
        TokenRegistry.TokenInfo storage tokenInfo = globalConfig.accounts().accounts[msg.sender].tokenInfos[_token];
        return tokenInfo.borrowPrincipal;
    }

    function getBorrowInterest(address _token) public view returns (uint256) {
        TokenRegistry.TokenInfo storage tokenInfo = globalConfig.accounts().accounts[msg.sender].tokenInfos[_token];
        uint256 accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
        return tokenInfo.calculateBorrowInterest(accruedRate);
    }

    function getBorrowBalance(address _token, address _accountAddr) public view returns (uint256) {
        return globalConfig.accounts().getBorrowBalanceCurrent(_token, _accountAddr);
    }

    function getBorrowETH(address _account) public view returns (uint256) {
        return globalConfig.accounts().getBorrowETH(_account, symbols);
    }

    function getDepositETH(address _account) public view returns (uint256) {
        return globalConfig.accounts().getDepositETH(_account, symbols);
    }

    function getTokenPrice(address _token) public view returns (uint256) {
        return symbols.priceFromAddress(_token);
    }
}