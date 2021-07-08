import { InterestRateModel } from "./../compound-protocol/scenario/src/Contract/InterestRateModel";
import { Contract } from "./../compound-protocol/scenario/src/Contract";
import { SavingAccountWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { BankWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { AccountsWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { takeSnapshot, revertToSnapShot } from "./SnapshotUtils";
import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
var shell = require("shelljs");
const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount: any = artifacts.require("SavingAccount");
const SavingAccountWithController: any = artifacts.require("SavingAccountWithController");
const Bank: any = artifacts.require("BankWithController");
const Accounts: any = artifacts.require("AccountsWithController");
const TokenRegistry: any = artifacts.require("TokenRegistry");
const AccountTokenLib = artifacts.require("AccountTokenLib");
const BitmapLib = artifacts.require("BitmapLib");
const Utils: any = artifacts.require("Utils");
const SavingLib = artifacts.require("SavingLib");

var child_process = require("child_process");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");
const Constant: t.ConstantContract = artifacts.require("Constant");

// Contracts for Upgradability
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const SavingAccountProxy: t.SavingAccountProxyContract = artifacts.require("SavingAccountProxy");
const AccountsProxy: t.AccountsProxyContract = artifacts.require("AccountsProxy");
const BankProxy: t.BankProxyContract = artifacts.require("BankProxy");

var tokenData = require("../test-helpers/tokenData.json");

// var compoundTokens: any = require("../compound-protocol/networks/development.json");
// var compoundTokens: any;
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
    public proxyAdmin!: t.ProxyAdminInstance;
    public compoundTokens: any = require("../compound-protocol/networks/development.json");

    public erc20TokensFromCompound: Array<string> = new Array();
    public cTokensCompound: Array<string> = new Array();

    public async deploy(script: String) {
        let jsonFileExists = true;

        const fileName = process.env.COVERAGE ? "coverage.json" : "development.json";
        const configFile = "../compound-protocol/networks/" + fileName;
        const currentPath = process.cwd();
        const compound = `${currentPath}/compound-protocol`;
        const scriptPath = `${compound}/script/scen/${script}`;
        const portNumber = process.env.COVERAGE ? "8546" : "8545";
        const command = `PROVIDER="http://localhost:${portNumber}/" yarn --cwd ${compound} run repl -s ${scriptPath}`;

        try {
            this.compoundTokens;
            this.compoundTokens.Contracts.Comptroller;
            console.log("--------------Comptroller received----------------");
        } catch (err) {
            jsonFileExists = false;
        }

        if (jsonFileExists) {
            // compoundTokens = require(configFile);

            const code0 = this.compoundTokens.InterestRateModel;
            const InterestRateModel = Object.keys(code0);
            const code = await web3.eth.getCode(this.compoundTokens.Contracts.Comptroller);
            console.log("InterestRateModel[0]", InterestRateModel[0].toString());
            console.log("script", script);

            if (InterestRateModel[0] == "StdInterest" && script == "scriptFlywheel.scen") {
                await revertToSnapShot(process.env.SNAPSHOT_ID || "");
                console.log("Reverted to snapshotId: " + process.env.SNAPSHOT_ID);
                process.env.SNAPSHOT_ID = await takeSnapshot();
                console.log("Snapshot Taken: snapshotId: " + process.env.SNAPSHOT_ID);
                return; // no need to deploy compound
            } else if (
                InterestRateModel[0] == "MyInterestModel" &&
                script == "whitePaperModel.scen"
            ) {
                await revertToSnapShot(process.env.SNAPSHOT_ID || "");
                console.log("Reverted to snapshotId: " + process.env.SNAPSHOT_ID);
                process.env.SNAPSHOT_ID = await takeSnapshot();
                console.log("Snapshot Taken: snapshotId: " + process.env.SNAPSHOT_ID);
                return; // no need to deploy compound
            }
        }

        console.log("---------------- deploy Compound ----------------------");

        // const currentPath = process.cwd();
        // const compound = `${currentPath}/compound-protocol`;
        // const scriptPath = `${compound}/script/scen/${script}`;
        // const portNumber = process.env.COVERAGE ? "8546" : "8545";
        // const command = `PROVIDER="http://localhost:${portNumber}/" yarn --cwd ${compound} run repl -s ${scriptPath}`;

        shell.exec(`rm -rf ${compound}/networks/development.json`);

        if (process.env.FLYWHEEL == "yes" && script == "scriptFlywheel.scen") {
            // Do nothing
        } else if (script == "whitePaperModel.scen") {
            const log = shell.exec(command);
            process.env.FLYWHEEL = "no";
        } else {
            const log = shell.exec(command);
            process.env.FLYWHEEL = "yes";
        }

        delete require.cache[require.resolve("../compound-protocol/networks/" + fileName)];
        // compoundTokens = require(configFile);

        process.env.SNAPSHOT_ID = await takeSnapshot();
        console.log("Snapshot Taken: snapshotId: " + process.env.SNAPSHOT_ID);
    }

    public async deployTruffle(script: String) {
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
        this.compoundTokens = require(configFile);
    }

    public async getERC20AddressesFromCompound(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        var erc20TokensFromCompound = new Array();
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.DAI);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.USDC);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.USDT);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.TUSD);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.MKR);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.BAT);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.ZRX);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.REP);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.WBTC);
        erc20TokensFromCompound.push(ETH_ADDR);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.LPToken);
        erc20TokensFromCompound.push(this.compoundTokens.Contracts.FIN);

        return erc20TokensFromCompound;
    }

    public async getCompoundAddresses(): Promise<Array<string>> {
        const network = process.env.NETWORK;

        var cTokensCompound = new Array();
        cTokensCompound.push(this.compoundTokens.Contracts.cDAI);
        cTokensCompound.push(this.compoundTokens.Contracts.cUSDC);
        cTokensCompound.push(this.compoundTokens.Contracts.cUSDT);
        cTokensCompound.push(addressZero);
        cTokensCompound.push(addressZero);
        cTokensCompound.push(this.compoundTokens.Contracts.cBAT);
        cTokensCompound.push(this.compoundTokens.Contracts.cZRX);
        cTokensCompound.push(this.compoundTokens.Contracts.cREP);
        cTokensCompound.push(this.compoundTokens.Contracts.cWBTC);
        cTokensCompound.push(this.compoundTokens.Contracts.cETH);
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

        await this.bank.initialize(this.globalConfig.address);

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
            await Accounts.link(accountTokenLib);
            await TokenRegistry.link(utils);
        } catch (error) {}

        this.accounts = await Accounts.new();
        // Accounts.setAsDeployed(this.accounts);
        await this.accounts.initialize(this.globalConfig.address);

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

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
            this.constant.address
        );

        const savingAccount: t.SavingAccountWithControllerInstance =
            await SavingAccountWithController.new();
        // SavingAccountWithController.setAsDeployed(savingAccount);

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                this.compoundTokens.Contracts.Comptroller
            )
            .encodeABI();

        // set FINAddress variable to mainnet address in SavingAccount
        await savingAccount.initFINAddress();
        // set COMPAddress variable to mainnet address in SavingAccount
        await savingAccount.initCOMPAddress();

        const accounts_initialize_data = this.accounts.contract.methods
            .initialize(this.globalConfig.address, this.compoundTokens.Contracts.Comptroller)
            .encodeABI();

        const bank_initialize_data = this.bank.contract.methods
            .initialize(this.globalConfig.address, this.compoundTokens.Contracts.Comptroller)
            .encodeABI();

        await savingAccountProxy.methods["initialize(address,address,bytes)"](
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.methods["initialize(address,address,bytes)"](
            this.accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.methods["initialize(address,address,bytes)"](
            this.bank.address,
            proxyAdmin.address,
            bank_initialize_data
        );
        const proxy = await SavingAccountWithController.at(savingAccountProxy.address);
        this.accounts = await Accounts.at(accountsProxy.address);
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
        var COMPTokenAddress = this.compoundTokens.Contracts.COMP;
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
        await this.bank.initialize(this.globalConfig.address);

        this.accounts = await Accounts.new();
        await this.accounts.initialize(this.globalConfig.address);

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

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
            this.constant.address
        );

        const savingAccount: t.SavingAccountWithControllerInstance =
            await SavingAccountWithController.new();

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                this.compoundTokens.Contracts.Comptroller
            )
            .encodeABI();

        const bank_initialize_data = this.bank.contract.methods
            .initialize(this.globalConfig.address, this.compoundTokens.Contracts.Comptroller)
            .encodeABI();

        const accounts_initialize_data = this.accounts.contract.methods
            .initialize(this.globalConfig.address, this.compoundTokens.Contracts.Comptroller)
            .encodeABI();

        await savingAccountProxy.methods["initialize(address,address,bytes)"](
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.methods["initialize(address,address,bytes)"](
            this.accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.methods["initialize(address,address,bytes)"](
            this.bank.address,
            proxyAdmin.address,
            bank_initialize_data
        );

        const proxy = await SavingAccountWithController.at(savingAccountProxy.address);
        this.accounts = await Accounts.at(accountsProxy.address);
        this.bank = await Bank.at(bankProxy.address);

        return proxy;
    }
}
