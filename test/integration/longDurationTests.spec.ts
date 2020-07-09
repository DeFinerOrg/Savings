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
    let ZERO: any;
    let ONE_WEEK: any;
    let ONE_MONTH: any;
    let BLOCKS_MINED_WEEKLY: any;
    let BLOCKS_MINED_MONTHLY: any;
    let tempContractAddress: any;
    let cTokenTemp: any;
    let addressCTokenTemp: any;
    let erc20contr: t.MockERC20Instance;

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
        ZERO = new BN(0);
        ONE_WEEK = new BN(7).mul(new BN(24).mul(new BN(3600)));
        ONE_MONTH = new BN(30).mul(new BN(24).mul(new BN(3600)));
        BLOCKS_MINED_WEEKLY = new BN(6).mul(new BN(24)).mul(new BN(7));
        BLOCKS_MINED_MONTHLY = new BN(6).mul(new BN(24)).mul(new BN(30));
        /* addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC); */
    });

    context("Deposit and Withdraw", async () => {
        context("should succeed", async () => {
            it("should deposit 1million of each token, wait for a week, withdraw all", async () => {
                const numOfToken = new BN(10).pow(new BN(6));

                // Deposit all tokens
                for (let i = 0; i < 9; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken);
                    //await erc20contr.approve(savingAccount.address, numOfToken);
                    const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                        erc20contr.address
                    );

                    await savingAccount.deposit(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    const expectedTokensAtSavingAccountContract = numOfToken
                        .mul(new BN(15))
                        .div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                        erc20contr.address
                    );

                    const totalDefinerBalanceChange = new BN(
                        totalDefinerBalanceAfterDeposit[0]
                    ).sub(new BN(totalDefinerBalanceBeforeDeposit[0]));
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
                }

                let block = await web3.eth.getBlock("latest");
                console.log("block_number", block.number);

                let targetBlock = new BN(block.number).add(BLOCKS_MINED_WEEKLY);

                await time.advanceBlockTo(targetBlock);

                let blockAfter = await web3.eth.getBlock("latest");
                console.log("block_number", blockAfter.number);

                for (let j = 0; j < 9; j++) {
                    tempContractAddress = tokens[j];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    await savingAccount.withdrawAll(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                    // Verify DeFiner balance
                    const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                        erc20contr.address
                    );
                    expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);
                }
            });
        });
    });

    context("Deposit, Borrow, Repay", async () => {
        context("should succeed", async () => {
            it("should deposit DAI, borrow USDC and repay after one month", async () => {
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision.div(new BN(1000));
                const numOfUSDC = new BN(1000);
                const totalDefinerBalanceBeforeDepositDAI = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                const totalDefinerBalanceBeforeDepositUSDC = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user2 }
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                const totalDefinerBalanceChangeDAI = new BN(
                    totalDefinerBalanceAfterDepositDAI[0]
                ).sub(new BN(totalDefinerBalanceBeforeDepositDAI[0]));
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user2 }
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC[0]
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC[0]));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Start borrowing.
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                const user1BalanceBefore = await erc20USDC.balanceOf(user1);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user1 }
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1[1]).to.be.bignumber.equal(
                    new BN(100)
                );

                let block = await web3.eth.getBlock("latest");
                console.log("block_number", block.number);

                let targetBlock = new BN(block.number).add(BLOCKS_MINED_MONTHLY);

                await time.advanceBlockTo(targetBlock);

                let blockAfter = await web3.eth.getBlock("latest");
                console.log("block_number", blockAfter.number);

                // 3. Start repayment.
                await savingAccount.repay(addressUSDC, new BN(100), { from: user1 });

                // 4. Verify the repay amount.
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(user1BalanceBefore).to.be.bignumber.equal(new BN(100));
                expect(user1BalanceAfter).to.be.bignumber.equal(ZERO);

                const totalDefinerBalanceAfterRepayUSDCUser1 = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user1 }
                );
                expect(totalDefinerBalanceAfterRepayUSDCUser1[1]).to.be.bignumber.equal(ZERO);
            });
        });
    });

    context("Deposit, Borrow and Withdraw", async () => {
        context("should succeed", async () => {
            it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw after 1 week", async () => {
                const numOfDAI = eighteenPrecision.mul(new BN(10));
                const numOfUSDC = sixPrecision.mul(new BN(10));
                const borrowAmount = numOfUSDC.div(new BN(10));
                const totalDefinerBalanceBeforeDepositDAI = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                const totalDefinerBalanceBeforeDepositUSDC = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user2 }
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                const balSavingAccountDAIAfterDeposit = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                const totalDefinerBalanceChangeDAI = new BN(
                    totalDefinerBalanceAfterDepositDAI[0]
                ).sub(new BN(totalDefinerBalanceBeforeDepositDAI[0]));
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user2 }
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC[0]
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC[0]));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Borrow USDC
                await savingAccount.borrow(addressUSDC, borrowAmount, { from: user1 });

                const balSavingAccountDAIAfterBorrow = await erc20DAI.balanceOf(
                    savingAccount.address
                );

                // Amount that is locked as collateral
                const collateralLocked = borrowAmount
                    .mul(eighteenPrecision)
                    .mul(await savingAccount.getCoinToETHRate(1))
                    .mul(new BN(100))
                    .div(new BN(60))
                    .div(await savingAccount.getCoinToETHRate(0))
                    .div(sixPrecision);

                // 3. Verify the loan amount
                const user1BalanceAfterBorrow = await erc20USDC.balanceOf(user1);
                expect(user1BalanceAfterBorrow).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user1 }
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1[1]).to.be.bignumber.equal(
                    borrowAmount
                );

                // Total remaining DAI after borrow
                const remainingDAI = numOfDAI.sub(new BN(collateralLocked));

                let block = await web3.eth.getBlock("latest");
                console.log("block_number", block.number);

                let targetBlock = new BN(block.number).add(BLOCKS_MINED_WEEKLY);

                await time.advanceBlockTo(targetBlock);

                let blockAfter = await web3.eth.getBlock("latest");
                console.log("block_number", blockAfter.number);

                // 4. Withdraw remaining DAI
                //await savingAccount.withdrawAllToken(erc20DAI.address, { from: user1 });
                await savingAccount.withdraw(erc20DAI.address, remainingDAI, { from: user1 });
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
                expect(balSavingAccountDAI).to.be.bignumber.equal(
                    collateralLocked.mul(new BN(15)).div(new BN(100))
                );

                const totalDefinerBalanceAfterWithdrawDAIUser1 = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                expect(totalDefinerBalanceAfterWithdrawDAIUser1[0]).to.be.bignumber.equal(
                    collateralLocked
                );
            });
        });
    });
});
