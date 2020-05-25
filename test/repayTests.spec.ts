import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8546"));
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

    context("repay()", async () => {
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
            it("when unsupported token address passed", async () => {
                // 1.1 Set up collateral.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                // 3. Start repayment.
                await expectRevert(
                    savingAccount.repay(dummy, new BN(10), { from: user2 }),
                    "Unsupported token"
                );
            });

            it("when amount is zero", async () => {
                // 1.1 Set up collateral.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                // 3. Start repayment.
                await expectRevert(
                    savingAccount.repay(addressDAI, new BN(0), { from: user2 }),
                    "Amount is zero"
                );
            });
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1.1 Set up collateral.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                // 3. Start repayment.
                await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
                // 4. Verify the repay amount.
                const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                expect(user2BalanceBefore).to.be.bignumber.equal(new BN(10));
                expect(user2BalanceAfter).to.be.bignumber.equal(new BN(0));
            });

            it("When the repayment tokenAmount is less than the loan amount.", async () => {
                // 1.1 Set up collateral.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                // 3. Start repayment.
                await savingAccount.repay(addressDAI, new BN(5), { from: user2 });
                // 4. Verify the repay amount.
                const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                expect(user2BalanceBefore).to.be.bignumber.equal(new BN(10));
                expect(user2BalanceAfter).to.be.bignumber.equal(new BN(5));
            });

            it("When the repayment tokenAmount is greater than the loan amount.", async () => {
                // 1.1 Set up collateral.
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                // 3. Start repayment.
                await savingAccount.repay(addressDAI, new BN(20), { from: user2 });
                // 4. Verify the repay amount.
                const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                expect(user2BalanceBefore).to.be.bignumber.equal(numOfToken.add(new BN(10)));
                expect(user2BalanceAfter).to.be.bignumber.equal(numOfToken);
            });

            it("When the repayment ETHAmount is less than the loan amount.", async () => {
                // 1.1 Set up collateral.
                await erc20USDC.transfer(user2, numOfToken);
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                    from: user1,
                    value: numOfToken
                });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 });
                // 3. Start repayment.
                await savingAccount.repay(ETH_ADDRESS, new BN(5), {
                    from: user2,
                    value: new BN(5)
                });
                // 4. Verify the repay amount.
                const user2ETHValue = await savingAccount.tokenBalanceOfAndInterestOf(ETH_ADDRESS, { from: user2 });
                expect(new BN(user2ETHValue[0]).add(new BN(user2ETHValue[1]))).to.be.bignumber.equal(new BN(-5));
            });

            it("When the repayment ETHAmount is greater than the loan amount.", async () => {
                // 1.1 Set up collateral.
                await erc20USDC.transfer(user2, numOfToken);
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                    from: user1,
                    value: numOfToken
                });
                await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 });
                // 3. Start repayment.
                await savingAccount.repay(ETH_ADDRESS, new BN(20), {
                    from: user2,
                    value: new BN(20)
                });
                // 4. Verify the repay amount.
                const user2ETHValue = await savingAccount.tokenBalanceOfAndInterestOf(ETH_ADDRESS, { from: user2 });
                expect(new BN(user2ETHValue[0]).add(new BN(user2ETHValue[1]))).to.be.bignumber.equal(new BN(0));
            });
        });
    });
});
