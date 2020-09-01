import { SavingAccountWithControllerInstance } from "./../types/truffle-contracts/index.d";
import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
var shell = require("shelljs");
const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount = artifacts.require("SavingAccount");
const SavingAccountWithController = artifacts.require("SavingAccountWithController");
const ChainLinkAggregator = artifacts.require("ChainLinkAggregator");
const TokenRegistry: t.TokenRegistryContract = artifacts.require("TokenRegistry");
var child_process = require("child_process");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");
const Constant: t.ConstantContract = artifacts.require("Constant");
const Bank: t.BankContract = artifacts.require("Bank");
const Accounts: t.AccountsContract = artifacts.require("Accounts");

// Contracts for Upgradability
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const SavingAccountProxy: t.SavingAccountProxyContract = artifacts.require("SavingAccountProxy");
const AccountsProxy: t.AccountsProxyContract = artifacts.require("AccountsProxy");
const BankProxy: t.BankProxyContract = artifacts.require("BankProxy");

var tokenData = require("../test-helpers/tokenData.json");

// var compoundTokens: any = require("../compound-protocol/networks/development.json");
var compoundTokens: any;
const addressZero: string = "0x0000000000000000000000000000000000000000";
const ETH_ADDR: string = "0x000000000000000000000000000000000000000E";

export class TestEngine {
    public erc20Tokens: Array<string> = new Array();
    public cTokens: Array<string> = new Array();
    public mockChainlinkAggregators: Array<string> = new Array();
    public tokenInfoRegistry!: t.TokenRegistryInstance;
    public globalConfig!: t.GlobalConfigInstance;
    public constant!: t.ConstantInstance;
    public bank!: t.BankInstance;
    public accounts!: t.AccountsInstance;

    public erc20TokensFromCompound: Array<string> = new Array();
    public cTokensCompound: Array<string> = new Array();

    public async deploy(script: String) {
        const currentPath = process.cwd();
        const compound = `${currentPath}/compound-protocol`;
        const scriptPath = `${compound}/script/scen/${script}`;
        const portNumber = process.env.COVERAGE ? "8546" : "8545";
        const command = `PROVIDER="http://localhost:${portNumber}/" yarn --cwd ${compound} run repl -s ${scriptPath}`;
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
        erc20TokensFromCompound.push(ETH_ADDR);

        return erc20TokensFromCompound;
    }

    public async getCompoundAddresses(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        var cTokensCompound = new Array();
        cTokensCompound.push(compoundTokens.Contracts.cDAI);
        cTokensCompound.push(compoundTokens.Contracts.cUSDC);
        cTokensCompound.push(compoundTokens.Contracts.cUSDT);
        cTokensCompound.push(addressZero);
        cTokensCompound.push(addressZero);
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

        this.globalConfig = await GlobalConfig.new();
        this.constant = await Constant.new();

        const bank = await Bank.new();
        await bank.initialize(this.globalConfig.address);

        const accounts = await Accounts.new();
        await accounts.initialize(this.globalConfig.address);

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        const chainLinkOracle: t.ChainLinkAggregatorInstance = await ChainLinkAggregator.new(
            this.tokenInfoRegistry.address
        );

        await this.tokenInfoRegistry.initialize(this.globalConfig.address);

        // Deploy Upgradability contracts
        const proxyAdmin = await ProxyAdmin.new();
        const savingAccountProxy = await SavingAccountProxy.new();
        const accountsProxy = await AccountsProxy.new();
        const bankProxy = await BankProxy.new();

        // Global Config initialize
        await this.globalConfig.initialize(
            bankProxy.address,
            savingAccountProxy.address,
            this.tokenInfoRegistry.address,
            accountsProxy.address,
            this.constant.address,
            chainLinkOracle.address
        );
 
        const savingAccount: t.SavingAccountWithControllerInstance = await SavingAccountWithController.new();
        // console.log("ERC20", this.erc20Tokens);
        // console.log("cTokens", cTokens);
        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                compoundTokens.Contracts.Comptroller
            )
            .encodeABI();

        const accounts_initialize_data = bank.contract.methods
            .initialize(
                this.globalConfig.address
            )
            .encodeABI();

        const bank_initialize_data = accounts.contract.methods
            .initialize(
                this.globalConfig.address
            )
            .encodeABI();

        await savingAccountProxy.initialize(
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.initialize(
            accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.initialize(
            bank.address,
            proxyAdmin.address,
            bank_initialize_data
        );
        const proxy = SavingAccountWithController.at(savingAccountProxy.address);
        this.accounts = Accounts.at(accountsProxy.address);
        this.bank = Bank.at(bankProxy.address);

        return proxy;
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
                const chainLinkOracle = aggregators[i];
                await this.tokenInfoRegistry.addToken(
                    tokenAddr,
                    decimals,
                    isTransferFeeEnabled,
                    isSupportedOnCompound,
                    cToken,
                    chainLinkOracle
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

    public async getCOMPTokenAddress(): Promise<string> {
        const network = process.env.NETWORK;
        var COMPTokenAddress = compoundTokens.Contracts.COMP;

        return COMPTokenAddress;
    }
}
