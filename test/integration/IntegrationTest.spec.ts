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
        addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.cTokenRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.cTokenRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.cTokenRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
    });

    context("Deposit and Withdraw", async () => {
        it("should deposit all tokens and withdraw all tokens", async () => {
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
                    //await erc20contr.approve(savingAccount.address, numOfToken);
                    await savingAccount.depositToken(erc20contr.address, numOfToken, {
                        from: accounts[u]
                    });

                    //console.log("User", u);
                    //console.log("Token", tempContractAddress);

                    //Verify if deposit was successful

                    /* const expectedTokensAtSavingAccountContract = numOfToken
                        .mul(new BN(15))
                        .div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    ); */
                }
            }

            /* for (let userWithdraw = 0; userWithdraw < 3; userWithdraw++) {
                //Withdraw 1000 tokens of each Address
                for (let j = 0; j < 9; j++) {
                    tempContractAddress = tokens[j];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    await savingAccount.withdrawAllToken(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    //expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
                }
            } */
            return numOfToken;
        });

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

        //openzeppelintesthelper increase blocktime by  1 week
        it("should deposit 1million of each token, wait for a week, withdraw all", async () => {
            const numOfToken = new BN(10).pow(new BN(6));
            console.log(numOfToken);

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

            await time.increase(new BN(604800));

            for (let j = 0; j < 9; j++) {
                tempContractAddress = tokens[j];
                erc20contr = await MockERC20.at(tempContractAddress);

                await savingAccount.withdrawAllToken(erc20contr.address);

                //Verify if withdrawAll was successful
                const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                //expect(new BN("0")).to.be.bignumber.equal(balSavingAccount);
            }
        });

        it("should deposit and withdraw with interest");
    });

    context("Deposit and Borrow", async () => {
        it("should deposit $1 million value and borrow 0.6 million");
    });

    context("Deposit, Borrow, Repay", async () => {
        it("");
    });

    context("Deposit, Borrow and Withdraw", async () => {
        it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw");

        it("should get deposit interests when he deposits, wait for a week and withdraw");
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
