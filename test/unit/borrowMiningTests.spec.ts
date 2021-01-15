import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("ERC20");

contract("SavingAccount.deposit", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    const eighteenPrecision = new BN(10).pow(new BN(18));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;
    let addressFIN: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cWBTC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let erc20FIN: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        addressFIN = tokens[11];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        erc20WBTC = await ERC20.at(addressWBTC);
        erc20FIN = await ERC20.at(addressFIN);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressDAI, 100, 100);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressUSDC, 100, 100);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressTUSD, 100, 100);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressMKR, 100, 100);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressWBTC, 100, 100);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressFIN, 100, 100);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(ETH_ADDRESS, 100, 100);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
    });

    context("Mining tests", async () => {
        context("Single Token", async () => {
            context("borrow mining", async () => {
                context("Compound supported 18 decimal token", async () => {
                    context("should succeed", async () => {
                        it("Deposit DAI then borrow small amount of DAI", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);

                            const numOfToken = new BN(10000);
                            // 1.1 Transfer DAI to user1 & user2.
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, new BN(5000), { from: user1 });
                            await savingAccount.deposit(addressDAI, new BN(5000), { from: user2 });

                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                            await savingAccount.borrow(addressDAI, new BN(1000), { from: user2 });
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(1000)
                            );

                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            await savingAccount.claim({ from: user2 });

                            const balFIN = await erc20FIN.balanceOf(user2);
                            console.log("balFIN", balFIN.toString());
                        });

                        it("Deposit DAI then borrow large amount of DAI", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);

                            const numOfToken = new BN(1000).mul(eightPrecision);
                            const depositAmount = new BN(500).mul(eightPrecision);
                            const borrowAmount = new BN(100).mul(eightPrecision);
                            // 1.1 Transfer DAI to user1 & user2.
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                            await savingAccount.deposit(addressDAI, depositAmount, { from: user2 });

                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                            await savingAccount.borrow(addressDAI, borrowAmount, { from: user2 });
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                borrowAmount
                            );

                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            await savingAccount.claim({ from: user2 });

                            const balFIN = await erc20FIN.balanceOf(user2);
                            console.log("balFIN", balFIN.toString());
                        });

                        it("Deposit USDC and borrow large amount of DAI", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);

                            const numOfDAI = eighteenPrecision.mul(new BN(1000));
                            const numOfUSDC = sixPrecision.mul(new BN(1000));
                            const depositAmountDAI = new BN(500).mul(eightPrecision);
                            const depositAmountUSDC = new BN(500).mul(sixPrecision);
                            const borrowAmount = new BN(10).mul(sixPrecision);

                            await erc20DAI.transfer(user1, numOfDAI);
                            await erc20USDC.transfer(user2, numOfUSDC);
                            await erc20DAI.approve(savingAccount.address, numOfDAI, {
                                from: user1,
                            });
                            await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, depositAmountDAI, {
                                from: user1,
                            });
                            await savingAccount.deposit(addressUSDC, depositAmountUSDC, {
                                from: user2,
                            });

                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                            await savingAccount.borrow(addressDAI, borrowAmount, {
                                from: user2,
                            });

                            // 3. Verify the loan amount.
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                borrowAmount
                            );

                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            await savingAccount.claim({ from: user2 });

                            const balFIN = await erc20FIN.balanceOf(user2);
                            console.log("balFIN", balFIN.toString());
                        });
                    });
                });

                context("Compound supported 6 decimal token", async () => {
                    context("should succeed", async () => {
                        it("Deposit DAI & USDC then borrow small amount of USDC", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(10000);

                            // 1.1 Transfer DAI to user2.
                            await erc20DAI.transfer(user2, numOfToken.mul(new BN(2)));

                            // 1.2 Transfer USDC to user1 & user2.
                            await erc20USDC.transfer(user1, numOfToken);
                            await erc20USDC.transfer(user2, numOfToken);
                            await erc20USDC.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await erc20USDC.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, new BN(5000), { from: user1 });
                            await savingAccount.deposit(addressDAI, new BN(5000), { from: user2 });
                            await savingAccount.deposit(addressUSDC, new BN(5000), { from: user2 });

                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));
                            await savingAccount.borrow(addressUSDC, new BN(10), { from: user2 });
                            const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(10)
                            );

                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);
                            console.log("USDC1");

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });
                            console.log("USDC2");

                            await savingAccount.claim({ from: user2 });

                            const balFIN = await erc20FIN.balanceOf(user2);
                            console.log("balFIN", balFIN.toString());
                        });

                        it("Deposit DAI & USDC then borrow large amount of USDC", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(10000).mul(eightPrecision);
                            const numOfUSDC = new BN(10000).mul(sixPrecision);

                            // 1.1 Transfer DAI to user2.
                            await erc20DAI.transfer(user2, numOfToken.mul(new BN(2)));

                            // 1.2 Transfer USDC to user1 & user2.
                            await erc20USDC.transfer(user1, numOfUSDC);
                            await erc20USDC.transfer(user2, numOfUSDC);
                            await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, numOfUSDC.div(new BN(2)), {
                                from: user1,
                            });
                            await savingAccount.deposit(addressDAI, numOfToken.div(new BN(2)), {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, numOfUSDC.div(new BN(2)), {
                                from: user2,
                            });

                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));
                            await savingAccount.borrow(addressUSDC, new BN(10).mul(sixPrecision), {
                                from: user2,
                            });

                            const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(10).mul(sixPrecision)
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });

                            const balFIN = await erc20FIN.balanceOf(user2);
                            console.log("balFIN", balFIN.toString());
                        });
                    });
                });

                context("Compound unsupported 18 decimal Token", async () => {
                    context("Should succeed", async () => {
                        it("Deposit DAI to borrow a small amount of MKR.", async function () {
                            this.timeout(0);
                            let numOfToken = new BN(100000);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);

                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20MKR.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20MKR.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });

                            await savingAccount.deposit(addressDAI, new BN(50000), {
                                from: user1,
                            });

                            await savingAccount.deposit(addressMKR, new BN(50000), {
                                from: user2,
                            });

                            // 2. Start borrowing.
                            const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));
                            await savingAccount.borrow(addressMKR, new BN(10), { from: user1 });

                            // 3. Verify the loan amount.
                            const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                            expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                                new BN(10)
                            );

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user1);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            await savingAccount.claim({ from: user1 });

                            const balFIN = await erc20FIN.balanceOf(user1);
                            console.log("balFIN", balFIN.toString());
                        });

                        it("Deposit DAI to borrow a large amount of MKR.", async function () {
                            this.timeout(0);
                            let numOfToken = new BN(100000).mul(eightPrecision);
                            let borrowAmt = new BN(50000).mul(eightPrecision);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100))
                            );
                            await savingAccount.fastForward(100000);

                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20MKR.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20MKR.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });

                            await savingAccount.deposit(addressDAI, borrowAmt, {
                                from: user1,
                            });

                            await savingAccount.deposit(addressMKR, borrowAmt, {
                                from: user2,
                            });

                            // 2. Start borrowing.
                            const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));
                            await savingAccount.borrow(addressMKR, new BN(10), { from: user1 });

                            // 3. Verify the loan amount.
                            const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                            expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                                new BN(10)
                            );

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user1);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            await savingAccount.claim({ from: user1 });

                            const balFIN = await erc20FIN.balanceOf(user1);
                            console.log("balFIN", balFIN.toString());
                        });
                    });
                });
            });
        });
    });
});
