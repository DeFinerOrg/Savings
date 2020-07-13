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
    let BLOCKS_MINED_WEEKLY: any;

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
        BLOCKS_MINED_WEEKLY = new BN(30).mul(new BN(6)).mul(new BN(24));
    });

    context("withdraw()", async () => {
        context("should succeed", async () => {
            it("when partial tokens are withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfTokens);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );

                const balCTokenContractBefore = await erc20DAI.balanceOf(addressCTokenForDAI);

                // deposit tokens
                await savingAccount.deposit(erc20DAI.address, numOfTokens);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                //Number of tokens to withdraw
                const withdraws = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
                let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdraw(erc20DAI.address, withdraws);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

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

                // 4.2 Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdraws);

                // 4.3 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                ).to.be.bignumber.equal(balCToken);

                //TODO
                // 4.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            /**
             * todo:The value of expectedTokenBalanceAfterWithdraw is incorrectly calculated.
             */
            // it("when 100 whole suported tokens are withdrawn", async () => {
            //     const ONE_DAI = new BN(10).pow(new BN(18));
            //
            //     // 1. Approve 1000 tokens
            //     const numOfTokens = new BN("1000").mul(ONE_DAI);
            //     await erc20DAI.approve(savingAccount.address, numOfTokens);
            //
            //     // deposit tokens
            //     await savingAccount.deposit(erc20DAI.address, numOfTokens);
            //
            //     //Number of tokens to withdraw
            //     const withdraws = new BN("100").mul(ONE_DAI);
            //
            //     // 2. validate if amount to be withdrawn is less than saving account balance
            //     const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
            //         savingAccount.address
            //     );
            //     expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
            //
            //     let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);
            //
            //     // 3. Withdraw Token from SavingContract
            //     await savingAccount.withdraw(erc20DAI.address, withdraws);
            //
            //     // 3.1 Validate user balance
            //     let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
            //     const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
            //         BN(userBalanceBeforeWithdraw)
            //     );
            //     expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
            //
            //     // 4. Validate Withdraw
            //
            //     // 4.1 Validate savingAccount contract balance
            //     const expectedTokenBalanceAfterWithdraw = numOfTokens
            //         .mul(new BN(15))
            //         .div(new BN(100))
            //         .sub(new BN("100").mul(ONE_DAI));
            //     const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
            //     expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
            //         newbalSavingAccount
            //     );
            //
            //     // 4.2 Amount in Compound
            //     const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
            //     const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
            //     expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);
            //
            //     // 4.3 cToken must be minted for SavingAccount
            //     const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
            //     const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
            //     expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            // });

            /**
             * todo:The value of expectedTokenBalanceAfterWithdraw is incorrectly calculated.
             */
            // it("when 100 whole USDC tokens are withdrawn", async () => {
            //     const ONE_USDC = new BN(10).pow(new BN(6));
            //
            //     // 1. Approve 1000 tokens
            //     const numOfTokens = new BN("1000").mul(ONE_USDC);
            //     await erc20USDC.approve(savingAccount.address, numOfTokens);
            //
            //     // deposit tokens
            //     await savingAccount.deposit(erc20USDC.address, numOfTokens);
            //
            //     //Number of tokens to withdraw
            //     const withdraws = new BN("100").mul(ONE_USDC);
            //
            //     // 2. validate if amount to be withdrawn is less than saving account balance
            //     const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
            //         savingAccount.address
            //     );
            //     expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
            //
            //     let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);
            //
            //     // 3. Withdraw Token from SavingContract
            //     await savingAccount.withdraw(erc20USDC.address, withdraws);
            //
            //     // 3.1 Validate user balance
            //     let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
            //     const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
            //         BN(userBalanceBeforeWithdraw)
            //     );
            //     expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
            //
            //     // 4. Validate Withdraw
            //
            //     // 4.1 Validate savingAccount contract balance
            //     const expectedTokenBalanceAfterWithdraw = numOfTokens
            //         .mul(new BN(15))
            //         .div(new BN(100))
            //         .sub(new BN("100").mul(ONE_USDC));
            //     const newbalSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
            //     expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
            //         newbalSavingAccount
            //     );
            //
            //     // 4.2 Amount in Compound
            //     const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
            //     const balCToken = await erc20USDC.balanceOf(addressCTokenForUSDC);
            //     expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);
            //
            //     // 4.3 cToken must be minted for SavingAccount
            //     const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
            //     const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
            //     expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            // });

            //Partial withdrawal of tokens with 6 decimals
            it("when partial USDC withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20USDC.approve(savingAccount.address, numOfTokens);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20USDC.address
                );

                const balCTokenContractBefore = await erc20USDC.balanceOf(addressCTokenForUSDC);

                // deposit tokens
                await savingAccount.deposit(erc20USDC.address, numOfTokens);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20USDC.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                //Number of tokens to withdraw
                const withdraws = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
                let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdraw(erc20USDC.address, withdraws);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

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

                // 4.2 Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20USDC.address
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdraws);

                // 4.3 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20USDC.balanceOf(addressCTokenForUSDC);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                ).to.be.bignumber.equal(balCToken);

                //TODO
                // 4.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when partial USDT withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20USDT.approve(savingAccount.address, numOfTokens);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20USDT.address
                );

                const balCTokenContractBefore = await erc20USDT.balanceOf(addressCTokenForUSDT);

                // deposit tokens
                await savingAccount.deposit(erc20USDT.address, numOfTokens);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20USDT.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                //Number of tokens to withdraw
                const withdraws = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20USDT.balanceOf(
                    savingAccount.address
                );
                expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20USDT.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdraw(erc20USDT.address, withdraws);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20USDT.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

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

                // 4.2 Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20USDT.address
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdraws);

                // 4.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20USDT.balanceOf(addressCTokenForUSDT);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                ).to.be.bignumber.equal(balCToken);

                //TODO
                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDT.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            //Partial withdrawal of tokens with 8 decimals
            it("when partial WBTC withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20WBTC.approve(savingAccount.address, numOfTokens);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20WBTC.address
                );

                const balCTokenContractBefore = await erc20WBTC.balanceOf(addressCTokenForWBTC);

                // deposit tokens
                await savingAccount.deposit(erc20WBTC.address, numOfTokens);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20WBTC.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                //Number of tokens to withdraw
                const withdraws = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20WBTC.balanceOf(
                    savingAccount.address
                );
                expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20WBTC.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdraw(erc20WBTC.address, withdraws);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20WBTC.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

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

                // 4.2 Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20WBTC.address
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdraws);

                // 4.3 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20WBTC.balanceOf(addressCTokenForWBTC);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                ).to.be.bignumber.equal(balCToken);

                //TODO
                // 4.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenWBTC.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when partial TUSD withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20TUSD.approve(savingAccount.address, numOfTokens);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20TUSD.address, numOfTokens);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                //Number of tokens to withdraw
                const withdraws = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                    savingAccount.address
                );
                expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdraw(erc20TUSD.address, withdraws);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

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

                // 4.2 Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdraws);
            });

            /**
             * todo:The value of expectedTokenBalanceAfterWithdraw is incorrectly calculated.
             */
            // it("when 1000 whole TUSD withdrawn", async () => {
            //     const ONE_TUSD = new BN(10).pow(new BN(18));
            //
            //     // 1. Approve 1000 tokens
            //     const numOfTokens = new BN("10000").mul(ONE_TUSD);
            //     await erc20TUSD.approve(savingAccount.address, numOfTokens);
            //
            //     // deposit tokens
            //     await savingAccount.deposit(erc20TUSD.address, numOfTokens);
            //
            //     //Number of tokens to withdraw
            //     const withdraws = new BN("1000").mul(ONE_TUSD);
            //
            //     // 2. validate if amount to be withdrawn is less than saving account balance
            //     const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
            //         savingAccount.address
            //     );
            //     expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
            //
            //     let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);
            //
            //     // 3. Withdraw Token from SavingContract
            //     await savingAccount.withdraw(erc20TUSD.address, withdraws);
            //
            //     // 3.1 Validate user balance
            //     let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
            //     const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
            //         BN(userBalanceBeforeWithdraw)
            //     );
            //     expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
            //
            //     // 4. Validate Withdraw
            //
            //     // 4.1 Validate savingAccount contract balance
            //     const expectedTokenBalanceAfterWithdraw = numOfTokens
            //         .mul(new BN(15))
            //         .div(new BN(100))
            //         .sub(new BN("1000").mul(ONE_TUSD));
            //     const newbalSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
            //     expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
            //         newbalSavingAccount
            //     );
            // });

            it("when partial MKR withdrawn", async () => {
                // 1. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20MKR.approve(savingAccount.address, numOfTokens);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20MKR.address, numOfTokens);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                //Number of tokens to withdraw
                const withdraws = new BN(20);

                // 2. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                    savingAccount.address
                );
                expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                // 3. Withdraw Token from SavingContract
                await savingAccount.withdraw(erc20MKR.address, withdraws);

                // 3.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

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

                // 4.2 Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20MKR.address
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdraws);
            });

            /**
             * todo:The value of expectedTokenBalanceAfterWithdraw is incorrectly calculated.
             */
            // it("when 1000 whole MKR withdrawn", async () => {
            //     const ONE_MKR = new BN(10).pow(new BN(18));
            //
            //     // 1. Approve 1000 tokens
            //     const numOfTokens = new BN("10000").mul(ONE_MKR);
            //     await erc20MKR.approve(savingAccount.address, numOfTokens);
            //
            //     // deposit tokens
            //     await savingAccount.deposit(erc20MKR.address, numOfTokens);
            //
            //     // Number of tokens to withdraw
            //     const withdraws = new BN("1000").mul(ONE_MKR);
            //
            //     // 2. validate if amount to be withdrawn is less than saving account balance
            //     const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
            //         savingAccount.address
            //     );
            //     expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
            //
            //     let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);
            //
            //     // 3. Withdraw Token from SavingContract
            //     await savingAccount.withdraw(erc20MKR.address, withdraws);
            //
            //     // 3.1 Validate user balance
            //     let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
            //     const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
            //         BN(userBalanceBeforeWithdraw)
            //     );
            //     expect(withdraws).to.be.bignumber.equal(userBalanceDiff);
            //
            //     // 4. Validate Withdraw
            //
            //     // 4.1 Validate savingAccount contract balance
            //     const expectedTokenBalanceAfterWithdraw = numOfTokens
            //         .mul(new BN(15))
            //         .div(new BN(100))
            //         .sub(new BN("1000").mul(ONE_MKR));
            //     const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
            //     expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
            //         newbalSavingAccount
            //     );
            // });

            it("when full tokens withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20DAI.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20DAI.address, depositAmount);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                //Withdrawing DAI
                await savingAccount.withdrawAll(erc20DAI.address);
                let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(owner);
                let accountBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(
                    savingAccount.address
                );

                // Verify user balance
                expect(userBalanceBeforeWithdrawDAI).to.be.bignumber.equal(
                    userBalanceAfterWithdrawDAI
                );
                // Verify contract balance
                expect(accountBalanceAfterWithdrawDAI).to.be.bignumber.equal(ZERO);

                // Verify DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);

                // Verify Compound balance
                const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(ZERO).to.be.bignumber.equal(balCToken);

                // Verify CToken balance
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(ZERO).to.be.bignumber.equal(balCTokens);
            });

            //Full withdrawal of tokens with 6 decimals
            it("when full USDC withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20USDC.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdrawUSDC = await erc20USDC.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20USDC.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20USDC.address, depositAmount);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20USDC.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                //Withdrawing USDC
                await savingAccount.withdrawAll(erc20USDC.address);
                let userBalanceAfterWithdrawUSDC = await erc20USDC.balanceOf(owner);
                let accountBalanceAfterWithdrawUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                expect(userBalanceBeforeWithdrawUSDC).to.be.bignumber.equal(
                    userBalanceAfterWithdrawUSDC
                );
                expect(accountBalanceAfterWithdrawUSDC).to.be.bignumber.equal(ZERO);

                // Verify DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20USDC.address
                );
                expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);

                // Verify Compound balance
                const balCToken = await erc20USDC.balanceOf(addressCTokenForUSDC);
                expect(ZERO).to.be.bignumber.equal(balCToken);

                // Verify CToken balance
                const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                expect(ZERO).to.be.bignumber.equal(balCTokens);
            });

            it("when full USDT withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20USDT.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdrawUSDT = await erc20USDT.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20USDT.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20USDT.address, depositAmount);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20USDT.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                //Withdrawing USDT
                await savingAccount.withdrawAll(erc20USDT.address);
                let userBalanceAfterWithdrawUSDT = await erc20USDT.balanceOf(owner);
                let accountBalanceAfterWithdrawUSDT = await erc20USDT.balanceOf(
                    savingAccount.address
                );
                expect(userBalanceBeforeWithdrawUSDT).to.be.bignumber.equal(
                    userBalanceAfterWithdrawUSDT
                );
                expect(accountBalanceAfterWithdrawUSDT).to.be.bignumber.equal(ZERO);

                // Verify DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20USDT.address
                );
                expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);

                // Verify Compound balance
                const balCToken = await erc20USDT.balanceOf(addressCTokenForUSDT);
                expect(ZERO).to.be.bignumber.equal(balCToken);

                // Verify CToken balance
                const balCTokens = await cTokenUSDT.balanceOf(savingAccount.address);
                expect(ZERO).to.be.bignumber.equal(balCTokens);
            });

            //Full withdrawal of tokens with 8 decimals
            it("when full WBTC withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20WBTC.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdrawWBTC = await erc20WBTC.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20WBTC.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20WBTC.address, depositAmount);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20WBTC.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                //Withdrawing WBTC
                await savingAccount.withdrawAll(erc20WBTC.address);
                let userBalanceAfterWithdrawWBTC = await erc20WBTC.balanceOf(owner);
                let accountBalanceAfterWithdrawWBTC = await erc20WBTC.balanceOf(
                    savingAccount.address
                );
                expect(userBalanceBeforeWithdrawWBTC).to.be.bignumber.equal(
                    userBalanceAfterWithdrawWBTC
                );
                expect(accountBalanceAfterWithdrawWBTC).to.be.bignumber.equal(ZERO);

                // Verify DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20WBTC.address
                );
                expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);

                // Verify Compound balance
                const balCToken = await erc20WBTC.balanceOf(addressCTokenForWBTC);
                expect(ZERO).to.be.bignumber.equal(balCToken);

                // Verify CToken balance
                const balCTokens = await cTokenWBTC.balanceOf(savingAccount.address);
                expect(ZERO).to.be.bignumber.equal(balCTokens);
            });

            it("when full TUSD withdrawn", async () => {
                const depositAmount = new BN(1000);
                await erc20TUSD.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdrawTUSD = await erc20TUSD.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20TUSD.address, depositAmount);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                //Withdrawing TUSD
                await savingAccount.withdrawAll(erc20TUSD.address);
                let userBalanceAfterWithdrawTUSD = await erc20TUSD.balanceOf(owner);
                let accountBalanceAfterWithdrawTUSD = await erc20TUSD.balanceOf(
                    savingAccount.address
                );
                expect(userBalanceBeforeWithdrawTUSD).to.be.bignumber.equal(
                    userBalanceAfterWithdrawTUSD
                );
                expect(accountBalanceAfterWithdrawTUSD).to.be.bignumber.equal(ZERO);

                // Verify DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );
                expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);
            });

            it("when full MKR withdrawn", async () => {
                const depositAmount = new BN("1000");
                await erc20MKR.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdrawMKR = await erc20MKR.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20MKR.address, depositAmount);

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                //Withdrawing MKR
                await savingAccount.withdrawAll(erc20MKR.address);
                let userBalanceAfterWithdrawMKR = await erc20MKR.balanceOf(owner);
                let accountBalanceAfterWithdrawMKR = await erc20MKR.balanceOf(
                    savingAccount.address
                );
                expect(userBalanceBeforeWithdrawMKR).to.be.bignumber.equal(
                    userBalanceAfterWithdrawMKR
                );
                expect(accountBalanceAfterWithdrawMKR).to.be.bignumber.equal(ZERO);

                // Verify DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    erc20MKR.address
                );
                expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);
            });

            it("when partial ETH withdrawn", async () => {
                const depositAmount = new BN(100);
                const withdrawAmount = new BN(20);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );

                //Depositting ETH Token to SavingContract
                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);
                //Withdrawing ETH
                await savingAccount.withdraw(ETH_ADDRESS, withdrawAmount);

                let ETHbalanceAfterWithdraw = await web3.eth.getBalance(savingAccount.address);
                let accountBalanceDiff = new BN(ETHbalanceBeforeWithdraw).sub(
                    new BN(ETHbalanceAfterWithdraw)
                );
                // Validate savingAccount ETH balance
                expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount);

                // Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdrawAmount);
            });

            it("when 1000 whole ETH withdrawn", async () => {
                const depositAmount = web3.utils.toWei("2000", "ether");
                const withdrawAmount = web3.utils.toWei("1000", "ether");
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );

                //Depositting ETH Token to SavingContract
                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);

                //Withdrawing ETH
                await savingAccount.withdraw(ETH_ADDRESS, withdrawAmount);

                let ETHbalanceAfterWithdraw = await web3.eth.getBalance(savingAccount.address);
                let accountBalanceDiff = new BN(ETHbalanceBeforeWithdraw).sub(
                    new BN(ETHbalanceAfterWithdraw)
                );
                // validate savingAccount ETH balance
                expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount);

                // Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalancDifference = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalancAfterWithdraw[0])
                );
                expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(withdrawAmount);
            });

            it("when full ETH withdrawn", async () => {
                const depositAmount = web3.utils.toWei("100", "ether");
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );

                // Depositting ETH Token to SavingContract
                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);
                expect(ETHbalanceBeforeWithdraw).to.be.bignumber.equal(depositAmount);

                // Withdrawing ETH
                await savingAccount.withdrawAll(ETH_ADDRESS);

                // Validate savingAccount ETH balance
                let ETHbalanceAfterWithdraw = await web3.eth.getBalance(savingAccount.address);
                expect(ETHbalanceAfterWithdraw).to.be.bignumber.equal(ZERO);

                // Validate DeFiner balance
                const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                expect(new BN(totalDefinerBalancAfterWithdraw[0])).to.be.bignumber.equal(ZERO);
            });

            it("when tokens are withdrawn with interest", async () => {
                const depositAmount = new BN(1000);
                await erc20DAI.approve(savingAccount.address, depositAmount);
                let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );

                // deposit tokens
                await savingAccount.deposit(erc20DAI.address, depositAmount, { from: owner });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                // Advancing blocks by 150
                let latestBlock = await web3.eth.getBlock("latest");
                let targetBlock = new BN(latestBlock.number).add(new BN(150));
                await time.advanceBlockTo(targetBlock);

                //Withdrawing DAI
                await savingAccount.withdrawAll(erc20DAI.address, { from: owner });

                // TODO: Need to write DeFiner balance once the interest function is implemented
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                let accountBalanceAfterWithdraw = await erc20DAI.balanceOf(savingAccount.address);
                expect(userBalanceBeforeWithdraw).to.be.bignumber.equal(userBalanceAfterWithdraw);
                expect(accountBalanceAfterWithdraw).to.be.bignumber.equal(ZERO);
            });
        });

        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const withdraws = new BN(20);

                //Try depositting unsupported Token to SavingContract
                await expectRevert(savingAccount.withdraw(dummy, withdraws), "Unsupported token");
            });

            it("when amount is zero", async () => {
                const withdraws = ZERO;

                await expectRevert(
                    savingAccount.withdraw(erc20DAI.address, withdraws),
                    "Amount is zero"
                );
            });

            it("when a user tries to withdraw who has not deposited before", async () => {
                const withdraws = new BN(20);

                await expectRevert(
                    savingAccount.withdraw(erc20DAI.address, withdraws),
                    "Insufficient balance."
                );
            });

            it("when user tries to withdraw more than his balance", async () => {
                const numOfTokens = new BN(10);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );

                await savingAccount.deposit(ETH_ADDRESS, numOfTokens, {
                    value: numOfTokens
                });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                const withdraws = new BN(20);
                await expectRevert(
                    savingAccount.withdraw(ETH_ADDRESS, withdraws),
                    "Insufficient balance."
                );
            });
            it("when user tries to withdraw tokens which are used as collateral by the user");
        });
    });
});
