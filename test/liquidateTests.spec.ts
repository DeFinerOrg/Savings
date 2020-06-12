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
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;

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
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20MKR = await MockERC20.at(addressMKR);
        erc20TUSD = await MockERC20.at(addressTUSD);
        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(mockChainlinkAggregatorforDAIAddress);
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(mockChainlinkAggregatorforUSDCAddress);
        numOfToken = new BN(1000);
    });

    context("liquidate()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("when unsupported token address is passed", async () => {
                    //Try depositting unsupported Token to SavingContract
                    await expectRevert(savingAccount.liquidate(owner, dummy), "Unsupported token");
                });

                it("when tokenAddress is zero", async () => {
                    //Try depositting zero address
                    await expectRevert(
                        savingAccount.liquidate(owner, addressZero),
                        "Token address is zero"
                    );
                });

                it("when the ratio of borrowed money and collateral is less than 85%", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await expectRevert(
                        savingAccount.liquidate(user2, addressDAI),
                        "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                    );
                });

                it("when collateral is not sufficient to be liquidated",async () => {
                    // 2. Approve 1000 tokens
                    const ONE_DAI = eighteenPrecision;
                    const ONE_USDC = sixPrecision;

                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    // 2. Start borrowing.
                    const limitAmount = ONE_USDC
                        .mul(await savingAccount.getCoinToUsdRate(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToUsdRate(0));
                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                    // 3. Change the price.
                    let updatedPrice = new BN(1);
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    await expectRevert(
                        savingAccount.liquidate(user2, addressDAI),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
            });

            context("should succeed", async () => {
                it("When user tries to liquidate partially", async () => {
                    const borrowAmt = new BN(600);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(DAIprice)
                        .mul(new BN(7))
                        .div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // 4. Start liquidation.
                    await savingAccount.liquidate(user2, addressDAI);
                });

                it("When user tries to liquidate fully", async () => {
                    // 2. Approve 1000 tokens
                    const numOfToken = new BN(100000000);

                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(100000000), { from: user2 });
                    // 3. Verify the loan amount
                    const user2Balance = await erc20DAI.balanceOf(user2);

                    await savingAccount.liquidate(user2, addressDAI);
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("when the ratio of borrowed money and collateral is less than 85%", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });

                    // 3. Change the price.
                    await expectRevert(
                        savingAccount.liquidate(user1, addressDAI),
                        "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                    );
                });

                it("when collateral is not sufficient to be liquidated",async () => {
                    const ONE_DAI = eighteenPrecision;
                    const ONE_ETH = eighteenPrecision;
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH
                    });
                    // 2. Start borrowing.
                    const limitAmount = ONE_DAI
                        .mul(await savingAccount.getCoinToUsdRate(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToUsdRate(0));
                    await savingAccount.borrow(ETH_ADDRESS, limitAmount, { from: user1 });
                    // 3. Change the price.
                    let updatedPrice = new BN(1);
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    await expectRevert(
                        savingAccount.liquidate(user1, addressDAI),
                        "Collateral is not sufficient to be liquidated."
                    );
                });
            });

            context("should succeed", async () => {
                it("When user tries to liquidate partially", async () => {
                    const borrowAmt = new BN(1);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });

                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(DAIprice)
                        .mul(new BN(7))
                        .div(new BN(10));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    await savingAccount.liquidate(user2, addressDAI);
                });
            });
        })
    });
});