import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.withdrawToken", async (accounts) => {
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
        addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.cTokenRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.cTokenRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.cTokenRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
    });

    context("withdrawToken()", async () => {
        context("should succeed", async () => {
            it("when partial tokens are withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20DAI.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20DAI.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when 100 whole suported tokens are withdrawn", async () => {
                const ONE_DAI = new BN(10).pow(new BN(18));

                // 1. Approve 1000 tokens
                const numOfTokens = new BN("1000").mul(ONE_DAI);
                await erc20DAI.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20DAI.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN("100").mul(ONE_DAI);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20DAI.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN("100").mul(ONE_DAI));
                const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when 100 whole USDC tokens are withdrawn", async () => {
                const ONE_USDC = new BN(10).pow(new BN(6));

                // 1. Approve 1000 tokens
                const numOfTokens = new BN("1000").mul(ONE_USDC);
                await erc20USDC.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20USDC.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN("100").mul(ONE_USDC);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20USDC.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN("100").mul(ONE_USDC));
                const newbalSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20USDC.balanceOf(addressCTokenForUSDC);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            //Partial withdrawal of tokens with 6 decimals
            it("when partial USDC withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20USDC.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20USDC.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20USDC.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20USDC.balanceOf(addressCTokenForUSDC);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when partial USDT withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20USDT.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20USDT.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20USDT.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20USDT.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20USDT.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20USDT.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20USDT.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20USDT.balanceOf(addressCTokenForUSDT);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDT.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            //Partial withdrawal of tokens with 8 decimals
            it("when partial WBTC withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20WBTC.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20WBTC.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20WBTC.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20WBTC.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20WBTC.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20WBTC.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20WBTC.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20WBTC.balanceOf(addressCTokenForWBTC);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenWBTC.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when partial TUSD withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20TUSD.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20TUSD.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20TUSD.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );
            });

            it("when 1000 whole TUSD withdrawn", async () => {
                const ONE_TUSD = new BN(10).pow(new BN(18));

                // 1. Approve 1000 tokens
                const numOfTokens = new BN("10000").mul(ONE_TUSD);
                await erc20TUSD.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20TUSD.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN("1000").mul(ONE_TUSD);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20TUSD.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN("1000").mul(ONE_TUSD));
                const newbalSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );
            });

            it("when partial MKR withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20MKR.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20MKR.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20MKR.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );
            });

            it("when 1000 whole MKR withdrawn", async () => {
                const ONE_MKR = new BN(10).pow(new BN(18));

                // 1. Approve 1000 tokens
                const numOfTokens = new BN("10000").mul(ONE_MKR);
                await erc20MKR.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20MKR.address, numOfTokens);

                // Number of tokens to withdraw
                const withdrawTokens = new BN("1000").mul(ONE_MKR);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20MKR.address, withdrawTokens);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 4. Validate Withdraw

                // 4.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN("1000").mul(ONE_MKR));
                const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );
            });

            it("when full tokens withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20DAI.approve(savingAccount.address, depositAmount);

                // deposit tokens
                await savingAccount.depositToken(erc20DAI.address, depositAmount);

                //Withdrawing DAI
                await savingAccount.withdrawAllToken(erc20DAI.address);
            });

            //Full withdrawal of tokens with 6 decimals
            it("when full USDC withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20USDC.approve(savingAccount.address, depositAmount);

                // deposit tokens
                await savingAccount.depositToken(erc20USDC.address, depositAmount);

                //Withdrawing USDC
                await savingAccount.withdrawAllToken(erc20USDC.address);
            });

            it("when full USDT withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20USDT.approve(savingAccount.address, depositAmount);

                // deposit tokens
                await savingAccount.depositToken(erc20USDT.address, depositAmount);

                //Withdrawing USDT
                await savingAccount.withdrawAllToken(erc20USDT.address);
            });

            //Full withdrawal of tokens with 8 decimals
            it("when full WBTC withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20WBTC.approve(savingAccount.address, depositAmount);

                // deposit tokens
                await savingAccount.depositToken(erc20WBTC.address, depositAmount);

                //Withdrawing WBTC
                await savingAccount.withdrawAllToken(erc20WBTC.address);
            });

            it("when full TUSD withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20TUSD.approve(savingAccount.address, depositAmount);

                // deposit tokens
                await savingAccount.depositToken(erc20TUSD.address, depositAmount);

                //Withdrawing TUSD
                await savingAccount.withdrawAllToken(erc20TUSD.address);
            });

            it("when full MKR withdrawn", async () => {
                const depositAmount = new BN("1000");
                await erc20MKR.approve(savingAccount.address, depositAmount);

                // deposit tokens
                await savingAccount.depositToken(erc20MKR.address, depositAmount);

                //Withdrawing MKR
                await savingAccount.withdrawAllToken(erc20MKR.address);
            });

            it("when partial ETH withdrawn", async () => {
                const depositAmount = new BN(100);
                const withdrawAmount = new BN(20);

                //Depositting ETH Token to SavingContract
                await savingAccount.depositToken(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);

                //Withdrawing ETH
                await savingAccount.withdrawToken(ETH_ADDRESS, withdrawAmount);

                /* let ETHbalanceAfterWithdraw = await web3.eth.getBalance(savingAccount.address);
                let accountBalanceDiff = BN(ETHbalanceAfterWithdraw).sub(BN(ETHbalanceBeforeWithdraw));

                // validate savingAccount ETH balance
                expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount); */
            });

            it("when 1000 whole ETH withdrawn", async () => {
                //Depositting ETH Token to SavingContract
                await savingAccount.depositToken(ETH_ADDRESS, web3.utils.toWei("2000", "ether"), {
                    value: web3.utils.toWei("2000", "ether")
                });

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);

                //Withdrawing ETH
                await savingAccount.withdrawToken(ETH_ADDRESS, web3.utils.toWei("1000", "ether"));

                /* let ETHbalanceAfterWithdraw = await web3.eth.getBalance(savingAccount.address);
                let accountBalanceDiff = BN(ETHbalanceAfterWithdraw).sub(BN(ETHbalanceBeforeWithdraw));

                // validate savingAccount ETH balance
                expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount); */
            });

            //TODO:
            /* it("when full ETH withdrawn", async () => {
                const depositAmount = new BN("1000000000000000000");

                //Depositting ETH Token to SavingContract
                await savingAccount.depositToken(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);
                expect(ETHbalanceBeforeWithdraw).to.be.bignumber.equal(depositAmount);

                //Withdrawing ETH
                await savingAccount.withdrawAllToken(ETH_ADDRESS);
            }); */
        });

        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const withdrawTokens = new BN(20);

                //Try depositting unsupported Token to SavingContract
                await expectRevert(
                    savingAccount.withdrawToken(dummy, withdrawTokens),
                    "Unsupported token"
                );
            });

            it("when tokenAddress is zero", async () => {
                const withdrawTokens = new BN(20);

                //Try depositting unsupported Token to SavingContract
                await expectRevert(
                    savingAccount.withdrawToken(addressZero, withdrawTokens),
                    "Token address is zero"
                );
            });

            it("when amount is zero", async () => {
                const withdrawTokens = new BN(0);

                await expectRevert(
                    savingAccount.withdrawToken(erc20DAI.address, withdrawTokens),
                    "Amount is zero"
                );
            });

            it("when a user tries to withdraw who has not deposited before", async () => {
                const withdrawTokens = new BN(20);

                await expectRevert(
                    savingAccount.withdrawToken(erc20DAI.address, withdrawTokens),
                    "Account not active, please deposit first."
                );
            });

            it("when user tries to withdraw more than his balance", async () => {
                const numOfTokens = new BN(10);

                await savingAccount.depositToken(ETH_ADDRESS, numOfTokens, {
                    value: numOfTokens
                });

                const withdrawTokens = new BN(20);

                await expectRevert(
                    savingAccount.withdrawToken(ETH_ADDRESS, withdrawTokens),
                    "Insufficient balance."
                );
            });

            it("when user tries to withdraw tokens which are used as collateral by the user");
        });
    });
});
