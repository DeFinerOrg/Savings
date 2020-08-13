import { SavingAccountWithControllerInstance } from "./../types/truffle-contracts/index.d";
import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
var shell = require("shelljs");
const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount = artifacts.require("SavingAccount");
const SavingAccountWithController = artifacts.require("SavingAccountWithController");
const ChainLinkOracle = artifacts.require("ChainLinkOracle");
const TokenInfoRegistry: t.TokenInfoRegistryContract = artifacts.require("TokenInfoRegistry");
var child_process = require("child_process");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

// Contracts for Upgradability
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const SavingAccountProxy: t.SavingAccountProxyContract = artifacts.require("SavingAccountProxy");

var tokenData = require("../test-helpers/tokenData.json");

// var compoundTokens: any = require("../compound-protocol/networks/development.json");
var compoundTokens: any;
const addressZero: string = "0x0000000000000000000000000000000000000001";
const ETH_ADDR: string = "0x000000000000000000000000000000000000000E";

export class TestEngine {
    public erc20Tokens: Array<string> = new Array();
    public cTokens: Array<string> = new Array();
    public mockChainlinkAggregators: Array<string> = new Array();
    public tokenInfoRegistry!: t.TokenInfoRegistryInstance;
    public globalConfig!: t.GlobalConfigInstance;

    public erc20TokensFromCompound: Array<string> = new Array();
    public cTokensCompound: Array<string> = new Array();

    public async deploy(script: String) {
        const currentPath = process.cwd();
        const compound = `${currentPath}/compound-protocol`;
        const scriptPath = `${compound}/script/scen/${script}`;
        const command = `PROVIDER="http://localhost:8545/" yarn --cwd ${compound} run repl -s ${scriptPath}`;
        const log = shell.exec(command);
        const fileName = process.env.COVERAGE ? "coverage.json" : "development.json"
        const configFile = "../compound-protocol/networks/" + fileName;
        // clean import caches
        delete require.cache[require.resolve("../compound-protocol/networks/" + fileName)];
        compoundTokens = require(configFile);
    }

    public async getERC20AddressesFromCompound(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        var erc20TokensFromCompound = new Array();
        erc20TokensFromCompound.push(compoundTokens.Contracts.DAI);
        erc20TokensFromCompound.push(compoundTokens.Contracts.USDC);
        erc20TokensFromCompound.push(compoundTokens.Contracts.USDT);
        erc20TokensFromCompound.push(compoundTokens.Contracts.TUSD);
        erc20TokensFromCompound.push(compoundTokens.Contracts.MKR);
        erc20TokensFromCompound.push(compoundTokens.Contracts.BAT);
        erc20TokensFromCompound.push(compoundTokens.Contracts.ZRX);
        erc20TokensFromCompound.push(compoundTokens.Contracts.REP);
        erc20TokensFromCompound.push(compoundTokens.Contracts.WBTC);

        return erc20TokensFromCompound;
    }

    public async getCompoundAddresses(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        var cTokensCompound = new Array();
        cTokensCompound.push(compoundTokens.Contracts.cDAI);
        cTokensCompound.push(compoundTokens.Contracts.cUSDC);
        cTokensCompound.push(compoundTokens.Contracts.cUSDT);
        cTokensCompound.push(compoundTokens.Contracts.cTUSD);
        cTokensCompound.push(compoundTokens.Contracts.cMKR);
        cTokensCompound.push(compoundTokens.Contracts.cBAT);
        cTokensCompound.push(compoundTokens.Contracts.cZRX);
        cTokensCompound.push(compoundTokens.Contracts.cREP);
        cTokensCompound.push(compoundTokens.Contracts.cWBTC);
        cTokensCompound.push(compoundTokens.Contracts.cETH);

        return cTokensCompound;
    }

    public async deployMockChainLinkAggregators(): Promise<Array<string>> {
        //var aggregators = new Array();
        const network = process.env.NETWORK;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                let addr;
                if (network == "development" || "coverage") {
                    addr = (
                        await MockChainLinkAggregator.new(
                            token.decimals,
                            new BN(token.latestAnswer)
                        )
                    ).address;
                } else if (network == "ropsten") {
                    addr = token.ropsten.aggregatorAddress;
                } else if (network == "mainnet" || network == "mainnet-fork") {
                    addr = token.mainnet.aggregatorAddress;
                }
                this.mockChainlinkAggregators.push(addr);
            })
        );
        let addr = (
            await MockChainLinkAggregator.new(
                tokenData.ETH.decimals,
                new BN(tokenData.ETH.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(addr);
        return this.mockChainlinkAggregators;
    }

    public async deploySavingAccount(): Promise<t.SavingAccountWithControllerInstance> {
        this.erc20Tokens = await this.getERC20AddressesFromCompound();
        const cTokens: Array<string> = await this.getCompoundAddresses();
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.tokenInfoRegistry = await TokenInfoRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        this.globalConfig = await GlobalConfig.new();

        const chainLinkOracle: t.ChainLinkOracleInstance = await ChainLinkOracle.new(
            this.tokenInfoRegistry.address
        );

        // Deploy Upgradability contracts
        const proxyAdmin = await ProxyAdmin.new();
        const savingAccountProxy = await SavingAccountProxy.new();

        const savingAccount: t.SavingAccountWithControllerInstance = await SavingAccountWithController.new();

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                chainLinkOracle.address,
                this.tokenInfoRegistry.address,
                this.globalConfig.address,
                compoundTokens.Contracts.Comptroller
            )
            .encodeABI();
        await savingAccountProxy.initialize(
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        const proxy = SavingAccountWithController.at(savingAccountProxy.address);
        return proxy;

        /*
        const savingAccount = await SavingAccountWithController.new(
            compoundTokens.Contracts.Comptroller
        );

        await savingAccount.initialize(this.erc20Tokens,
            cTokens,
            chainLinkOracle.address,
            this.tokenInfoRegistry.address,
            this.globalConfig.address);

        return savingAccount;*/
    }

    private async initializeTokenInfoRegistry(
        cTokens: Array<string>,
        aggregators: Array<string>
    ): Promise<void> {
        await Promise.all(
            tokenData.tokens.map(async (token: any, i: number) => {
                const tokenAddr = this.erc20Tokens[i];
                const decimals = token.decimals;
                const isTransferFeeEnabled = token.isFeeEnabled;
                const isSupportedOnCompound = true;
                const cToken = cTokens[i];
                const chainLinkAggregator = aggregators[i];
                await this.tokenInfoRegistry.addToken(
                    tokenAddr,
                    decimals,
                    isTransferFeeEnabled,
                    isSupportedOnCompound,
                    cToken,
                    chainLinkAggregator
                );
            })
        );
        await this.tokenInfoRegistry.addToken(
            ETH_ADDR,
            18,
            false,
            true,
            cTokens[9],
            aggregators[9]
        );
    }
}
