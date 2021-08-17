import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../../test-helpers/lib/lib";
import { takeSnapshot, revertToSnapShot } from "../../../test-helpers/SnapshotUtils";
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

let snapshotId: string;
contract("Integration Tests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

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

    before(function () {
        this.timeout(0);
        // Things to initialize before all test
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");

        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        bank = await testEngine.bank;

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
        await savingAccount.fastForward(1);
    });

    context("Deposit and Withdraw", async () => {
        context("should succeed", async () => {
            it("should deposit all tokens and withdraw all tokens", async function () {
                this.timeout(0);
                const numOfToken = new BN(1000);
                await savingAccount.fastForward(1000);

                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                                tempContractAddress
                            );
                            cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        }
                        await erc20contr.transfer(user1, numOfToken);
                        await erc20contr.approve(savingAccount.address, numOfToken, {
                            from: user1,
                        });

                        const balCTokensBefore = new BN(
                            await cTokenTemp.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                            savingAccount.address
                        );

                        await erc20contr.transfer(user1, numOfToken);
                        await erc20contr.approve(savingAccount.address, numOfToken, {
                            from: user1,
                        });

                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                user1
                            );

                        await savingAccount.deposit(erc20contr.address, numOfToken, {
                            from: user1,
                        });

                        const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                user1
                            );

                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));

                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                        // Verify if deposit was successful
                        // checking if token index is not that of a Compound unsupported token
                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            await savAccBalVerify(
                                0,
                                numOfToken,
                                erc20contr.address,
                                cTokenTemp,
                                balCTokensBefore,
                                BN(balSavingAccountBeforeDeposit),
                                bank,
                                savingAccount
                            );
                        } else {
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(numOfToken).to.be.bignumber.equal(balSavingAccount);
                        }
                    }
                }

                // Withdraw all tokens of each Address
                for (let j = 0; j < 11; j++) {
                    if (j != 9) {
                        tempContractAddress = tokens[j];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (j != 3 && j != 4 && j != 10 && j != 11) {
                            addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                                tempContractAddress
                            );

                            cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        }

                        await savingAccount.withdrawAll(erc20contr.address, {
                            from: user1,
                        });

                        // Verify if withdrawAll was successful
                        const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                        // Verify Compound balance
                        const balCToken = await erc20contr.balanceOf(addressCTokenTemp);

                        // Verify CToken balance
                        const balCTokens = await cTokenTemp.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(ZERO).to.be.bignumber.equal(balCTokens);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                user1
                            );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    }
                }
            });

            it("should deposit all and withdraw only non-Compound tokens (MKR, TUSD)", async function () {
                this.timeout(0);
                const numOfToken = new BN(1000);

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                                tempContractAddress
                            );
                            cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        }

                        //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                        await erc20contr.approve(savingAccount.address, numOfToken);
                        //await erc20contr.approve(savingAccount.address, numOfToken);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                owner
                            );
                        const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);
                        const balCTokensBefore = new BN(
                            await cTokenTemp.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                            savingAccount.address
                        );

                        await savingAccount.deposit(erc20contr.address, numOfToken);

                        // Validate the total balance on DeFiner after deposit
                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            await savAccBalVerify(
                                0,
                                numOfToken,
                                erc20contr.address,
                                cTokenTemp,
                                balCTokensBefore,
                                BN(balSavingAccountBeforeDeposit),
                                bank,
                                savingAccount
                            );
                        } else {
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(numOfToken).to.be.bignumber.equal(balSavingAccount);
                        }
                    }
                }

                // Withdraw TUSD & MKR
                for (let i = 3; i <= 4; i++) {
                    if (i != 9) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);

                        await savingAccount.withdrawAll(erc20contr.address);

                        //Verify if withdrawAll was successful
                        const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                owner
                            );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    }
                }
            });

            it("should deposit all and withdraw Compound supported tokens", async function () {
                this.timeout(0);
                const numOfToken = new BN(1000);

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                                tempContractAddress
                            );
                            cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        }

                        //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                        await erc20contr.approve(savingAccount.address, numOfToken);
                        //await erc20contr.approve(savingAccount.address, numOfToken);

                        const balCTokensBefore = new BN(
                            await cTokenTemp.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                            savingAccount.address
                        );

                        await savingAccount.deposit(erc20contr.address, numOfToken);

                        // Validate the total balance on DeFiner after deposit
                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            await savAccBalVerify(
                                0,
                                numOfToken,
                                erc20contr.address,
                                cTokenTemp,
                                balCTokensBefore,
                                BN(balSavingAccountBeforeDeposit),
                                bank,
                                savingAccount
                            );
                        } else {
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(numOfToken).to.be.bignumber.equal(balSavingAccount);
                        }
                    }
                }

                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        if (i != 3 && i != 4 && i != 10 && i != 11) {
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
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                            // Verify DeFiner balance
                            const totalDefinerBalancAfterWithdraw =
                                await accountsContract.getDepositBalanceCurrent(
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
                }
            });

            it("should deposit all and withdraw only token with less than 18 decimals", async function () {
                this.timeout(0);
                const numOfToken = new BN(1000);

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                                tempContractAddress
                            );
                            cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        }

                        //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                        await erc20contr.approve(savingAccount.address, numOfToken);
                        //await erc20contr.approve(savingAccount.address, numOfToken);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                owner
                            );
                        const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);
                        const balCTokensBefore = new BN(
                            await cTokenTemp.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                            savingAccount.address
                        );

                        await savingAccount.deposit(erc20contr.address, numOfToken);

                        // Validate the total balance on DeFiner after deposit
                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            await savAccBalVerify(
                                0,
                                numOfToken,
                                erc20contr.address,
                                cTokenTemp,
                                balCTokensBefore,
                                BN(balSavingAccountBeforeDeposit),
                                bank,
                                savingAccount
                            );
                        } else {
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(numOfToken).to.be.bignumber.equal(balSavingAccount);
                        }
                    }
                }

                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        if (i == 1 || i == 2 || i == 8) {
                            tempContractAddress = tokens[i];
                            erc20contr = await ERC20.at(tempContractAddress);
                            await savingAccount.withdrawAll(erc20contr.address);

                            //Verify if withdrawAll was successful
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                            // Verify DeFiner balance
                            const totalDefinerBalancAfterWithdraw =
                                await accountsContract.getDepositBalanceCurrent(
                                    erc20contr.address,
                                    owner
                                );
                            expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                        }
                    }
                }
            });

            it("should deposit 1 million of each token, wait for a week, withdraw all", async function () {
                this.timeout(0);
                const numOfToken = new BN(10).pow(new BN(6));

                // Deposit all tokens
                for (let i = 0; i < 11; i++) {
                    if (i != 9) {
                        tempContractAddress = tokens[i];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                                tempContractAddress
                            );
                            cTokenTemp = await MockCToken.at(addressCTokenTemp);
                        }

                        //await erc20contr.transfer(accounts[userDeposit], numOfToken);
                        await erc20contr.approve(savingAccount.address, numOfToken);
                        //await erc20contr.approve(savingAccount.address, numOfToken);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20contr.address,
                                owner
                            );

                        const balCTokenContractInit = await erc20contr.balanceOf(addressCTokenTemp);
                        const balCTokensBefore = new BN(
                            await cTokenTemp.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balSavingAccountBeforeDeposit = await erc20contr.balanceOf(
                            savingAccount.address
                        );

                        await savingAccount.deposit(erc20contr.address, numOfToken);

                        // Validate the total balance on DeFiner after deposit
                        if (i != 3 && i != 4 && i != 10 && i != 11) {
                            await savAccBalVerify(
                                0,
                                numOfToken,
                                erc20contr.address,
                                cTokenTemp,
                                balCTokensBefore,
                                BN(balSavingAccountBeforeDeposit),
                                bank,
                                savingAccount
                            );
                        } else {
                            const balSavingAccount = await erc20contr.balanceOf(
                                savingAccount.address
                            );
                            expect(numOfToken).to.be.bignumber.equal(balSavingAccount);
                        }
                    }
                }

                await time.increase(ONE_WEEK);

                for (let j = 0; j < 11; j++) {
                    if (j != 9) {
                        tempContractAddress = tokens[j];
                        erc20contr = await ERC20.at(tempContractAddress);

                        if (j != 3 && j != 4 && j != 10 && j != 11) {
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
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
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
                }
            });
        });
    });

    context("Deposit and Borrow", async () => {
        context("should succeed", async () => {
            it("should deposit $1 million value and borrow 0.6 million", async function () {
                this.timeout(0);
                const numOfToken = eighteenPrecision.mul(new BN(10).pow(new BN(6)));
                const numOfUSDC = sixPrecision.mul(new BN(10).pow(new BN(7)));
                const borrowTokens = eighteenPrecision
                    .mul(new BN(6))
                    .mul(new BN(10).pow(new BN(5)));

                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                // Transfer 1 million DAI tokens (18 decimals) to user1
                await erc20DAI.transfer(user1, numOfToken);

                // Transfer 1 million USDC tokens (6 decimals) to user2
                await erc20USDC.transfer(user2, numOfUSDC);

                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                // 1. Deposit $1 million
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Validate the total balance on DeFiner after deposit
                await savAccBalVerify(
                    0,
                    numOfToken,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const savingAccountDAITokenAfterDeposit = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );

                // 2. Borrow $0.6 million
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                const usdcTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](usdcTokenIndex, true, {
                    from: user2,
                });
                await savingAccount.borrow(addressDAI, borrowTokens, { from: user2 });

                // 3. Verify the amount borrowed
                const user2Balance = await erc20DAI.balanceOf(user2);
                expect(user2Balance).to.be.bignumber.equal(borrowTokens);

                await savAccBalVerify(
                    2,
                    borrowTokens,
                    addressDAI,
                    cDAI,
                    BN(balCDAIBeforeBorrow),
                    savingAccountDAITokenAfterDeposit,
                    bank,
                    savingAccount
                );
            });

            it("should allow the borrow of tokens which are more than reserve if user has enough collateral", async function () {
                this.timeout(0);
                //user1 deposits 1000 full tokens of DAI
                //user2 deposits 1000 full of USDC
                //user1 borrows 300 full tokens of USDC which are more than reserve(150 full tokens)
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));
                const borrowAmount = sixPrecision.mul(new BN(300));
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Validate the total balance on DeFiner after deposit
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                // Validate the total balance on DeFiner after deposit
                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 2. Borrow USDC
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                const daiTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](daiTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: user1,
                });

                // 3. Verify the loan amount
                const user1Balance = await erc20USDC.balanceOf(user1);
                const user1BalanceChange = new BN(user1Balance).sub(
                    new BN(user1BalanceBeforeBorrow)
                );
                expect(user1BalanceChange).to.be.bignumber.equal(borrowAmount);

                await savAccBalVerify(
                    2,
                    borrowAmount,
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );
            });

            it("should deposit DAI and borrow USDC tokens whose amount is equal to ILTV of collateral", async function () {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                // Validate the total balance on DeFiner after deposit
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
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

                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                const daiTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](daiTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: user1,
                });

                // 3. Verify the loan amount.
                const user1Balance = await erc20USDC.balanceOf(user1);
                const user1BalanceChange = new BN(user1Balance).sub(
                    new BN(user1BalanceBeforeBorrow)
                );
                expect(user1BalanceChange).to.be.bignumber.equal(borrowAmount);

                await savAccBalVerify(
                    2,
                    borrowAmount,
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );
            });

            it("should deposit DAI and 3 different users should borrow USDC in gaps of 1 month", async function () {
                this.timeout(0);
                // 1. User 1 deposits 100,000 USDC
                const numOfUSDC = new BN(100000);
                const numOfToken = new BN(1000);

                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20USDC.transfer(user1, numOfUSDC);
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

                // Verify if deposit was successful (USDC)
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                // 2. other users to borrow
                for (let u = 2; u <= 4; u++) {
                    const userBorrowIndex = new BN(u);
                    // Amount to be borrowed based upon the userBorrowIndex
                    const borrowAmount = numOfToken.mul(userBorrowIndex.sub(new BN(1)));
                    const depositAmountCollateral = eighteenPrecision.div(new BN(100));
                    const userNumber = accounts[userBorrowIndex];
                    const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                    const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                        savingAccount.address
                    );
                    const balCTokensBefore = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await erc20DAI.transfer(userNumber, depositAmountCollateral);
                    await erc20DAI.approve(savingAccount.address, depositAmountCollateral, {
                        from: userNumber,
                    });

                    await savingAccount.deposit(addressDAI, depositAmountCollateral, {
                        from: userNumber,
                    });

                    await savAccBalVerify(
                        0,
                        depositAmountCollateral,
                        addressDAI,
                        cDAI,
                        balCTokensBefore,
                        BN(balSavingAccountUserBefore),
                        bank,
                        savingAccount
                    );

                    const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // Advance blocks by 150
                    //await time.increase(ONE_MONTH);
                    let block = await web3.eth.getBlock("latest");
                    console.log("block_number", block.number);

                    let targetBlock = new BN(block.number).add(new BN(150));

                    await time.advanceBlockTo(targetBlock);

                    let blockAfter = await web3.eth.getBlock("latest");
                    console.log("block_number_After", blockAfter.number);

                    // check for interest rate

                    // Start borrowing
                    const userBalanceBeforeBorrow = await erc20USDC.balanceOf(userNumber);
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: userNumber,
                        }
                    );
                    await savingAccount.borrow(addressUSDC, borrowAmount, {
                        from: userNumber,
                    });

                    await savAccBalVerify(
                        2,
                        borrowAmount,
                        addressUSDC,
                        cUSDC,
                        BN(balCUSDCBeforeBorrow),
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const userBalanceAfterBorrow = await erc20USDC.balanceOf(userNumber);
                    const userBalanceDiff = new BN(userBalanceAfterBorrow).sub(
                        new BN(userBalanceBeforeBorrow)
                    );
                    // Verify if borrow was successful
                    expect(userBalanceDiff).to.be.bignumber.equal(borrowAmount);
                }
            });

            it("when user deposits DAI, borrows USDC and tries to deposit his borrowed tokens", async function () {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));
                const totalDefinerBalanceBeforeDepositDAI =
                    await accountsContract.getDepositBalanceCurrent(addressDAI, user1);
                const totalDefinerBalanceBeforeDepositUSDC =
                    await accountsContract.getDepositBalanceCurrent(addressUSDC, user2);
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 2. Start borrowing.
                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);
                const borrowAmount = sixPrecision.mul(new BN(10));

                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                const daiTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](daiTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressUSDC, borrowAmount, {
                    from: user1,
                });

                // 3. Verify the loan amount.
                await savAccBalVerify(
                    2,
                    borrowAmount,
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const user1Balance = await erc20USDC.balanceOf(user1);
                const user1BalanceChange = new BN(user1Balance).sub(
                    new BN(user1BalanceBeforeBorrow)
                );
                expect(user1BalanceChange).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowUSDCUser1 =
                    await accountsContract.getBorrowBalanceCurrent(addressUSDC, user1);
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceBeforeDepositUSDC2 =
                    await accountsContract.getDepositBalanceCurrent(addressUSDC, user1);
                const balCUSDCContractBeforeDposit = await erc20USDC.balanceOf(cUSDC_addr);
                console.log(
                    "balCUSDCContractBeforeDposit",
                    balCUSDCContractBeforeDposit.toString()
                );
                const balSavingAccountUserBefore2 = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBefore2 = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                // 4. User1 tries to deposit his borrowed USDC
                await savingAccount.deposit(addressUSDC, new BN(1000), {
                    from: user1,
                });

                await savAccBalVerify(
                    0,
                    new BN(1000),
                    addressUSDC,
                    cUSDC,
                    balCTokensBefore2,
                    BN(balSavingAccountUserBefore2),
                    bank,
                    savingAccount
                );
            });
        });

        context("should fail", async () => {
            it("when user deposits USDC, borrows DAI and wants to deposit DAI without repaying", async function () {
                this.timeout(0);
                const numOfToken = new BN(2000);
                const depositTokens = new BN(1000);
                const borrowTokens = new BN(600);
                const totalDefinerBalanceBeforeDepositDAI =
                    await accountsContract.getDepositBalanceCurrent(addressDAI, user1);
                const totalDefinerBalanceBeforeDepositUSDC =
                    await accountsContract.getDepositBalanceCurrent(addressUSDC, user2);
                const balCDAIContractInit = await erc20DAI.balanceOf(cDAI_addr);
                const balCUSDCContractInit = await erc20USDC.balanceOf(cUSDC_addr);
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                // 1. Deposit
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, depositTokens, { from: user2 });

                // Verify if deposit was successful
                await savAccBalVerify(
                    0,
                    numOfToken,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    depositTokens,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountDAITokenAfterDeposit = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );
                const user2BalanceBeforeBorrow = await erc20DAI.balanceOf(user2);

                // 2. Borrow
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                const usdcTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](usdcTokenIndex, true, {
                    from: user2,
                });
                await savingAccount.borrow(addressDAI, borrowTokens, { from: user2 });

                // 3. Verify the amount borrowed
                await savAccBalVerify(
                    2,
                    borrowTokens,
                    addressDAI,
                    cDAI,
                    BN(balCDAIBeforeBorrow),
                    savingAccountDAITokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const user2Balance = await erc20DAI.balanceOf(user2);
                expect(
                    new BN(user2Balance).sub(new BN(user2BalanceBeforeBorrow))
                ).to.be.bignumber.equal(borrowTokens);

                const totalDefinerBalanceAfterBorrowUSDCUser2 =
                    await accountsContract.getBorrowBalanceCurrent(addressDAI, user2);
                expect(totalDefinerBalanceAfterBorrowUSDCUser2).to.be.bignumber.equal(borrowTokens);

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
            it("should deposit DAI, borrow USDC and repay after one month", async function () {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision;
                const numOfUSDC = new BN(1000);
                const depositAmount = numOfDAI.div(new BN(2));
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                await savAccBalVerify(
                    0,
                    depositAmount,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
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
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 2. Start borrowing.
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                const daiTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](daiTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });

                // Verify borrow
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const user1BalanceBeforeRepay = await erc20USDC.balanceOf(user1);
                const totalDefinerBalanceAfterBorrowUSDCUser1 =
                    await accountsContract.getBorrowBalanceCurrent(addressUSDC, user1);
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(new BN(100));
                expect(
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceBeforeBorrow))
                ).to.be.bignumber.equal(new BN(100));

                // fastforward
                await savingAccount.fastForward(100000000);
                await savingAccount.deposit(addressDAI, new BN(10), { from: user1 });

                const balCUSDCBeforeRepay = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenBeforeRepay = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 3. Start repayment.
                await savingAccount.repay(addressUSDC, new BN(100), { from: user1 });

                // 4. Verify the repay amount.
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceAfter))
                ).to.be.bignumber.equal(new BN(100));

                await savAccBalVerify(
                    3,
                    new BN(100),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeRepay),
                    savingAccountUSDCTokenBeforeRepay,
                    bank,
                    savingAccount
                );

                // const totalDefinerBalanceAfterRepayUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                //     addressUSDC,
                //     user1
                // );
                // expect(totalDefinerBalanceAfterRepayUSDCUser1).to.be.bignumber.equal(ZERO);
            });

            it("User deposits DAI, borrows USDC, deposits DAI again, borrows USDC again and then repays", async function () {
                this.timeout(0);
                // 1. Initiate deposit
                const numOfDAI = eighteenPrecision;
                const numOfUSDC = sixPrecision;
                const depositAmount = numOfDAI.div(new BN(2));
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                // Verify if deposit was successful
                await savAccBalVerify(
                    0,
                    depositAmount,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 2. Start borrowing.
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                const daiTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](daiTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });

                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const totalDefinerBalanceAfterBorrowUSDCUser1 =
                    await accountsContract.getBorrowBalanceCurrent(addressUSDC, user1);
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(new BN(100));

                const balSavingAccountUserBefore2 = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore2 = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );

                // Deposit and borrow again
                await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });

                // verify 2nd deposit
                await savAccBalVerify(
                    0,
                    depositAmount,
                    addressDAI,
                    cDAI,
                    balCTokensBefore2,
                    BN(balSavingAccountUserBefore2),
                    bank,
                    savingAccount
                );

                const balCUSDCBeforeBorrow2 = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenAfterDeposit2 = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });

                // verify 2nd borrow
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow2),
                    savingAccountUSDCTokenAfterDeposit2,
                    bank,
                    savingAccount
                );

                const user1BalanceBeforeRepay = await erc20USDC.balanceOf(user1);
                const balCUSDCBeforeRepay = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenBeforeRepay = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 3. Start repayment.
                savingAccount.repay(addressUSDC, new BN(200), { from: user1 });

                // 4. Verify the repay amount.
                await savAccBalVerify(
                    3,
                    new BN(200),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeRepay),
                    savingAccountUSDCTokenBeforeRepay,
                    bank,
                    savingAccount
                );

                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(
                    new BN(user1BalanceBeforeRepay).sub(new BN(user1BalanceAfter))
                ).to.be.bignumber.equal(new BN(200));

                const totalDefinerBalanceAfterRepayUSDCUser1 =
                    await accountsContract.getBorrowBalanceCurrent(addressUSDC, user1);
                expect(totalDefinerBalanceAfterRepayUSDCUser1).to.be.bignumber.equal(ZERO);
            });
        });
    });

    context("Deposit, Borrow and Withdraw", async () => {
        context("should succeed", async () => {
            it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw", async function () {
                this.timeout(0);
                const numOfDAI = eighteenPrecision.mul(new BN(10));
                const numOfUSDC = sixPrecision.mul(new BN(10));
                const borrowAmount = sixPrecision;
                const balSavingAccountUserBefore = await erc20DAI.balanceOf(savingAccount.address);
                const balCTokensBefore = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                // Verify if deposit was successful
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBefore,
                    BN(balSavingAccountUserBefore),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const user1BalanceBeforeBorrow = await erc20USDC.balanceOf(user1);
                const balCUSDCBeforeBorrow2 = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountUSDCTokenAfterDeposit2 = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // 2. Borrow USDC
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                const daiTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](daiTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressUSDC, borrowAmount, { from: user1 });

                // Amount that is locked as collateral
                const collateralLocked = borrowAmount
                    .mul(eighteenPrecision)
                    .mul(await tokenInfoRegistry.priceFromIndex(1))
                    .mul(new BN(100))
                    .div(new BN(60))
                    .div(await tokenInfoRegistry.priceFromIndex(0))
                    .div(sixPrecision);

                // 3. Verify the loan amount
                await savAccBalVerify(
                    2,
                    borrowAmount,
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow2),
                    savingAccountUSDCTokenAfterDeposit2,
                    bank,
                    savingAccount
                );

                const user1BalanceAfterBorrow = await erc20USDC.balanceOf(user1);
                expect(
                    new BN(user1BalanceAfterBorrow).sub(new BN(user1BalanceBeforeBorrow))
                ).to.be.bignumber.equal(borrowAmount);

                const savingAccountCDAITokenAfterDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const savingAccountDAITokenAfterDeposit = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );

                // Total remaining DAI after borrow
                const remainingDAI = numOfDAI.sub(new BN(collateralLocked));

                // 4. Withdraw remaining DAI
                await savingAccount.withdraw(addressDAI, remainingDAI, { from: user1 });

                await savAccBalVerify(
                    1,
                    remainingDAI,
                    erc20DAI.address,
                    cDAI,
                    savingAccountCDAITokenAfterDeposit,
                    savingAccountDAITokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const totalDefinerBalanceAfterWithdrawDAIUser1 =
                    await accountsContract.getDepositBalanceCurrent(addressDAI, user1);
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
            it("should deposit ETH, borrow DAI & USDC, withdraw all remaining ETH", async function () {
                this.timeout(0);
                const numOfETH = eighteenPrecision.mul(new BN(10));
                const numOfDAI = new BN(1000);
                const numOfUSDC = new BN(1000);
                const balCTokensBefore = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);
                const balSavingAccountUserBeforeDAI = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeDAI = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                // 1. Deposit collateral
                await erc20DAI.transfer(user2, numOfDAI);
                await erc20USDC.transfer(user3, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, {
                    from: user2,
                });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                    from: user3,
                });

                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH,
                });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user3 });

                // Verify if the deposits were successful
                await savAccBalVerify(
                    0,
                    numOfETH,
                    ETH_ADDRESS,
                    cETH,
                    balCTokensBefore,
                    new BN(ETHbalanceBeforeDeposit),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBeforeDAI,
                    BN(balSavingAccountUserBeforeDAI),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );

                const savingAccountDAITokenAfterDeposit = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );
                let ETHbalanceBeforeBorrow = await web3.eth.getBalance(savingAccount.address);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );

                // 2. Start borrowing.
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(ETH_ADDRESS);
                const ethTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](ethTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressDAI, new BN(100), { from: user1 });
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });

                // Verify that the borrow was successful
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressDAI,
                    cDAI,
                    BN(balCDAIBeforeBorrow),
                    savingAccountDAITokenAfterDeposit,
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
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
                const ETHbalanceBeforeWithdrawContr =
                    await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, user1);
                let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(savingAccount.address);
                const balCTokensBeforeWithdraw = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );

                // 4. Withdraw remaining ETH
                await savingAccount.withdraw(ETH_ADDRESS, totalAmountLeft, {
                    from: user1,
                });

                // Validate DeFiner balance
                await savAccBalVerify(
                    1,
                    totalAmountLeft,
                    ETH_ADDRESS,
                    cETH,
                    balCTokensBeforeWithdraw,
                    new BN(ETHbalanceBeforeWithdraw),
                    bank,
                    savingAccount
                );

                const ETHbalanceAfterWithdrawContr =
                    await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, user1);
                let accountBalanceDiff = new BN(ETHbalanceBeforeWithdrawContr).sub(
                    new BN(ETHbalanceAfterWithdrawContr)
                );

                // validate user 1 ETH balance
                expect(accountBalanceDiff).to.be.bignumber.equal(totalAmountLeft);
            });

            it("should deposit ETH, borrow more than reserve if collateral is sufficient", async function () {
                this.timeout(0);
                const numOfETH = eighteenPrecision;
                const numOfDAI = new BN(1000);
                const balCTokensBefore = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);
                const balSavingAccountUserBeforeDAI = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeDAI = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );

                // 1. Deposit collateral
                await erc20DAI.transfer(user2, numOfDAI);
                await erc20DAI.approve(savingAccount.address, numOfDAI, {
                    from: user2,
                });

                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH,
                });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });

                // Verify if deposit was successful
                await savAccBalVerify(
                    0,
                    numOfETH,
                    ETH_ADDRESS,
                    cETH,
                    balCTokensBefore,
                    new BN(ETHbalanceBeforeDeposit),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBeforeDAI,
                    BN(balSavingAccountUserBeforeDAI),
                    bank,
                    savingAccount
                );

                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountDAITokenAfterDeposit = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );

                // 2. Start borrowing.
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(ETH_ADDRESS);
                const ethTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](ethTokenIndex, true, {
                    from: user1,
                });
                await savingAccount.borrow(addressDAI, new BN(200), { from: user1 });

                // Verify that the borrow was successful
                await savAccBalVerify(
                    2,
                    new BN(200),
                    addressDAI,
                    cDAI,
                    BN(balCDAIBeforeBorrow),
                    savingAccountDAITokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const user1DAIBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressDAI,
                    user1
                );
                expect(new BN(user1DAIBalance)).to.be.bignumber.equal(new BN(200));
            });

            it("should deposit ETH, borrow different tokens deposited by multiple users", async function () {
                this.timeout(0);

                const balCTokensBefore = new BN(
                    await cETH.balanceOfUnderlying.call(savingAccount.address)
                );
                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(savingAccount.address);
                const balSavingAccountUserBeforeDAI = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeDAI = new BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeUSDC = await erc20USDC.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeUSDC = new BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeBAT = await erc20BAT.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeBAT = new BN(
                    await cBAT.balanceOfUnderlying.call(savingAccount.address)
                );
                const balSavingAccountUserBeforeZRX = await erc20ZRX.balanceOf(
                    savingAccount.address
                );
                const balCTokensBeforeZRX = new BN(
                    await cZRX.balanceOfUnderlying.call(savingAccount.address)
                );

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
                    from: user2,
                });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                    from: user3,
                });
                await erc20BAT.approve(savingAccount.address, numOfBAT, {
                    from: user4,
                });
                await erc20ZRX.approve(savingAccount.address, numOfZRX, {
                    from: user5,
                });
                await erc20MKR.approve(savingAccount.address, numOfMKR, {
                    from: user6,
                });

                await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                    from: user1,
                    value: numOfETH,
                });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user3 });
                await savingAccount.deposit(addressBAT, numOfBAT, { from: user4 });
                await savingAccount.deposit(addressZRX, numOfZRX, { from: user5 });
                await savingAccount.deposit(addressMKR, numOfMKR, { from: user6 });

                // Verify if the deposits were successful
                await savAccBalVerify(
                    0,
                    numOfETH,
                    ETH_ADDRESS,
                    cETH,
                    balCTokensBefore,
                    new BN(ETHbalanceBeforeDeposit),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfDAI,
                    addressDAI,
                    cDAI,
                    balCTokensBeforeDAI,
                    BN(balSavingAccountUserBeforeDAI),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfUSDC,
                    addressUSDC,
                    cUSDC,
                    balCTokensBeforeUSDC,
                    BN(balSavingAccountUserBeforeUSDC),
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    0,
                    numOfBAT,
                    addressBAT,
                    cBAT,
                    balCTokensBeforeBAT,
                    BN(balSavingAccountUserBeforeBAT),
                    bank,
                    savingAccount
                );
                // 849 = 850, precision issue due to rate in scenario
                // await savAccBalVerify(
                //     0,
                //     numOfZRX,
                //     addressZRX,
                //     cZRX,
                //     balCTokensBeforeZRX,
                //     BN(balSavingAccountUserBeforeZRX),
                //     bank,
                //     savingAccount
                // );
                const balSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                expect(numOfMKR).to.be.bignumber.equal(balSavingAccount);

                let ETHbalanceBeforeBorrow = await web3.eth.getBalance(savingAccount.address);

                // cDAI before borrow
                const balCDAIContractBeforeBorrow = await erc20DAI.balanceOf(cDAI_addr);
                const balCDAIBeforeBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const savingAccountDAITokenBeforeBorrow = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );

                // cUSDC before borrow
                const balCUSDCBeforeBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCUSDCContractBeforeBorrow = await erc20USDC.balanceOf(cUSDC_addr);
                const savingAccountUSDCTokenBeforeBorrow = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                // cBAT before borrow
                const balCBATBeforeBorrow = await cBAT.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCBATContractBeforeBorrow = await erc20BAT.balanceOf(cBAT_addr);
                const savingAccountBATTokenBeforeBorrow = BN(
                    await erc20BAT.balanceOf(savingAccount.address)
                );

                // cZRX before borrow
                const balCZRXBeforeBorrow = await cZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balCZRXContractBeforeBorrow = await erc20ZRX.balanceOf(cZRX_addr);
                const savingAccountZRXTokenBeforeBorrow = BN(
                    await erc20ZRX.balanceOf(savingAccount.address)
                );

                // 2. Start borrowing.
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(ETH_ADDRESS);
                const ethTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](ethTokenIndex, true, {
                    from: user1,
                });
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

                // Verify that the borrow was successful
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressDAI,
                    cDAI,
                    BN(balCDAIBeforeBorrow),
                    savingAccountDAITokenBeforeBorrow,
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressUSDC,
                    cUSDC,
                    BN(balCUSDCBeforeBorrow),
                    savingAccountUSDCTokenBeforeBorrow,
                    bank,
                    savingAccount
                );
                await savAccBalVerify(
                    2,
                    new BN(100),
                    addressBAT,
                    cBAT,
                    BN(balCBATBeforeBorrow),
                    savingAccountBATTokenBeforeBorrow,
                    bank,
                    savingAccount
                );
                // 750 = 751, precision issue due to rate in scenario
                // await savAccBalVerify(
                //     2,
                //     new BN(100),
                //     addressZRX,
                //     cZRX,
                //     BN(balCZRXBeforeBorrow),
                //     savingAccountZRXTokenBeforeBorrow,
                //     bank,
                //     savingAccount
                // );

                expect(new BN(user1DAIBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1USDCBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1BATBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1ZRXBalance)).to.be.bignumber.equal(new BN(100));
                expect(new BN(user1MKRBalance)).to.be.bignumber.equal(new BN(100));

                // cDAI
                const balCDAIAfterBorrow = await cDAI.balanceOfUnderlying.call(
                    savingAccount.address
                );
                // cUSDC
                const balCUSDCAfterBorrow = await cUSDC.balanceOfUnderlying.call(
                    savingAccount.address
                );
                // cBAT
                const balCBATAfterBorrow = await cBAT.balanceOfUnderlying.call(
                    savingAccount.address
                );
                // cZRX
                const balCZRXAfterBorrow = await cZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                /* expect(new BN(balCDAIBeforeBorrow)).to.be.bignumber.greaterThan(
                    new BN(balCDAIContractAfterBorrow)
                ); */

                expect(new BN(balCDAIContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    new BN(balCDAIAfterBorrow)
                );
                expect(new BN(balCUSDCContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    new BN(balCUSDCAfterBorrow)
                );
                expect(new BN(balCBATContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    new BN(balCBATAfterBorrow)
                );
                expect(new BN(balCZRXContractBeforeBorrow)).to.be.bignumber.greaterThan(
                    new BN(balCZRXAfterBorrow)
                );
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
