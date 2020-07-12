import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "./../types/truffle-contracts/index.d";
import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

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
    let addressCTokenForUDST: any;
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
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUDST = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForTUSD = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        addressCTokenForMKR = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20USDT = await MockERC20.at(addressUSDT);
        erc20TUSD = await MockERC20.at(addressTUSD);
        erc20MKR = await MockERC20.at(addressMKR);

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(mockChainlinkAggregatorforDAIAddress);
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(mockChainlinkAggregatorforUSDCAddress);
        mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(mockChainlinkAggregatorforUSDTAddress);
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(mockChainlinkAggregatorforTUSDAddress);
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(mockChainlinkAggregatorforMKRAddress);
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(mockChainlinkAggregatorforETHAddress);
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_USDC = sixPrecision;
        // Set DAI, USDC, USDT, TUSD to the same price for convenience
        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);
        await mockChainlinkAggregatorforUSDT.updateAnswer(DAIprice);
        await mockChainlinkAggregatorforTUSD.updateAnswer(DAIprice);
    });

    // extra tests by Yichun
    context("Additional tests for Deposit", async () => {
        context("With multiple tokens", async () => {
            context("Should suceed", async () => {
                it("Deposit DAI and USDC", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 DAI and 1 USDC
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user1, sixPrecision.mul(new BN(1)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user1 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(1)), { from: user1 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), { from: user1 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(1)), { from: user1 });
                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 DAI and 1 USDC
                     * 2. CToken left in saving account should be 85% of total tokens
                     * 3. Token left in saving account should be 15% of total tokens
                     */
                    const userDAIBalance = await savingAccount.tokenBalance(addressDAI, { from: user1 });
                    const userUSDCBalance = await savingAccount.tokenBalance(addressUSDC, { from: user1 });

                });
            });
        });
    });
});
