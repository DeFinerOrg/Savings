import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.borrow", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

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
    let addressWBTC: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforWBTCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
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
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforWBTC: t.MockChainLinkAggregatorInstance;

    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_USDC: any;

    let unitroller: t.UnitrollerContract;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        await testEngine.deployCompound()
        // savingAccount = await testEngine.deploySavingAccount();
        // // 1. initialization.
        // tokens = await testEngine.erc20Tokens;
        // mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        // accountsContract = await testEngine.accounts;
        // bank = await testEngine.bank;

        // addressDAI = tokens[0];
        // addressUSDC = tokens[1];
        // addressUSDT = tokens[2];
        // addressTUSD = tokens[3];
        // addressMKR = tokens[4];
        // addressWBTC = tokens[8];

        // mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        // mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        // mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        // mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        // mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        // mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];
        // mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0];

        // erc20WBTC = await ERC20.at(addressWBTC);
        // erc20DAI = await ERC20.at(addressDAI);
        // erc20USDC = await ERC20.at(addressUSDC);
        // erc20USDT = await ERC20.at(addressUSDT);
        // erc20TUSD = await ERC20.at(addressTUSD);
        // erc20MKR = await ERC20.at(addressMKR);

        // cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        // cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        // cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        // cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);

        // cDAI = await MockCToken.at(cDAI_addr);
        // cUSDC = await MockCToken.at(cUSDC_addr);
        // cUSDT = await MockCToken.at(cUSDT_addr);
        // cWBTC = await MockCToken.at(cWBTC_addr);

        // mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforDAIAddress
        // );
        // mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforUSDCAddress
        // );
        // mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforUSDTAddress
        // );
        // mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforTUSDAddress
        // );
        // mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforMKRAddress
        // );
        // mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforETHAddress
        // );
        // mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
        //     mockChainlinkAggregatorforWBTCAddress
        // );

        // ONE_DAI = eighteenPrecision;
        // ONE_USDC = sixPrecision;
        // // Set DAI, USDC, USDT, TUSD to the same price for convenience
        // let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
        // await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);
        // await mockChainlinkAggregatorforUSDT.updateAnswer(DAIprice);
        // await mockChainlinkAggregatorforTUSD.updateAnswer(DAIprice);
    });

    // extra tests by Yichun
    context("Additional tests for Borrow", async () => {
        it("Empty test", async () => {

        });
    });
});
