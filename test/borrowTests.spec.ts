import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");

contract("SavingAccount", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
    });

    context("borrow()", async () => {
        let tokens: any;
        let addressDAI: any;
        let addressUSDC: any;
        let erc20DAI: t.MockERC20Instance;
        let erc20USDC: t.MockERC20Instance;
        let numOfToken: any;
        beforeEach(async () => {
            // 1. initialization.
            tokens = await testEngine.erc20Tokens;
            addressDAI = tokens[0];
            addressUSDC = tokens[1];
            erc20DAI = await MockERC20.at(addressDAI);
            erc20USDC = await MockERC20.at(addressUSDC);
            numOfToken = new BN(1000);
        });
        context("should fail", async () => {
            it("Deposit DAI then borrow DAI", async () => {
                // 1.1 Transfer DAI to user1 & user2.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20DAI.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressDAI, new BN(10), { from: user2 }),
                    "Deposit is greater than or equal to zero, please use withdraw instead."
                );
            });

            it("Deposit DAI & USDC then borrow DAI", async () => {
                // 1.1 Transfer DAI to user1 & user2.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20DAI.transfer(user2, numOfToken);
                // 1.2 Transfer USDC to user2.
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressDAI, new BN(10), { from: user2 }),
                    "Deposit is greater than or equal to zero, please use withdraw instead."
                );
            });

            it("Deposit DAI & USDC then borrow USDC", async () => {
                // 1.1 Transfer DAI to user2.
                await erc20DAI.transfer(user2, numOfToken);
                // 1.2 Transfer USDC to user1 & user2.
                await erc20USDC.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressUSDC, new BN(10), { from: user2 }),
                    "Deposit is greater than or equal to zero, please use withdraw instead."
                );
            });

            it("when unsupported token address is passed", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(dummy, new BN(10), { from: user2 }),
                    "Unsupported token"
                );
            });

            it("when amount is zero", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressDAI, new BN(0), { from: user2 }),
                    "Amount is zero"
                );
            });

            it("when user tries to borrow token, but he has not deposited any token before", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressDAI, new BN(10), { from: user2 }),
                    "Insufficient collateral."
                );
            });

            it("when user tries to borrow ETH, but he has not deposited any token before", async () => {
                await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                    from: user1,
                    value: numOfToken
                });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 }),
                    "revert"
                );
            });

            it("when user tries to borrow more than initial LTV (ILTV)", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                const balance = numOfToken
                    .mul(await savingAccount.getCoinToUsdRate(2))
                    .mul(new BN(85))
                    .div(new BN(100))
                    .div(await savingAccount.getCoinToUsdRate(1));
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressDAI, balance, { from: user2 }),
                    "Insufficient collateral."
                );
            });

            it("when there is no liquidity for the asked token", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await expectRevert(
                    savingAccount.borrow(addressDAI, new BN(1001), { from: user2 }),
                    "SafeERC20: low-level call failed -- Reason given: SafeERC20: low-level call failed."
                );
            });
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                // 3. Verify the loan amount.
                const user2Balance = await erc20DAI.balanceOf(user2);
                expect(user2Balance).to.be.bignumber.equal(new BN(10));
            });

            //     it("when borrow amount of token less then ILTV of his collateral value");

            it("when borrow amount of token is equal to ILTV of his collateral value", async () => {
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                const limitAmount = numOfToken.mul(new BN(60)).div(new BN(100));
                await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                // 3. Verify the loan amount.
                const user2Balance = await erc20DAI.balanceOf(user2);
                expect(user2Balance).to.be.bignumber.equal(limitAmount);
            });

            it("when borrow amount of ETH less then ILTV of his collateral value", async () => {
                await erc20DAI.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                    from: user1,
                    value: numOfToken
                });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user2 });
                // 2. Start borrowing.
                const user2ETHBalanceBefore = await web3.eth.getBalance(user2);
                await savingAccount.borrow(ETH_ADDRESS, new BN(1), { from: user2 });
                // 3. Verify the loan amount.
                const user2ETHBalanceAfter = await web3.eth.getBalance(user2);
                expect(user2ETHBalanceAfter).to.be.bignumber.equal(
                    user2ETHBalanceBefore.add(new BN(1))
                );
            });

            it("when borrow amount of ETH is equal to ILTV of his collateral value", async () => {
                await erc20DAI.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                    from: user1,
                    value: numOfToken
                });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user2 });
                // 2. Start borrowing.
                const user2ETHBalanceBefore = await web3.eth.getBalance(user2);
                const limitAmount = numOfToken
                    .mul(await savingAccount.getCoinToUsdRate(1))
                    .mul(new BN(60))
                    .div(new BN(100))
                    .div(await savingAccount.getCoinToUsdRate(0));
                await savingAccount.borrow(ETH_ADDRESS, limitAmount, { from: user2 });
                // 3. Verify the loan amount.
                const user2ETHBalanceAfter = await web3.eth.getBalance(user2);
                expect(user2ETHBalanceAfter).to.be.bignumber.equal(
                    user2ETHBalanceBefore.add(limitAmount)
                );
            });
        });
    });
});
