var tokenData = require("../test-helpers/tokenData.json");

const { BN } = require("@openzeppelin/test-helpers");

const SymbolsLib = artifacts.require("SymbolsLib");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const Base = artifacts.require("Base");

const SavingAccount = artifacts.require("SavingAccount");
const ChainLinkOracle = artifacts.require("ChainLinkOracle");

// Mocks
const MockERC20 = artifacts.require("MockERC20");
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

    // Configure ChainLinkOracle
    const chainLinkOracle = await configureChainLinkOracle(deployer);

    console.log("ChainLinkOracle:", chainLinkOracle.address);
};

const getERC20Tokens = async () => {
    const network = process.env.NETWORK;
    const tokensToMint = new BN(10000);
    var erc20TokenAddresses = new Array();

    await Promise.all(
        tokenData.tokens.map(async (token) => {
            let addr;
            if (network == "development" || network == "ropsten") {
                addr = (await MockERC20.new(token.name, token.symbol, token.decimals, tokensToMint))
                    .address;
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

const configureChainLinkOracle = async (deployer) => {
    // Supported Tokens by ChainLink
    // https://docs.google.com/spreadsheets/d/1EE8l8sMTZUqkApAzk8hnFPAFLx8em7IT6kQ1x5RkoOA/edit#gid=0

    return await deployer.deploy(ChainLinkOracle, getERC20Tokens(), getChainLinkAggregators());
};
