var tokenData = require("../test-helpers/tokenData.json");

const { BN } = require("@openzeppelin/test-helpers");

const SymbolsLib = artifacts.require("SymbolsLib");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const Base = artifacts.require("Base");

const SavingAccount = artifacts.require("SavingAccount");
const ChainLinkOracle = artifacts.require("ChainLinkOracle");
const CTokenRegistry = artifacts.require("CTokenRegistry");

// Mocks
const MockERC20 = artifacts.require("MockERC20");
const MockCToken = artifacts.require("MockCToken");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");

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
    await deployer.link(Base, SavingAccount);

    // Deploy SavingAccount contract
    await deployer.deploy(SavingAccount);

    const erc20Tokens = await getERC20Tokens();
    const chainLinkAggregators = await getChainLinkAggregators();
    const cTokens = await getCTokens();

    // Deploy CTokenRegistry
    await deployer.deploy(CTokenRegistry, erc20Tokens, cTokens);

    // Configure ChainLinkOracle
    const chainLinkOracle = await deployer.deploy(
        ChainLinkOracle,
        erc20Tokens,
        chainLinkAggregators
    );

    console.log("ChainLinkOracle:", chainLinkOracle.address);
};

const getCTokens = async () => {
    const network = process.env.NETWORK;
    var cTokens = new Array();

    await Promise.all(
        tokenData.tokens.map(async (token) => {
            let addr;
            if (network == "development") {
                addr = (await MockCToken.new()).address;
            } else if (network == "ropsten") {
                addr = token.ropsten.cTokenAddress;
            } else if (network == "mainnet" || network == "fork") {
                addr = token.mainnet.cTokenAddress;
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
            if (network == "development") {
                addr = (await MockERC20.new(token.name, token.symbol, token.decimals, tokensToMint))
                    .address;
            } else if (network == "ropsten") {
                addr = token.ropsten.tokenAddress;
            } else if (network == "mainnet" || network == "fork") {
                addr = token.mainnet.tokenAddress;
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
            if (network == "development") {
                addr = (
                    await MockChainLinkAggregator.new(token.decimals, new BN(token.latestAnswer))
                ).address;
            } else if (network == "ropsten") {
                addr = token.ropsten.aggregatorAddress;
            } else if (network == "mainnet" || network == "fork") {
                addr = token.mainnet.aggregatorAddress;
            }
            aggregators.push(addr);
        })
    );
    return aggregators;
};
