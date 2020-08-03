var tokenData = require("../test-helpers/tokenData.json");
// var compound = require("../compound-protocol/networks/development.json");

const { BN } = require("@openzeppelin/test-helpers");

const SymbolsLib = artifacts.require("SymbolsLib");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const Base = artifacts.require("Base");

const SavingAccount = artifacts.require("SavingAccount");
const SavingAccountWithController = artifacts.require("SavingAccountWithController");

const ChainLinkOracle = artifacts.require("ChainLinkOracle");
const TokenInfoRegistry = artifacts.require("TokenInfoRegistry");
const GlobalConfig = artifacts.require("GlobalConfig");

// Upgradablility contracts
const ProxyAdmin = artifacts.require("ProxyAdmin");
const SavingAccountProxy = artifacts.require("SavingAccountProxy");

// Mocks
const MockERC20 = artifacts.require("MockERC20");
const MockCToken = artifacts.require("MockCToken");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");

// This is to resolve "Invalid JSON RPC response" error when using expectRevert.
// Code taken from
// https://forum.openzeppelin.com/t/error-deploying-simple-erc777-contract-with-truffle-and-ganache/1588/13
require("@openzeppelin/test-helpers/configure")({
    provider: web3.currentProvider,
    environment: "truffle"
});

const ETH_ADDR = "0x000000000000000000000000000000000000000E";
const DEAD_ADDR = "0x0000000000000000000000000000000000000001";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = async function(deployer, network) {
    // Deploy Libs
    await deployer.deploy(SymbolsLib);
    await deployer.deploy(TokenInfoLib);

    // Link Libraries
    await deployer.link(TokenInfoLib, Base);
    await deployer.link(SymbolsLib, Base);

    // Deploy Base library
    await deployer.deploy(Base);

    // Link libraries
    await deployer.link(SymbolsLib, SavingAccount);
    await deployer.link(TokenInfoLib, SavingAccount);
    await deployer.link(Base, SavingAccount);

    await deployer.link(SymbolsLib, SavingAccountWithController);
    await deployer.link(TokenInfoLib, SavingAccountWithController);
    await deployer.link(Base, SavingAccountWithController);

    const erc20Tokens = await getERC20Tokens();
    const chainLinkAggregators = await getChainLinkAggregators();
    const cTokens = await getCTokens(erc20Tokens);

    // Deploy TokenRegistry
    const tokenInfoRegistry = await deployer.deploy(TokenInfoRegistry);
    await initializeTokenInfoRegistry(
        tokenInfoRegistry,
        erc20Tokens,
        cTokens,
        chainLinkAggregators
    );

    // Configure ChainLinkOracle
    const chainLinkOracle = await deployer.deploy(ChainLinkOracle, tokenInfoRegistry.address);

    const globalConfig = await deployer.deploy(GlobalConfig);

    // Deploy Upgradability
    const savingAccountProxy = await deployer.deploy(SavingAccountProxy);
    const proxyAdmin = await deployer.deploy(ProxyAdmin);

    // Deploy SavingAccount contract
    const savingAccount = await deployer.deploy(SavingAccount);
    const initialize_data = savingAccount.contract.methods
        .initialize(
            erc20Tokens,
            cTokens,
            chainLinkOracle.address,
            tokenInfoRegistry.address,
            globalConfig.address
        )
        .encodeABI();
    await savingAccountProxy.initialize(savingAccount.address, proxyAdmin.address, initialize_data);

    console.log("TokenInfoRegistry:", tokenInfoRegistry.address);
    console.log("GlobalConfig:", globalConfig.address);
    console.log("ChainLinkOracle:", chainLinkOracle.address);
    console.log("SavingAccount:", savingAccountProxy.address);
};

const initializeTokenInfoRegistry = async (
    tokenInfoRegistry,
    erc20Tokens,
    cTokens,
    chainLinkAggregators
) => {
    await Promise.all(
        tokenData.tokens.map(async (token, i) => {
            const tokenAddr = erc20Tokens[i];
            const decimals = token.decimals;
            const isTransferFeeEnabled = token.isFeeEnabled;
            const isSupportedOnCompound = true;
            const cToken = cTokens[i];
            const chainLinkAggregator = chainLinkAggregators[i];
            await tokenInfoRegistry.addToken(
                tokenAddr,
                decimals,
                isTransferFeeEnabled,
                isSupportedOnCompound,
                cToken,
                chainLinkAggregator
            );
        })
    );

    // Add ETH
    await tokenInfoRegistry.addToken(ETH_ADDR, 18, false, true, ZERO_ADDRESS, DEAD_ADDR);
};

const getCTokens = async (erc20Tokens) => {
    const network = process.env.NETWORK;
    var cTokens = new Array();

    let isSupportedByCompoundArray = tokenData.tokens.map((token) => token.isSupportedByCompound);

    await Promise.all(
        tokenData.tokens.map(async (token, index) => {
            let addr;
            if (network == "ropsten") {
                addr = token.ropsten.cTokenAddress;
            } else if (network == "kovan") {
                addr = token.kovan.cTokenAddress;
            } else if (network == "rinkeby") {
                addr = token.rinkeby.cTokenAddress;
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
    const network = process.env.NETWORK;
    const tokensToMint = new BN(10000);
    var erc20TokenAddresses = new Array();

    await Promise.all(
        tokenData.tokens.map(async (token) => {
            let addr;
            if (network == "ropsten") {
                addr = token.ropsten.tokenAddress;
            } else if (network == "kovan") {
                addr = token.kovan.tokenAddress;
            }  else if (network == "rinkeby") {
                addr = token.rinkeby.cTokenAddress;
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
    const network = process.env.NETWORK;
    await Promise.all(
        tokenData.tokens.map(async (token) => {
            let addr;
            if (network == "ropsten") {
                addr = token.ropsten.aggregatorAddress;
            } else if (network == "kovan") {
                addr = token.kovan.aggregatorAddress;
            }  else if (network == "rinkeby") {
                addr = token.rinkeby.cTokenAddress;
            } else if (network == "mainnet" || network == "mainnet-fork") {
                addr = token.mainnet.aggregatorAddress;
            } else {
                // network = development || coverage
                addr = (
                    await MockChainLinkAggregator.new(token.decimals, new BN(token.latestAnswer))
                ).address;
            }
            aggregators.push(addr);
        })
    );
    return aggregators;
};
