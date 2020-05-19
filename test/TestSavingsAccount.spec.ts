import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const TokenRegistry: t.TokenRegistryContract = artifacts.require("TokenRegistry");
const CTokenRegistry: t.CTokenRegistryContract = artifacts.require("CTokenRegistry");
const ChainLinkOracle: t.ChainLinkOracleContract = artifacts.require("ChainLinkOracle");

contract("SavingAccount", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
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

    context("constructor", async () => {
        context("should fail", async () => {
            it("when ...<describe the context>");
        });

        context("should succeed", async () => {
            it("deployed and state variables initialized", async () => {
                expect(await savingAccount.EMERGENCY_ADDR()).to.equal(EMERGENCY_ADDRESS);
                expect(await savingAccount.ETH_ADDR()).equal(ETH_ADDRESS);
            });

            it("when all parameters are valid");
        });
    });

    context("depositToken()", async () => {
        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const numOfToken = new BN(1000);

                //Try depositting unsupported Token to SavingContract
                await expectRevert(
                    savingAccount.depositToken(dummy, numOfToken),
                    "Unsupported token"
                );
            });

            it("when amount is zero", async () => {
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const depositTokens = new BN(0);

                //Try depositting unsupported Token to SavingContract
                await expectRevert(
                    savingAccount.depositToken(erc20DAI.address, depositTokens),
                    "Amount is zero"
                );
            });
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Get DAI contact instance
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const cTokenDAI: t.MockCTokenInstance = await MockCToken.at(addressCTokenForDAI);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // 3. Deposit Token to SavingContract
                await savingAccount.depositToken(erc20DAI.address, numOfToken);

                // 4. Validate that the tokens are deposited to SavingAccount
                // 4.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // 4.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 4.2 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(balCTokenContract);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
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
        });
    });

    context("borrow()", async () => {
        context("should fail", async () => {
            it("Deposit DAI then borrow DAI", async () => {
                // 1. Set up collateral.
                const tokens = await testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const numOfToken = new BN(1000);
                // 1.1 Transfer DAI to user2.
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
                // 1. Set up collateral.
                const tokens = await testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                const numOfToken = new BN(1000);
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
                // 1. Set up collateral.
                const tokens = await testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                const numOfToken = new BN(1000);
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
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const addressUSDC = tokens[1];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                 const numOfToken = new BN(1000);
                 await erc20DAI.transfer(user1, numOfToken);
                 await erc20USDC.transfer(user2, numOfToken);
                 await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                 await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                 await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                 await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                 // 2. Start borrowing.
                 await expectRevert(
                     savingAccount.borrow(
                         dummy,
                         new BN(10),
                         { from: user2 }
                     ),
					 "Unsupported token"
                 );
             });

             it("when amount is zero", async () => {
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const addressUSDC = tokens[1];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                 const numOfToken = new BN(1000);
                 await erc20DAI.transfer(user1, numOfToken);
                 await erc20USDC.transfer(user2, numOfToken);
                 await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                 await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                 await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                 await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                 // 2. Start borrowing.
                 await expectRevert(savingAccount.borrow(addressDAI, new BN(0), { from: user2 }),
                     "Amount is zero"
                 );
             });

             it("when user tries to borrow token, but he has not deposited any token before", async () => {
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const numOfToken = new BN(1000);
                 await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                 await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                 // 2. Start borrowing.
                 await expectRevert(savingAccount.borrow(addressDAI, new BN(10), { from: user2 }),
                     "SafeERC20: low-level call failed -- Reason given: SafeERC20: low-level call failed."
                 );
             });

             it("when user tries to borrow ETH, but he has not deposited any token before", async () => {
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const numOfToken = new BN(1000);
                 await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                     from: user1,
                     value: numOfToken
                 });
                 // 2. Start borrowing.
                 await expectRevert(savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 }),
                     "revert"
                 );
             });

             it("when user tries to borrow more than initial LTV (ILTV)", async () => {
                 // 1. Set up collateral.
                const tokens = await testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                const numOfTokenDAI = new BN(1000000000000000000);
				const numOfTokenUSDC = new BN(1000000);
                await erc20DAI.transfer(user1, numOfTokenDAI);
                await erc20USDC.transfer(user2, numOfTokenUSDC);
                await erc20DAI.approve(savingAccount.address, numOfTokenDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfTokenUSDC, { from: user2 });
                await savingAccount.depositToken(addressDAI, numOfTokenDAI, { from: user1 });
                await savingAccount.depositToken(addressUSDC, numOfTokenUSDC, { from: user2 });
                console.log(await savingAccount.getCoinToUsdRate(1));
                console.log(await savingAccount.getCoinToUsdRate(2));
                const balance = new BN(1).mul(await savingAccount.getCoinToUsdRate(2)).mul(new BN(85)).div(new BN(100)).div(await savingAccount.getCoinToUsdRate(1))
                console.log(balance);
                // 2. Start borrowing.
				await expectRevert(
                    savingAccount.borrow(
                        addressDAI,
                        balance,
                        { from: user2 }
                    ),
                    "When the loan exceeds BORROW_LTV"
                );
             });

             it("when there is no liquidity for the asked token", async() => {
				  // 1. Set up collateral.
                const tokens = await testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
				const numOfToken = new BN(1000);
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
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const addressUSDC = tokens[1];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                 const numOfToken = new BN(1000);
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
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const addressUSDC = tokens[1];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                 const numOfToken = new BN(1000);
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
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const addressUSDC = tokens[1];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const erc20USDC: t.MockERC20Instance = await MockERC20.at(addressUSDC);
                 const numOfToken = new BN(1000);
                 await erc20DAI.transfer(user1, numOfToken);
                 await erc20USDC.transfer(user2, numOfToken);
                 await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                 await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                     from: user1,
                     value: numOfToken
                 });
                 await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
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
                 // 1. Set up collateral.
                 const tokens = await testEngine.erc20Tokens;
                 const addressDAI = tokens[0];
                 const addressUSDC = tokens[1];
                 const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                 const numOfToken = new BN(1000000000000000000);
                 await erc20DAI.transfer(user2, numOfToken);
                 await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                 await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                     from: user1,
                     value: numOfToken
                 });
                 await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                 // 2. Start borrowing.
				 const user2ETHBalanceBefore = await web3.eth.getBalance(user2);
				 console.log(await savingAccount.getCoinToUsdRate(0));
				 console.log(await savingAccount.getCoinToUsdRate(1));
                 const limitAmount = new BN(1).mul(await savingAccount.getCoinToUsdRate(1)).mul(new BN(60)).div(100).div(await savingAccount.getCoinToUsdRate(1));
                 await savingAccount.borrow(ETH_ADDRESS, limitAmount, { from: user2 });
                 // 3. Verify the loan amount.
                 const user2ETHBalanceAfter = await web3.eth.getBalance(user2);
                 expect(user2ETHBalanceAfter).to.be.bignumber.equal(user2ETHBalanceBefore.add(limitAmount));
             });
         });
    });

    context("repay()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("withdrawToken()", async () => {
        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Get DAI contract instance
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const cTokenDAI: t.MockCTokenInstance = await MockCToken.at(addressCTokenForDAI);

                // 2. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20DAI.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 3. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                // 4. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20DAI.address, withdrawTokens);

                // 4.1 Validate user balance
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 5. Validate Withdraw

                // 5.1 Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // 5.2 Amount in Compound
                const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken);

                // 5.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });

            it("when partial withdrawn");

            it("when full withdrawn");

            it("when withdrawing ETH", async () => {
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
                const userBalanceDiff = BN(ETHbalanceBeforeWithdraw).sub(
                    BN(ETHbalanceAfterWithdraw)
                );

                // validate savingAccount ETH balance
                expect(userBalanceDiff).to.be.bignumber.equal(withdrawAmount); */
            });

            it("when partial ETH withdrawn");

            it("when full ETH withdrawn");
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
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const withdrawTokens = new BN(0);

                //Try depositting unsupported Token to SavingContract
                await expectRevert(
                    savingAccount.withdrawToken(erc20DAI.address, withdrawTokens),
                    "Amount is zero"
                );
            });

            it("when a user tries to withdraw who has not deposited before");

            it("when user tries to withdraw more then his balance");

            it("when user tries to withdraw tokens which are used as collateral by the user");
        });
    });

    context("liquidate()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("toCompound()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("fromCompound()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });
});
