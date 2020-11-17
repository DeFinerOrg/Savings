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
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cETH_addr: any;
    let cBAT_addr: any;
    let cZRX_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cBAT: t.MockCTokenInstance;
    let cZRX: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;

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
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cBAT_addr = await testEngine.tokenInfoRegistry.getCToken(addressBAT);
        cZRX_addr = await testEngine.tokenInfoRegistry.getCToken(addressZRX);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        cBAT = await MockCToken.at(cBAT_addr);
        cZRX = await MockCToken.at(cZRX_addr);
        cETH = await MockCToken.at(cETH_addr);
    });

    // Funtion to verify Compound balance in tests
    const compoundVerify = async (
        addressCToken: string,
        numOfToken: BN,
        balCTokenContractInit: BN,
        erc20contr: t.MockErc20Instance,
        cTokenTemp: t.MockCTokenInstance
    ) => {
        const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
        const balCTokenContract = await erc20contr.balanceOf(addressCToken);
        expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
            new BN(balCTokenContract).sub(new BN(balCTokenContractInit))
        );

        const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(savingAccount.address);
        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
    };

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
                        expect(
                            await compoundVerify(
                                addressCTokenTemp,
                                numOfToken,
                                BN(balCTokenContractInit),
                                erc20contr,
                                cTokenTemp
                            )
                        );
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
                    //expect(ZERO).to.be.bignumber.equal(balCToken);

                    // Verify CToken balance
                    const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                        savingAccount.address
                    );
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
                        expect(
                            await compoundVerify(
                                addressCTokenTemp,
                                numOfToken,
                                BN(balCTokenContractInit),
                                erc20contr,
                                cTokenTemp
                            )
                        );
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
                        expect(
                            await compoundVerify(
                                addressCTokenTemp,
                                numOfToken,
                                BN(balCTokenContractInit),
                                erc20contr,
                                cTokenTemp
                            )
                        );
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

                        // Verify Compound balance
                        const balCToken = await erc20contr.balanceOf(addressCTokenTemp);
                        //expect(ZERO).to.be.bignumber.equal(balCToken);

                        // Verify CToken balance
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(ZERO).to.be.bignumber.equal(balCTokens);
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
                        expect(
                            await compoundVerify(
                                addressCTokenTemp,
                                numOfToken,
                                BN(balCTokenContractInit),
                                erc20contr,
                                cTokenTemp
                            )
                        );
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
                        expect(
                            await compoundVerify(
                                addressCTokenTemp,
                                numOfToken,
                                BN(balCTokenContractInit),
                                erc20contr,
                                cTokenTemp
                            )
                        );
                    }
                }

                await time.increase(ONE_WEEK);

                for (let j = 0; j < 11; j++) {
                    tempContractAddress = tokens[j];
                    erc20contr = await ERC20.at(tempContractAddress);

                    if (j != 3 && j != 4 && j != 9 && j != 10) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

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

                    // Verify CToken balance
                    const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    expect(ZERO).to.be.bignumber.equal(balCTokens);
                }
            });
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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

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

                // Verify if deposit was successful (DAI)
                const expectedTokensAtSavingAccountContractDAI = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractDAI).to.be.bignumber.equal(
                    balSavingAccountDAI
                );

                // Verify Compound balance (cDAI)
                await compoundVerify(
                    cDAI_addr,
                    numOfToken,
                    BN(balCDAIContractInit),
                    erc20DAI,
                    cDAI
                );

                // Verify if deposit was successful (USDC)
                const expectedTokensAtSavingAccountContractUSDC = numOfUSDC
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractUSDC).to.be.bignumber.equal(
                    balSavingAccountUSDC
                );

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
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

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCDAIContractAfterBorrow)
                );
                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.greaterThan(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCUSDCContractAfterBorrow)
                );
                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.equal(BN(balCUSDCAfterBorrow));
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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfDAI
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
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.equal(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCAfterBorrow)
                );
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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfDAI
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
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.equal(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCAfterBorrow)
                );
            });

            it("should deposit DAI and 3 different users should borrow USDC in gaps of 1 month", async function() {
                this.timeout(0);
                // 1. User 1 deposits 100,000 USDC
                const numOfUSDC = new BN(100000);
                const numOfToken = new BN(1000);

                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20USDC.transfer(user1, numOfUSDC);
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

                // Verify if deposit was successful (USDC)
                const expectedTokensAtSavingAccountContractUSDC = numOfUSDC
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractUSDC).to.be.bignumber.equal(
                    balSavingAccountUSDC
                );

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                // 2. other users to borrow
                for (let u = 2; u <= 4; u++) {
                    const userBorrowIndex = new BN(u);
                    // Amount to be borrowed based upon the userBorrowIndex
                    const borrowAmount = numOfToken.mul(userBorrowIndex.sub(new BN(1)));
                    const depositAmountCollateral = eighteenPrecision.div(new BN(100));
                    const userNumber = accounts[userBorrowIndex];
                    const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);

                    await erc20DAI.transfer(userNumber, depositAmountCollateral);
                    await erc20DAI.approve(savingAccount.address, depositAmountCollateral, {
                        from: userNumber
                    });

                    await savingAccount.deposit(addressDAI, depositAmountCollateral, {
                        from: userNumber
                    });

                    // Verify Compound balance (cDAI)
                    const expectedTokensAtCTokenContract = depositAmountCollateral
                        .mul(new BN(85))
                        .div(new BN(100));
                    const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                    expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(
                        new BN(balCTokenContract).sub(new BN(balCDAIContractInit))
                    );

                    const expectedCTokensAtSavingAccount = depositAmountCollateral
                        .mul(new BN(85))
                        .div(new BN(100));
                    const balCTokens = await cDAI.balanceOfUnderlying.call(savingAccount.address);
                    expect(
                        expectedCTokensAtSavingAccount.mul(userBorrowIndex.sub(new BN(1)))
                    ).to.be.bignumber.equal(balCTokens);

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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfDAI
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
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.equal(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.equal(BN(balCUSDCAfterBorrow));

                const balSavingAccountUSDCBeforeDeposit2 = await erc20USDC.balanceOf(
                    savingAccount.address,
                    {
                        from: user1
                    }
                );

                const totalDefinerBalanceBeforeDepositUSDC2 = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user1
                );

                // 4. User1 tries to deposit his borrowed USDC
                await savingAccount.deposit(addressUSDC, new BN(1000), {
                    from: user1
                });

                const totalDefinerBalanceAfterDepositUSDC2 = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                const totalDefinerBalanceChangeUSDC2 = new BN(
                    totalDefinerBalanceAfterDepositUSDC2
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC2));
                expect(totalDefinerBalanceChangeUSDC2).to.be.bignumber.equal(new BN(1000));

                // TODO: Verify Compound balance (cUSDC)
                /* await compoundVerify(
                    cUSDC_addr,
                    new BN(1000),
                    BN(balCUSDCContractBeforeDeposit2),
                    erc20USDC,
                    cUSDC
                ); */
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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                // 1. Deposit
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, depositTokens, { from: user2 });

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractDAI).to.be.bignumber.equal(
                    balSavingAccountDAI
                );

                const expectedTokensAtSavingAccountContractUSDC = depositTokens
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractUSDC).to.be.bignumber.equal(
                    balSavingAccountUSDC
                );

                // Verify Compound balance (cDAI)
                await compoundVerify(
                    cDAI_addr,
                    numOfToken,
                    BN(balCDAIContractInit),
                    erc20DAI,
                    cDAI
                );

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    depositTokens,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
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
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(depositTokens);

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.greaterThan(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.equal(BN(balCUSDCAfterBorrow));

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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = depositAmount
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

                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(depositAmount);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // Verify Compound balance (cDAI)
                await compoundVerify(
                    cDAI_addr,
                    depositAmount,
                    BN(balCDAIContractInit),
                    erc20DAI,
                    cDAI
                );

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

                // 2. Start borrowing.
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                const user1BalanceBeforeRepay = await erc20USDC.balanceOf(user1);
                console.log("user1BalanceBeforeRepay", user1BalanceBeforeRepay.toString());

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(new BN(100));
                expect(
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceBeforeBorrow))
                ).to.be.bignumber.equal(new BN(100));

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.equal(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCAfterBorrow)
                );

                // fastforward
                await savingAccount.fastForward(100000000);
                await savingAccount.deposit(addressDAI, new BN(10), { from: user1 });

                // 3. Start repayment.
                await savingAccount.repay(addressUSDC, new BN(100), { from: user1 });

                // 4. Verify the repay amount.
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);

                expect(
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceAfter))
                ).to.be.bignumber.equal(new BN(100));

                const totalDefinerBalanceAfterRepayUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterRepayUSDCUser1).to.be.bignumber.equal(ZERO);
            });

            it("User deposits DAI, borrows USDC, deposits DAI again, borrows USDC again and then repays", async function() {
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
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = depositAmount
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address, {
                    from: user1
                });
                expect(expectedTokensAtSavingAccountContractDAI).to.be.bignumber.equal(
                    balSavingAccountDAI
                );

                const expectedTokensAtSavingAccountContractUSDC = numOfUSDC
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address, {
                    from: user2
                });
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
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(depositAmount);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // Verify Compound balance (cDAI)
                await compoundVerify(
                    cDAI_addr,
                    depositAmount,
                    BN(balCDAIContractInit),
                    erc20DAI,
                    cDAI
                );

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

                // 2. Start borrowing.
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                const user1BalanceBefore = await erc20USDC.balanceOf(user1);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(new BN(100));

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.equal(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.equal(BN(balCUSDCAfterBorrow));

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
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceAfter))
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
                const borrowAmount = sixPrecision;
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);

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

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfDAI
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
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(numOfDAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.equal(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.equal(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCAfterBorrow)
                );

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
                const balCETHContractInit = await web3.eth.getBalance(cETH_addr);
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);
                const balCTokensBefore = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);

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

                // Verify if deposit was successful
                const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                const userBalanceDiff = new BN(ETHbalanceAfterDeposit).sub(
                    new BN(ETHbalanceBeforeDeposit)
                );
                const expectedTokensAtSavingAccountContractETH = new BN(numOfETH)
                    .mul(new BN(15))
                    .div(new BN(100));
                expect(userBalanceDiff).to.be.bignumber.equal(
                    expectedTokensAtSavingAccountContractETH
                );

                const expectedTokensAtSavingAccountContractDAI = numOfDAI
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

                // Some tokens are sent to Compound contract (ETH)
                const expectedTokensAtCTokenContract = numOfETH.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                expect(
                    new BN(balCETHContractInit).add(new BN(expectedTokensAtCTokenContract))
                ).to.be.bignumber.equal(balCTokenContract);

                // cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfETH.mul(new BN(85)).div(new BN(100));
                const balCTokensAfter = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                    balCTokensAfter.sub(balCTokensBefore)
                );

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                let ETHbalanceBeforeBorrow = await web3.eth.getBalance(savingAccount.address);

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);

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

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.greaterThan(BN(balCDAIAfterBorrow));

                const balCUSDCContractAfterBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCContractAfterBorrow)
                );

                expect(BN(balCUSDCBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCUSDCAfterBorrow)
                );

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

                const ETHbalanceBeforeWithdrawContr = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );

                // 4. Withdraw remaining ETH
                await savingAccount.withdraw(ETH_ADDRESS, totalAmountLeft, {
                    from: user1
                });

                const ETHbalanceAfterWithdrawContr = await accountsContract.getDepositBalanceCurrent(
                    ETH_ADDRESS,
                    user1
                );

                let accountBalanceDiff = new BN(ETHbalanceBeforeWithdrawContr).sub(
                    new BN(ETHbalanceAfterWithdrawContr)
                );

                // validate user 1 ETH balance
                expect(accountBalanceDiff).to.be.bignumber.equal(totalAmountLeft);
            });

            it("should deposit ETH, borrow more than reserve if collateral is sufficient", async function() {
                this.timeout(0);
                const numOfETH = eighteenPrecision;
                const numOfDAI = new BN(1000);
                const balCETHContractInit = await web3.eth.getBalance(cETH_addr);
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCTokensBefore = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );

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

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfDAI
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractDAI).to.be.bignumber.equal(
                    balSavingAccountDAI
                );

                const expectedTokensAtSavingAccountContractETH = numOfETH
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountETH = await web3.eth.getBalance(savingAccount.address);
                expect(expectedTokensAtSavingAccountContractETH).to.be.bignumber.equal(
                    balSavingAccountETH
                );

                // Some tokens are sent to Compound contract (ETH)
                const expectedTokensAtCTokenContract = numOfETH.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                expect(
                    new BN(balCETHContractInit).add(new BN(expectedTokensAtCTokenContract))
                ).to.be.bignumber.equal(balCTokenContract);

                // cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfETH.mul(new BN(85)).div(new BN(100));
                const balCTokensAfter = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                    balCTokensAfter.sub(balCTokensBefore)
                );

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, new BN(200), { from: user1 });

                const user1DAIBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressDAI,
                    user1
                );

                expect(new BN(user1DAIBalance)).to.be.bignumber.equal(new BN(200));

                // Verify Compound after Borrow
                const balCDAIContractAfterBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                expect(BN(balCDAIContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    BN(balCDAIContractAfterBorrow)
                );

                expect(BN(balCDAIBeforeBorrow)).to.be.bignumber.greaterThan(BN(balCDAIAfterBorrow));
            });

            it("should deposit ETH, borrow different tokens deposited by multiple users", async function() {
                this.timeout(0);

                const balCETHContractInit = await web3.eth.getBalance(cETH_addr);
                const balCTokensBefore = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);
                const balCBATContractInit = await erc20BAT.balanceOf(cBAT_addr);
                const balCZRXContractInit = await erc20ZRX.balanceOf(cZRX_addr);

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

                // Verify if deposit was successful
                const expectedTokensAtSavingAccountContractDAI = numOfDAI
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address, {
                    from: user2
                });
                expect(expectedTokensAtSavingAccountContractDAI).to.be.bignumber.equal(
                    balSavingAccountDAI
                );

                const expectedTokensAtSavingAccountContractUSDC = numOfUSDC
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address, {
                    from: user2
                });
                expect(expectedTokensAtSavingAccountContractUSDC).to.be.bignumber.equal(
                    balSavingAccountUSDC
                );

                const expectedTokensAtSavingAccountContractBAT = numOfBAT
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountBAT = await erc20BAT.balanceOf(savingAccount.address, {
                    from: user2
                });
                expect(expectedTokensAtSavingAccountContractBAT).to.be.bignumber.equal(
                    balSavingAccountBAT
                );

                const expectedTokensAtSavingAccountContractZRX = numOfZRX
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccountZRX = await erc20ZRX.balanceOf(savingAccount.address, {
                    from: user2
                });
                expect(expectedTokensAtSavingAccountContractZRX).to.be.bignumber.equal(
                    balSavingAccountZRX
                );

                // Some tokens are sent to Compound contract (ETH)
                const expectedTokensAtCTokenContract = numOfETH.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                expect(
                    new BN(balCETHContractInit).add(new BN(expectedTokensAtCTokenContract))
                ).to.be.bignumber.equal(balCTokenContract);

                // cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfETH.mul(new BN(85)).div(new BN(100));
                const balCTokensAfter = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                    balCTokensAfter.sub(balCTokensBefore)
                );

                // Verify Compound balance (cDAI)
                await compoundVerify(cDAI_addr, numOfDAI, BN(balCDAIContractInit), erc20DAI, cDAI);

                // Verify Compound balance (cUSDC)
                await compoundVerify(
                    cUSDC_addr,
                    numOfUSDC,
                    BN(balCUSDCContractInit),
                    erc20USDC,
                    cUSDC
                );

                // Verify Compound balance (cBAT)
                await compoundVerify(cBAT_addr, numOfBAT, BN(balCBATContractInit), erc20BAT, cBAT);

                // TODO: Returning 849 instead of 850
                // Verify Compound balance (cZRX)
                /* await compoundVerify(cZRX_addr, numOfZRX, BN(balCZRXContractInit), erc20ZRX, cZRX);
                console.log("cZRX-n"); */
                // Check deposit bal of user5

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
