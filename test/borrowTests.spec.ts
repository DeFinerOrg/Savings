import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.borrow", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

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
                it("when unsupported token address is passed", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
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
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressDAI, new BN(0), { from: user2 }),
                        "Amount is zero"
                    );
                });

                it("when user tries to borrow token, but he has not deposited any token before", async () => {
                    // 1. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressDAI, new BN(10), { from: user2 }),
                        "User not have any deposits"
                    );
                });

                it("when there is no liquidity for the asked token", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressDAI, new BN(1001), { from: user2 }),
                        "Lack of liquidity."
                    );
                });
            });

            context("should succeed", async () => {
                // modified
                it("Deposit DAI then borrow DAI", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });

                // modified
                it("Deposit DAI & USDC then borrow DAI", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });

                // modified
                it("Deposit DAI & USDC then borrow USDC", async () => {
                    // 1.1 Transfer DAI to user2.
                    await erc20DAI.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user1 & user2.
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user2 });
                    const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });
                // modified
                it("when supported token address is passed", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.mul(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });

                // it("when borrow amount of token less then ILTV of his collateral value");

                it("when borrow amount of token is equal to ILTV of his collateral value", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await savingAccount.getCoinToETHRate(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToETHRate(0));
                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                    // 3. Verify the loan amount.
                    const user2Balance = await erc20DAI.balanceOf(user2);
                    expect(user2Balance).to.be.bignumber.equal(limitAmount);
                });

                it("when borrowing a whole DAI", async () => {
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(10)), {
                        from: user2
                    });
                    // 3. Verify the loan amount.
                    const user2Balance = await erc20DAI.balanceOf(user2);
                    expect(user2Balance).to.be.bignumber.equal(numOfDAI.div(new BN(10)));
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("when unsupported token address is passed", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
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
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
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
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
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
                //     await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                //     await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                //         from: user2,
                //         value: numOfToken
                //     });
                //     const balance = numOfToken
                //         .mul(await savingAccount.getCoinToETHRate(1))
                //         .mul(new BN(85))
                //         .div(new BN(100))
                //         .div(await savingAccount.getCoinToETHRate(0));
                //     // 2. Start borrowing.
                //     await expectRevert(
                //         savingAccount.borrow(ETH_ADDRESS, balance, { from: user1 }),
                //         "Insufficient collateral."
                //     );
                // });

                it("when there is no liquidity for the asked ETH", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(1001), { from: user1 }),
                        "revert"
                    );
                });
            });

            context("should succeed", async () => {
                beforeEach(async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                });

                // it("Deposit ETH & USDC then borrow ETH", async () => {
                //     // 1.2 Transfer USDC to user1.
                //     await erc20USDC.transfer(user1, numOfToken);
                //     await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                //     await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                //         from: user1,
                //         value: numOfToken,
                //     });
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                //     const user1ETHValue = await savingAccount.tokenBalance(ETH_ADDRESS, {
                //         from: user1,
                //     });
                //     expect(new BN(user1ETHValue[1])).to.be.bignumber.equal(new BN(10));
                // });

                // it("Deposit DAI & ETH then borrow ETH", async () => {
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                //     const user1ETHValue = await savingAccount.tokenBalance(ETH_ADDRESS, {
                //         from: user1,
                //     });
                //     expect(new BN(user1ETHValue[1])).to.be.bignumber.equal(new BN(10));
                // });

                // it("Deposit ETH then borrow ETH", async () => {
                //     await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                //         from: user1,
                //         value: numOfToken
                //     });
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 })
                //     const user1ETHValue = await savingAccount.tokenBalance(ETH_ADDRESS, {
                //             from: user1
                //         });
                //     expect(new BN(user1ETHValue[1])).to.be.bignumber.equal(new BN(10));
                // });

                /*
                todo: There are still problems with the price acquisition of ETH.
                 */
                // it("when supported token address is passed", async () => {
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                //     // 3. Verify the loan amount.
                //     const user1ETHValue = await savingAccount.tokenBalance(ETH_ADDRESS, {
                //         from: user1
                //     });
                //     expect(new BN(user1ETHValue[1])).to.be.bignumber.equal(new BN(10));
                // });

                /*
                todo: There are still problems with the price acquisition of ETH.
                 */
                // it("when borrow amount of ETH less then ILTV of his collateral value", async () => {
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(1), { from: user1 });
                //     // 3. Verify the loan amount.
                //     const user1ETHBorrowValue = await savingAccount.tokenBalance(
                //         ETH_ADDRESS,
                //         {
                //             from: user1
                //         }
                //     );
                //     expect(new BN(user1ETHBorrowValue[1])).to.be.bignumber.equal(new BN(1));
                // });

                /*
                todo: There are still problems with the price acquisition of ETH.
                 */

                // it("when borrow amount of ETH is equal to ILTV of his collateral value", async () => {
                //     // 2. Start borrowing.
                //     const limitAmount = numOfToken
                //         .mul(await savingAccount.getCoinToETHRate(1))
                //         .mul(new BN(60))
                //         .div(new BN(100))
                //         .div(await savingAccount.getCoinToETHRate(0));
                //     await savingAccount.borrow(ETH_ADDRESS, limitAmount, { from: user1 });
                //     // 3. Verify the loan amount.
                //     const user2ETHBorrowValue = await savingAccount.tokenBalance(ETH_ADDRESS, { from: user1})
                //     expect(new BN(user2ETHBorrowValue[1])).to.be.bignumber.equal(limitAmount);
                // });

                /*
                todo: There are still problems with the price acquisition of ETH.
                 */
                // it("When the amount is large, deposit DAI to borrow ETH.", async () => {
                //     const numOfDAI = eighteenPrecision.mul(new BN(10));
                //     const numOfETH = eighteenPrecision.mul(new BN(10));
                //     await erc20DAI.transfer(user1, numOfDAI);
                //     await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                //     await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                //     await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                //         from: user2,
                //         value: numOfETH
                //     });
                //     // 2. Start borrowing.
                //     await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                //     // 3. Verify the loan amount.
                //     const user1ETHBorrowValue = await savingAccount.tokenBalance(
                //         ETH_ADDRESS,
                //         { from: user1 }
                //     );
                //     expect(new new BN(user1ETHBorrowValue[1])).to.be.bignumber.equal(new BN(10));
                // });
            });
        });

        context("Token without Compound (MKR, TUSD)", async () => {
            context("should fail", async () => {
                it("when borrow MKR，amount is zero", async () => {
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressMKR, new BN(0), { from: user2 }),
                        "Amount is zero"
                    );
                });

                it("when borrow TUSD，amount is zero", async () => {
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressTUSD, new BN(0), { from: user1 }),
                        "Amount is zero"
                    );
                });

                it("when user tries to borrow MKR, but he has not deposited any token before", async () => {
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressMKR, new BN(10), { from: user2 }),
                        "Insufficient collateral."
                    );
                });

                it("when user tries to borrow TUSD, but he has not deposited any token before", async () => {
                    await erc20TUSD.transfer(user1, numOfToken);
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user1 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressTUSD, new BN(10), { from: user2 }),
                        "User not have any deposits"
                    );
                });

                it("when there is no liquidity for the asked MKR", async () => {
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressMKR, new BN(1001), { from: user2 }),
                        "Insufficient collateral."
                    );
                });

                it("when there is no liquidity for the asked TUSD", async () => {
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressTUSD, new BN(1001), { from: user1 }),
                        "Lack of liquidity."
                    );
                });
            });

            context("should succeed", async () => {
                // modified
                it("Deposit MKR then borrow MKR", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));

                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(new BN(1));
                });
                // modified
                it("Deposit TUSD then borrow TUSD", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20TUSD.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20TUSD.balanceOf(user2));

                    await savingAccount.borrow(addressTUSD, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20TUSD.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });

                // modified
                it("Deposit MKR & TUSD then borrow MKR", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20MKR.balanceOf(user2));

                    await savingAccount.borrow(addressMKR, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20MKR.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });
                // modified
                it("Deposit MKR & TUSD then borrow TUSD", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20TUSD.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20TUSD.balanceOf(user2));

                    await savingAccount.borrow(addressTUSD, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20TUSD.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });
                // modified
                it("When depositing DAI to borrow MKR.", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));

                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(new BN(1));
                });
                // modified
                it("When depositing DAI to borrow TUSD.", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20TUSD.balanceOf(user1));

                    await savingAccount.borrow(addressTUSD, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20TUSD.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(new BN(1));
                });
            });
        });

        context("Token with 6 decimal", async () => {
            context("should fail", async () => {
                it("when borrow USDC, amount is zero", async () => {
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressUSDC, new BN(0), { from: user1 }),
                        "Amount is zero"
                    );
                });

                it("when user tries to borrow USDC, but he has not deposited any token before", async () => {
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user1 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressUSDC, new BN(10), { from: user2 }),
                        "User not have any deposits"
                    );
                });

                it("when there is no liquidity for the asked USDC", async () => {
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressUSDC, new BN(1001), { from: user1 }),
                        "Insufficient collateral."
                    );
                });
            });

            context("should succeed", async () => {
                // modified
                it("Deposit USDC then borrow USDC", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });
                // modified
                it("When depositing DAI to borrow USDC.", async () => {
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20USDC.balanceOf(user1));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(new BN(10));
                });

                it("when borrow amount of token is equal to ILTV of his collateral value", async () => {
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await savingAccount.getCoinToETHRate(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToETHRate(1));
                    await savingAccount.borrow(addressUSDC, limitAmount, { from: user1 });
                    // 3. Verify the loan amount.
                    const user1Balance = await erc20USDC.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(limitAmount);
                });

                it("When the DAI is large, deposit DAI to borrow USDC.", async () => {
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20USDC.balanceOf(user1));

                    await savingAccount.borrow(addressUSDC, numOfUSDC.div(new BN(10)), {
                        from: user1
                    });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(numOfUSDC.div(new BN(10)));
                });
                // modified
                it("when borrow USDC of token is equal to ILTV of his collateral value", async () => {
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await savingAccount.getCoinToETHRate(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await savingAccount.getCoinToETHRate(0));
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(limitAmount);
                });
            });
        });
    });
});
