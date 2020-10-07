import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { BigNumber } from "bignumber.js";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.Erc20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.withdraw", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressBAT: any;
    let addressZRX: any;
    let addressREP: any;
    let addressWBTC: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforBATAddress: any;
    let mockChainlinkAggregatorforZRXAddress: any;
    let mockChainlinkAggregatorforREPAddress: any;
    let mockChainlinkAggregatorforWBTCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cTUSD_addr: any;
    let cMKR_addr: any;
    let cBAT_addr: any;
    let cZRX_addr: any;
    let cREP_addr: any;
    let cWBTC_addr: any;

    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenTUSD: t.MockCTokenInstance;
    let cTokenMKR: t.MockCTokenInstance;
    let cTokenBAT: t.MockCTokenInstance;
    let cTokenZRX: t.MockCTokenInstance;
    let cTokenREP: t.MockCTokenInstance;

    let cTokenWBTC: t.MockCTokenInstance;
    let cTokenETH: t.MockCTokenInstance;

    let erc20DAI: t.Erc20Instance;
    let erc20USDC: t.Erc20Instance;
    let erc20USDT: t.Erc20Instance;
    let erc20TUSD: t.Erc20Instance;
    let erc20MKR: t.Erc20Instance;
    let erc20BAT: t.Erc20Instance;
    let erc20ZRX: t.Erc20Instance;
    let erc20REP: t.Erc20Instance;
    let erc20WBTC: t.Erc20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforBAT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforZRX: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforREP: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforWBTC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_USDC: any;
    let ZERO: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressBAT = tokens[4];
        addressZRX = tokens[4];
        addressREP = tokens[4];

        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforBATAddress = mockChainlinkAggregators[5];
        mockChainlinkAggregatorforZRXAddress = mockChainlinkAggregators[6];
        mockChainlinkAggregatorforREPAddress = mockChainlinkAggregators[7];
        mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];

        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0];
        erc20WBTC = await ERC20.at(addressWBTC);

        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        erc20BAT = await ERC20.at(addressBAT);
        erc20ZRX = await ERC20.at(addressZRX);
        erc20REP = await ERC20.at(addressREP);
        erc20WBTC = await ERC20.at(addressWBTC);

        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cTokenDAI = await MockCToken.at(cDAI_addr);
        cTokenUSDC = await MockCToken.at(cUSDC_addr);
        cTokenUSDT = await MockCToken.at(cUSDT_addr);
        cTokenWBTC = await MockCToken.at(cWBTC_addr);

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDTAddress
        );
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforTUSDAddress
        );
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforMKRAddress
        );
        mockChainlinkAggregatorforBAT = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforBATAddress
        );
        mockChainlinkAggregatorforZRX = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforZRXAddress
        );
        mockChainlinkAggregatorforREP = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforREPAddress
        );
        mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforWBTCAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforWBTCAddress
        );

        ONE_DAI = eighteenPrecision;
        ONE_USDC = sixPrecision;
        numOfToken = new BN(1000);
        ZERO = new BN(0);
    });
    context("Test", async () => {
        context("should succ", async () => {
            // it("Deposit USDC then withdraw it", async () => {
            //     const repAmt = eighteenPrecision;
            //     const daiAmt = eighteenPrecision;
            //     const usdcAmt = sixPrecision;


            //     await erc20USDC.transfer(user1, usdcAmt);
            //     await erc20USDC.approve(savingAccount.address, usdcAmt, { from: user1 });
            //     await savingAccount.deposit(erc20USDC.address, usdcAmt, { from: user1 });
            //     await savingAccount.fastForward(10000);

            //     await erc20USDC.transfer(user1, usdcAmt);
            //     await erc20USDC.approve(savingAccount.address, usdcAmt, { from: user1 });
            //     await savingAccount.deposit(erc20USDC.address, usdcAmt, { from: user1 });

            //     await savingAccount.fastForward(10000);

            //     await erc20USDC.transfer(user1, usdcAmt);
            //     await erc20USDC.approve(savingAccount.address, usdcAmt, { from: user1 });
            //     await savingAccount.deposit(erc20USDC.address, usdcAmt, { from: user1 });

            //     await savingAccount.fastForward(100000);

            //     const depositTokenBefore1 = new BN(await savingAccount.getDepositBalance(erc20USDC.address, user1));
            //     // const depositTokenBefore2 = new BN(await savingAccount.getDepositBalance(erc20USDC.address, user1));

            //     await savingAccount.withdraw(erc20USDC.address, new BN(1000), { from: user1 });

            //     const depositTokenAfter1 = new BN(await savingAccount.getDepositBalance(erc20USDC.address, user1));
            //     // const depositTokenAfter2 = new BN(await savingAccount.getDepositBalance(erc20USDC.address, user1));

            //     console.log(depositTokenAfter1.toString());
            //     console.log(depositTokenBefore1.toString());
            //     console.log(depositTokenBefore1.sub(depositTokenAfter1).toString());
            //     // console.log(depositTokenAfter2.toString());
            //     // console.log(depositTokenBefore2.toString());

            // });

            // it("Strange test case", async () => {
            //     console.log("Change the token TUSD price to 5741769150000000");
            //     await mockChainlinkAggregatorforTUSD.updateAnswer(new BN("5741769150000000"));

            //     console.log("Increase 7602 blocks.");
            //     await savingAccount.fastForward(7602);

            //     console.log("User 0xE5904695748fe4A84b40b3fc79De2277660BD1D3 tries to deposit 4088058989 WBTC to DeFiner, should succeed.");
            //     await erc20WBTC.transfer(user1, new BN("4088058989"));
            //     await erc20WBTC.approve(savingAccount.address, new BN("4088058989"), { from: user1 });
            //     await savingAccount.deposit(erc20WBTC.address, new BN("4088058989"), { from: user1 });

            //     console.log("Change the token TUSD price to 5397263001000000");
            //     await mockChainlinkAggregatorforTUSD.updateAnswer(new BN("5397263001000000"));

            //     console.log("User 0xc783df8a850f42e7F7e57013759C285caa701eB6 tries to deposit 3139485263312020104 ZRX to DeFiner, should succeed.");
            //     await erc20ZRX.transfer(user2, new BN("3139485263312020104"));
            //     await erc20ZRX.approve(savingAccount.address, new BN("3139485263312020104"), { from: user2 });
            //     await savingAccount.deposit(erc20ZRX.address, new BN("3139485263312020104"), { from: user2 });

            //     console.log("Change the token ZRX price to 839308800000000");
            //     await mockChainlinkAggregatorforZRX.updateAnswer(new BN("839308800000000"));

            //     console.log("Change the token WBTC price to 40790550162600000000");
            //     await mockChainlinkAggregatorforWBTC.updateAnswer(new BN("40790550162600000000"));

            //     console.log("Change the token DAI price to 6129442050000000");
            //     await mockChainlinkAggregatorforDAI.updateAnswer(new BN("6129442050000000"));

            //     console.log("User 0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4 tries to deposit 99190196745536448208 REP to DeFiner, should succeed.")
            //     await erc20REP.transfer(user3, new BN("99190196745536448208"));
            //     await erc20REP.approve(savingAccount.address, new BN("99190196745536448208"), { from: user3 });
            //     await savingAccount.deposit(erc20REP.address, new BN("99190196745536448208"), { from: user3 });

            //     console.log("Change the token USDC price to 6053040900000000");
            //     await mockChainlinkAggregatorforUSDC.updateAnswer(new BN("6053040900000000"));

            //     console.log("Increase 6426 blocks.");
            //     await savingAccount.fastForward(6426);

            //     console.log("User 0xE5904695748fe4A84b40b3fc79De2277660BD1D3 tries to deposit 7947878768 WBTC to DeFiner, should succeed.");
            //     await erc20WBTC.transfer(user1, new BN("7947878768"));
            //     await erc20WBTC.approve(savingAccount.address, new BN("7947878768"), { from: user1 });
            //     await savingAccount.deposit(erc20WBTC.address, new BN("7947878768"), { from: user1 });

            //     console.log("User 0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4 tries to deposit 86242100448480693851 TUSD to DeFiner, should succeed.")
            //     await erc20TUSD.transfer(user3, new BN("86242100448480693851"));
            //     await erc20TUSD.approve(savingAccount.address, new BN("86242100448480693851"), { from: user3 });
            //     await savingAccount.deposit(erc20TUSD.address, new BN("86242100448480693851"), { from: user3 });

            //     console.log("Change the token BAT price to 1056338250000000");
            //     await mockChainlinkAggregatorforBAT.updateAnswer(new BN("1056338250000000"));

            //     console.log("Change the token WBTC price to 46501227185364000000");
            //     await mockChainlinkAggregatorforWBTC.updateAnswer(new BN("46501227185364000000"));

            //     console.log("User 0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4 tries to deposit 17862954276730490287 BAT to DeFiner, should succeed.")
            //     await erc20BAT.transfer(user3, new BN("17862954276730490287"));
            //     await erc20BAT.approve(savingAccount.address, new BN("17862954276730490287"), { from: user3 });
            //     await savingAccount.deposit(erc20BAT.address, new BN("17862954276730490287"), { from: user3 });

            //     const depositTokenBefore1 = new BN(await savingAccount.getDepositBalance(erc20ZRX.address, user2));
            //     const depositTokenBefore2 = new BN(await savingAccount.getDepositBalance(erc20ZRX.address, user1));
            //     console.log("User 0xc783df8a850f42e7F7e57013759C285caa701eB6 tries to transfer 808225768101575899 ZRX to user 0xE5904695748fe4A84b40b3fc79De2277660BD1D3, should succeed.")
            //     await savingAccount.transfer(user1, erc20ZRX.address, new BN("808225768101575899"), { from: user2 });

            //     const depositTokenAfter1 = new BN(await savingAccount.getDepositBalance(erc20ZRX.address, user2));
            //     const depositTokenAfter2 = new BN(await savingAccount.getDepositBalance(erc20ZRX.address, user1));

            //     console.log(depositTokenAfter1.toString());
            //     console.log(depositTokenBefore1.toString());
            //     console.log(depositTokenBefore1.sub(depositTokenAfter1).toString());
            //     console.log(depositTokenAfter2.toString());
            //     console.log(depositTokenBefore2.toString());


            // });

            it("Strange test case", async () => {
                const daiAmt = eighteenPrecision;
                await erc20DAI.transfer(owner, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: owner });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: owner });
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                const balanceBefore = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const principalBefore = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address));
                const interestBefore = new BN(await savingAccount.getDepositInterest(erc20DAI.address));

                await erc20DAI.transfer(owner, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: owner });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: owner });

                const balanceAfter = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address));
                const interestAfter = new BN(await savingAccount.getDepositInterest(erc20DAI.address));

                console.log(balanceBefore.toString());
                console.log(principalBefore.toString());
                console.log(interestBefore.toString());

                console.log(balanceAfter.toString());
                console.log(principalAfter.toString());
                console.log(interestAfter.toString());


            });
            it("Strange test case", async () => {
                const daiAmt = eighteenPrecision;

                await erc20DAI.transfer(owner, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: owner });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: owner });

                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);

                const balanceBefore = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const principalBefore = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address));
                const interestBefore = new BN(await savingAccount.getDepositInterest(erc20DAI.address));

                await erc20DAI.transfer(user1, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: user1 });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: user1 });

                // await erc20USDC.transfer(owner, new BN("10000000"));
                // await erc20USDC.approve(savingAccount.address, new BN("10000000"), { from: owner });
                // await savingAccount.deposit(erc20USDC.address, new BN("10000000"), { from: owner });

                const balanceAfter = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address));
                const interestAfter = new BN(await savingAccount.getDepositInterest(erc20DAI.address));

                console.log(balanceBefore.toString());
                console.log(principalBefore.toString());
                console.log(interestBefore.toString());

                console.log(balanceAfter.toString());
                console.log(principalAfter.toString());
                console.log(interestAfter.toString());


            });

            it("Strange test case", async () => {
                const daiAmt = eighteenPrecision;

                await erc20DAI.transfer(owner, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: owner });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: owner });

                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);

                await erc20DAI.transfer(owner, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: owner });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: owner });

                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);
                await savingAccount.fastForward(1000000);

                const balanceBefore = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const principalBefore = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address));
                const interestBefore = new BN(await savingAccount.getDepositInterest(erc20DAI.address));

                await savingAccount.transfer(user1, erc20DAI.address, daiAmt)
                // await erc20USDC.transfer(owner, new BN("10000000"));
                // await erc20USDC.approve(savingAccount.address, new BN("10000000"), { from: owner });
                // await savingAccount.deposit(erc20USDC.address, new BN("10000000"), { from: owner });

                const balanceAfter = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address));
                const interestAfter = new BN(await savingAccount.getDepositInterest(erc20DAI.address));

                const usr1balanceAfter = new BN(await savingAccount.getDepositBalance(erc20DAI.address, user1));
                const usr1principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address, { from: user1 }));
                const usr1interestAfter = new BN(await savingAccount.getDepositInterest(erc20DAI.address, { from: user1 }));

                console.log(balanceBefore.toString());
                console.log(principalBefore.toString());
                console.log(interestBefore.toString());

                console.log(balanceAfter.toString());
                console.log(principalAfter.toString());
                console.log(interestAfter.toString());

                console.log(usr1balanceAfter.toString());
                console.log(usr1principalAfter.toString());
                console.log(usr1interestAfter.toString());


            });

            it("Strange test case", async () => {
                const daiAmt = eighteenPrecision;
                const usdcAmt = sixPrecision;
                await erc20DAI.transfer(user1, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: user1 });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: user1 });

                await erc20USDC.transfer(owner, usdcAmt);
                await erc20USDC.approve(savingAccount.address, usdcAmt, { from: owner });
                await savingAccount.deposit(erc20USDC.address, usdcAmt, { from: owner });

                await savingAccount.borrow(erc20DAI.address, daiAmt.div(new BN(2)), { from: owner });

                await savingAccount.fastForward(10000000);
                await savingAccount.newRateIndexCheckpoint(erc20DAI.address);


                await erc20DAI.transfer(user1, daiAmt);
                await erc20DAI.approve(savingAccount.address, daiAmt, { from: user1 });
                await savingAccount.deposit(erc20DAI.address, daiAmt, { from: user1 });

                await savingAccount.fastForward(10000000);
                await savingAccount.newRateIndexCheckpoint(erc20DAI.address);
                const usr1balanceBefore = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const usr1principalBefore = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address, { from: owner }));
                const usr1interestBefore = new BN(await savingAccount.getDepositInterest(erc20DAI.address, { from: owner }));

                const balanceBefore = new BN(await savingAccount.getDepositBalance(erc20DAI.address, user1));
                const principalBefore = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address, { from: user1 }));
                const interestBefore = new BN(await savingAccount.getDepositInterest(erc20DAI.address, { from: user1 }));
                await savingAccount.transfer(owner, erc20DAI.address, daiAmt, { from: user1 })
                // await erc20USDC.transfer(owner, new BN("10000000"));
                // await erc20USDC.approve(savingAccount.address, new BN("10000000"), { from: owner });
                // await savingAccount.deposit(erc20USDC.address, new BN("10000000"), { from: owner });

                const balanceAfter = new BN(await savingAccount.getDepositBalance(erc20DAI.address, user1));
                const principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address, { from: user1 }));
                const interestAfter = new BN(await savingAccount.getDepositInterest(erc20DAI.address, { from: user1 }));

                const usr1balanceAfter = new BN(await savingAccount.getDepositBalance(erc20DAI.address, owner));
                const usr1principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20DAI.address, { from: owner }));
                const usr1interestAfter = new BN(await savingAccount.getDepositInterest(erc20DAI.address, { from: owner }));

                console.log(balanceBefore.toString());
                console.log(principalBefore.toString());
                console.log(interestBefore.toString());

                console.log(balanceAfter.toString());
                console.log(principalAfter.toString());
                console.log(interestAfter.toString());

                console.log(usr1balanceBefore.toString());
                console.log(usr1principalBefore.toString());
                console.log(usr1interestBefore.toString());

                console.log(usr1balanceAfter.toString());
                console.log(usr1principalAfter.toString());
                console.log(usr1interestAfter.toString());


            });

            // it("Strange test case", async () => {
            //     const daiAmt = eighteenPrecision;
            //     const usdcAmt = sixPrecision;

            //     await erc20USDC.transfer(owner, usdcAmt);
            //     await erc20USDC.approve(savingAccount.address, usdcAmt, { from: owner });
            //     await savingAccount.deposit(erc20USDC.address, usdcAmt, { from: owner });

            //     await erc20DAI.transfer(user1, daiAmt);
            //     await erc20DAI.approve(savingAccount.address, daiAmt, { from: user1 });
            //     await savingAccount.deposit(erc20DAI.address, daiAmt, { from: user1 });

            //     await savingAccount.borrow(erc20USDC.address, usdcAmt.div(new BN(2)), { from: user1 });

            //     await savingAccount.fastForward(5000000);


            //     await erc20USDC.transfer(owner, usdcAmt);
            //     await erc20USDC.approve(savingAccount.address, usdcAmt, { from: owner });
            //     await savingAccount.deposit(erc20USDC.address, usdcAmt, { from: owner });

            //     await savingAccount.fastForward(5000000);



            //     const balanceBefore = new BN(await savingAccount.getDepositBalance(erc20USDC.address, owner));
            //     const principalBefore = new BN(await savingAccount.getDepositPrincipal(erc20USDC.address));
            //     const interestBefore = new BN(await savingAccount.getDepositInterest(erc20USDC.address));

            //     await savingAccount.transfer(user1, erc20USDC.address, usdcAmt)
            //     await savingAccount.newRateIndexCheckpoint(erc20USDC.address);
            //     // await erc20USDC.transfer(owner, new BN("10000000"));
            //     // await erc20USDC.approve(savingAccount.address, new BN("10000000"), { from: owner });
            //     // await savingAccount.deposit(erc20USDC.address, new BN("10000000"), { from: owner });

            //     const balanceAfter = new BN(await savingAccount.getDepositBalance(erc20USDC.address, owner));
            //     const principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20USDC.address));
            //     const interestAfter = new BN(await savingAccount.getDepositInterest(erc20USDC.address));

            //     await savingAccount.borrow(erc20USDC.address, usdcAmt.div(new BN(2)), { from: user1 });

            //     const usr1balanceAfter = new BN(await savingAccount.getDepositBalance(erc20USDC.address, user1));
            //     const usr1principalAfter = new BN(await savingAccount.getDepositPrincipal(erc20USDC.address, { from: user1 }));
            //     const usr1interestAfter = new BN(await savingAccount.getDepositInterest(erc20USDC.address, { from: user1 }));

            //     console.log(balanceBefore.toString());
            //     console.log(principalBefore.toString());
            //     console.log(interestBefore.toString());

            //     console.log(balanceAfter.toString());
            //     console.log(principalAfter.toString());
            //     console.log(interestAfter.toString());

            //     console.log(usr1balanceAfter.toString());
            //     console.log(usr1principalAfter.toString());
            //     console.log(usr1interestAfter.toString());


            // });


        });
    });

});
