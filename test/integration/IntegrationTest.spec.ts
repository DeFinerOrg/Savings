import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("Integration Tests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressBAT: any;
    let addressZRX: any;
    let addressREP: any;
    let addressWBTC: any;
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
    let erc20TUSD: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20BAT: t.MockERC20Instance;
    let erc20ZRX: t.MockERC20Instance;
    let erc20REP: t.MockERC20Instance;
    let erc20WBTC: t.MockERC20Instance;

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
        addressBAT = tokens[5];
        addressZRX = tokens[6];
        addressREP = tokens[7];
        addressWBTC = tokens[8];
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20USDT = await MockERC20.at(addressUSDT);
        erc20TUSD = await MockERC20.at(addressTUSD);
        erc20MKR = await MockERC20.at(addressMKR);
        erc20BAT = await MockERC20.at(addressBAT);
        erc20ZRX = await MockERC20.at(addressZRX);
        erc20REP = await MockERC20.at(addressREP);
        erc20WBTC = await MockERC20.at(addressWBTC);
        /* addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.cTokenRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.cTokenRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.cTokenRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC); */
    });

    context("Deposit and Withdraw", async () => {
        /* it("should deposit all tokens and withdraw all tokens", async () => {
            const numOfToken = new BN(1000);

            let tempContractAddress: any;
            let erc20contr: t.MockERC20Instance;

            // use Promise - map (from TestEngine)
            for (let u = 0; u < 3; u++) {
                //userDeposit --> u
                const userDepositIndex = u;
                //Deposit 1000 tokens of each Address
                for (let i = 0; i < 9; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    await erc20contr.transfer(accounts[u], numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken, {
                        from: accounts[u]
                    });

                    const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                        savingAccount.address
                    );
                    console.log("user", u);
                    console.log("token", tempContractAddress);
                    console.log("balSavingAccountBeforeDeposit", BN(balSavingAccountBeforeDeposit));

                    //await erc20contr.approve(savingAccount.address, numOfToken);
                    await savingAccount.depositToken(erc20contr.address, numOfToken, {
                        from: accounts[u]
                    });

                    const balSavingAccountAfterDeposit = await erc20contr.balanceOf(
                        savingAccount.address
                    );
                    console.log("user", u);
                    console.log("Token", tempContractAddress);
                    console.log("balSavingAccountAfterDeposit", BN(balSavingAccountAfterDeposit));

                    //Verify if deposit was successful

                    //array that stores no. of tokens

                    const expectedTokensAtSavingAccountContract = numOfToken
                        .mul(new BN(u + 1))
                        .mul(new BN(15))
                        .div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );
                }
            }

            for (let userWithdraw = 0; userWithdraw < 3; userWithdraw++) {
                //Withdraw 1000 tokens of each Address
                for (let j = 0; j < 9; j++) {
                    tempContractAddress = tokens[j];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    await savingAccount.withdrawAllToken(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    //expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
                }
            }
        }); */

        it("should deposit all and withdraw only non-Compound tokens (MKR, TUSD)", async () => {
            const numOfToken = new BN(1000);

            let tempContractAddress: any;
            let erc20contr: t.MockERC20Instance;

            // Deposit all tokens
            for (let i = 0; i < 9; i++) {
                tempContractAddress = tokens[i];
                erc20contr = await MockERC20.at(tempContractAddress);

                //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                await erc20contr.approve(savingAccount.address, numOfToken);
                //await erc20contr.approve(savingAccount.address, numOfToken);
                await savingAccount.depositToken(erc20contr.address, numOfToken);

                //Verify if deposit was successful
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );
            }

            //Withdraw TUSD & MKR
            for (let i = 3; i <= 4; i++) {
                tempContractAddress = tokens[i];
                erc20contr = await MockERC20.at(tempContractAddress);

                await savingAccount.withdrawAllToken(erc20contr.address);

                //Verify if withdrawAll was successful
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
            }
        });

        it("should deposit all and withdraw Compound supported tokens", async () => {
            const numOfToken = new BN(1000);

            let tempContractAddress: any;
            let erc20contr: t.MockERC20Instance;

            // Deposit all tokens
            for (let i = 0; i < 9; i++) {
                tempContractAddress = tokens[i];
                erc20contr = await MockERC20.at(tempContractAddress);

                //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                await erc20contr.approve(savingAccount.address, numOfToken);
                //await erc20contr.approve(savingAccount.address, numOfToken);
                await savingAccount.depositToken(erc20contr.address, numOfToken);

                //Verify if deposit was successful
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );
            }

            for (let i = 0; i < 9; i++) {
                if (i != 3 && i != 4) {
                    tempContractAddress = tokens[i];
                    erc20contr = await MockERC20.at(tempContractAddress);
                    await savingAccount.withdrawAllToken(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
                }
            }
        });

        it("should deposit all and withdraw only token with less than 18 decimals", async () => {
            const numOfToken = new BN(1000);

            let tempContractAddress: any;
            let erc20contr: t.MockERC20Instance;

            // Deposit all tokens
            for (let i = 0; i < 9; i++) {
                tempContractAddress = tokens[i];
                erc20contr = await MockERC20.at(tempContractAddress);

                //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                await erc20contr.approve(savingAccount.address, numOfToken);
                //await erc20contr.approve(savingAccount.address, numOfToken);
                await savingAccount.depositToken(erc20contr.address, numOfToken);

                //Verify if deposit was successful
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );
            }

            for (let i = 0; i < 9; i++) {
                if (i == 1 || i == 2 || i == 8) {
                    tempContractAddress = tokens[i];
                    erc20contr = await MockERC20.at(tempContractAddress);
                    await savingAccount.withdrawAllToken(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
                }
            }
        });

        it("should deposit 1million of each token, wait for a week, withdraw all", async () => {
            const numOfToken = new BN(10).pow(new BN(6));

            let tempContractAddress: any;
            let erc20contr: t.MockERC20Instance;

            /* await Promise.all(
                tokens.map(async (token: string) => {
                    erc20contr = await MockERC20.at(token);
                    console.log("token", token);
                    //console.log("erc20contr", erc20contr.address);
                    await erc20contr.approve(savingAccount.address, numOfToken);
                    await savingAccount.depositToken(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    const expectedTokensAtSavingAccountContract = numOfToken
                        .mul(new BN(15))
                        .div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );
                })
            ); */

            // Deposit all tokens
            for (let i = 0; i < 9; i++) {
                tempContractAddress = tokens[i];
                erc20contr = await MockERC20.at(tempContractAddress);

                //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                await erc20contr.approve(savingAccount.address, numOfToken);
                //await erc20contr.approve(savingAccount.address, numOfToken);
                await savingAccount.depositToken(erc20contr.address, numOfToken);

                //Verify if deposit was successful
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );
            }

            await time.increase(new BN(7).mul(new BN(24).mul(new BN(3600))));

            for (let j = 0; j < 9; j++) {
                tempContractAddress = tokens[j];
                erc20contr = await MockERC20.at(tempContractAddress);

                await savingAccount.withdrawAllToken(erc20contr.address);

                //Verify if withdrawAll was successful
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
            }
        });

        it("should deposit and withdraw with interest");
    });

    context("Deposit and Borrow", async () => {
        it("should deposit $1 million value and borrow 0.6 million", async () => {
            const numOfToken = new BN("1000000"); //eighteenPrecision.mul(new BN(10).pow(new BN(6)));
            const borrowTokens = new BN("600000");

            await erc20DAI.transfer(user1, numOfToken);
            await erc20USDC.transfer(user2, numOfToken);
            await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
            await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
            // 1. Deposit $1 million
            await savingAccount.depositToken(addressDAI, numOfToken, { from: user1 });
            await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
            // 2. Borrow $0.6 million
            await savingAccount.borrow(addressDAI, borrowTokens, { from: user2 });
            // 3. Verify the amount borrowed
            const user2Balance = await erc20DAI.balanceOf(user2);
            expect(user2Balance).to.be.bignumber.equal(borrowTokens);
        });

        it("should allow the borrow of tokens which are more than reserve if user has enough collateral", async () => {
            //user1 deposits 1000 full tokens of DAI
            //user2 deposits 1000 full of USDC
            //user1 borrows 300 ful tokens of USDC
            const numOfDAI = eighteenPrecision.mul(new BN(1000));
            const numOfUSDC = sixPrecision.mul(new BN(1000));

            await erc20DAI.transfer(user1, numOfDAI);
            await erc20USDC.transfer(user2, numOfUSDC);
            await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
            await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

            //1. Deposit DAI
            await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
            await savingAccount.depositToken(addressUSDC, numOfUSDC, { from: user2 });

            // 2. Borrow USDC
            await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(300)), { from: user1 });

            // 3. Verify the loan amount
            const user1Balance = await erc20USDC.balanceOf(user1);
            expect(user1Balance).to.be.bignumber.equal(sixPrecision.mul(new BN(300)));
        });

        it("should deposit DAI and borrow USDC tokens whose amount is equal to ILTV of collateral", async () => {
            // 1. Initiate deposit
            const numOfDAI = eighteenPrecision.mul(new BN(1000));
            const numOfToken = sixPrecision.mul(new BN(1000));
            await erc20DAI.transfer(user1, numOfDAI);
            await erc20USDC.transfer(user2, numOfToken);
            await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
            await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
            await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
            await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });

            // 2. Start borrowing.
            const borrowAmount = numOfDAI
                .mul(await savingAccount.getCoinToUsdRate(0))
                .mul(new BN(60))
                .div(new BN(100))
                .div(await savingAccount.getCoinToUsdRate(1));
            //converting borrowAmount to six precision
            await savingAccount.borrow(addressUSDC, borrowAmount.div(new BN(10).pow(new BN(12))), {
                from: user1
            });

            // 3. Verify the loan amount.
            const user1Balance = await erc20USDC.balanceOf(user1);
            expect(user1Balance).to.be.bignumber.equal(
                borrowAmount.div(new BN(10).pow(new BN(12)))
            );
        });

        it("should deposit DAI and 3 different users should borrow USDC", async () => {
            // 1. User 1 deposits 10,000 DAI & USDC
            const numOfUSDC = new BN(100000);
            const numOfToken = new BN(1000);

            await erc20USDC.transfer(user1, numOfUSDC);
            await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
            await savingAccount.depositToken(addressUSDC, numOfUSDC, { from: user1 });

            // 2. other users to borrow
            for (let u = 2; u <= 4; u++) {
                const userBorrowIndex = new BN(u);
                const borrowAmount = numOfToken.mul(userBorrowIndex.sub(new BN(1)));
                const depositAmountCollateral = borrowAmount.mul(new BN(3));
                const userNumber = accounts[userBorrowIndex];

                await erc20DAI.transfer(userNumber, eighteenPrecision);
                await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                    from: userNumber
                });

                await savingAccount.depositToken(addressDAI, eighteenPrecision, {
                    from: userNumber
                });
                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: userNumber
                });

                console.log("borrowAmount", borrowAmount);
                console.log("depositAmountCollateral", depositAmountCollateral);
                console.log("userNumber", userNumber);
            }
        });
    });

    context("Deposit, Borrow, Repay", async () => {
        // Borrow and repay of tokens with less than 18 decimals
        it("should deposit DAI, borrow USDC and repay after one month", async () => {
            // 1. Initiate deposit
            const numOfDAI = eighteenPrecision.div(new BN(1000));
            const numOfToken = new BN(1000);

            await erc20DAI.transfer(user1, numOfDAI);
            await erc20USDC.transfer(user2, numOfToken);
            await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
            await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
            await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
            await savingAccount.depositToken(addressUSDC, numOfToken, { from: user2 });
            await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });

            // 2. Start borrowing.
            await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
            const user1BalanceBefore = await erc20USDC.balanceOf(user1);

            // 3. Start repayment.
            await time.increase(new BN(30).mul(new BN(24).mul(new BN(3600))));
            await savingAccount.repay(addressUSDC, new BN(100), { from: user1 });

            // 4. Verify the repay amount.
            const user1BalanceAfter = await erc20USDC.balanceOf(user1);
            expect(user1BalanceBefore).to.be.bignumber.equal(new BN(100));
            expect(user1BalanceAfter).to.be.bignumber.equal(new BN(0));
        });
    });

    context("Deposit, Borrow and Withdraw", async () => {
        it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw", async () => {
            const numOfDAI = eighteenPrecision.mul(new BN(10));
            const numOfUSDC = sixPrecision.mul(new BN(10));
            const borrowAmount = numOfUSDC.div(new BN(10));
            await erc20DAI.transfer(user1, numOfDAI);
            await erc20USDC.transfer(user2, numOfUSDC);
            await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
            await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

            //1. Deposit DAI
            await savingAccount.depositToken(addressDAI, numOfDAI, { from: user1 });
            await savingAccount.depositToken(addressUSDC, numOfUSDC, { from: user2 });

            // 2. Borrow USDC
            await savingAccount.borrow(addressUSDC, borrowAmount, { from: user1 });

            // Amount that is locked as collateral
            const collateralLocked = borrowAmount
                .mul(await savingAccount.getCoinToUsdRate(1))
                .mul(new BN(100))
                .div(new BN(60))
                .div(await savingAccount.getCoinToUsdRate(0));

            // 3. Verify the loan amount
            const user1Balance = await erc20USDC.balanceOf(user1);
            expect(user1Balance).to.be.bignumber.equal(numOfUSDC.div(new BN(10)));

            // Total remaining DAI after borrow
            const remainingDAI = numOfDAI.sub(collateralLocked); //.sub(new BN(1631454));

            // 4. Withdraw remaining DAI
            //await savingAccount.withdrawAllToken(erc20DAI.address, { from: user1 });
            await savingAccount.withdrawToken(erc20DAI.address, remainingDAI, { from: user1 });
            const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
            expect(balSavingAccountDAI).to.be.bignumber.equal(collateralLocked);
        });

        it("should get deposit interests when he deposits, wait for a week and withdraw", async () => {});
    });

    context("Deposit, Borrow and liquidate", async () => {
        it("");
    });

    context("Deposit, Borrow, Repay and liquidate", async () => {
        it("");
    });

    context("Deposit, Borrow, Repay, Withdraw and liquidate", async () => {
        it("");
    });
});
