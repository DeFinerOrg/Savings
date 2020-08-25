import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.borrow", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

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
    let mockChainlinkAggregatorforWBTCAddress: any;
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

    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20MKR: t.ERC20Instance;
    let erc20TUSD: t.ERC20Instance;
    let erc20USDT: t.ERC20Instance;
    let erc20WBTC: t.ERC20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforWBTC: t.MockChainLinkAggregatorInstance;

    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_USDC: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
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
        mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];

        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0]; //todo:where is ETH address?
        erc20WBTC = await ERC20.at(addressWBTC);

        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
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

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDTAddress
        );
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforTUSDAddress
        );
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforMKRAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforWBTCAddress
        );

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
            context(
                "Use compound supported and unsupported tokens together (WBTC, TUSD)",
                async () => {
                    context("Should fail", async () => {
                        it("Deposits WBTC, borrows TUSD and the collateral is not enough", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 0.01 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)).div(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)).div(new BN(100)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)).div(new BN(100)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows more TUSD than its borrowing power, should fail
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(90);
                            await expectRevert(
                                savingAccount.borrow(addressTUSD, borrow, { from: user1 }),
                                "Insufficient collateral."
                            );
                        });
                        it("Deposits TUSD, borrows WBTC and the collateral is not enough", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 100 WBTC
                             * Account2: deposits 1 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account11 Borrows more WBTC than its borrowing power, should fail
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = eightPrecision.mul(TUSDPrice).div(WBTCPrice);
                            await expectRevert(
                                savingAccount.borrow(addressWBTC, borrow, { from: user2 }),
                                "Insufficient collateral."
                            );
                        });
                        it("Deposits WBTC, borrows TUSD and the amount is zero", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows 0 TUSD
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(0);
                            await expectRevert(
                                savingAccount.borrow(addressTUSD, borrow, { from: user1 }),
                                "Amount is zero"
                            );
                        });
                        it("Deposits TUSD, borrows WBTC and the amount is zero", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 100 WBTC
                             * Account2: deposits 1 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account11 Borrows 0 WBTC
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(0);
                            await expectRevert(
                                savingAccount.borrow(addressWBTC, borrow, { from: user2 }),
                                "Amount is zero"
                            );
                        });
                    });
                    context("Should succeeed", async () => {
                        it("Deposits WBTC, borrows a small amount of TUSD ", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows 10 TUSD
                             * To verify:
                             * 1. Account1 increases 10 TUSD
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(10);
                            let accTUSDBefore = await erc20TUSD.balanceOf(user1);
                            await savingAccount.borrow(addressTUSD, borrow, { from: user1 });
                            let accTUSDAfter = await erc20TUSD.balanceOf(user1);
                            expect(BN(accTUSDAfter).sub(BN(accTUSDBefore))).to.be.bignumber.equals(
                                borrow
                            );
                        });
                        it("Deposits TUSD, borrows a small amount of WBTC ", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account2: Borrows 1 WBTC
                             * To verify:
                             * 1. Account2 increases 1 WBTC
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(1);
                            let accWBTCBefore = await erc20WBTC.balanceOf(user2);
                            await savingAccount.borrow(addressWBTC, borrow, { from: user2 });
                            let accWBTCAfter = await erc20WBTC.balanceOf(user2);
                            expect(BN(accWBTCAfter).sub(BN(accWBTCBefore))).to.be.bignumber.equals(
                                borrow
                            );
                        });
                        it("Deposits WBTC, borrows the same amount of borrowing power ", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10000)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(10000)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(10000)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows the same as the borrowing power
                             * To verify:
                             * 1. Account1 increases the same amount of borrow power of TUSD
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();

                            let borrow = eighteenPrecision
                                .mul(TUSDPrice)
                                .div(WBTCPrice)
                                .div(new BN(100))
                                .mul(new BN(60));
                            let accTUSDBefore = await erc20TUSD.balanceOf(user1);

                            await savingAccount.borrow(addressTUSD, borrow, { from: user1 });
                            let accTUSDAfter = await erc20TUSD.balanceOf(user1);
                            expect(BN(accTUSDAfter).sub(accTUSDBefore)).to.be.bignumber.equals(
                                borrow
                            );
                        });
                        it("Deposits TUSD, borrows the same amount of borrowing power", async () => {
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 100 WBTC
                             * Account2: deposits 1 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account2:Borrows the same as the borrowing power
                             * To verify:
                             * 1. Account1 increases the same amount of borrow power of TUSD
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = eightPrecision
                                .mul(TUSDPrice)
                                .div(WBTCPrice)
                                .div(new BN(100))
                                .mul(new BN(60));
                            let accWBTCBefore = await erc20WBTC.balanceOf(user2);

                            await savingAccount.borrow(addressWBTC, borrow, { from: user2 });
                            let accWBTCAfter = await erc20WBTC.balanceOf(user2);
                            expect(BN(accWBTCAfter).sub(BN(accWBTCBefore))).to.be.bignumber.equals(
                                borrow
                            );
                        });
                    });
                }
            );
        });
        context("Call multiple times", async () => {
            context("Should succeed", async () => {
                it("Uses 18 decimals, TUSD", async () => {
                    /*
                     * Step 1
                     * Account 1: Deposits 100 whole DAI tokens
                     * Account 2: Depoists 100 whole TUSD tokens
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(100)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(100)),
                        { from: user1 }
                    );
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(100)),
                        { from: user2 }
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(100)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(100)), {
                        from: user2
                    });

                    /*
                     * Step 2
                     * Account 1: Borrows 10 whole TUSD twice
                     * To verify:
                     * 1. Account 1's TUSD balance should be 10 after the first borrow
                     * 2. Account 1's TUSD balance should be 20 after the second borrow
                     */
                    let borrow = eighteenPrecision.mul(new BN(10));
                    let accTUSDBeforeFirst = await erc20TUSD.balanceOf(user1);
                    await savingAccount.borrow(addressTUSD, borrow, { from: user1 });
                    let accTUSDAfterFirst = await erc20TUSD.balanceOf(user1);
                    await savingAccount.borrow(addressTUSD, borrow, { from: user1 });
                    let accTUSDAfterSecond = await erc20TUSD.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(accTUSDAfterFirst).sub(BN(accTUSDBeforeFirst))
                    ).to.be.bignumber.equals(borrow);
                    // Verify 2.
                    expect(
                        BN(accTUSDAfterSecond).sub(BN(accTUSDBeforeFirst))
                    ).to.be.bignumber.equals(borrow.mul(new BN(2)));
                });
                it("Uses 6 decimals, USDC", async () => {
                    /*
                     * Step 1
                     * Account 1: Deposits 100 whole DAI tokens
                     * Account 2: Depoists 100 whole USDC tokens
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(100)));
                    await erc20USDC.transfer(user2, sixPrecision.mul(new BN(100)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(100)),
                        { from: user1 }
                    );
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(100)), {
                        from: user2
                    });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(100)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(100)), {
                        from: user2
                    });
                    /*
                     * Step 2
                     * Account 1: Borrows 10 whole USDC twice
                     * To verify:
                     * 1. Account 1's USDC balance should be 10 after the first borrow
                     * 2. Account 1's USDC balance should be 20 after the second borrow
                     */
                    let borrow = sixPrecision.mul(new BN(10));
                    let accUSDCBeforeFirst = await erc20USDC.balanceOf(user1);

                    await savingAccount.borrow(addressUSDC, borrow, { from: user1 });
                    let accUSDCAfterFirst = await erc20USDC.balanceOf(user1);
                    await savingAccount.borrow(addressUSDC, borrow, { from: user1 });
                    let accUSDCAfterSecond = await erc20USDC.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(accUSDCAfterFirst).sub(BN(accUSDCBeforeFirst))
                    ).to.be.bignumber.equals(borrow);
                    // Verify 2.
                    expect(
                        BN(accUSDCAfterSecond).sub(BN(accUSDCBeforeFirst))
                    ).to.be.bignumber.equals(borrow.mul(new BN(2)));
                });
                it("Uses 8 decimals, WBTC", async () => {
                    /*
                     * Step 1
                     * Account 1: Deposits 1000 whole DAI tokens
                     * Account 2: Depoists 1000 whole WBTC tokens
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(1000)));
                    await erc20WBTC.transfer(user2, eightPrecision.mul(new BN(1000)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1000)),
                        { from: user1 }
                    );
                    await erc20WBTC.approve(
                        savingAccount.address,
                        eightPrecision.mul(new BN(1000)),
                        { from: user2 }
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1000)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressWBTC, eightPrecision.mul(new BN(1000)), {
                        from: user2
                    });
                    /*
                     * Step 2
                     * Account 1: Borrows 0.01 whole WBTC twice
                     * To verify:
                     * 1. Account 1's WBTC balance should be 10 after the first borrow
                     * 2. Account 1's WBTC balance should be 20 after the second borrow
                     */
                    let borrow = eightPrecision.div(new BN(100));
                    let accWBTCAfterFirstBefore = await erc20WBTC.balanceOf(user1);

                    await savingAccount.borrow(addressWBTC, borrow, { from: user1 });
                    let accWBTCAfterFirst = await erc20WBTC.balanceOf(user1);
                    await savingAccount.borrow(addressWBTC, borrow, { from: user1 });
                    let accWBTCAfterSecond = await erc20WBTC.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(accWBTCAfterFirst).sub(BN(accWBTCAfterFirstBefore))
                    ).to.be.bignumber.equals(borrow);
                    // Verify 2.
                    expect(
                        BN(accWBTCAfterSecond).sub(BN(accWBTCAfterFirstBefore))
                    ).to.be.bignumber.equals(borrow.mul(new BN(2)));
                });
            });
        });
    });
});
