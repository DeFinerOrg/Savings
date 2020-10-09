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
            it("liquidate(): Case 1", async () => {
                const daiAmt = eighteenPrecision;
                const usdcAmt = sixPrecision;
                const daiPrice = new BN(await mockChainlinkAggregatorforDAI.latestAnswer());

                await mockChainlinkAggregatorforTUSD.updateAnswer(daiPrice);
                await mockChainlinkAggregatorforUSDC.updateAnswer(daiPrice);

                await erc20DAI.transfer(user1, daiAmt.mul(new BN(2)));
                await erc20DAI.approve(savingAccount.address, daiAmt.mul(new BN(2)), { from: user1 });
                await savingAccount.deposit(erc20DAI.address, daiAmt.mul(new BN(2)), { from: user1 });

                await erc20USDC.transfer(owner, usdcAmt.mul(new BN(10)));
                await erc20USDC.approve(savingAccount.address, usdcAmt.mul(new BN(10)), { from: owner });
                await savingAccount.deposit(erc20USDC.address, usdcAmt.mul(new BN(10)), { from: owner });

                await erc20USDC.transfer(user2, usdcAmt.mul(new BN(2)));
                await erc20USDC.approve(savingAccount.address, usdcAmt.mul(new BN(2)), { from: user2 });
                await savingAccount.deposit(erc20USDC.address, usdcAmt.mul(new BN(2)), { from: user2 });

                await savingAccount.borrow(erc20USDC.address, usdcAmt.mul(new BN(120)).div(new BN(100)), { from: user1 });
                await savingAccount.borrow(erc20USDC.address, usdcAmt, { from: user2 });

                const newDAIPrice = daiPrice.mul(new BN(70)).div(new BN(100));

                await mockChainlinkAggregatorforDAI.updateAnswer(newDAIPrice);

                const user1Liquidatable = await accountsContract.isAccountLiquidatable.call(user1);
                const user2Liquidatable = await accountsContract.isAccountLiquidatable.call(user2);

                console.log("User1's liquidatable status: " + user1Liquidatable);
                console.log("User2's liquidatable status: " + user2Liquidatable);

                await savingAccount.liquidate(user1, erc20DAI.address, { from: user2 });

            });

            it("isAccountliquidatable(): Case 1", async () => {
                const daiAmt = eighteenPrecision;
                const usdcAmt = sixPrecision;
                const daiPrice = new BN(await mockChainlinkAggregatorforDAI.latestAnswer());

                await mockChainlinkAggregatorforTUSD.updateAnswer(daiPrice);
                await mockChainlinkAggregatorforUSDC.updateAnswer(daiPrice);

                await erc20DAI.transfer(user1, daiAmt.mul(new BN(2)));
                await erc20DAI.approve(savingAccount.address, daiAmt.mul(new BN(2)), { from: user1 });
                await savingAccount.deposit(erc20DAI.address, daiAmt.mul(new BN(2)), { from: user1 });

                await erc20USDC.transfer(owner, usdcAmt.mul(new BN(10)));
                await erc20USDC.approve(savingAccount.address, usdcAmt.mul(new BN(10)), { from: owner });
                await savingAccount.deposit(erc20USDC.address, usdcAmt.mul(new BN(10)), { from: owner });

                await savingAccount.borrow(erc20USDC.address, usdcAmt.mul(new BN(120)).div(new BN(100)), { from: user1 });

                const newDAIPrice = daiPrice.mul(new BN(60)).div(new BN(100));

                await mockChainlinkAggregatorforDAI.updateAnswer(newDAIPrice);

                const user1Liquidatable = await accountsContract.isAccountLiquidatable.call(user1);

                console.log("User1's liquidatable status: " + user1Liquidatable);


            });


        });
    });

});
