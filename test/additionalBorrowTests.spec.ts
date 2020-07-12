import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "./../types/truffle-contracts/index.d";
import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.liquidate", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForTUSD: any;
    let addressCTokenForMKR: any;
    let addressCTokenForWBTC: any;

    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenTUSD: t.MockCTokenInstance;
    let cTokenMKR: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;

    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let erc20USDT: t.MockERC20Instance;
    let erc20WBTC: t.MockERC20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_USDC: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0];//todo:where is ETH address?
        erc20WBTC = await MockERC20.at(addressWBTC);

        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20USDT = await MockERC20.at(addressUSDT);
        erc20TUSD = await MockERC20.at(addressTUSD);
        erc20MKR = await MockERC20.at(addressMKR);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForTUSD = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        addressCTokenForMKR = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenTUSD = await MockCToken.at(addressCTokenForTUSD);
        cTokenMKR = await MockCToken.at(addressCTokenForMKR);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(mockChainlinkAggregatorforDAIAddress);
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(mockChainlinkAggregatorforUSDCAddress);
        mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(mockChainlinkAggregatorforUSDTAddress);
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(mockChainlinkAggregatorforTUSDAddress);
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(mockChainlinkAggregatorforMKRAddress);
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(mockChainlinkAggregatorforETHAddress);
        ONE_DAI = eighteenPrecision;
        ONE_USDC = sixPrecision;
        // Set DAI, USDC, USDT, TUSD to the same price for convenience
        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);
        await mockChainlinkAggregatorforUSDT.updateAnswer(DAIprice);
        await mockChainlinkAggregatorforTUSD.updateAnswer(DAIprice);
    });

    // extra tests by Yichun
    context("Additional tests for Borrow", async () => {
        context("With multiple tokens", async () => {
            context("Use compound supported and unsupported tokens together (WBTC, TUSD)", async () => {
                context("Should fail", async () => {
                    it("Deposits WBTC, borrows TUSD and the collateral is not enough", async () => {

                    });
                });
            });
        });
    });
});
