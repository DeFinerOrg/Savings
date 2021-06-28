import { SavingAccountWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { BankWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { AccountsWithControllerInstance } from "./../types/truffle-contracts/index.d";
import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
var shell = require("shelljs");
const MockCToken = artifacts.require("MockCTokenV1_1");
const MockERC20 = artifacts.require("MockERC20V1_1");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregatorV1_1");
const SavingAccount: any = artifacts.require("SavingAccountV1_1");
const SavingAccountWithController: any = artifacts.require("SavingAccountWithControllerV1_1");
const Bank: any = artifacts.require("BankWithControllerV1_1");
const AccountsWithController: any = artifacts.require("AccountsWithControllerV1_1");
const ChainLinkAggregator = artifacts.require("ChainLinkAggregatorV1_1");
const TokenRegistry: any = artifacts.require("TokenRegistryV1_1");
const AccountTokenLib = artifacts.require("AccountTokenLibV1_1");
const BitmapLib = artifacts.require("BitmapLibV1_1");
const Utils: any = artifacts.require("UtilsV1_1");
const SavingLib = artifacts.require("SavingLibV1_1");

var child_process = require("child_process");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfigV1_1");
const Constant: t.ConstantContract = artifacts.require("ConstantV1_1");

// Contracts for Upgradability
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const SavingAccountProxy = artifacts.require("SavingAccountProxyV1_1");
const AccountsProxy = artifacts.require("AccountsProxyV1_1");
const BankProxy = artifacts.require("BankProxyV1_1");

var tokenData = require("../test-helpers/tokenData.json");

// var compoundTokens: any = require("../compound-protocol/networks/development.json");
var compoundTokens: any;
const addressZero: string = "0x0000000000000000000000000000000000000000";
const ETH_ADDR: string = "0x000000000000000000000000000000000000000E";

export class TestEngineV1_1 {
    public savingAccount!: t.SavingAccountWithControllerInstance;
    public erc20Tokens: Array<string> = new Array();
    public cTokens: Array<string> = new Array();
    public mockChainlinkAggregators: Array<string> = new Array();
    public tokenInfoRegistry!: t.TokenRegistryInstance;
    public globalConfig!: t.GlobalConfigInstance;
    public constant!: t.ConstantInstance;
    public bank!: t.BankWithControllerInstance;
    public accounts!: t.AccountsWithControllerInstance;
    public proxyAdmin!: t.ProxyAdminInstance;
    public erc20TokensFromCompound: Array<string> = new Array();
    public cTokensCompound: Array<string> = new Array();

    constructor() {
        this.deploy();
    }

    public deploy() {
        const configFile = "../compound-protocol/networks/development.json";
        compoundTokens = require(configFile);
    }

    public deployTruffle(script: String) {
        const currentPath = process.cwd();
        const compound = `${currentPath}/compound-protocol`;
        const scriptPath = `${compound}/script/scen/${script}`;
        const portNumber = process.env.COVERAGE ? "8546" : "8545";
        const command = `PROVIDER="http://localhost:${portNumber}/" yarn --cwd ${compound} run repl -s ${scriptPath}`;

        const log = shell.exec(command);

        const fileName = process.env.COVERAGE ? "coverage.json" : "development.json";
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
        erc20TokensFromCompound.push(compoundTokens.Contracts.LPToken);
        erc20TokensFromCompound.push(compoundTokens.Contracts.FIN);

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
        cTokensCompound.push(addressZero);
        cTokensCompound.push(addressZero);

        return cTokensCompound;
    }

    public async deployMockChainLinkAggregators(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        if (this.mockChainlinkAggregators.length != 0) return this.mockChainlinkAggregators;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                let addr;
                if (network == "development" || "coverage" || !network) {
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
        let ETHaddr = (
            await MockChainLinkAggregator.new(
                tokenData.ETH.decimals,
                new BN(tokenData.ETH.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(ETHaddr);

        let LPaddr = (
            await MockChainLinkAggregator.new(
                tokenData.LPToken.decimals,
                new BN(tokenData.LPToken.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(LPaddr);

        let DeFiner = (
            await MockChainLinkAggregator.new(
                tokenData.DeFiner.decimals,
                new BN(tokenData.DeFiner.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(DeFiner);

        return this.mockChainlinkAggregators;
    }

    public async deploySavingAccount(): Promise<t.SavingAccountWithControllerInstance> {
        this.erc20Tokens = await this.getERC20AddressesFromCompound();

        const cTokens: Array<string> = await this.getCompoundAddresses();
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.globalConfig = await GlobalConfig.new();
        this.constant = await Constant.new();
        this.bank = await Bank.new();

        await this.bank.methods["initialize(address)"](this.globalConfig.address);

        const accountTokenLib = await AccountTokenLib.new();
        const bitMapLib = await BitmapLib.new();
        const utils = await Utils.new();
        // Utils.setAsDeployed(utils);

        try {
            await SavingLib.link(utils);
        } catch (err) {
            // Do nothing
        }

        const savingLib = await SavingLib.new();

        // AccountTokenLib.setAsDeployed(accountTokenLib);
        // BitmapLib.setAsDeployed(bitMapLib);
        // SavingLib.setAsDeployed(savingLib);

        try {
            await SavingAccount.link(utils);
            await SavingAccount.link(savingLib);
            await SavingAccountWithController.link(utils);
            await SavingAccountWithController.link(savingLib);
            // await Accounts.link(utils);
            await AccountsWithController.link(accountTokenLib);
            await TokenRegistry.link(utils);
        } catch (error) {}

        this.accounts = await AccountsWithController.new();
        // AccountsWithController.setAsDeployed(this.accounts);
        await this.accounts.methods["initialize(address,address)"](
            this.globalConfig.address,
            compoundTokens.Contracts.Comptroller
        );

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        const chainLinkOracle = await ChainLinkAggregator
            .new
            // this.tokenInfoRegistry.address
            ();
        await chainLinkOracle.initialize(this.globalConfig.address);

        await this.tokenInfoRegistry.initialize(this.globalConfig.address);

        // Deploy Upgradability contracts
        const proxyAdmin = await ProxyAdmin.new();
        this.proxyAdmin = proxyAdmin;
        // ProxyAdmin.setAsDeployed(proxyAdmin);

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

        const savingAccount: t.SavingAccountWithControllerInstance =
            await SavingAccountWithController.new();
        // SavingAccountWithController.setAsDeployed(savingAccount);

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                compoundTokens.Contracts.Comptroller
            )
            .encodeABI();

        const accounts_initialize_data = this.accounts.contract.methods
            .initialize(this.globalConfig.address, compoundTokens.Contracts.Comptroller)
            .encodeABI();

        const bank_initialize_data = this.bank.contract.methods
            .initialize(this.globalConfig.address, compoundTokens.Contracts.Comptroller)
            .encodeABI();

        await savingAccountProxy.initialize(
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.initialize(
            this.accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.initialize(this.bank.address, proxyAdmin.address, bank_initialize_data);
        const proxy = await SavingAccountWithController.at(savingAccountProxy.address);
        this.savingAccount = proxy;
        this.accounts = await AccountsWithController.at(accountsProxy.address);
        this.bank = await Bank.at(bankProxy.address);

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

        await this.tokenInfoRegistry.addToken(
            this.erc20Tokens[10],
            18,
            false,
            false,
            cTokens[10],
            aggregators[10]
        );

        await this.tokenInfoRegistry.addToken(
            this.erc20Tokens[11],
            18,
            false,
            false,
            cTokens[11],
            aggregators[11]
        );
    }

    public async getCOMPTokenAddress(): Promise<string> {
        const network = process.env.NETWORK;
        var COMPTokenAddress = compoundTokens.Contracts.COMP;
        return COMPTokenAddress;
    }

    // This acts the same as deploySavingAccount, but this one can be used in truffle test suite.

    public async deploySavingAccountTruffle(): Promise<t.SavingAccountWithControllerInstance> {
        this.erc20Tokens = await this.getERC20AddressesFromCompound();
        const cTokens: Array<string> = await this.getCompoundAddresses();
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.globalConfig = await GlobalConfig.new();
        this.constant = await Constant.new();
        this.bank = await Bank.new();
        await this.bank.methods["initialize(address)"](this.globalConfig.address);

        this.accounts = await AccountsWithController.new();
        await this.accounts.methods["initialize(address)"](this.globalConfig.address);

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        const chainLinkOracle = await ChainLinkAggregator
            .new
            // this.tokenInfoRegistry.address
            ();

        await chainLinkOracle.initialize(this.globalConfig.address);

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

        const savingAccount: t.SavingAccountWithControllerInstance =
            await SavingAccountWithController.new();

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                compoundTokens.Contracts.Comptroller
            )
            .encodeABI();

        const bank_initialize_data = this.bank.contract.methods
            .initialize(this.globalConfig.address, compoundTokens.Contracts.Comptroller)
            .encodeABI();

        const accounts_initialize_data = this.accounts.contract.methods
            .initialize(this.globalConfig.address, compoundTokens.Contracts.Comptroller)
            .encodeABI();

        await savingAccountProxy.initialize(
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.initialize(
            this.accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.initialize(this.bank.address, proxyAdmin.address, bank_initialize_data);

        const proxy = await SavingAccountWithController.at(savingAccountProxy.address);
        this.accounts = await AccountsWithController.at(accountsProxy.address);
        this.bank = await Bank.at(bankProxy.address);

        return proxy;
    }
}
