var tokenData = require("../test-helpers/OKExChainData.json");
// var compound = require("../compound-protocol/networks/development.json");

const { BN } = require("@openzeppelin/test-helpers");

const AccountTokenLib = artifacts.require("AccountTokenLib");
const SavingLib = artifacts.require("SavingLib");
const Utils = artifacts.require("Utils");
const BitmapLib = artifacts.require("BitmapLib");
const Accounts = artifacts.require("Accounts");
const Bank = artifacts.require("Bank");

const SavingAccount = artifacts.require("SavingAccount");
const SavingAccountWithController = artifacts.require("SavingAccountWithController");

const TokenRegistry = artifacts.require("TokenRegistry");
const GlobalConfig = artifacts.require("GlobalConfig");
const Constant = artifacts.require("Constant");

// Upgradablility contracts
const ProxyAdmin = artifacts.require("ProxyAdmin");
const SavingAccountProxy = artifacts.require("SavingAccountProxy");
const AccountsProxy = artifacts.require("AccountsProxy");
const BankProxy = artifacts.require("BankProxy");

// Mocks
const MockERC20 = artifacts.require("MockERC20");
const MockCToken = artifacts.require("MockCToken");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");

// ExOracle
const ExOracle = artifacts.require("ExOracle");
const ExOracleFIN = artifacts.require("ExOracleFIN");

// This is to resolve "Invalid JSON RPC response" error when using expectRevert.
// Code taken from
// https://forum.openzeppelin.com/t/error-deploying-simple-erc777-contract-with-truffle-and-ganache/1588/13
/*
require("@openzeppelin/test-helpers/configure")({
    provider: web3.currentProvider,
    environment: "truffle"
});
*/

const ETH_ADDR = "0x000000000000000000000000000000000000000E";
const DEAD_ADDR = "0x0000000000000000000000000000000000000001";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let net_work;

module.exports = async function (deployer, network) {
    console.log("++++++++++++++++" + network + "+++++++++++++++++++");
    net_work = network;

    const erc20Tokens = await getERC20Tokens();
    console.log("=========================getERC20Tokens============================");
    const chainLinkAggregators = await getChainLinkAggregators();
    console.log(chainLinkAggregators);
    console.log("=========================getChainLinkAggregators============================");
    const cTokens = await getCTokens(erc20Tokens);
    console.log("=========================getCTokens============================");

    // Deploy TokenRegistry
    const tokenInfoRegistry = await deployer.deploy(TokenRegistry);
    console.log("=========================Deploy TokenRegistry============================");

    await initializeTokenInfoRegistry(
        tokenInfoRegistry,
        erc20Tokens,
        cTokens,
        chainLinkAggregators
    );

    const globalConfig = await GlobalConfig.deployed();
    await tokenInfoRegistry.initialize(globalConfig.address);
    console.log(
        "========================= tokenInfoRegistry.initialize ============================"
    );

    // Deploy Upgradability

    const constant = await Constant.deployed();
    const accountsProxy = await AccountsProxy.deployed();
    const bankProxy = await BankProxy.deployed();
    const savingAccountProxy = await SavingAccountProxy.deployed();
    await globalConfig.initialize(
        bankProxy.address,
        savingAccountProxy.address,
        tokenInfoRegistry.address,
        accountsProxy.address,
        constant.address
    );
    console.log("=========================globalConfig.initialize============================");

    // Deploy SavingAccount contract
    const savingAccount = await deployer.deploy(SavingAccount);
    console.log("=========================Deploy SavingAccount============================");

    const accounts = await Accounts.deployed();
    const accounts_initialize_data = accounts.contract.methods
        .initialize(globalConfig.address)
        .encodeABI();
    console.log("=========================accounts_initialize_data============================");

    const bank = await Bank.deployed();
    const bank_initialize_data = bank.contract.methods.initialize(globalConfig.address).encodeABI();
    console.log("=========================bank_initialize_data============================");

    const initialize_data = savingAccount.contract.methods
        .initialize(erc20Tokens, cTokens, globalConfig.address)
        .encodeABI();
    console.log(erc20Tokens);
    console.log(cTokens);
    console.log("=========================initialize_data============================");

    const proxyAdmin = await ProxyAdmin.deployed();
    await savingAccountProxy.initialize(savingAccount.address, proxyAdmin.address, initialize_data);
    console.log(
        "=========================savingAccountProxy.initialize============================"
    );
    await accountsProxy.initialize(accounts.address, proxyAdmin.address, accounts_initialize_data);
    console.log("=========================accountsProxy.initialize============================");
    await bankProxy.initialize(bank.address, proxyAdmin.address, bank_initialize_data);
    console.log("=========================bankProxy.initialize============================");

    await addAndSetupFINToken(tokenInfoRegistry);
    console.log("=========================setup FIN Token============================");

    console.log("GlobalConfig:", globalConfig.address);
    console.log("Constant:", constant.address);
    console.log("Accounts:", accountsProxy.address);
    console.log("Bank:", bankProxy.address);
    console.log("TokenRegistry:", tokenInfoRegistry.address);
    console.log("SavingAccount:", savingAccountProxy.address);
};

const initializeTokenInfoRegistry = async (
    tokenInfoRegistry,
    erc20Tokens,
    cTokens,
    chainLinkAggregators
) => {
    const network = net_work;
    await Promise.all(
        tokenData.tokens.map(async (token, i) => {
            const tokenAddr = erc20Tokens[i];
            const decimals = token.decimals;
            const isTransferFeeEnabled = token.isFeeEnabled;
            const isSupportedOnCompound = token.isSupportedByCompound;
            const cToken = cTokens[i];
            const chainLinkOracle = chainLinkAggregators[i];
            console.log("adding token", token.symbol);
            await tokenInfoRegistry.addToken(
                tokenAddr,
                decimals,
                isTransferFeeEnabled,
                isSupportedOnCompound,
                cToken,
                chainLinkOracle
            );
            console.log("initializeTokenInfoRegistry: " + i);
        })
    );

    // Add ETH
    if (network == "ropsten" || network == "ropsten-fork") {
        await tokenInfoRegistry.addToken(
            ETH_ADDR,
            tokenData.ETH.decimals,
            tokenData.ETH.isFeeEnabled,
            tokenData.ETH.isSupportedByCompound,
            tokenData.ETH.ropsten.cTokenAddress,
            DEAD_ADDR
        );
    } else if (network == "kovan" || network == "kovan-fork") {
        await tokenInfoRegistry.addToken(
            ETH_ADDR,
            tokenData.ETH.decimals,
            tokenData.ETH.isFeeEnabled,
            tokenData.ETH.isSupportedByCompound,
            tokenData.ETH.kovan.cTokenAddress,
            DEAD_ADDR
        );
    } else if (network == "rinkeby" || network == "rinkeby-fork") {
        await tokenInfoRegistry.addToken(
            ETH_ADDR,
            tokenData.ETH.decimals,
            tokenData.ETH.isFeeEnabled,
            tokenData.ETH.isSupportedByCompound,
            tokenData.ETH.rinkeby.cTokenAddress,
            DEAD_ADDR
        );
    } else if (network == "mainnet" || network == "mainnet-fork") {
        await tokenInfoRegistry.addToken(
            ETH_ADDR,
            tokenData.ETH.decimals,
            tokenData.ETH.isFeeEnabled,
            tokenData.ETH.isSupportedByCompound,
            tokenData.ETH.mainnet.cTokenAddress,
            DEAD_ADDR
        );
    } else {
        // network = development || coverage
        await tokenInfoRegistry.addToken(
            ETH_ADDR,
            tokenData.ETH.decimals,
            tokenData.ETH.isFeeEnabled,
            tokenData.ETH.isSupportedByCompound,
            ZERO_ADDRESS,
            DEAD_ADDR
        );
    }
    console.log("initializeTokenInfoRegistry: " + "ETH");
};

const getCTokens = async (erc20Tokens) => {
    // const network = process.env.NETWORK;
    const network = net_work;

    console.log("*************" + network + "***********");

    var cTokens = new Array();

    let isSupportedByCompoundArray = tokenData.tokens.map((token) => token.isSupportedByCompound);

    await Promise.all(
        tokenData.tokens.map(async (token, index) => {
            let addr;
            if (network == "kovan" || network == "kovan-fork") {
                addr = token.kovan.cTokenAddress;
            } else if (network == "mainnet" || network == "mainnet-fork") {
                addr = token.mainnet.cTokenAddress;
            } else {
                // network = development || coverage
                let erc20Address = erc20Tokens[index];
                if (!isSupportedByCompoundArray[index]) {
                    erc20Address = ZERO_ADDRESS;
                }
                // Create MockCToken for given ERC20 token address
                addr = ZERO_ADDRESS;
            }
            cTokens.push(addr);
        })
    );

    return cTokens;
};

const getERC20Tokens = async () => {
    // const network = process.env.NETWORK;
    const network = net_work;

    const tokensToMint = new BN(10000);
    var erc20TokenAddresses = new Array();

    await Promise.all(
        tokenData.tokens.map(async (token) => {
            let addr;
            if (network == "kovan" || network == "kovan-fork") {
                addr = token.kovan.tokenAddress;
            } else if (network == "mainnet" || network == "mainnet-fork") {
                addr = token.mainnet.tokenAddress;
            } else {
                // network = development || coverage
                addr = (await MockERC20.new(token.name, token.symbol, token.decimals, tokensToMint))
                    .address;
            }
            erc20TokenAddresses.push(addr);
        })
    );
    return erc20TokenAddresses;
};

const getChainLinkAggregators = async () => {
    var aggregators = new Array();
    // const network = process.env.NETWORK;
    const network = net_work;

    const exOracleConf = await getExOracleDataSource();
    let exOracleAddress = exOracleConf[0];
    let dataSource = exOracleConf[1];

    // For loop ensures that the deployment order is maintained.
    // we need to maintain the deployed addresses in order in the `aggregators` array
    const pairs = tokenData.ExOracle.ExOracleContracts;
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        console.log("deploying ExOracle pair", pair.pairName);
        const exOracleImplAddress = (
            await ExOracle.new(exOracleAddress, dataSource, pair.pairName, pair.priceType)
        ).address;
        aggregators.push(exOracleImplAddress);
        console.log("ExOracle pair:", pair.pairName, " deployed with address", exOracleImplAddress);
    }

    return aggregators;
};

const getExOracleDataSource = async () => {
    const network = net_work;

    let dummy_Addr = "0x0000000000000000000000000000000000000042";
    let dummy_Datasource = "0x0000000000000000000000000000000000000041";

    let exOracleAddress;
    let dataSource;

    if (network == "mainnet" || network == "mainnet-fork") {
        exOracleAddress = tokenData.ExOracle.mainnet.exOracleAddress;
        dataSource = tokenData.ExOracle.mainnet.dataSource;
    } else if (network == "kovan" || network == "kovan-fork") {
        exOracleAddress = tokenData.ExOracle.testnet.exOracleAddress;
        dataSource = tokenData.ExOracle.testnet.dataSource;
    } else if (network == "coverage" || network == "development") {
        exOracleAddress = (await ExOracleFIN.new(dummy_Addr, dummy_Datasource)).address;
        dataSource = dummy_Datasource;
        console.log("exOracleAddress", exOracleAddress);
        console.log("dataSource", dataSource);
    }
    return [exOracleAddress, dataSource];
};

const addAndSetupFINToken = async (tokenInfoRegistry) => {
    const finOracleAddress = await deployFINOracle();
    await addFINTokenSupport(tokenInfoRegistry, finOracleAddress);
};

// Deploy custom Oracle for FIN token
const deployFINOracle = async () => {
    const exOracleConf = await getExOracleDataSource();
    let exOracleAddress = exOracleConf[0];
    let dataSource = exOracleConf[1];

    const exOracleFin = await ExOracleFIN.new(exOracleAddress, dataSource);
    await exOracleFin.setFINPriceInUSD(tokenData.DeFiner.latestAnswer);
    console.log("FIN price in USD set in Oracle:", (await exOracleFin.finPriceInUSD()).toString());
    const finOracleAddress = exOracleFin.address;
    console.log("ExOracleFIN deployed:", finOracleAddress);
    return finOracleAddress;
};

// Add FIN token support
const addFINTokenSupport = async (tokenInfoRegistry, finOracleAddress) => {
    const network = net_work;

    let tokenAddr;
    let cTokenAddr;

    if (network == "mainnet" || network == "mainnet-fork") {
        tokenAddr = tokenData.DeFiner.mainnet.tokenAddress;
        cTokenAddr = tokenData.DeFiner.mainnet.cTokenAddress;
    } else if (network == "kovan" || network == "kovan-fork") {
        tokenAddr = tokenData.DeFiner.testnet.tokenAddress;
        cTokenAddr = tokenData.DeFiner.testnet.cTokenAddress;
    } else if (network == "coverage" || network == "development") {
        tokenAddr = tokenData.DeFiner.testnet.tokenAddress;
        cTokenAddr = tokenData.DeFiner.testnet.cTokenAddress;
    }

    await tokenInfoRegistry.addToken(
        tokenAddr,
        tokenData.DeFiner.decimals,
        tokenData.DeFiner.isFeeEnabled,
        tokenData.DeFiner.isSupportedByCompound,
        cTokenAddr,
        finOracleAddress
    );
};
