import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("Integration Tests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;

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
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20BAT: t.MockErc20Instance;
    let erc20ZRX: t.MockErc20Instance;
    let erc20REP: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let ZERO: any;
    let ONE_WEEK: any;
    let ONE_MONTH: any;
    let tempContractAddress: any;
    let cTokenTemp: t.MockCTokenInstance;
    let addressCTokenTemp: any;
    let erc20contr: t.MockErc20Instance;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");
        testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
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
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        erc20BAT = await ERC20.at(addressBAT);
        erc20ZRX = await ERC20.at(addressZRX);
        erc20REP = await ERC20.at(addressREP);
        erc20WBTC = await ERC20.at(addressWBTC);
        ZERO = new BN(0);
        ONE_WEEK = new BN(7).mul(new BN(24).mul(new BN(3600)));
        ONE_MONTH = new BN(30).mul(new BN(24).mul(new BN(3600)));
        /* cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr); */
    });

    context("Special test.", async () => {
        context("should succeed", async () => {
            it("Special test 1", async function () {
                this.timeout(0);
                // const
                const numOfETH = eighteenPrecision.mul(new BN(1));
                const numOfBAT = eighteenPrecision.mul(new BN(100));
                const borrowAmount = eighteenPrecision.mul(new BN(20));
                console.log("const");

                await erc20BAT.transfer(user1, numOfBAT);
                await erc20BAT.transfer(user2, numOfBAT);
                await savingAccount.fastForward(1000);
                await erc20BAT.approve(savingAccount.address, numOfBAT, { from: user1 });
                await erc20BAT.approve(savingAccount.address, numOfBAT, { from: user2 });
                // uesr1 deposit 1ETH
                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH,
                });
                console.log("uesr1 deposit 1ETH");
                // uesr2 deposit 100BAT
                await savingAccount.deposit(addressBAT, numOfBAT, { from: user2 });
                console.log("uesr2 deposit 100BAT");
                const user1Deposit = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );
                const user2Deposit = await accountsContract.getDepositBalanceCurrent(
                    addressBAT,
                    user2
                );

                console.log("user1Deposit: " + user1Deposit.toString());
                console.log("user2Deposit: " + user2Deposit.toString());

                // user1 borrow 20BAT
                await savingAccount.borrow(addressBAT, borrowAmount, { from: user1 });
                console.log("user1 borrow 20BAT");
                const user1Borrow1 = await accountsContract.getBorrowBalanceCurrent(
                    addressBAT,
                    user1
                );
                console.log("user1Borrow1: " + user1Borrow1.toString());

                // user1 repay 2BAT
                await savingAccount.repay(addressBAT, borrowAmount.div(new BN(10)), {
                    from: user1,
                });
                console.log("user1 repay 2BAT");
                const user1Borrow2 = await accountsContract.getBorrowBalanceCurrent(
                    addressBAT,
                    user1
                );
                console.log("user1Borrow2: " + user1Borrow2.toString());

                // user1 repay 20BAT(repay all BAT)
                await savingAccount.repay(addressBAT, borrowAmount, { from: user1 });
                console.log("user1 repay 20BAT(repay all BAT)");
                const user1Borrow3 = await accountsContract.getBorrowBalanceCurrent(
                    addressBAT,
                    user1
                );
                console.log("user1Borrow3: " + user1Borrow3.toString());

                expect(user1Deposit).to.be.bignumber.equal(numOfETH);
                expect(user2Deposit).to.be.bignumber.equal(numOfBAT);
                expect(user1Borrow1).to.be.bignumber.equal(borrowAmount);
                expect(user1Borrow2).to.be.bignumber.equal(
                    borrowAmount.sub(borrowAmount.div(new BN(10)))
                );
                expect(user1Borrow3).to.be.bignumber.equal(new BN(0));
            });

            it("Special test 2", async function () {
                this.timeout(0);
                // const
                const numOfETH = eighteenPrecision.mul(new BN(1));
                const numOfBAT = eighteenPrecision.mul(new BN(100));
                const borrowAmount = eighteenPrecision.mul(new BN(20));
                console.log("const");

                await erc20BAT.transfer(user1, numOfBAT);
                await erc20BAT.transfer(user2, numOfBAT);
                await erc20BAT.approve(savingAccount.address, numOfBAT, { from: user1 });
                await erc20BAT.approve(savingAccount.address, numOfBAT, { from: user2 });
                // uesr1 deposit 1ETH
                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH,
                });
                console.log("uesr1 deposit 1ETH");
                // uesr2 deposit 100BAT
                await savingAccount.deposit(addressBAT, numOfBAT, { from: user2 });
                console.log("uesr2 deposit 100BAT");
                const user1Deposit = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );
                const user2Deposit = await accountsContract.getDepositBalanceCurrent(
                    addressBAT,
                    user2
                );

                console.log("user1Deposit: " + user1Deposit.toString());
                console.log("user2Deposit: " + user2Deposit.toString());

                // user1 borrow 20BAT
                await savingAccount.borrow(addressBAT, borrowAmount, { from: user1 });
                console.log("user1 borrow 20BAT");
                const user1Borrow1 = await accountsContract.getBorrowBalanceCurrent(
                    addressBAT,
                    user1
                );
                console.log("user1Borrow1: " + user1Borrow1.toString());

                // user1 repay 40BAT
                await savingAccount.repay(addressBAT, borrowAmount.mul(new BN(2)), { from: user1 });
                console.log("user1 repay 40BAT");
                const user1Borrow2 = await accountsContract.getBorrowBalanceCurrent(
                    addressBAT,
                    user1
                );
                console.log("user1Borrow2: " + user1Borrow2.toString());

                // user2 withdraw 25BAT
                await savingAccount.withdraw(addressBAT, numOfBAT.div(new BN(4)), { from: user2 });
                console.log("user2 withdraw 25BAT");
                const user2Deposit1 = await accountsContract.getDepositBalanceCurrent(
                    addressBAT,
                    user2
                );
                console.log("user2Deposit1: " + user2Deposit1.toString());

                // user2 withdraw 25BAT
                await savingAccount.withdraw(addressBAT, numOfBAT.div(new BN(4)), { from: user2 });
                console.log("user2 withdraw 25BAT");
                const user2Deposit2 = await accountsContract.getDepositBalanceCurrent(
                    addressBAT,
                    user2
                );
                console.log("user2Deposit2: " + user2Deposit2.toString());

                // user2 withdraw ALLBAT
                await savingAccount.withdrawAll(addressBAT, { from: user2 });
                console.log("user2 withdraw ALLBAT");
                const user2Deposit3 = await accountsContract.getDepositBalanceCurrent(
                    addressBAT,
                    user2
                );
                console.log("user2Deposit3: " + user2Deposit3.toString());

                // user1 withdraw 0.25ETH
                await savingAccount.withdraw(ETH_ADDRESS, numOfETH.div(new BN(4)), { from: user1 });
                console.log("user1 withdraw 0.25ETH");
                const user1Deposit1 = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );
                console.log("user1Deposit1: " + user1Deposit1.toString());

                // user1 withdraw 0.25ETH
                await savingAccount.withdraw(ETH_ADDRESS, numOfETH.div(new BN(4)), { from: user1 });
                console.log("user1 withdraw 0.25ETH");
                const user1Deposit2 = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );
                console.log("user1Deposit2: " + user1Deposit2.toString());

                // user1 withdraw ALLETH
                await savingAccount.withdrawAll(ETH_ADDRESS, { from: user1 });
                console.log("user1 withdraw ALLETH");
                const user1Deposit3 = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );
                console.log("user1Deposit3: " + user1Deposit3.toString());

                expect(user1Deposit).to.be.bignumber.equal(numOfETH);
                expect(user2Deposit).to.be.bignumber.equal(numOfBAT);
                expect(user1Borrow1).to.be.bignumber.equal(borrowAmount);
                expect(user1Borrow2).to.be.bignumber.equal(new BN(0));

                expect(user2Deposit1).to.be.bignumber.equal(numOfBAT.sub(numOfBAT.div(new BN(4))));
                expect(user2Deposit2).to.be.bignumber.equal(numOfBAT.sub(numOfBAT.div(new BN(2))));
                expect(user2Deposit3).to.be.bignumber.equal(new BN(0));
                expect(user1Deposit1).to.be.bignumber.equal(numOfETH.sub(numOfETH.div(new BN(4))));
                expect(user1Deposit2).to.be.bignumber.equal(numOfETH.sub(numOfETH.div(new BN(2))));
                expect(user1Deposit3).to.be.bignumber.equal(new BN(0));
            });

            it("Special test 3", async function () {
                this.timeout(0);
                // const
                const numOfDAI = eighteenPrecision.mul(new BN(100));
                console.log("const");

                await erc20DAI.approve(savingAccount.address, numOfDAI);

                // owner deposit 100DAI
                await savingAccount.deposit(addressDAI, numOfDAI);
                console.log("owner deposit 100DAI");
                const ownerDeposit = await accountsContract.getDepositBalanceCurrent(
                    addressDAI,
                    owner
                );
                console.log("ownerDeposit: " + ownerDeposit.toString());

                // Fastforward
                await savingAccount.fastForward(100000);

                const ownerBalanceBefore = await erc20DAI.balanceOf(owner);
                console.log("ownerBalanceBefore: " + ownerBalanceBefore.toString());
                // owner withdraw ALLDAI
                await savingAccount.withdrawAll(addressDAI);
                console.log("owner withdraw ALLDAI");
                const uownerDeposit3 = await accountsContract.getDepositBalanceCurrent(
                    addressDAI,
                    owner
                );
                console.log("ownerDeposit3: " + uownerDeposit3.toString());
                const ownerBalanceAfter = await erc20DAI.balanceOf(owner);
                console.log("ownerBalanceAfter: " + ownerBalanceAfter.toString());

                expect(ownerDeposit).to.be.bignumber.equal(numOfDAI);
                expect(uownerDeposit3).to.be.bignumber.equal(new BN(0));
            });
        });
    });
});
