import { SavingAccountWithControllerContract } from './../types/truffle-contracts/index.d';
import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");

const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount = artifacts.require("SavingAccountWithController");
const ChainLinkOracle = artifacts.require("ChainLinkOracle");
const TokenInfoRegistry: t.TokenInfoRegistryContract = artifacts.require("TokenInfoRegistry");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

var tokenData = require("../test-helpers/tokenData.json");

var compoundTokens = require("../compound-protocol/networks/development.json");

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

    /* public async deployMockCTokens(erc20Tokens: Array<string>): Promise<Array<string>> {
        const network = process.env.NETWORK;
        var cTokens = new Array();
        await Promise.all(
            erc20Tokens.map(async (tokenAddr: any) => {
                let addr;
                if (network == "development") {
                    // Create MockCToken for given ERC20 token address
                    addr = (await MockCToken.new(tokenAddr)).address;
                } else if (network == "ropsten") {
                    addr = tokenAddr.ropsten.cTokenAddress;
                } else if (network == "mainnet" || network == "mainnet-fork") {
                    addr = tokenAddr.mainnet.cTokenAddress;
                }
                cTokens.push(addr);
            })
        );
        let addr = (await MockCToken.new(ETH_ADDR)).address;
        cTokens.push(addr);
        return cTokens;
    } */

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
        //console.log("erc20", erc20TokensFromCompound);

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
        //console.log("cTokens", cTokensCompound);

        return cTokensCompound;
    }

    /* public async deployMockERC20Tokens(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        const ONE_BILLION = new BN(10).pow(new BN(9));
        const tokensToMint = ONE_BILLION;
        var erc20TokenAddresses = new Array();
        let addr;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                let addr;
                if (network == "development") {
                    addr = (
                        await MockERC20.new(token.name, token.symbol, token.decimals, tokensToMint)
                    ).address;
                } else if (network == "ropsten") {
                    addr = token.ropsten.tokenAddress;
                } else if (network == "mainnet" || network == "mainnet-fork") {
                    addr = token.mainnet.tokenAddress;
                }
                erc20TokenAddresses.push(addr);
            })
        );
        return erc20TokenAddresses;
    } */

    public async deployMockChainLinkAggregators(): Promise<Array<string>> {
        //var aggregators = new Array();
        const network = process.env.NETWORK;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                let addr;
                if (network == "development") {
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

    public async deploySavingAccount(): Promise<t.SavingAccountInstance> {
        //this.erc20Tokens = await this.deployMockERC20Tokens();
        this.erc20Tokens = await this.getERC20AddressesFromCompound();
        //this.cTokensCompound = await this.getCompoundAddresses();
        //const cTokens: Array<string> = await this.deployMockCTokens(this.erc20Tokens);
        const cTokens: Array<string> = await this.getCompoundAddresses();
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.tokenInfoRegistry = await TokenInfoRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        this.globalConfig = await GlobalConfig.new();

        const chainLinkOracle: t.ChainLinkOracleInstance = await ChainLinkOracle.new(
            this.tokenInfoRegistry.address
        );
        return SavingAccount.new(
            this.erc20Tokens,
            cTokens,
            chainLinkOracle.address,
            this.tokenInfoRegistry.address,
            this.globalConfig.address,
            compoundTokens.Comptroller.ComptrollerScen.address
        );
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
                // TODO When PR merged fix this, by default set to `true`
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
