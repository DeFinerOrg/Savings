import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("ERC20");
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
    const user4 = accounts[4];
    const user5 = accounts[5];
    const user6 = accounts[6];
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

    before(function() {
        this.timeout(0);
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function() {
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
            it("should deposit all tokens and withdraw all tokens", async function() {
                this.timeout(0);
                const numOfToken = new BN(1000);

                for (let i = 0; i < 11; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }
                    await erc20contr.transfer(user1, numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken, {
                        from: user1
                    });

                    const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                        savingAccount.address
                    );

                    const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        user1
                    );

                    const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);

                    await savingAccount.deposit(erc20contr.address, numOfToken, {
                        from: user1
                    });

                    const balSavingAccountAfterDeposit = await erc20contr.balanceOf(
                        savingAccount.address
                    );

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        user1
                    );

                    const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit).sub(
                        new BN(totalDefinerBalanceBeforeDeposit)
                    );
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                    // Verify if deposit was successful
                    // checking if token index is not that of a Compound unsupported token
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        const expectedTokensAtSavingAccountContract = numOfToken
                            .mul(new BN(15))
                            .div(new BN(100));
                        const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );
                    } else {
                        const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                        expect(numOfToken).to.be.bignumber.equal(balSavingAccount);
                    }

                    // Verify balance on Compound
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20contr.balanceOf(addressCTokenTemp);
                        expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
                            new BN(balCTokenContract).sub(new BN(balCTokenContractInit))
                        );

                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
                    }
                }

                // Withdraw all tokens of each Address
                for (let j = 0; j < 11; j++) {
                    tempContractAddress = tokens[j];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (j != 3 && j != 4 && j != 9 && j != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

                    await savingAccount.withdrawAll(erc20contr.address, {
                        from: user1
                    });

                    // Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                    // Verify Compound balance
                    const balCToken = await erc20contr.balanceOf(addressCTokenTemp);

                    // Verify CToken balance
                    const balCTokens = await cTokenTemp.balanceOf(savingAccount.address);
                    expect(ZERO).to.be.bignumber.equal(balCTokens);

                    // Verify DeFiner balance
                    const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        user1
                    );
                    expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                }
            });

            it("should deposit all and withdraw only non-Compound tokens (MKR, TUSD)", async function() {
                this.timeout(0);
                const numOfToken = new BN(1000);

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

                    //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken);
                    //await erc20contr.approve(savingAccount.address, numOfToken);
                    const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );
                    const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);

                    await savingAccount.deposit(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    const expectedTokensAtSavingAccountContract =
                        i == 3 || i == 4 || i == 9 || i == 10
                            ? numOfToken
                            : numOfToken.mul(new BN(15)).div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );

                    // Verify balance on Compound
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20contr.balanceOf(addressCTokenTemp);

                        expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
                            new BN(balCTokenContract).sub(new BN(balCTokenContractInit))
                        );

                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
                    }

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );

                    const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit).sub(
                        new BN(totalDefinerBalanceBeforeDeposit)
                    );
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
                }

                // Withdraw TUSD & MKR
                for (let i = 3; i <= 4; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await ERC20.at(tempContractAddress);

                    await savingAccount.withdrawAll(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                    // Verify DeFiner balance
                    const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );
                    expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                }
            });

            it("should deposit all and withdraw Compound supported tokens", async function() {
                this.timeout(0);
                const numOfToken = new BN(1000);

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

                    //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken);
                    //await erc20contr.approve(savingAccount.address, numOfToken);

                    const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );
                    const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);

                    await savingAccount.deposit(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    const expectedTokensAtSavingAccountContract =
                        i == 3 || i == 4 || i == 9 || i == 10
                            ? numOfToken
                            : numOfToken.mul(new BN(15)).div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );

                    const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit).sub(
                        new BN(totalDefinerBalanceBeforeDeposit)
                    );
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                    // Verify balance on Compound
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20contr.balanceOf(addressCTokenTemp);

                        expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
                            new BN(balCTokenContract).sub(new BN(balCTokenContractInit))
                        );

                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
                    }
                }

                for (let i = 0; i < 11; i++) {
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        // const balSavingCToken = await cTokenTemp.balanceOfUnderlying.call(savingAccount.address);
                        // console.log(balSavingCToken.toString())
                        await savingAccount.withdrawAll(erc20contr.address);

                        //Verify if withdrawAll was successful
                        const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20contr.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    }
                }
            });

            it("should deposit all and withdraw only token with less than 18 decimals", async function() {
                this.timeout(0);
                const numOfToken = new BN(1000);

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

                    //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken);
                    //await erc20contr.approve(savingAccount.address, numOfToken);
                    const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );
                    const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);

                    await savingAccount.deposit(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    const expectedTokensAtSavingAccountContract =
                        i == 3 || i == 4 || i == 9 || i == 10
                            ? numOfToken
                            : numOfToken.mul(new BN(15)).div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );

                    const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit).sub(
                        new BN(totalDefinerBalanceBeforeDeposit)
                    );
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                    // Verify balance on Compound
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20contr.balanceOf(addressCTokenTemp);

                        expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
                            new BN(balCTokenContract).sub(new BN(balCTokenContractInit))
                        );

                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
                    }
                }

                for (let i = 0; i < 11; i++) {
                    if (i == 1 || i == 2 || i == 8) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);
                        await savingAccount.withdrawAll(erc20contr.address);

                        //Verify if withdrawAll was successful
                        const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20contr.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    }
                }
            });

            it("should deposit 1 million of each token, wait for a week, withdraw all", async function() {
                this.timeout(0);
                const numOfToken = new BN(10).pow(new BN(6));

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

                    //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                    await erc20contr.approve(savingAccount.address, numOfToken);
                    //await erc20contr.approve(savingAccount.address, numOfToken);
                    const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );

                    const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);
                    await savingAccount.deposit(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    const expectedTokensAtSavingAccountContract =
                        i == 3 || i == 4 || i == 9 || i == 10
                            ? numOfToken
                            : numOfToken.mul(new BN(15)).div(new BN(100));
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                        balSavingAccount
                    );

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );

                    const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit).sub(
                        new BN(totalDefinerBalanceBeforeDeposit)
                    );
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                    // Verify balance on Compound
                    if (i != 3 && i != 4 && i != 9 && i != 10) {
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20contr.balanceOf(addressCTokenTemp);

                        expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
                            new BN(balCTokenContract).sub(new BN(balCTokenContractInit))
                        );

                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
                    }
                }

                await time.increase(ONE_WEEK);

                for (let j = 0; j < 11; j++) {
                    tempContractAddress = tokens[j];
                    erc20contr = await ERC20.at(tempContractAddress);

                    await savingAccount.withdrawAll(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                    // Verify DeFiner balance
                    const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                        erc20contr.address,
                        owner
                    );
                    expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                }
            });

            it("should deposit and withdraw with interest");
        });
    });

    context("Deposit and Borrow", async () => {
        context("should succeed", async () => {
            it("should deposit $1 million value and borrow 0.6 million", async function() {
                this.timeout(0);
                const numOfToken = eighteenPrecision.mul(new BN(10).pow(new BN(6)));
                const numOfUSDC = sixPrecision.mul(new BN(10).pow(new BN(7)));
                const borrowTokens = eighteenPrecision
                    .mul(new BN(6))
                    .mul(new BN(10).pow(new BN(5)));

                // Transfer 1 million DAI tokens (18 decimals) to user1
                await erc20DAI.transfer(user1, numOfToken);

                // Transfer 1 million USDC tokens (6 decimals) to user2
                await erc20USDC.transfer(user2, numOfUSDC);

                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                // 1. Deposit $1 million
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                //Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractDAI).to.be.bignumber.equal(
                    balSavingAccountDAI
                );

                const expectedTokensAtSavingAccountContractUSDC = numOfUSDC
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractUSDC).to.be.bignumber.equal(
                    balSavingAccountUSDC
                );

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfToken);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Borrow $0.6 million
                await savingAccount.borrow(addressDAI, borrowTokens, { from: user2 });
                // 3. Verify the amount borrowed
                const user2Balance = await erc20DAI.balanceOf(user2);
                expect(user2Balance).to.be.bignumber.equal(borrowTokens);

                const totalDefinerBalanceAfterBorrowtDAIUser1 = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowtDAIUser1).to.be.bignumber.equal(numOfToken);

                const totalDefinerBalanceAfterBorrowtDAIUser2 = await accountsContract.getBorrowBalanceCurrent(
                    erc20DAI.address,
                    user2
                );
                expect(totalDefinerBalanceAfterBorrowtDAIUser2).to.be.bignumber.equal(borrowTokens);
            });

            it("should allow the borrow of tokens which are more than reserve if user has enough collateral", async function() {
                this.timeout(0);
                //user1 deposits 1000 full tokens of DAI
                //user2 deposits 1000 full of USDC
                //user1 borrows 300 full tokens of USDC which are more than reserve(150 full tokens)
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));
                const borrowAmount = sixPrecision.mul(new BN(300));
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

                // 2. Borrow USDC
                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: user1
                });

                // 3. Verify the loan amount
                const user1Balance = await erc20USDC.balanceOf(user1);
                const user1BalanceChange = new BN(user1Balance).sub(
                    new BN(user1BalanceBeforeBorrow)
                );
                expect(user1BalanceChange).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowtDAIUser1 = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowtDAIUser1).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(borrowAmount);
            });

            it("should deposit DAI and borrow USDC tokens whose amount is equal to ILTV of collateral", async function() {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Start borrowing.
                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);
                const borrowAmount = numOfDAI
                    .mul(sixPrecision)
                    .mul(await tokenInfoRegistry.priceFromIndex(0))
                    .mul(new BN(60))
                    .div(new BN(100))
                    .div(await tokenInfoRegistry.priceFromIndex(1))
                    .div(eighteenPrecision);

                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: user1
                });

                // 3. Verify the loan amount.
                const user1Balance = await erc20USDC.balanceOf(user1);
                const user1BalanceChange = new BN(user1Balance).sub(
                    new BN(user1BalanceBeforeBorrow)
                );
                expect(user1BalanceChange).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(borrowAmount);
            });

            it("should deposit DAI and 3 different users should borrow USDC in gaps of 1 month", async function() {
                this.timeout(0);
                // 1. User 1 deposits 100,000 USDC
                const numOfUSDC = new BN(100000);
                const numOfToken = new BN(1000);

                await erc20USDC.transfer(user1, numOfUSDC);
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

                // 2. other users to borrow
                for (let u = 2; u <= 4; u++) {
                    const userBorrowIndex = new BN(u);
                    // Amount to be borrowed based upon the userBorrowIndex
                    const borrowAmount = numOfToken.mul(userBorrowIndex.sub(new BN(1)));
                    const depositAmountCollateral = eighteenPrecision.div(new BN(100));
                    const userNumber = accounts[userBorrowIndex];

                    await erc20DAI.transfer(userNumber, depositAmountCollateral);
                    await erc20DAI.approve(savingAccount.address, depositAmountCollateral, {
                        from: userNumber
                    });

                    await savingAccount.deposit(addressDAI, depositAmountCollateral, {
                        from: userNumber
                    });

                    let userDefinerBalanceBeforeBorrow = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        userNumber
                    );

                    let userTotalBalanceBeforeDAI = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        userNumber
                    );

                    const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                    const expectedTokensAtSavingAccountContract = depositAmountCollateral
                        .mul(new BN(15))
                        .div(new BN(100));
                    expect(
                        expectedTokensAtSavingAccountContract.mul(userBorrowIndex.sub(new BN(1)))
                    ).to.be.bignumber.equal(balSavingAccount);

                    // Advance blocks by 150
                    //await time.increase(ONE_MONTH);
                    let block = await web3.eth.getBlock("latest");
                    console.log("block_number", block.number);

                    let targetBlock = new BN(block.number).add(new BN(150));

                    await time.advanceBlockTo(targetBlock);

                    let blockAfter = await web3.eth.getBlock("latest");
                    console.log("block_number_After", blockAfter.number);

                    // check for interest rate
                    let userTotalBalanceAfterDAI = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        userNumber
                    );

                    expect(new BN(userTotalBalanceBeforeDAI)).to.be.bignumber.equal(
                        new BN(userTotalBalanceAfterDAI)
                    );

                    // Start borrowing
                    const userBalanceBeforeBorrow = await erc20USDC.balanceOf(userNumber);
                    await savingAccount.borrow(addressUSDC, borrowAmount, {
                        from: userNumber
                    });

                    let userDefinerBalanceAfterBorrow = await accountsContract.getBorrowBalanceCurrent(
                        addressUSDC,
                        userNumber
                    );
                    const userBalanceAfterBorrow = await erc20USDC.balanceOf(userNumber);
                    const userBalanceDiff = new BN(userBalanceAfterBorrow).sub(
                        new BN(userBalanceBeforeBorrow)
                    );
                    const userDefinerBalanceDiff = new BN(userDefinerBalanceAfterBorrow).sub(
                        new BN(userDefinerBalanceBeforeBorrow)
                    );
                    // Verify if borrow was successful
                    expect(borrowAmount).to.be.bignumber.equal(userDefinerBalanceDiff);
                    expect(userBalanceDiff).to.be.bignumber.equal(borrowAmount);
                }
            });

            it("when user deposits DAI, borrows USDC and tries to deposit his borrowed tokens", async function() {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Start borrowing.
                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);
                const borrowAmount = sixPrecision.mul(new BN(10));

                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: user1
                });

                // 3. Verify the loan amount.
                const user1Balance = await erc20USDC.balanceOf(user1);
                const user1BalanceChange = new BN(user1Balance).sub(
                    new BN(user1BalanceBeforeBorrow)
                );
                expect(user1BalanceChange).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(borrowAmount);

                // TODO: balance verify for USDC
                // 4. User1 tries to deposit his borrowed USDC
                await savingAccount.deposit(addressUSDC, new BN(1000), {
                    from: user1
                });
            });
        });

        context("should fail", async () => {
            it("when user deposits USDC, borrows DAI and wants to deposit DAI without repaying", async function() {
                this.timeout(0);
                const numOfToken = new BN(2000);
                const depositTokens = new BN(1000);
                const borrowTokens = new BN(600);
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                // 1. Deposit
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, depositTokens, { from: user2 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfToken);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(depositTokens);

                const user2BalanceBeforeBorrow = await erc20DAI.balanceOf(user2);
                // 2. Borrow
                await savingAccount.borrow(addressDAI, borrowTokens, { from: user2 });

                // 3. Verify the amount borrowed
                const user2Balance = await erc20DAI.balanceOf(user2);
                expect(
                    new BN(user2Balance).sub(new BN(user2BalanceBeforeBorrow))
                ).to.be.bignumber.equal(borrowTokens);

                const totalDefinerBalanceAfterBorrowUSDCUser2 = await accountsContract.getBorrowBalanceCurrent(
                    erc20DAI.address,
                    user2
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser2).to.be.bignumber.equal(borrowTokens);

                await expectRevert(
                    savingAccount.deposit(addressDAI, borrowTokens, { from: user2 }),
                    "SafeERC20: low-level call failed"
                );
            });
        });
    });

    context("Deposit, Borrow, Repay", async () => {
        context("should succeed", async () => {
            // Borrow and repay of tokens with less than 18 decimals
            it("should deposit DAI, borrow USDC and repay after one month", async function() {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision;
                const numOfUSDC = new BN(1000);
                const depositAmount = numOfDAI.div(new BN(2));
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );

                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(depositAmount);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

                // 2. Start borrowing.
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                const user1BalanceBefore = await erc20USDC.balanceOf(user1);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(new BN(100));

                const user1BalanceBeforeRepay = await erc20USDC.balanceOf(user1);

                // fastforward
                await savingAccount.fastForward(100000000);
                await savingAccount.deposit(addressDAI, new BN(10), { from: user1 });

                // 3. Start repayment.
                await savingAccount.repay(addressUSDC, new BN(100), { from: user1 });

                // 4. Verify the repay amount.
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(
                    new BN(user1BalanceBefore).sub(new BN(user1BalanceBeforeBorrow))
                ).to.be.bignumber.equal(new BN(100));
                // 912949920
                //expect(user1BalanceAfter).to.be.bignumber.equal(ZERO);

                const totalDefinerBalanceAfterRepayUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterRepayUSDCUser1).to.be.bignumber.equal(ZERO);
            });

            it("User deposits DAI , borrows USDC, deposits DAI again, borrows USDC again and then repays", async function() {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision;
                const numOfUSDC = sixPrecision;
                const depositAmount = numOfDAI.div(new BN(2));

                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(depositAmount);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

                // 2. Start borrowing.
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                const user1BalanceBefore = await erc20USDC.balanceOf(user1);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(new BN(100));

                // Deposit and borrow again
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });

                const user1BalanceBeforeRepay = await erc20USDC.balanceOf(user1);
                console.log("user1BalanceBeforeRepay", user1BalanceBeforeRepay.toString());

                // 3. Start repayment.
                savingAccount.repay(addressUSDC, new BN(200), { from: user1 });

                // 4. Verify the repay amount.
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceBeforeBorrow))
                ).to.be.bignumber.equal(new BN(200));

                const totalDefinerBalanceAfterRepayUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterRepayUSDCUser1).to.be.bignumber.equal(ZERO);
            });
        });
    });

    context("Deposit, Borrow and Withdraw", async () => {
        context("should succeed", async () => {
            it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw", async function() {
                this.timeout(0);
                const numOfDAI = eighteenPrecision.mul(new BN(10));
                const numOfUSDC = sixPrecision.mul(new BN(10));
                const borrowAmount = numOfUSDC.div(new BN(10));
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
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
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);
                // 2. Borrow USDC
                await savingAccount.borrow(addressUSDC, borrowAmount, { from: user1 });

                const balSavingAccountDAIAfterBorrow = await erc20DAI.balanceOf(
                    savingAccount.address
                );

                // Amount that is locked as collateral
                const collateralLocked = borrowAmount
                    .mul(eighteenPrecision)
                    .mul(await tokenInfoRegistry.priceFromIndex(1))
                    .mul(new BN(100))
                    .div(new BN(60))
                    .div(await tokenInfoRegistry.priceFromIndex(0))
                    .div(sixPrecision);

                // 3. Verify the loan amount
                const user1BalanceAfterBorrow = await erc20USDC.balanceOf(user1);
                expect(
                    new BN(user1BalanceAfterBorrow).sub(new BN(user1BalanceBeforeBorrow))
                ).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(borrowAmount);

                // Total remaining DAI after borrow
                const remainingDAI = numOfDAI.sub(new BN(collateralLocked));

                // 4. Withdraw remaining DAI
                await savingAccount.withdraw(erc20DAI.address, remainingDAI, { from: user1 });

                const totalDefinerBalanceAfterWithdrawDAIUser1 = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                expect(totalDefinerBalanceAfterWithdrawDAIUser1).to.be.bignumber.equal(
                    collateralLocked
                );
            });

            context("should fail", async () => {});
        });
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

    context("with ETH", async () => {
        context("should succeed", async () => {
            it("should deposit ETH, borrow DAI & USDC, withdraw all remaining ETH", async function() {
                this.timeout(0);
                const numOfETH = eighteenPrecision.mul(new BN(10));
                const numOfDAI = new BN(1000);
                const numOfUSDC = new BN(1000);

                // 1. Deposit collateral
                await erc20DAI.transfer(user2, numOfDAI);
                await erc20USDC.transfer(user3, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, {
                    from: user2
                });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                    from: user3
                });

                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH
                });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user3 });

                let ETHbalanceBeforeBorrow = await web3.eth.getBalance(savingAccount.address);

                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(100), { from: user1 });
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });

                const user1DAIBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressDAI,
                    user1
                );
                const user1USDCBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );

                expect(new BN(user1DAIBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1USDCBalance)).to.be.bignumber.equal(new BN(100));

                // amount locked as collateral
                const lockedAmountDAI = new BN(100)
                    .mul(await tokenInfoRegistry.priceFromIndex(0))
                    .mul(new BN(100))
                    .div(new BN(60));

                const lockedAmountUSDC = new BN(100)
                    .mul(await tokenInfoRegistry.priceFromIndex(1))
                    .mul(sixPrecision)
                    .mul(new BN(100))
                    .div(new BN(60))
                    .div(eighteenPrecision);

                const totalLockedAmount = new BN(lockedAmountDAI).add(new BN(lockedAmountUSDC));
                const totalAmountLeft = new BN(ETHbalanceBeforeBorrow).sub(
                    new BN(totalLockedAmount)
                );

                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(user1);

                console.log("lockedAmountDAI", lockedAmountDAI.toString());
                console.log("lockedAmountUSDC", lockedAmountUSDC.toString());
                console.log("totalLockedAmount", totalLockedAmount.toString());
                console.log("ETHbalanceBeforeWithdraw", ETHbalanceBeforeWithdraw.toString());
                console.log("totalAmountLeft", totalAmountLeft.toString());

                // 4. Withdraw remaining ETH
                await savingAccount.withdraw(ETH_ADDRESS, totalAmountLeft, {
                    from: user1
                });

                let ETHbalanceAfterWithdraw = await web3.eth.getBalance(user1);
                console.log("ETHbalanceAfterWithdraw", ETHbalanceAfterWithdraw.toString());

                let accountBalanceDiff = new BN(ETHbalanceAfterWithdraw).sub(
                    new BN(ETHbalanceBeforeWithdraw)
                );
                // validate user 1 ETH balance
                //expect(accountBalanceDiff).to.be.bignumber.equal(totalAmountLeft); // minute difference between the two
            });

            it("should deposit ETH, borrow more than reserve if collateral is sufficient", async function() {
                this.timeout(0);
                const numOfETH = eighteenPrecision;
                const numOfDAI = new BN(1000);

                // 1. Deposit collateral
                await erc20DAI.transfer(user2, numOfDAI);
                await erc20DAI.approve(savingAccount.address, numOfDAI, {
                    from: user2
                });

                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH
                });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });

                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(200), { from: user1 });

                const user1DAIBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressDAI,
                    user1
                );

                expect(new BN(user1DAIBalance)).to.be.bignumber.equal(new BN(200));
            });

            it("should deposit ETH, borrow different tokens deposited by multiple users", async function() {
                this.timeout(0);
                const numOfETH = eighteenPrecision;
                const numOfDAI = new BN(1000);
                const numOfUSDC = new BN(1000);
                const numOfBAT = new BN(1000);
                const numOfZRX = new BN(1000);
                const numOfMKR = new BN(1000);

                // 1. Deposit collateral
                await erc20DAI.transfer(user2, numOfDAI);
                await erc20USDC.transfer(user3, numOfUSDC);
                await erc20BAT.transfer(user4, numOfBAT);
                await erc20BAT.transfer(user5, numOfZRX);
                await erc20MKR.transfer(user6, numOfMKR);

                await erc20DAI.approve(savingAccount.address, numOfDAI, {
                    from: user2
                });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                    from: user3
                });
                await erc20BAT.approve(savingAccount.address, numOfBAT, {
                    from: user4
                });
                await erc20ZRX.approve(savingAccount.address, numOfZRX, {
                    from: user5
                });
                await erc20MKR.approve(savingAccount.address, numOfMKR, {
                    from: user6
                });

                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH
                });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user3 });
                await savingAccount.deposit(addressBAT, numOfBAT, { from: user4 });
                await savingAccount.deposit(addressZRX, numOfZRX, { from: user5 });
                await savingAccount.deposit(addressMKR, numOfMKR, { from: user6 });

                let ETHbalanceBeforeBorrow = await web3.eth.getBalance(savingAccount.address);
                console.log("ETHbalanceBeforeBorrow", ETHbalanceBeforeBorrow.toString());

                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(100), { from: user1 });
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                await savingAccount.borrow(addressBAT, new BN(100), { from: user1 });
                await savingAccount.borrow(addressZRX, new BN(100), { from: user1 });
                await savingAccount.borrow(addressMKR, new BN(100), { from: user1 });

                const user1DAIBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressDAI,
                    user1
                );
                const user1USDCBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );
                const user1BATBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressDAI,
                    user1
                );
                const user1ZRXBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );
                const user1MKRBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );

                expect(new BN(user1DAIBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1USDCBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1BATBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1ZRXBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1MKRBalance)).to.be.bignumber.equal(new BN(100));
            });
        });

        it("should deposit DAI and borrow DAI only after withdrawing first", async function() {
            this.timeout(0);
            /* const numOfToken = new BN(1000);
                // 1. Transfer 1000 DAI to user 1 & 2, 1000 USDC to user 1
                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user1, numOfUSDC);
                await erc20DAI.transfer(user2, numOfDAI);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
                let userBalanceBeforeDeposit = await erc20DAI.balanceOf(user1);
                // 2. User 1 & 2 deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                // Verify deposit
                const expectedTokensAtSavingAccountContract = numOfDAI
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract.mul(new BN(2))).to.be.bignumber.equal(
                    balSavingAccount
                );
                // 3. User 1 tries to borrow DAI
                await savingAccount.borrow(addressDAI, new BN(100), {
                    from: user1
                });
                // 4. User 1 withdraws all DAI
                await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                // 4.1 Verify if withdraw was successful
                expect(new BN(userBalanceBeforeDeposit).add(new BN(100))).to.be.bignumber.equal(
                    userBalanceAfterWithdraw
                );
                // 5. Deposit USDC and borrow DAI
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });
                const limitAmount = numOfUSDC
                    .mul(eighteenPrecision)
                    .mul(await tokenInfoRegistry.priceFromIndex(1))
                    .mul(new BN(50))
                    .div(new BN(100))
                    .div(await tokenInfoRegistry.priceFromIndex(0))
                    .div(sixPrecision);
                await savingAccount.borrow(addressDAI, limitAmount, { from: user1 });
                let userBalanceAfterBorrow = await erc20DAI.balanceOf(user1);
                let expectedBalanceAfterBorrow = new BN(userBalanceAfterWithdraw).add(limitAmount);
                console.log("limitAmount", limitAmount);
                console.log("userBalanceAfterBorrow", userBalanceAfterBorrow);
                console.log("expectedBalanceAfterBorrow", expectedBalanceAfterBorrow);
                // Verify that borrow was successful
                expect(expectedBalanceAfterBorrow).to.be.bignumber.equal(userBalanceAfterBorrow); */
        });

        it("should get deposit interests when he deposits, wait for a week and withdraw", async () => {});
    });
    context("should fail", async () => {});

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
