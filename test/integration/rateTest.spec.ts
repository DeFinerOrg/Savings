import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockErc20Contract = artifacts.require("MockERC20");
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
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cZRX_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cZRX: t.MockCTokenInstance;
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
    let cTokenTemp: any;
    let addressCTokenTemp: any;
    let erc20contr: t.MockErc20Instance;
    // testEngine = new TestEngine();
    // testEngine.deploy("whitePaperModel.scen");

    context("Compound Model Validation", async () => {
        context("Uses WhitePaper Model", async () => {
            before(function () {
                // Things to initialize before all test
                this.timeout(0);
                testEngine = new TestEngine();
                testEngine.deploy("whitePaperModel.scen");
            });

            beforeEach(async function () {
                this.timeout(0);
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
                cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
                cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
                cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
                cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
                cZRX_addr = await testEngine.tokenInfoRegistry.getCToken(addressZRX);
                cDAI = await MockCToken.at(cDAI_addr);
                cUSDC = await MockCToken.at(cUSDC_addr);
                cUSDT = await MockCToken.at(cUSDT_addr);
                cWBTC = await MockCToken.at(cWBTC_addr);
                cZRX = await MockCToken.at(cZRX_addr);
            });

            it("Deposit DAI and checkout the output rate", async function () {
                this.timeout(0);
                await savingAccount.fastForward(1000);
                console.log("-------------------------Initial Value---------------------------");
                // 1. Check the compound rate before deposit
                const borrowRateBeforeDeposit = await cZRX.borrowRatePerBlock({ from: user1 });
                const depositRateBeforeDeposit = await cZRX.supplyRatePerBlock({
                    from: user1,
                });
                console.log("Borrow rate ", borrowRateBeforeDeposit.toString());
                console.log("Deposit rate ", depositRateBeforeDeposit.toString());

                const balCTokenContract = await cZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balTokenZRX = await erc20ZRX.balanceOf(savingAccount.address);
                console.log("balCTokenContract = ", balCTokenContract.toString());
                console.log("balTokenZRX = ", balTokenZRX.toString());

                // 2. User 1 deposits 1 ZRX
                const numOfZRX = eighteenPrecision;
                await erc20ZRX.transfer(user1, numOfZRX.mul(new BN(4)));
                await erc20ZRX.approve(savingAccount.address, numOfZRX.mul(new BN(4)), {
                    from: user1,
                });
                await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });
                // await erc20DAI.transfer(user2, numOfZRX.mul(new BN(4)));
                // await erc20DAI.approve(savingAccount.address, numOfZRX.mul(new BN(4)), { from: user2 });
                // await savingAccount.deposit(addressDAI, numOfZRX.mul(new BN(4)), { from: user2 });
                // await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
                console.log("---------------------------After Deposit---------------------------");

                const balCTokenContract1 = await cZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balTokenZRX1 = await erc20ZRX.balanceOf(savingAccount.address);
                console.log("balCTokenContract = ", balCTokenContract1.toString());
                console.log("balTokenZRX = ", balTokenZRX1.toString());
                // 3. Advance 175,200 blocks, which roughly equals one month
                // const b1 = await savingAccount.getBlockNumber({ from: user1 });
                // console.log("Block number = ", b1.toString());
                const borrowRateAfterDeposit = await cZRX.borrowRatePerBlock({ from: user1 });
                const depositRateAfterDeposit = await cZRX.supplyRatePerBlock({ from: user1 });
                console.log("Borrow rate ", borrowRateAfterDeposit.toString());
                console.log("Deposit rate ", depositRateAfterDeposit.toString());

                await savingAccount.fastForward(100000000);
                console.log(
                    "------------------------100000000 blocks later------------------------"
                );
                // const b2 = await savingAccount.getBlockNumber({ from: user1 });
                // console.log("Block number = ", b2.toString());

                // await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });

                const balCTokenContract2 = await cZRX.balanceOfUnderlying.call(
                    savingAccount.address
                );
                const balTokenZRX2 = await erc20ZRX.balanceOf(savingAccount.address);
                console.log("balCTokenContract = ", balCTokenContract2.toString());
                console.log("balTokenZRX = ", balTokenZRX2.toString());

                // 4. Check the compound rate after deposit
                const borrowRateAfterFastForward = await cZRX.borrowRatePerBlock({ from: user1 });
                const depositRateAfterFastForward = await cZRX.supplyRatePerBlock({ from: user1 });
                console.log("Borrow rate ", borrowRateAfterFastForward.toString());
                console.log("Deposit rate ", depositRateAfterFastForward.toString());
                /*
                console.log("--------------------------After Borrow--------------------------");
                await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
                const borrowRateAfterBorrow = await cZRX.borrowRatePerBlock({from: user1});
                const depositRateAfterBorrow = await cZRX.supplyRatePerBlock({from: user1});
                console.log("Borrow rate ", borrowRateAfterBorrow.toString());
                console.log("Deposit rate ", depositRateAfterBorrow.toString());*/
            });
        });
    });
});
