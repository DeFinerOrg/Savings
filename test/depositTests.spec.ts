import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.deposit", async (accounts) => {
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
    let addressTUSD: any;
    let addressMKR: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
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
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        // Use ERC20 from OZ, import this
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20TUSD = await MockERC20.at(addressTUSD);
        erc20MKR = await MockERC20.at(addressMKR);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        // Use CERC20, import from Compound
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
    });

    context("deposit()", async () => {
        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const numOfToken = new BN(1000);
                await expectRevert(savingAccount.deposit(dummy, numOfToken), "Unsupported token");
            });

            it("when amount is zero", async () => {
                const deposits = new BN(0);

                await expectRevert(
                    savingAccount.deposit(erc20DAI.address, deposits),
                    "Amount is zero"
                );
            });
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // gets init with 5e26
                const balCTokenContractInit = await erc20DAI.balanceOf(addressCTokenForDAI);
                // gets init with 0
                const balCTokensInit = await cTokenDAI.balanceOf(savingAccount.address);

                //expect(balCTokenContractInit).to.be.bignumber.equal(new BN(10));
                //expect(balCTokensInit).to.be.bignumber.equal(new BN(10));

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );

                const balCTokenContractBefore = await erc20DAI.balanceOf(addressCTokenForDAI);

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20DAI.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                // 3.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 3.3 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                // change variable name addressCTokenForDAI --> cDAI_addr
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCTokenContract))
                ).to.be.bignumber.equal(balCTokenContract);

                //TODO
                // 3.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                // change cTokenDAI to `cDAI`
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when 1000 whole supported tokens are deposited", async () => {
                const ONE_DAI = new BN(10).pow(new BN(18));

                // 1. Approve 1000 tokens
                const numOfToken = new BN("1000").mul(ONE_DAI);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );

                const balCTokenContractBefore = await erc20DAI.balanceOf(addressCTokenForDAI);

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20DAI.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20DAI.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                // 3.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 3.3 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCTokenContract))
                ).to.be.bignumber.equal(balCTokenContract);

                //TODO
                // 3.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            // When Compound unsupported tokens are passed
            it("when TUSD address is passed", async () => {
                // 1. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20TUSD.approve(savingAccount.address, numOfToken);

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20TUSD.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
            });

            it("when 1000 whole TUSD tokens are deposited", async () => {
                const ONE_TUSD = new BN(10).pow(new BN(18));

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );

                // 1. Approve 1000 tokens
                const numOfToken = new BN("1000").mul(ONE_TUSD);
                await erc20TUSD.approve(savingAccount.address, numOfToken);

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20TUSD.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20TUSD.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
            });

            it("when MKR address is passed", async () => {
                // 1. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20MKR.approve(savingAccount.address, numOfToken);

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20MKR.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
            });

            it("when 1000 whole MKR tokens are deposited", async () => {
                const ONE_MKR = new BN(10).pow(new BN(18));

                // 1. Approve 1000 tokens
                const numOfToken = new BN("1000").mul(ONE_MKR);
                await erc20MKR.approve(savingAccount.address, numOfToken);

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20MKR.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20MKR.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
            });

            // When tokens with less than 18 decimals are passed
            it("when 1000 whole USDC tokens are deposited", async () => {
                const ONE_USDC = new BN(10).pow(new BN(6));

                // 1. Approve 1000 tokens
                const numOfToken = new BN("1000").mul(ONE_USDC);
                await erc20USDC.approve(savingAccount.address, numOfToken);

                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    erc20USDC.address
                );

                const balCTokenContractBefore = await erc20USDC.balanceOf(addressCTokenForUSDC);

                // 2. Deposit Token to SavingContract
                await savingAccount.deposit(erc20USDC.address, numOfToken);

                // 3. Validate that the tokens are deposited to SavingAccount
                // 3.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    erc20USDC.address
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                // 3.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 3.3 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20USDC.balanceOf(addressCTokenForUSDC);
                expect(
                    new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCTokenContract))
                ).to.be.bignumber.equal(balCTokenContract);

                //TODO
                // 3.4 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                //expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when ETH address is passed", async () => {
                const depositAmount = new BN(10);
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );

                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                const userBalanceDiff = new BN(ETHbalanceAfterDeposit).sub(
                    new BN(ETHbalanceBeforeDeposit)
                );
                // validate savingAccount ETH balance
                expect(userBalanceDiff).to.be.bignumber.equal(depositAmount);

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);
            });

            it("when 1000 whole ETH are deposited", async () => {
                const depositAmount = web3.utils.toWei("1000", "ether");
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);
                const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );

                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount
                });

                const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);

                const userBalanceDiff = new BN(ETHbalanceAfterDeposit).sub(
                    new BN(ETHbalanceBeforeDeposit)
                );

                // validate savingAccount ETH balance
                expect(userBalanceDiff).to.be.bignumber.equal(depositAmount);

                // Validate the total balance on DeFiner
                const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                    ETH_ADDRESS
                );
                const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit[0]).sub(
                    new BN(totalDefinerBalanceBeforeDeposit[0])
                );
                expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);
            });
        });
    });
});
