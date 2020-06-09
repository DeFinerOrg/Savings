import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");

const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount = artifacts.require("SavingAccount");
const ChainLinkOracle = artifacts.require("ChainLinkOracle");
const TokenInfoRegistry: t.TokenInfoRegistryContract = artifacts.require("TokenInfoRegistry");

var tokenData = require("../test-helpers/tokenData.json");

const ETH_ADDR: string = "0x000000000000000000000000000000000000000E";

export class TestEngine {
    public erc20Tokens: Array<string> = new Array();
    public cTokens: Array<string> = new Array();
    public mockChainlinkAggregators: Array<string> = new Array();
    public tokenInfoRegistry!: t.TokenInfoRegistryInstance;

    public async deployMockCTokens(erc20Tokens: Array<string>): Promise<Array<string>> {
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

        return cTokens;
    }

    public async deployMockERC20Tokens(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        const tokensToMint = new BN(10000);
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
    }

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

        return this.mockChainlinkAggregators;
    }

    public async deploySavingAccount(): Promise<t.SavingAccountInstance> {
        this.erc20Tokens = await this.deployMockERC20Tokens();
        const cTokens: Array<string> = await this.deployMockCTokens(this.erc20Tokens);
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.tokenInfoRegistry = await TokenInfoRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        const chainLinkOracle: t.ChainLinkOracleInstance = await ChainLinkOracle.new(
            this.tokenInfoRegistry.address
        );
        return SavingAccount.new(
            this.erc20Tokens,
            cTokens,
            chainLinkOracle.address,
            this.tokenInfoRegistry.address
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
        //await tokenInfoRegistry.addToken(ETH_ADDR);
    }
}
