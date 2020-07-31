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
    let savingAccount: t.SavingAccountWithControllerInstance;

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
    let addressCTokenForZRX: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;
    let cTokenZRX: t.MockCTokenInstance;
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
    let tempContractAddress: any;
    let cTokenTemp: any;
    let addressCTokenTemp: any;
    let erc20contr: t.MockERC20Instance;

    context("Compound Model Validation", async () => {
        context("Uses WhitePaper Model", async () => {
            before(async () => {
                // Things to initialize before all test
                testEngine = new TestEngine();
                testEngine.deploy("whitePaperModel.scen");
            });

            beforeEach(async () => {
                savingAccount = await testEngine.deploySavingAccount();
                // 1. initialization.
                tokens = await testEngine.erc20Tokens;
                console.log(tokens[0]);
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
                addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
                addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
                addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
                addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
                addressCTokenForZRX = await testEngine.tokenInfoRegistry.getCToken(addressZRX);
                cTokenDAI = await MockCToken.at(addressCTokenForDAI);
                cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
                cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
                cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
                cTokenZRX = await MockCToken.at(addressCTokenForZRX);
            });
            it("Deposit DAI and checkout the output rate", async () => {
                console.log("-------------------------Initial Value---------------------------");
                // 1. Check the compound rate before deposit
                const borrowRateBeforeDeposit = await cTokenZRX.borrowRatePerBlock({ from: user1 });
                const depositRateBeforeDeposit = await cTokenZRX.supplyRatePerBlock({
                    from: user1
                });
                console.log("Borrow rate ", borrowRateBeforeDeposit.toString());
                console.log("Deposit rate ", depositRateBeforeDeposit.toString());

                const balCTokenContract = await cTokenZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balTokenZRX = await erc20ZRX.balanceOf(savingAccount.address);
                console.log("balCTokenContract = ", balCTokenContract.toString());
                console.log("balTokenZRX = ", balTokenZRX.toString());

                // 2. User 1 deposits 1 ZRX
                const numOfZRX = eighteenPrecision;
                await erc20ZRX.transfer(user1, numOfZRX.mul(new BN(4)));
                await erc20ZRX.approve(savingAccount.address, numOfZRX.mul(new BN(4)), {
                    from: user1
                });
                await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });
                // await erc20DAI.transfer(user2, numOfZRX.mul(new BN(4)));
                // await erc20DAI.approve(savingAccount.address, numOfZRX.mul(new BN(4)), { from: user2 });
                // await savingAccount.deposit(addressDAI, numOfZRX.mul(new BN(4)), { from: user2 });
                // await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
                console.log("---------------------------After Deposit---------------------------");

                const balCTokenContract1 = await cTokenZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balTokenZRX1 = await erc20ZRX.balanceOf(savingAccount.address);
                console.log("balCTokenContract = ", balCTokenContract1.toString());
                console.log("balTokenZRX = ", balTokenZRX1.toString());
                // 3. Advance 175,200 blocks, which roughly equals one month
                const b1 = await savingAccount.getBlockNumber({ from: user1 });
                console.log("Block number = ", b1.toString());
                const borrowRateAfterDeposit = await cTokenZRX.borrowRatePerBlock({ from: user1 });
                const depositRateAfterDeposit = await cTokenZRX.supplyRatePerBlock({ from: user1 });
                console.log("Borrow rate ", borrowRateAfterDeposit.toString());
                console.log("Deposit rate ", depositRateAfterDeposit.toString());

                await savingAccount.fastForward(100000000);
                console.log(
                    "------------------------100000000 blocks later------------------------"
                );
                const b2 = await savingAccount.getBlockNumber({ from: user1 });
                console.log("Block number = ", b2.toString());

                // await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });

                const balCTokenContract2 = await cTokenZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balTokenZRX2 = await erc20ZRX.balanceOf(savingAccount.address);
                console.log("balCTokenContract = ", balCTokenContract2.toString());
                console.log("balTokenZRX = ", balTokenZRX2.toString());

                // 4. Check the compound rate after deposit
                const borrowRateAfterFastForward = await cTokenZRX.borrowRatePerBlock({
                    from: user1
                });
                const depositRateAfterFastForward = await cTokenZRX.supplyRatePerBlock({
                    from: user1
                });
                console.log("Borrow rate ", borrowRateAfterFastForward.toString());
                console.log("Deposit rate ", depositRateAfterFastForward.toString());
                /*
                console.log("--------------------------After Borrow--------------------------");
                await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
                const borrowRateAfterBorrow = await cTokenZRX.borrowRatePerBlock({from: user1});
                const depositRateAfterBorrow = await cTokenZRX.supplyRatePerBlock({from: user1});
                console.log("Borrow rate ", borrowRateAfterBorrow.toString());
                console.log("Deposit rate ", depositRateAfterBorrow.toString());*/
            });

            it("should deposit 1million of each token, wait for a week, withdraw all", async () => {
                console.log(
                    "-------------------------Initial Value Index---------------------------"
                );
                const numOfToken = new BN(10).pow(new BN(6));

                // Deposit all tokens
                for (let i = 0; i < 9; i++) {
                    tempContractAddress = tokens[i];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    if (i != 3 && i != 4) {
                        addressCTokenTemp = await testEngine.tokenInfoRegistry.getCToken(
                            tempContractAddress
                        );
                        cTokenTemp = await MockCToken.at(addressCTokenTemp);
                    }

                    await erc20contr.approve(savingAccount.address, numOfToken);
                    const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                        erc20contr.address
                    );
                    const balCTokenContract = await cTokenTemp.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balTokenTemp = await erc20contr.balanceOf(savingAccount.address);
                    console.log("balCTokenContract = ", balCTokenContract.toString());
                    console.log("balTokenTemp = ", balTokenTemp.toString());

                    console.log("TokenI", i);
                    await savingAccount.deposit(erc20contr.address, numOfToken);

                    //Verify if deposit was successful
                    if (i != 3 && i != 4) {
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

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                        erc20contr.address
                    );

                    const totalDefinerBalanceChange = new BN(
                        totalDefinerBalanceAfterDeposit[0]
                    ).sub(new BN(totalDefinerBalanceBeforeDeposit[0]));
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                    console.log(
                        "---------------------------After Deposit Index---------------------------"
                    );

                    const balCTokenContract1 = await cTokenTemp.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balTokenTemp1 = await erc20contr.balanceOf(savingAccount.address);
                    console.log("balCTokenContract = ", balCTokenContract1.toString());
                    console.log("balTokenZRX = ", balTokenTemp1.toString());

                    const b1 = await savingAccount.getBlockNumber({ from: user1 });
                    console.log("Block number = ", b1.toString());
                    const borrowRateAfterDeposit = await cTokenTemp.borrowRatePerBlock({
                        from: user1
                    });
                    const depositRateAfterDeposit = await cTokenTemp.supplyRatePerBlock({
                        from: user1
                    });
                    console.log("Borrow rate ", borrowRateAfterDeposit.toString());
                    console.log("Deposit rate ", depositRateAfterDeposit.toString());

                    await savingAccount.fastForward(100000000);
                    console.log(
                        "------------------------100000000 blocks later------------------------"
                    );
                    const b2 = await savingAccount.getBlockNumber({ from: user1 });
                    console.log("Block number = ", b2.toString());

                    // await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });

                    const balCTokenContract2 = await cTokenTemp.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balTokenTemp2 = await erc20contr.balanceOf(savingAccount.address);
                    console.log("balCTokenContract = ", balCTokenContract2.toString());
                    console.log("balTokenTemp = ", balTokenTemp2.toString());
                }

                // Advance blocks by 1 week

                for (let j = 0; j < 9; j++) {
                    console.log("TokenI", j);

                    tempContractAddress = tokens[j];
                    erc20contr = await MockERC20.at(tempContractAddress);

                    //await savingAccount.withdrawAll(erc20contr.address);

                    //Verify if withdrawAll was successful
                    const balSavingAccount = await erc20contr.balanceOf(savingAccount.address);
                    //expect(ZERO).to.be.bignumber.equal(balSavingAccount);

                    // Verify DeFiner balance
                    const totalDefinerBalancAfterWithdraw = await savingAccount.tokenBalance(
                        erc20contr.address
                    );
                    //expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw[0]);
                }
            });
        });
    });
});
