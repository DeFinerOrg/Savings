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
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    const numOfDAI = eighteenPrecision;
    const numOfWBTC = eightPrecision;
    const numOfUSDC = sixPrecision;
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

    });

    context("Addtional tests for repay()", async () => {
        context("Checking saving account's value after repayment", async () => {
            context("Should succeed.", async () => {
                beforeEach(async () => {
                    /*
                     * Setting up collateral beforehand.
                     * User1 deposit a whole DAI, and user2 deposit a whole USDC.
                     * Give 1 extra DAI to user2 for repayment.
                     * User2 then borrows half a DAI.
                     * Saving account balance: 7.5*10^16 DAI, 4.25*10^17 cDAI
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), { from: user2 });
                });
                it("Repay all the outstandings DAI token", async () => {
                    /*
                     * Repay all the outstandings
                     * After repayment, saving account balance: 1.5*10^17 DAI, 8.5*10^17 cDAI
                     */
                    await savingAccount.repay(addressDAI, numOfDAI.div(new BN(2)), { from: user2 });
                    const expectedCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100));
                    const expectedDAIBalance = numOfDAI.mul(new BN(15)).div(new BN(100));
                    const realCTokenBalance = await cTokenDAI.balanceOf(savingAccount.address);
                    const realDAIBalance = await erc20DAI.balanceOf(savingAccount.address);
                    expect(expectedCTokenBalance).to.be.bignumber.equal(realCTokenBalance);
                    expect(expectedDAIBalance).to.be.bignumber.equal(realDAIBalance);
                });
                it("Repay all the outstandings DAI token", async () => {
                    /*
                     * Repay 1/4 * 10^18 DAI
                     * After repayment, saving account balance: 1.5*10^17 DAI, 6*10^17 cDAI
                     */
                    await savingAccount.repay(addressDAI, numOfDAI.div(new BN(4)), { from: user2 });
                    // 8.5*10^17 - 2.5*10^17
                    const expectedCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100)).sub(numOfDAI.div(new BN(4)));
                    const expectedDAIBalance = numOfDAI.mul(new BN(15)).div(new BN(100));
                    const realCTokenBalance = await cTokenDAI.balanceOf(savingAccount.address);
                    const realDAIBalance = await erc20DAI.balanceOf(savingAccount.address);

                    expect(realCTokenBalance).to.be.bignumber.equal(expectedCTokenBalance);
                    expect(realDAIBalance).to.be.bignumber.equal(expectedDAIBalance);
                });
                it("Repay with a small amount of DAI token", async () => {
                    /*
                     * Repay 1/4 * 10^18 DAI
                     * After repayment, saving account balance: 1.5*10^17 DAI, 8.5*10^17 - 5*10^17 + 10 cDAI
                     */
                    await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
                    // 8.5*10^17 - 5*10^17 + 10 cDAI
                    const expectedCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100)).sub(numOfDAI.div(new BN(2))).add(new BN(10));
                    const expectedDAIBalance = numOfDAI.mul(new BN(15)).div(new BN(100));
                    const realCTokenBalance = await cTokenDAI.balanceOf(savingAccount.address);
                    const realDAIBalance = await erc20DAI.balanceOf(savingAccount.address);
                    // expect(realCTokenBalance).to.be.bignumber.equal(expectedCTokenBalance);
                    expect(realDAIBalance).to.be.bignumber.equal(expectedDAIBalance);
                });
            });
        });
        // context("with WBTC, 8 decimals token", async () => {
        //     context("should succeed", async () => {
        //         beforeEach(async () => {
        //             // 1.1 Set up collateral.
        //             await erc20DAI.transfer(user1, numOfDAI);
        //             await erc20WBTC.transfer(user2, numOfWBTC);
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
        //             await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
        //             await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
        //             await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });
        //         });

        //         it("when supported token address is passed", async () => {
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
        //             const user2BalanceBefore = await erc20DAI.balanceOf(user2);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
        //             // 4. Verify the repay amount.
        //             const user2BalanceAfter = await erc20DAI.balanceOf(user2);
        //             expect(user2BalanceBefore).to.be.bignumber.equal(new BN(10));
        //             expect(user2BalanceAfter).to.be.bignumber.equal(new BN(0));
        //         });

        //         it("When the repayment DAI Amount is less than the loan amount.", async () => {
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
        //             const user2BalanceBefore = await erc20DAI.balanceOf(user2);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressDAI, new BN(5), { from: user2 });
        //             // 4. Verify the repay amount.
        //             const user2BalanceAfter = await erc20DAI.balanceOf(user2);
        //             expect(user2BalanceBefore).to.be.bignumber.equal(new BN(10));
        //             expect(user2BalanceAfter).to.be.bignumber.equal(new BN(5));
        //         });

        //         it("When the repayment DAI Amount is equal than the loan amount.", async () => {
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
        //             const user2BalanceBefore = await erc20DAI.balanceOf(user2);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
        //             // 4. Verify the repay amount.
        //             const user2BalanceAfter = await erc20DAI.balanceOf(user2);
        //             expect(user2BalanceBefore).to.be.bignumber.equal(new BN(10));
        //             expect(user2BalanceAfter).to.be.bignumber.equal(new BN(0));
        //         });

        //         it("When the repayment DAI Amount is greater than the loan amount.", async () => {
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
        //             // 2.1 Prepare more DAI.
        //             await erc20DAI.transfer(user2, numOfDAI);
        //             const user2BalanceBefore = await erc20DAI.balanceOf(user2);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressDAI, new BN(20), { from: user2 });
        //             // 4. Verify the repay amount.
        //             const user2BalanceAfter = await erc20DAI.balanceOf(user2);
        //             expect(user2BalanceBefore).to.be.bignumber.equal(numOfDAI.add(new BN(10)));
        //             expect(user2BalanceAfter).to.be.bignumber.equal(numOfDAI);
        //         });

        //         it("When the repayment WBTC Amount is less than the loan amount.", async () => {
        //             await erc20DAI.transfer(user1, numOfDAI);
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
        //             await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });
        //             await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });
        //             const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressWBTC, new BN(5), { from: user1 });
        //             // 4. Verify the repay amount.
        //             const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
        //             expect(user1BalanceBefore).to.be.bignumber.equal(new BN(10));
        //             expect(user1BalanceAfter).to.be.bignumber.equal(new BN(5));
        //         });

        //         it("When the repayment WBTC Amount is equal than the loan amount.", async () => {
        //             await erc20DAI.transfer(user1, numOfDAI);
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
        //             await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });
        //             await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });
        //             const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressWBTC, new BN(10), { from: user1 });
        //             // 4. Verify the repay amount.
        //             const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
        //             expect(user1BalanceBefore).to.be.bignumber.equal(new BN(10));
        //             expect(user1BalanceAfter).to.be.bignumber.equal(new BN(0));
        //         });

        //         it("When the repayment WBTC Amount is greater than the loan amount.", async () => {
        //             await erc20DAI.transfer(user1, numOfDAI);
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
        //             await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });
        //             await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
        //             // 2. Start borrowing.
        //             await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });
        //             // 2.1 Prepare more DAI.
        //             await erc20WBTC.transfer(user1, numOfWBTC);
        //             const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
        //             // 3. Start repayment.
        //             await savingAccount.repay(addressWBTC, new BN(20), { from: user1 });
        //             // 4. Verify the repay amount.
        //             const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
        //             expect(user1BalanceBefore).to.be.bignumber.equal(numOfWBTC.add(new BN(10)));
        //             expect(user1BalanceAfter).to.be.bignumber.equal(numOfWBTC);
        //         });
        //     });
        // });
    });
});