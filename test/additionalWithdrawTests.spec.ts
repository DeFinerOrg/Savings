import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.withdraw", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForWBTC: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20USDT: t.MockERC20Instance;
    let erc20WBTC: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let ZERO: any;
    let ONE_YEAR: any;
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20USDT = await MockERC20.at(addressUSDT);
        erc20WBTC = await MockERC20.at(addressWBTC);
        erc20TUSD = await MockERC20.at(addressTUSD);
        erc20MKR = await MockERC20.at(addressMKR);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
        ZERO = new BN(0);
        ONE_YEAR = new BN(365).mul(new BN(24).mul(new BN(3600)));

    });

    context("Addtional tests for withdraw", async () => {
        context("when partial tokens are withdrawn, but triggers DeFiner to withdraw from Compound", async () => {
            context("should succeed", async () => {
                it("Use DAI, 18 decimals", async () => {
                    /*
                     * Step 1
                     * Account 0 deposits 1000 tokens into DeFiner
                     * DeFiner should have 850 tokens for cTokenDAI and 150 tokens for DAI
                     */
                    const numOfTokens = new BN(1000);
                    await erc20DAI.approve(savingAccount.address, numOfTokens);
                    await savingAccount.deposit(erc20DAI.address, numOfTokens);
                    /*
                     * Step 2
                     * Account 0 withdraw 150 tokens into DeFiner
                     * DeFiner should have 850 tokens for cTokenDAI, so it should trigger the mechanism 
                     * to withdraw some tokens from Compound
                     * To verify:
                     * 1. withdraw amount = balance before withdraw - balance after withdraw
                     * 2. cTokenDAI + DAI = 850
                     * 3. cTokenDAI id either 723 or 722
                     */
                    const withdraws = new BN(150);
                    let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);
                    await savingAccount.withdraw(erc20DAI.address, withdraws);
                    let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                    const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                        BN(userBalanceBeforeWithdraw)
                    );
                    // Verify 1.
                    expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
                    const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                    const balCToken = await cTokenDAI.balanceOfUnderlying.call(savingAccount.address);
                    const totalSavingAccount = (new BN(newbalSavingAccount)).add(new BN(balCToken));
                    const totalDeposit = BN(numOfTokens.sub(withdraws));
                    // Verify 2.
                    expect(totalSavingAccount).to.be.bignumber.equal(totalDeposit)
                    // Verify 3.
                    expect(BN(balCToken)).to.be.bignumber.equal(new BN(723));
                });
                it("Use USDC, 6 decimals", async () => {
                    /*
                     * Step 1
                     * Account 0 deposits 1000 tokens into DeFiner
                     * DeFiner should have 850 tokens for cTokenUSDC and 150 tokens for USDC
                     */
                    const numOfTokens = new BN(1000);
                    await erc20USDC.approve(savingAccount.address, numOfTokens);
                    await savingAccount.deposit(erc20USDC.address, numOfTokens);
                    /*
                     * Step 2
                     * Account 0 withdraw 150 tokens into DeFiner
                     * DeFiner should have 850 tokens for cTokenUSDC, so it should trigger the mechanism 
                     * to withdraw some tokens from Compound
                     * To verify:
                     * 1. withdraw amount = balance before withdraw - balance after withdraw
                     * 2. cTokenUSDC + USDC = 850
                     * 3. cTokenUSDC id either 723 or 722
                     */
                    const withdraws = new BN(150);
                    let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);
                    await savingAccount.withdraw(erc20USDC.address, withdraws);
                    let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                    const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                        BN(userBalanceBeforeWithdraw)
                    );
                    // Verify 1.
                    expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
                    const newbalSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                    const balCToken = await cTokenUSDC.balanceOfUnderlying.call(savingAccount.address);
                    const totalSavingAccount = BN(newbalSavingAccount).add(balCToken);
                    const totalDeposit = BN(numOfTokens.sub(withdraws));
                    // Verify 2.
                    expect(totalSavingAccount).to.be.bignumber.equal(totalDeposit)
                    // Verify 3.
                    expect(BN(balCToken)).to.be.bignumber.equal(new BN(723));
                });
                it("Use WBTC, 8 decimals", async () => {
                    /*
                     * Step 1
                     * Account 0 deposits 1000 tokens into DeFiner
                     * DeFiner should have 850 tokens for cTokenWBTC and 150 tokens for WBTC
                     */
                    const numOfTokens = new BN(1000);
                    await erc20WBTC.approve(savingAccount.address, numOfTokens);
                    await savingAccount.deposit(erc20WBTC.address, numOfTokens);
                    /*
                     * Step 2
                     * Account 0 withdraw 150 tokens into DeFiner
                     * DeFiner should have 850 tokens for cTokenWBTC, so it should trigger the mechanism 
                     * to withdraw some tokens from Compound
                     * To verify:
                     * 1. withdraw amount = balance before withdraw - balance after withdraw
                     * 2. cTokenWBTC + WBTC = 850
                     * 3. cTokenWBTC id either 723 or 722
                     */
                    const withdraws = new BN(150);
                    let userBalanceBeforeWithdraw = await erc20WBTC.balanceOf(owner);
                    await savingAccount.withdraw(erc20WBTC.address, withdraws);
                    let userBalanceAfterWithdraw = await erc20WBTC.balanceOf(owner);
                    const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                        BN(userBalanceBeforeWithdraw)
                    );
                    // Verify 1.
                    expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
                    const newbalSavingAccount = await erc20WBTC.balanceOf(savingAccount.address);
                    const balCToken = await cTokenWBTC.balanceOfUnderlying.call(savingAccount.address);
                    const totalSavingAccount = BN(newbalSavingAccount).add(balCToken);
                    const totalDeposit = BN(numOfTokens.sub(withdraws));
                    // Verify 2.
                    expect(totalSavingAccount).to.be.bignumber.equal(totalDeposit)
                    // Verify 3.
                    expect(BN(balCToken)).to.be.bignumber.equal(new BN(723));
                });

                // TODO: Compound unsupported tokens issues are not fixed yet.
                // it("Use TUSD, compound not supported tokens", async () => {
                //     /*
                //         * Step 1
                //         * Account 0 deposits 1000 tokens into DeFiner
                //         * DeFiner should have 1000 tokens TUSD
                //         */
                //     const numOfTokens = new BN(1000);
                //     await erc20TUSD.approve(savingAccount.address, numOfTokens);
                //     await savingAccount.deposit(erc20TUSD.address, numOfTokens);
                //     /*
                //         * Step 2
                //         * Account 0 withdraw 150 tokens into DeFiner
                //         * DeFiner should have 850 TUSD tokens
                //         * to withdraw some tokens from Compound
                //         * To verify:
                //         * 1. withdraw amount = balance before withdraw - balance after withdraw
                //         * 2. TUSD tokens in compound is 850
                //         */
                //     const withdraws = new BN(150);
                //     let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);
                //     await savingAccount.withdraw(erc20TUSD.address, withdraws);
                //     let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                //     const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                //         BN(userBalanceBeforeWithdraw)
                //     );
                //     // Verify 1.
                //     expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
                //     const newbalSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                //     // Verify 2.
                //     expect(newbalSavingAccount).to.be.bignumber.equal(new BN(850));
                // });
            });
        });
        // // TODO 1.3 Feature in DeFiner is not implemented yet.
        // context("When withdrawing an amount of value that is larger than the total tokens DeFiner has", async () => {
        //     context("should succeed", async () => {
        //         // TODO: Failed test
        //         it("Uses DAI, 18 decimals", async () => {
        //             const numOfDAIs = new BN(1).mul(eighteenPrecision);
        //             const numOfUSDCs = new BN(1).mul(sixPrecision);
        //             /*
        //              * Step 1
        //              * Assign 10^18 DAI to user1 and Assign 10^6 USDC to user2
        //              * Then deposit all these tokens to DeFiner
        //              */
        //             await erc20DAI.transfer(user1, numOfDAIs);
        //             await erc20USDC.transfer(user2, numOfUSDCs);
        //             await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
        //             await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user2 });
        //             await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
        //             await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user2 });
        //             /*
        //              * Step 2
        //              * User2 borrows 5x10^17 DAI from DeFiner
        //              * Now Definer only has 5x10^17 DAI tokens in total
        //              * User1 tries to withdraw all the tokens from DeFiner
        //              */
        //             savingAccount.borrow(addressDAI, numOfDAIs.div(new BN(2)), { from: user2 });
        //             /*
        //              * Step 3
        //              * User1 withdraw all the 10^18 DAI tokens from DeFiner
        //              * To verify:
        //              * 1. The DAI tokens in user 1 raised by 10^18
        //              */
        //             let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);
        //             await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });
        //             let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
        //             const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
        //                 BN(userBalanceBeforeWithdraw)
        //             );
        //             // Verify 1.
        //             expect(numOfDAIs).to.be.bignumber.equal(userBalanceDiff);
        //         });
        //         it("Uses USDC, 6 decimals", async () => {
        //             const numOfDAIs = new BN(1).mul(eighteenPrecision);
        //             const numOfUSDCs = new BN(1).mul(sixPrecision);
        //             /*
        //              * Step 1
        //              * Assign 10^18 DAI to user2 and Assign 10^6 USDC to user1
        //              * Then deposit all these tokens to DeFiner
        //              */
        //             await erc20DAI.transfer(user2, numOfDAIs);
        //             await erc20USDC.transfer(user1, numOfUSDCs);
        //             await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user2 });
        //             await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });
        //             await savingAccount.deposit(addressDAI, numOfDAIs, { from: user2 });
        //             await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
        //             /*
        //              * Step 2
        //              * User2 borrows 5x10^5 USDC from DeFiner
        //              * Now Definer only has 5x10^5 USDC tokens in total
        //              * User1 tries to withdraw all the tokens from DeFiner
        //              */
        //             savingAccount.borrow(addressUSDC, numOfUSDCs.div(new BN(2)), { from: user2 });
        //             /*
        //              * Step 3
        //              * User1 withdraw all the 10^6 USDC tokens from DeFiner
        //              * To verify:
        //              * 1. The USDC tokens in user 1 raised by 10^18
        //              */
        //             let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);
        //             await savingAccount.withdrawAll(erc20USDC.address, { from: user1 });
        //             let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
        //             const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
        //                 BN(userBalanceBeforeWithdraw)
        //             );
        //             // Verify 1.
        //             expect(numOfUSDCs).to.be.bignumber.equal(userBalanceDiff);
        //         });
        //         it("Uses WBTC, 8 decimals", async () => {
        //             const numOfWBTCs = new BN(1).mul(eightPrecision);
        //             const numOfUSDCs = new BN(1).mul(sixPrecision);
        //             /*
        //              * Step 1
        //              * Assign 10^8 WBTC to user1 and Assign 10^6 USDC to user2
        //              * Then deposit all these tokens to DeFiner
        //              */
        //             await erc20WBTC.transfer(user1, numOfWBTCs);
        //             await erc20USDC.transfer(user2, numOfUSDCs);
        //             await erc20WBTC.approve(savingAccount.address, numOfWBTCs, { from: user1 });
        //             await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user2 });
        //             await savingAccount.deposit(addressWBTC, numOfWBTCs, { from: user1 });
        //             await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user2 });
        //             /*
        //              * Step 2
        //              * User2 borrows 10^4 WBTC from DeFiner
        //              * Now Definer only has 10^8 - 10^4 tokens in total
        //              * User1 tries to withdraw all the tokens from DeFiner
        //              */
        //             savingAccount.borrow(addressWBTC, new BN(1000), { from: user2 });
        //             /*
        //              * Step 3
        //              * User1 withdraw all the 10^8 WBTC tokens from DeFiner
        //              * To verify:
        //              * 1. The WBTC tokens in user 1 raised by 10^8
        //              */
        //             let userBalanceBeforeWithdraw = await erc20WBTC.balanceOf(owner);
        //             await savingAccount.withdrawAll(erc20WBTC.address, { from: user1 });
        //             let userBalanceAfterWithdraw = await erc20WBTC.balanceOf(owner);
        //             const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
        //                 BN(userBalanceBeforeWithdraw)
        //             );
        //             // Verify 1.
        //             expect(numOfWBTCs).to.be.bignumber.equal(userBalanceDiff);
        //         });
        //     });
        //     context("should fail", async () => {
        //         it("use TUSD, so DeFiner can't borrow it from Compound since it's not uspported by Compound", async () => {
        //             const numOfTUSDs = new BN(1).mul(eighteenPrecision);
        //             const numOfUSDCs = new BN(1).mul(sixPrecision);
        //             /*
        //              * Step 1
        //              * Assign 10^18 TUSD to user1 and Assign 10^6 USDC to user2
        //              * Then deposit all these tokens to DeFiner
        //              */
        //             await erc20TUSD.transfer(user1, numOfTUSDs);
        //             await erc20USDC.transfer(user2, numOfUSDCs);
        //             await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });
        //             await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user2 });
        //             await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });
        //             await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user2 });
        //             /*
        //              * Step 2
        //              * User2 borrows 5x10^17 TUSD from DeFiner
        //              * Now Definer only has 5x10^17 TUSD tokens in total
        //              * User1 tries to withdraw all the tokens from DeFiner
        //              */
        //             savingAccount.borrow(addressTUSD, numOfTUSDs.div(new BN(2)), { from: user2 });
        //             /*
        //              * Step 3
        //              * User1 withdraw all the 10^18 TUSD tokens from DeFiner
        //              * It should fail.
        //              */
        //             await expectRevert(
        //                 savingAccount.withdrawAll(erc20TUSD.address, { from: user1 }),
        //                 "Lack of liquidity."
        //             );
        //         });
        //     });
        // });

        context("Deposit and withdraw with multiple kinds of tokens.", async () => {
            context("Should succeed", async () => {
                it("Deposit DAI and USDC, withdraw partially", async () => {
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. userUSDCBalanceAfterWithdraw - userUSDCBalanceBeforeWithdraw = halfOfUSDCs
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const halfOfUSDCs = numOfUSDCs.div(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceBeforeWithdraw = await erc20USDC.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    await savingAccount.withdraw(erc20USDC.address, halfOfUSDCs, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceAfterWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    expect(BN(userUSDCBalanceAfterWithdraw).sub(BN(userUSDCBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(halfOfUSDCs));
                });
                it("Deposit DAI and USDC, withdraw fully", async () => {
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw all the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = numOfDAIs
                     * 2. userUSDCBalanceAfterWithdraw - userUSDCBalanceBeforeWithdraw = numOfUSDCs
                     */
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceBeforeWithdraw = await erc20USDC.balanceOf(user1);
                    await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });
                    await savingAccount.withdrawAll(erc20USDC.address, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceAfterWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(numOfDAIs);
                    // Verify 2.
                    expect(BN(userUSDCBalanceAfterWithdraw).sub(BN(userUSDCBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(numOfUSDCs));
                });
                it("Deposit DAI and TUSD, withdraw partially", async () => {
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfTUSDs = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20TUSD.transfer(user1, numOfTUSDs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. userTUSDBalanceAfterWithdraw - userTUSDBalanceBeforeWithdraw = halfOfTUSDs
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const halfOfTUSDs = numOfTUSDs.div(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    await savingAccount.withdraw(erc20TUSD.address, halfOfTUSDs, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceAfterWithdraw = await erc20TUSD.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    expect(BN(userTUSDBalanceAfterWithdraw).sub(BN(userTUSDBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(halfOfTUSDs));
                });
                it("Deposit DAI and TUSD, withdraw fully", async () => {
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfTUSDs = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20TUSD.transfer(user1, numOfTUSDs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = numOfDAIs
                     * 2. userTUSDBalanceAfterWithdraw - userTUSDBalanceBeforeWithdraw = numOfTUSDs
                     */
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);
                    await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });
                    await savingAccount.withdrawAll(erc20TUSD.address, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceAfterWithdraw = await erc20TUSD.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(numOfDAIs));
                    // Verify 2.
                    expect(BN(userTUSDBalanceAfterWithdraw).sub(BN(userTUSDBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(numOfTUSDs));
                });
            });
            context("Should fail", async () => {
                it("Deposit DAI and USDC, withdraw more USDC tokens than it deposits", async () => {
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the DAI tokens it deposits to DeFiner and doubel the tokens of USDC
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. withdraw double USDC tokens will fail
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const doubleOfUSDCs = numOfUSDCs.mul(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    expect(BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    await expectRevert(
                        savingAccount.withdraw(erc20USDC.address, doubleOfUSDCs, { from: user1 }),
                        "Insufficient balance."
                    );
                });
                it("Deposit DAI and TUSD, withdraw more USDC tokens than it deposits", async () => {
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfTUSDs = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20TUSD.transfer(user1, numOfTUSDs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the DAI tokens it deposits to DeFiner and double the TUSD tokens
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. withdraw double TUSD tokens will fail
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const doubleOfTUSDs = numOfTUSDs.mul(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw)))
                        .to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    await expectRevert(
                        savingAccount.withdraw(erc20TUSD.address, doubleOfTUSDs, { from: user1 }),
                        "Insufficient balance."
                    );
                });
            });
        });
        context("Withdraw when there is still borrow outstandings", async () => {
            it("Deposit DAI, borrows USDC and wants to withdraw all", async () => {
                /*
                 * Step 1
                 * Account 1 deposits 2 DAI, Account 2 deposits 1 USDC
                 */
                const numOfDAI = eighteenPrecision.mul(new BN(2));
                const numOfUSDC = sixPrecision;
                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                /*
                 * Step 2
                 * Account 0 borrows 10 tokens from DeFiner
                 * Then tries to withdraw all the tokens
                 * Should fail, beacuse user has to repay all the outstandings before withdrawing.
                 */
                const borrows = new BN(10);
                await savingAccount.borrow(addressUSDC, borrows, { from: user1 });
                // TODO: Should Fail
                await expectRevert(
                    savingAccount.withdrawAll(erc20DAI.address, { from: user1 }),
                    "Insufficient collateral."
                );

            });
            it("Deposit DAI, borrows USDC and wants to withdraw", async () => {
                /*
                 * Step 1
                 * Account 1 deposits 2 DAI, Account 2 deposits 1 USDC
                 */
                const numOfDAI = eighteenPrecision.mul(new BN(2));
                const numOfUSDC = sixPrecision;
                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                /*
                 * Step 2
                 * Account 0 borrows 10 tokens from DeFiner
                 * Then tries to withdraw all the tokens
                 * Should fail, beacuse user has to repay all the outstandings before withdrawing.
                 */
                const borrows = new BN(10);
                await savingAccount.borrow(addressUSDC, borrows, { from: user1 });
                await savingAccount.withdraw(erc20DAI.address, new BN(100), { from: user1 });

                const TokenLeft = new BN(await erc20DAI.balanceOf(savingAccount.address));
                const UserTokenLeft = new BN(await erc20DAI.balanceOf(user1));

                const CTokenLeft = new BN(await cTokenDAI.balanceOfUnderlying.call(savingAccount.address));
                const userTotalBalance = await savingAccount.getBorrowBalance(addressUSDC, user1 );

                expect(TokenLeft).to.be.bignumber.equal(numOfDAI.mul(new BN(15)).div(new BN(100)).sub(new BN(100)));
                expect(CTokenLeft).to.be.bignumber.equal(numOfDAI.mul(new BN(85)).div(new BN(100)));
                expect(UserTokenLeft).to.be.bignumber.equal(new BN(100));
                // Verify 2.
                expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(10));
            });
        });
        context("Withdraw partially multiple times", async () => {
            context("Should succeed", async () => {
                it("Use DAI which 18 is decimals, deposit some tokens and withdraw all of them in four times", async () => {
                    /*
                     * Step 1
                     * Assign 10^18 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times 
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfDAIs = numOfDAIs.div(new BN(4));
                    const userDAIBalanceBeforeFirstWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeSecondWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceBeforeSecondWithdraw).sub(userDAIBalanceBeforeFirstWithdraw))
                        .to.be.bignumber.equal(quaterOfDAIs);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeThirdWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceBeforeThirdWithdraw).sub(userDAIBalanceBeforeSecondWithdraw))
                        .to.be.bignumber.equal(quaterOfDAIs);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeForthWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceBeforeForthWithdraw).sub(userDAIBalanceBeforeThirdWithdraw))
                        .to.be.bignumber.equal(quaterOfDAIs);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceAfterForthWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceAfterForthWithdraw).sub(userDAIBalanceBeforeForthWithdraw))
                        .to.be.bignumber.equal(quaterOfDAIs);
                    const userTotalBalance = await savingAccount.getDepositBalance(addressDAI, user1);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                });
                it("Use USDC which 6 is decimals, deposit some tokens and withdraw all of them in four times", async () => {
                    /*
                     * Step 1
                     * Assign 10^6 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times 
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^6 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfUSDCs = numOfUSDCs.div(new BN(4));
                    const userUSDCBalanceBeforeFirstWithdraw = await erc20USDC.balanceOf(user1);

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceBeforeSecondWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.

                    expect(BN(userUSDCBalanceBeforeSecondWithdraw).sub(userUSDCBalanceBeforeFirstWithdraw))
                        .to.be.bignumber.equal(quaterOfUSDCs);
                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceBeforeThirdWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userUSDCBalanceBeforeThirdWithdraw).sub(userUSDCBalanceBeforeSecondWithdraw))
                        .to.be.bignumber.equal(quaterOfUSDCs);
                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceBeforeForthWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.

                    expect(BN(userUSDCBalanceBeforeForthWithdraw).sub(userUSDCBalanceBeforeThirdWithdraw))
                        .to.be.bignumber.equal(quaterOfUSDCs);
                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceAfterForthWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userUSDCBalanceAfterForthWithdraw).sub(userUSDCBalanceBeforeForthWithdraw))
                        .to.be.bignumber.equal(quaterOfUSDCs);
                    const userTotalBalance = await savingAccount.getDepositBalance(addressUSDC, user1);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                });
                it("Use WBTC which 8 is decimals, deposit some tokens and withdraw all of them in four times", async () => {
                    /*
                     * Step 1
                     * Assign 10^6 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfWBTCs = new BN(1).mul(eightPrecision);
                    await erc20WBTC.transfer(user1, numOfWBTCs);
                    await erc20WBTC.approve(savingAccount.address, numOfWBTCs, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTCs, { from: user1 });
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times 
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfWBTCs = numOfWBTCs.div(new BN(4));
                    const userWBTCBalanceBeforeFirstWithdraw = await erc20WBTC.balanceOf(user1);
                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceBeforeSecondWithdraw = await erc20WBTC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userWBTCBalanceBeforeSecondWithdraw).sub(userWBTCBalanceBeforeFirstWithdraw))
                        .to.be.bignumber.equal(quaterOfWBTCs);
                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceBeforeThirdWithdraw = await erc20WBTC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userWBTCBalanceBeforeThirdWithdraw).sub(userWBTCBalanceBeforeSecondWithdraw))
                        .to.be.bignumber.equal(quaterOfWBTCs);
                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceBeforeForthWithdraw = await erc20WBTC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userWBTCBalanceBeforeForthWithdraw).sub(userWBTCBalanceBeforeThirdWithdraw))
                        .to.be.bignumber.equal(quaterOfWBTCs);
                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceAfterForthWithdraw = await erc20WBTC.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userWBTCBalanceAfterForthWithdraw).sub(userWBTCBalanceBeforeForthWithdraw))
                        .to.be.bignumber.equal(quaterOfWBTCs);
                    const userTotalBalance = await savingAccount.getDepositBalance(addressWBTC, user1);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                });
            });
            context("Should fail", async () => {
                it("Use DAI, deposit 10^18 tokens, withdraw 1/4 of them the first time, then withdraw 10^18 tokens", async () => {
                    /*
                     * Step 1
                     * Assign 10^18 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    /*
                     * Step 2
                     * Withdraw 1/4 of 10^18 tokens, then withdraw 10^18 tokens
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after the first withdraw
                     * 2. The second withdraw should fail
                     */
                    const quaterOfDAIs = numOfDAIs.div(new BN(4));
                    const userDAIBalanceBeforeFirstWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeSecondWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(BN(userDAIBalanceBeforeSecondWithdraw).sub(userDAIBalanceBeforeFirstWithdraw))
                        .to.be.bignumber.equal(quaterOfDAIs);
                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, numOfDAIs, { from: user1 }),
                        "Insufficient balance."
                    );
                });
            });
        });
    });
});