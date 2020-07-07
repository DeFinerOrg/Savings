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

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let erc20USDT: t.MockERC20Instance;
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
        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0];//todo:where is ETH address?
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
    context("liquidate()", async () => {
        context("With multiple kinds of tokens", async () => {
            context("Should fail", async () => {
                it("Borrow multiple compound supported tokens, liquidate with compound supported token, and there is not engough collteral.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 USDT
                     * Account3: deposits 2 USDC and 2 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user2, sixPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 40%, acccount2 tries to liquidate using USDC
                     * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.2
                     *           It can be liquidated but the collateral is not enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressUSDC, { from: user2 }),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
                it("Borrow multiple compound supported tokens, liquidate with compound unsupported token, and there is not engough collteral.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 TUSD
                     * Account3: deposits 2 USDC and 2 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));


                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 40%, acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1.6 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.2
                     *           It can be liquidated but the collateral is not enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
                it("Borrow multiple compound unsupported tokens, liquidate with compound supported tokens, and there is not engough collteral.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 USDC
                     * Account3: deposits 2 MKR and 2 TUSD
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20USDC.transfer(user2, sixPrecision.mul(new BN(1)));
                    await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(1)), { from: user2 });
                    await erc20MKR.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows MKR that is the same value of 0.6 DAI and 0.6 TUSD
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let MKRAmount = eighteenPrecision.mul(BN(DAIprice)).mul(new BN(60)).div(new BN(100)).div(BN(MKRprice));
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 40%, acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1.6 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.6
                     *           It can be liquidated but the collateral is not enough.
                     */
                    let updatedPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
                it("Borrow multiple compound unsupported tokens, liqudiate with compound unsupported tokens, and there is not engough collteral.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 TUSD
                     * Account3: deposits 2 MKR and 2 TUSD
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20MKR.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows MKR that is the same value of 0.6 DAI and 0.6 TUSD
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let MKRAmount = eighteenPrecision.mul(BN(DAIprice)).div(BN(MKRprice)).mul(new BN(60)).div(new BN(100));
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 40%, acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.6
                     *           It can be liquidated but the collateral is not enough.
                     */
                    let updatedPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
                it("Borrow multiple compound supported and unsupported tokens, liquidate with compound supported tokens, and there is not engough collteral.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 USDT
                     * Account3: deposits 2 USDC and 2 TUSD
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user2, sixPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDC and 0.6 TUSD
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 20%, acccount2 tries to liquidate using USDC
                     * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.2
                     *           It can be liquidated but the collateral is not enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressUSDT, { from: user2 }),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
                it("Borrow multiple compound supported and unsupported tokens, liquidate with compound unsupported tokens, and there is not engough collteral.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 TUSD
                     * Account3: deposits 2 USDC and 2 TUSD
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDC and 0.6 TUSD
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 20%, acccount2 tries to liquidate using USDC
                     * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.6
                     *           It can be liquidated but the collateral is not enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
                it("Borrow multiple compound supported tokens, liquidate with compound unsupported token, and the liqudiator don't have enough tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 TUSD
                     * Account3: deposits 2 USDC and 2 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     * Account2: borrows 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user2 });
                    /* 
                     * Step 3. DAI and TUSD price drops 30%, acccount2 tries to liquidate using TUSD.
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                     *           It can be liquidated and the collateral is enough.
                     * Account2: No funds left actually.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedDAIPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedDAIPrice);
                    let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    let updatedTUSDPrice = BN(TUSDprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforTUSD.updateAnswer(updatedTUSDPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                        "No extra funds are used for liquidation."
                    );
                });


                it("Borrow multiple compound supported tokens, liquidate with compound supported token, and the liqudiator don't have enough tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 DAI
                     * Account3: deposits 2 USDC and 2 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     * Account2: borrows 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user2 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                     *           It can be liquidated and the collateral is enough.
                     * Account2: Account 2 becomes liquidatable too, so it can't liquidate account 1.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                        "No extra funds are used for liquidation."
                    );
                });
                it("Borrow multiple compound unsupported tokens, liquidate with compound supported tokens, and the liqudiator don't have enough tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 DAI
                     * Account3: deposits 2 TUSD and 2 MKR
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));
                    await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await erc20MKR.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                     * Account2: borrows 0.6 TUSD
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let MKRAmount = eighteenPrecision.mul(BN(DAIprice)).div(BN(MKRprice)).mul(new BN(60)).div(new BN(100));
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user2 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                     *           It can be liquidated and the collateral is enough.
                     * Account2: Account 2 becomes liquidatable too, so it can't liquidate account 1.
                     */
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                        "No extra funds are used for liquidation."
                    );
                });
                it("Borrow multiple compound unsupported tokens, liqudiate with compound unsupported tokens, and the liqudiator don't have enough tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 TUSD
                     * Account3: deposits 2 TUSD and 2 MKR
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));
                    await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await erc20MKR.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                     * Account2: borrows MKR that is the same value as 0.6 DAI
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let MKRAmount = eighteenPrecision.mul(BN(DAIprice)).div(BN(MKRprice)).mul(new BN(60)).div(new BN(100));
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user2 });
                    /* 
                     * Step 3. DAI price drops 40%, TUSD price drops 20% acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1.2 USD, the borrowed asset worth 0.6 + 0.6 * 0.8 = 1.08
                     *           1.08 / 1.2 = 0.9 > 0.85, liquidatable. 1.2 * 0.95 = 1.14 > 1.08, collateral enough
                     * Account2: Collateral worth 0.8 USD, borrowed asset worth 0.8 USD.
                     *           0.6 / 0.8 = 0.75 > 0.6, no funds left
                     */
                    let updatedDAIPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedDAIPrice);
                    let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    let updatedTUSDPrice = BN(TUSDprice).mul(new BN(80)).div(new BN(100));
                    await mockChainlinkAggregatorforTUSD.updateAnswer(updatedTUSDPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                        "No extra funds are used for liquidation."
                    );
                });
                it("Borrow multiple compound supported and unsupported tokens, liquidate with compound supported tokens, and the liqudiator don't have enough tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 DAI
                     * Account3: deposits 2 USDC and 2 TUSD
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 USDC and 0.6 TUSD
                     * Account2: borrows 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user2 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                     *           It can be liquidated and the collateral is enough.
                     * Account2: Account 2 becomes liquidatable too, so it can't liquidate account 1.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                        "No extra funds are used for liquidation."
                    );
                });
                it("Borrow multiple compound supported and unsupported tokens, liquidate with compound unsupported tokens, and the liqudiator don't have enough tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 1 TUSD
                     * Account3: deposits 2 USDC and 2 TUSD
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), { from: user3 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), { from: user3 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 USDC and 0.6 TUSD
                     * Account2: borrows 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user2 });
                    /* 
                     * Step 3. DAI price drops 40%, TUSD price drops 20% acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1.2 USD, the borrowed asset worth 0.6 + 0.6 * 0.8 = 1.08
                     *           1.08 / 1.2 = 0.9 > 0.85, liquidatable. 1.2 * 0.95 = 1.14 > 1.08, collateral enough
                     * Account2: Collateral worth 0.8 USD, borrowed asset worth 0.8 USD.
                     *           0.6 / 0.8 = 0.75 > 0.6, no funds left
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedDAIPrice = BN(DAIprice).mul(new BN(60)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedDAIPrice);
                    let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    let updatedTUSDPrice = BN(TUSDprice).mul(new BN(80)).div(new BN(100));
                    await mockChainlinkAggregatorforTUSD.updateAnswer(updatedTUSDPrice);
                    await expectRevert(
                        savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                        "No extra funds are used for liquidation."
                    );
                });
            });

            context("Should succeed", async () => {
                it("Borrow multiple compound supported tokens, liquidate with compound supported token.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 USDT
                     * Account3: deposits 20 USDC and 20 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user2, sixPrecision.mul(new BN(10)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(10)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDT
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressUSDT, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Borrow multiple compound supported tokens, liquidate with compound unsupported token.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 TUSD
                     * Account3: deposits 20 USDC and 20 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Borrow multiple compound unsupported tokens, liquidate with compound supported tokens", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 DAI
                     * Account3: deposits 20 TUSD and 20 MKR
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(10)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                    await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await erc20MKR.approve(savingAccount.address, eighteenPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let MKRAmount = eighteenPrecision.mul(BN(DAIprice)).div(BN(MKRprice)).mul(new BN(60)).div(new BN(100));
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Borrow multiple compound unsupported tokens, liqudiate with compound unsupported tokens.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 TUSD
                     * Account3: deposits 20 TUSD and 20 MKR
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                    await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await erc20MKR.approve(savingAccount.address, eighteenPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let MKRAmount = eighteenPrecision.mul(BN(DAIprice)).div(BN(MKRprice)).mul(new BN(60)).div(new BN(100));
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDC
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Borrow multiple compound supported and unsupported tokens, liquidate with compound supported tokens.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 DAI
                     * Account3: deposits 20 TUSD and 20 USDC
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(10)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 TUSD and 0.6 USDC
                     */
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Borrow multiple compound supported and unsupported tokens, liquidate with compound unsupported tokens.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 TUSD
                     * Account3: deposits 20 TUSD and 20 USDC
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 0.6 TUSD and 0.6 USDC
                     */
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Liquidate a huge amount of multiple kinds of compound supported tokens.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 20000 DAI
                     * Account2: deposits 100000 DAI
                     * Account3: deposits 200000 TUSD and 200000 USDC
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(20000)));
                    await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(100000)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(200000)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(200000)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(20000)), { from: user1 });
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(100000)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(200000)), { from: user3 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(200000)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(20000)), { from: user1 });
                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(100000)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(200000)), { from: user3 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(200000)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 6000 TUSD and 6000 USDC
                     */
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)).mul(new BN(10000)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)).mul(new BN(10000)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
                it("Liquidate a huge amount of multiple kinds of compound unsupported tokens.", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 20000 DAI
                     * Account2: deposits 100000 TUSD
                     * Account3: deposits 200000 TUSD and 200000 USDC
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(20000)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100000)));
                    await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(200000)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(200000)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(20000)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(100000)), { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, eighteenPrecision.mul(new BN(200000)), { from: user3 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(200000)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(20000)), { from: user1 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(100000)), { from: user2 });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(200000)), { from: user3 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(200000)), { from: user3 });
                    /* 
                     * Step 2. User1 and User 2 borrows from DeFiner
                     * Account1: borrows 6000 TUSD and 6000 USDC
                     */
                    await savingAccount.borrow(addressTUSD, eighteenPrecision.mul(new BN(60)).div(new BN(100)).mul(new BN(10000)), { from: user1 });
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)).mul(new BN(10000)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using TUSD
                     * Account1: Collateral worth roughly 1,4 * 10000 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2
                     *           It can be liquidated and the collateral is enough.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const liquidateBefore = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, ETH_ADDRESS);
                    expect(liquidateBefore).to.be.true;
                    expect(liquidateAfter).to.be.false;
                });
            });
        });
        context("LTV rates changing tests.", async () => {
            context("Should fail.", async () => {
                it("Account is liquidatable, and becomes unliquidatable after LTV changing", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 USDT
                     * Account3: deposits 20 USDC and 20 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user2, sixPrecision.mul(new BN(10)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(10)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDT
                     * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                     *           It is liquidatable before the LTV rate changes
                     *           It is not liquidatable after the LTV rate changes to 0.9.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(70)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const rateChangeBefore = await savingAccount.isAccountLiquidatable(user1, addressUSDT);
                    testEngine.tokenInfoRegistry.updateLiquidationThreshold(addressUSDT, 90);
                    const rateChangeAfter = await savingAccount.isAccountLiquidatable(user1, addressUSDT);
                    expect(rateChangeBefore).to.be.true;
                    expect(rateChangeAfter).to.be.false;
                    await expectRevert(
                        savingAccount.liquidate(user1, addressUSDT, { from: user2 }),
                        // FIXME: warning info in saving account shouldn't be hardcoded.
                        "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                    );
                });
            });
            context("Should succeed.", async () => {
                it("Account is unliquidatable, and becomes liquidatable after LTV changing", async () => {
                    /* 
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 2 DAI
                     * Account2: deposits 10 USDT
                     * Account3: deposits 20 USDC and 20 USDT
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                    await erc20USDT.transfer(user2, sixPrecision.mul(new BN(10)));
                    await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                    await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                    await erc20DAI.approve(savingAccount.address, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(10)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), { from: user3 });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), { from: user1 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(10)), { from: user2 });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), { from: user3 });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), { from: user3 });
                    /* 
                     * Step 2. User1 borrows from DeFiner
                     * Account1: borrows 0.6 USDT and 0.6 USDC
                     */
                    await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    await savingAccount.borrow(addressUSDT, sixPrecision.mul(new BN(60)).div(new BN(100)), { from: user1 });
                    /* 
                     * Step 3. DAI price drops 20%, acccount2 tries to liquidate using USDT
                     * Account1: Collateral worth roughly 1.6 USD, 1.2/1.6 = 0.75 < 0.85
                     *           It is not liquidatable before the LTV rate changes
                     *           It is not liquidatable after the LTV rate changes to 0.7.
                     */
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(DAIprice).mul(new BN(80)).div(new BN(100));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    const rateChangeBefore = await savingAccount.isAccountLiquidatable(user1, addressUSDT);
                    testEngine.tokenInfoRegistry.updateLiquidationThreshold(addressUSDT, 70);
                    const rateChangeAfter = await savingAccount.isAccountLiquidatable(user1, addressUSDT);
                    expect(rateChangeBefore).to.be.false;
                    expect(rateChangeAfter).to.be.true;
                    await savingAccount.liquidate(user1, addressUSDT, { from: user2 });
                    const liquidateAfter = await savingAccount.isAccountLiquidatable(user1, addressUSDT);
                    expect(liquidateAfter).to.be.false;
                });
            });
        });
    });
});
