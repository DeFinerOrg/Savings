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

    // Deploy ChainLinkOracle
    await deployChainLinkOracle(deployer, network);
};

const deployChainLinkOracle = async (deployer, network) => {
    let ercDAI, ercUSDC, ercUSDT, ercTUSD, ercMKR, ercBAT, ercZRX, ercREP;
    let aggDAI, aggUSDC, aggUSDT, aggTUSD, aggMKR, aggBAT, aggZRX, aggREP;
    if (network == "development") {
        // Local network

        // Supported Tokens by ChainLink
        // https://docs.google.com/spreadsheets/d/1EE8l8sMTZUqkApAzk8hnFPAFLx8em7IT6kQ1x5RkoOA/edit#gid=0

        // Create MockERC20 tokens
        // =======================
        ercDAI = (await MockERC20.new("DAI", "DAI", 18, 1000)).address;
        ercUSDC = (await MockERC20.new("USD Coin", "USDC", 6, 1000)).address;
        ercUSDT = (await MockERC20.new("Tether", "USDT", 6, 1000)).address;
        ercTUSD = (await MockERC20.new("TrueUSD", "TUSD", 18, 1000)).address;
        ercMKR = (await MockERC20.new("Maker", "MKR", 18, 1000)).address;
        ercBAT = (await MockERC20.new("Basic attention token", "BAT", 18, 1000)).address;
        ercZRX = (await MockERC20.new("0x", "ZRX", 18, 1000)).address;
        ercREP = (await MockERC20.new("Augur", "REP", 18, 1000)).address;

        // Create Mock Aggregators
        // =======================
        // Aggregators are feeded with mock latestAnswer
        aggDAI = (await MockChainLinkAggregator.new(18, new BN("5424285000000000"))).address; // DAI / ETH
        aggUSDC = (await MockChainLinkAggregator.new(6, new BN("5309685000000000"))).address; // USDC / ETH
        aggUSDT = (await MockChainLinkAggregator.new(6, new BN("5164220000000000"))).address; // USDT / ETH
        aggTUSD = (await MockChainLinkAggregator.new(18, new BN("5172765000000000"))).address; // TUSD / ETH
        aggMKR = (await MockChainLinkAggregator.new(18, new BN("1716434500000000000"))).address; // MKR / ETH
        aggBAT = (await MockChainLinkAggregator.new(18, new BN("918555000000000"))).address; // BAT / ETH
        aggZRX = (await MockChainLinkAggregator.new(18, new BN("953760000000000"))).address; // ZRX / ETH
        aggREP = (await MockChainLinkAggregator.new(18, new BN("52943555000000000"))).address; // REP / ETH
    } else if (network == "rinkeby") {
        // Rinkeby testnet
    } else if (network == "fork" || network == "mainnet") {
        // Mainnet || mainnet-forked-ganache
        // ERC20 addresses
        // ===============
        ercDAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
        ercUSDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
        ercUSDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
        ercTUSD = "0x0000000000085d4780B73119b644AE5ecd22b376";
        ercMKR = "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2";
        ercBAT = "0x0d8775f648430679a709e98d2b0cb6250d2887ef";
        ercZRX = "0xe41d2489571d322189246dafa5ebde1f4699f498";
        ercREP = "0x1985365e9f78359a9B6AD760e32412f4a445E862";

        // Aggregators addresses
        // =====================
        aggDAI = "0x037E8F2125bF532F3e228991e051c8A7253B642c";
        aggUSDC = "0xdE54467873c3BCAA76421061036053e371721708";
        aggUSDT = "0xa874fe207DF445ff19E7482C746C4D3fD0CB9AcE";
        aggTUSD = "0x73ead35fd6A572EF763B13Be65a9db96f7643577";
        aggMKR = "0xDa3d675d50fF6C555973C4f0424964e1F6A4e7D3";
        aggBAT = "0x9b4e2579895efa2b4765063310Dc4109a7641129";
        aggZRX = "0xA0F9D94f060836756FFC84Db4C78d097cA8C23E8";
        aggREP = "0xb8b513d9cf440C1b6f5C7142120d611C94fC220c";
    }

    await deployer.deploy(
        ChainLinkOracle,
        [ercDAI, ercUSDC, ercUSDT, ercTUSD, ercMKR, ercBAT, ercZRX, ercREP],
        [aggDAI, aggUSDC, aggUSDT, aggTUSD, aggMKR, aggBAT, aggZRX, aggREP]
    );
};
