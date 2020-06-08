import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");

contract("SavingAccount.liquidate", async (accounts) => {
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

    context("liquidate()", async () => {
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

            it("when the ratio of borrowed money and collateral is less than 95%", async () => {
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                //const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(1000);

                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                // 3. Verify the loan amount.
                const user2Balance = await erc20DAI.balanceOf(user2);

                await expectRevert(
                    savingAccount.liquidate(user2, addressDAI),
                    "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                );
            });

            it("when collateral is not sufficient to be liquidated");
        });

        context("should succeed", async () => {
            /* it("When user tries to liquidate partially", async () => {
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                //const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(100000000);

                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(90000000), { from: user2 });
                // 3. Verify the loan amount
                const user2Balance = await erc20DAI.balanceOf(user2);

                await savingAccount.liquidate(user2, addressDAI);
            });

            //it("When user tries to liquidate partially");

            it("When user tries to liquidate fully", async () => {
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                //const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);

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
            }); */
        });
    });
});
