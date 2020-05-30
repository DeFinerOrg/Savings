import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");

contract("SavingAccount.borrow", async (accounts) => {
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
    let addressMKR: any;
    let addressTUSD: any;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let numOfToken: any;

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
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20MKR = await MockERC20.at(addressMKR);
        erc20TUSD = await MockERC20.at(addressTUSD);
        numOfToken = new BN(1000);
    });

    context("borrow()", async () => {
        context("with Token", async () => {

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
                        "Account not active, please deposit first."
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

                // it("when borrow amount of token less then ILTV of his collateral value");

                it("when borrow amount of token is equal to ILTV of his collateral value", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await savingAccount.getCoinToUsdRate(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToUsdRate(0));
                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                    // 3. Verify the loan amount.
                    const user2Balance = await erc20DAI.balanceOf(user2);
                    expect(user2Balance).to.be.bignumber.equal(limitAmount);
                });
            });

        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("Deposit ETH then borrow ETH", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken
                    });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 }),
                        "Insufficient collateral."
                    );
                });

                it("Deposit ETH & USDC then borrow ETH", async () => {
                    // 1.2 Transfer USDC to user2.
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken
                    });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 }),
                        "Deposit is greater than or equal to zero, please use withdraw instead."
                    );
                });

                it("Deposit DAI & ETH then borrow ETH", async () => {
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken
                    });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user2 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 }),
                        "Insufficient collateral."
                    );
                });

                it("when unsupported token address is passed", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(dummy, new BN(10), { from: user2 }),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(0), { from: user1 }),
                        "Amount is zero"
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
                        "Insufficient collateral."
                    );
                });

                /*
                todo: The amount is too small to recognize LTV.
                 */
                // it("when user tries to borrow more than initial LTV (ILTV)", async () => {
                //     await erc20DAI.transfer(user1, numOfToken);
                //     await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                //     await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                //     await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                //         from: user2,
                //         value: numOfToken
                //     });
                //     const balance = numOfToken
                //         .mul(await savingAccount.getCoinToUsdRate(1))
                //         .mul(new BN(85))
                //         .div(new BN(100))
                //         .div(await savingAccount.getCoinToUsdRate(0));
                //     // 2. Start borrowing.
                //     await expectRevert(
                //         savingAccount.borrow(ETH_ADDRESS, balance, { from: user1 }),
                //         "Insufficient collateral."
                //     );
                // });

                it("when there is no liquidity for the asked token", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(1001), { from: user1 }),
                        "Insufficient collateral."
                    );
                });
            });

            context("should succeed", async () => {
                beforeEach(async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                });

                /*
                todo: There are still problems with the price acquisition of ETH.
                 */
                // it("when supported token address is passed", async () => {
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                //     // 3. Verify the loan amount.
                //     const user1ETHValue = await savingAccount.tokenBalanceOfAndInterestOf(ETH_ADDRESS, {
                //         from: user1
                //     });
                //     expect(
                //         new BN(user1ETHValue[0]).add(new BN(user1ETHValue[1]))
                //     ).to.be.bignumber.equal(new BN(-10));
                // });

                it("when borrow amount of ETH less then ILTV of his collateral value", async () => {
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1ETHBorrowValue = await savingAccount.tokenBalanceOfAndInterestOf(ETH_ADDRESS, {
                        from: user1
                    })
                    expect(
                        new BN(user1ETHBorrowValue[0]).add(new BN(user1ETHBorrowValue[1]))
                    ).to.be.bignumber.equal(new BN(-1));
                });

                /*
                todo: There are still problems with the price acquisition of ETH.
                 */

                // it("when borrow amount of ETH is equal to ILTV of his collateral value", async () => {
                //     // 2. Start borrowing.
                //     const limitAmount = numOfToken
                //         .mul(await savingAccount.getCoinToUsdRate(1))
                //         .mul(new BN(60))
                //         .div(new BN(100))
                //         .div(await savingAccount.getCoinToUsdRate(0));
                //     await savingAccount.borrow(ETH_ADDRESS, limitAmount, { from: user1 });
                //     // 3. Verify the loan amount.
                //     const user2ETHBorrowValue = await savingAccount.tokenBalanceOfAndInterestOf(ETH_ADDRESS, { from: user1})
                //     expect(new BN(user2ETHBorrowValue[0]).add(new BN(user2ETHBorrowValue[1]))).to.be.bignumber.equal(new BN(-1).mul(limitAmount));
                // });

                it("When the amount is large, deposit DAI to borrow ETH.", async () => {
                    const numOfDAI = new BN(10e19);
                    const numOfETH = new BN(10e19);
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.depositToken(ETH_ADDRESS, numOfETH, {
                        from: user2,
                        value: numOfETH
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1ETHBorrowValue = await savingAccount.tokenBalanceOfAndInterestOf(ETH_ADDRESS, { from: user1})
                    expect(new BN(user1ETHBorrowValue[0]).add(new BN(user1ETHBorrowValue[1]))).to.be.bignumber.equal(new BN(-10));
                });
            });
        });

        context("Token without Compound (MKR, TUSD)",async () => {
            context("should fail", async () => {

            });

            context("should succeed", async () => {
                it("When depositing DAI to borrow MKR.", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.depositToken(addressMKR, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1Balance = await erc20MKR.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(new BN(1));
                });

                it("When depositing DAI to borrow TUSD.", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.depositToken(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressTUSD, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1Balance = await erc20TUSD.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(new BN(1));
                });
            });
        });

        context("Token with 6 decimal", async () => {
            context("should fail", async () => {

            });

            context("should succeed", async () => {
                it("When depositing DAI to borrow USDC.", async () => {
                    const numOfDAI = new BN(10e15);
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1Balance = await erc20USDC.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(new BN(10));
                });

                it("when borrow amount of token is equal to ILTV of his collateral value", async () => {
                    const numOfDAI = new BN(10e15);
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await savingAccount.getCoinToUsdRate(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToUsdRate(1));
                    await savingAccount.borrow(addressUSDC, limitAmount, { from: user1 });
                    // 3. Verify the loan amount.
                    const user1Balance = await erc20USDC.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(limitAmount);
                });

                it("When the amount is large, deposit DAI to borrow USDC.", async () => {
                    const numOfDAI = new BN(10e19);
                    const numOfUSDC = new BN(10e7);
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.depositToken(addressUSDC, numOfUSDC, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressUSDC, numOfUSDC.div(10), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1Balance = await erc20USDC.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(numOfUSDC.div(10));
                });
            });
        })
    });
});
