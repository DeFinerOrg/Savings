import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.depositToken", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;

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
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.cTokenRegistry.getCToken(addressUSDC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
    });

    context("depositToken()", async () => {
        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const numOfToken = new BN(1000);
                await expectRevert(
                    savingAccount.depositToken(dummy, numOfToken),
                    "Unsupported token"
                );
            });

            it("when amount is zero", async () => {
                const depositTokens = new BN(0);

                await expectRevert(
                    savingAccount.depositToken(erc20DAI.address, depositTokens),
                    "Amount is zero"
                );
            });
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // 2. Deposit Token to SavingContract
                await savingAccount.depositToken(erc20DAI.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // 3.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 3.3 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(balCTokenContract);

                // 3.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when 1000 whole supported tokens are deposited", async () => {
                // 1. Approve 1000 tokens
                const numOfToken = new BN("1000000000000000000000");
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // 2. Deposit Token to SavingContract
                await savingAccount.depositToken(erc20DAI.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // 3.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 3.3 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(balCTokenContract);

                // 3.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when 1000 whole USDC tokens are deposited", async () => {
                // 1. Approve 1000 tokens
                const numOfToken = new BN("1000000000");
                await erc20USDC.approve(savingAccount.address, numOfToken);

                // 2. Deposit Token to SavingContract
                await savingAccount.depositToken(erc20USDC.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // 3.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 3.3 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20USDC.balanceOf(addressCTokenForUSDC);
                expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(balCTokenContract);

                // 3.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when ETH address is passed", async () => {
                const depositAmount = new BN(10);
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);

                await savingAccount.depositToken(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);

                //const userBalanceDiff = BN(ETHbalanceAfterDeposit).sub(BN(ETHbalanceBeforeDeposit));

                // validate savingAccount ETH balance
                expect(ETHbalanceAfterDeposit).to.be.bignumber.equal(depositAmount);
            });

            it("when 1000 whole ETH are deposited", async () => {
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);

                await savingAccount.depositToken(ETH_ADDRESS, web3.utils.toWei("1000", "ether"), {
                    value: web3.utils.toWei("1000", "ether")
                });

                const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);

                //const userBalanceDiff = BN(ETHbalanceAfterDeposit).sub(BN(ETHbalanceBeforeDeposit));

                // validate savingAccount ETH balance
                expect(ETHbalanceAfterDeposit).to.be.bignumber.equal(
                    web3.utils.toWei("1000", "ether")
                );
            });
        });
    });
});
