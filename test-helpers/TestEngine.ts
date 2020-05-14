import * as t from "../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");

const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount = artifacts.require("SavingAccount");
const ChainLinkOracle = artifacts.require("ChainLinkOracle");
const TokenRegistry: t.TokenRegistryContract = artifacts.require("TokenRegistry");
const CTokenRegistry: t.CTokenRegistryContract = artifacts.require("CTokenRegistry");

var tokenData = require("../test-helpers/tokenData.json");

const ETH_ADDR: string = "0x000000000000000000000000000000000000000E";

export class TestEngine {
    public erc20Tokens: Array<string> = new Array();
    public cTokens: Array<string> = new Array();

    public cTokenRegistry!: t.CTokenRegistryInstance;

    public async deployMockCTokens(erc20Tokens: Array<string>): Promise<Array<string>> {
        var cTokens = new Array();

        await Promise.all(
            erc20Tokens.map(async (tokenAddr) => {
                let addr;
                // Create MockCToken for given ERC20 token address
                addr = (await MockCToken.new(tokenAddr)).address;

                cTokens.push(addr);
            })
        );

        return cTokens;
    }

    public async deployMockERC20Tokens(): Promise<Array<string>> {
        const tokensToMint = new BN(10000);
        var erc20TokenAddresses = new Array();
        let addr;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                addr = (await MockERC20.new(token.name, token.symbol, token.decimals, tokensToMint))
                    .address;
                erc20TokenAddresses.push(addr);
            })
        );

        return erc20TokenAddresses;
    }

    public async deployMockChainLinkAggregators(): Promise<Array<string>> {
        var aggregators = new Array();
        let addr;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                addr = (
                    await MockChainLinkAggregator.new(token.decimals, new BN(token.latestAnswer))
                ).address;
                aggregators.push(addr);
            })
        );

        return aggregators;
    }

    public async deploySavingAccount(): Promise<t.SavingAccountInstance> {
        this.erc20Tokens = await this.deployMockERC20Tokens();
        const cTokens = await this.deployMockCTokens(this.erc20Tokens);
        this.cTokenRegistry = await CTokenRegistry.new(this.erc20Tokens, cTokens);
        const aggregators = await this.deployMockChainLinkAggregators();
        const chainLinkOracle: t.ChainLinkOracleInstance = await ChainLinkOracle.new(
            this.erc20Tokens,
            aggregators
        );
        const tokenRegistry: t.TokenRegistryInstance = await TokenRegistry.new(this.erc20Tokens);
        await tokenRegistry.addToken(ETH_ADDR);

        return SavingAccount.new(
            this.erc20Tokens,
            cTokens,
            chainLinkOracle.address,
            tokenRegistry.address
        );
    }
}
