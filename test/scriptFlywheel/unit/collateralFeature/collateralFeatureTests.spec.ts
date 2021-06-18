import * as t from "../../../../types/truffle-contracts/index";
import { TestEngine } from "../../../../test-helpers/TestEngine";

const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");

var chai = require("chai");
var expect = chai.expect;

const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
const ZERO = new BN(0);
const ENABLED = true;
const DISABLED = false;

let testEngine: TestEngine;
let savingAccount: t.SavingAccountWithControllerInstance;
let accountsContract: t.AccountsInstance;
let tokenInfoRegistry: t.TokenRegistryInstance;
let bank: t.BankInstance;

contract("Collateral Feature Tests", async (accounts) => {
    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;

    let tokenIndexDAI: BN;
    let tokenIndexUSDC: BN;
    let tokenIndexUSDT: BN;
    let tokenIndexTUSD: BN;
    let tokenIndexMKR: BN;
    let tokenIndexWBTC: BN;
    let tokenIndexETH: BN;

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
    let cETH_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;

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

    before(function () {
        // Things to initialize before all test
        this.timeout(0);

        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = testEngine.tokenInfoRegistry;
        accountsContract = testEngine.accounts;
        bank = testEngine.bank;

        // 1. initialization.
        tokens = testEngine.erc20Tokens;
        mockChainlinkAggregators = testEngine.mockChainlinkAggregators;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];

        erc20WBTC = await ERC20.at(addressWBTC);
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);

        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        cETH = await MockCToken.at(cETH_addr);

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
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforWBTCAddress
        );

        // load tokenIndex
        tokenIndexDAI = await tokenInfoRegistry.getTokenIndex(addressDAI);
        tokenIndexUSDC = await tokenInfoRegistry.getTokenIndex(addressUSDC);
        tokenIndexUSDT = await tokenInfoRegistry.getTokenIndex(addressUSDT);
        tokenIndexTUSD = await tokenInfoRegistry.getTokenIndex(addressTUSD);
        tokenIndexMKR = await tokenInfoRegistry.getTokenIndex(addressMKR);
        tokenIndexWBTC = await tokenInfoRegistry.getTokenIndex(addressWBTC);
        tokenIndexETH = await tokenInfoRegistry.getTokenIndex(ETH_ADDRESS);

        await savingAccount.fastForward(1);
    });

    describe("setCollateral()", async () => {
        it("should fail when token is not present");

        describe("Enable Collateral", async () => {
            it("should enable collateral for a single token", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndexUSDT, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, addressUSDT, ENABLED);
            });

            it("should enable collateral for very first token");

            it("should enable collateral for very last token");

            it("should enable collateral for all tokens");
        });

        describe("Disable Collateral", async () => {
            it("should disable collateral for a single token");

            it("should disable collateral for very first token");

            it("should disable collateral for very last token");

            it("should disable collateral for all tokens");
        });
    });

    describe("setCollateral([],[])", async () => {
        it("should fail when token is not present");

        describe("Enable Collateral on multiple tokens", async () => {
            it("should enable collateral for a single token");

            it("should enable collateral for all tokens");

            it("should enable collateral for random tokens");

            it("should enable to collateral for first and the last one");
        });

        describe("Disable Collateral on multiple tokens", async () => {
            it("should disable collateral for a single token");

            it("should disable collateral for all tokens");

            it("should disable collateral for random tokens");

            it("should disable to collateral for first and the last one");
        });

        describe("Enable/Disable on multiple tokens", async () => {
            it("should disable some and enable some tokens");
        });
    });

    describe("getCollateralStatus", async () => {
        it("should get his collateral status");

        it("default collateral status of a user is disabled");
    });

    describe("Integration tests", async () => {
        it("every user should have thier own collateral status");
    });
});

async function expectAllCollStatusDisabledForUser(user: string) {
    // method-1: getCollateralStatus()
    const collStatus = await accountsContract.getCollateralStatus(user);
    const tokens = collStatus[0];
    const status = collStatus[1];

    expect(tokens.length > 0, "no tokens");
    expect(tokens.length == status.length, "length mismatch");

    for (let i = 0; i < tokens.length; i++) {
        expect(status[i] == false, "status is enabled");
    }

    // method-2: direct status check
    await expectCollateralBitmap(user, ZERO);
}

async function expectDepositBitmap(user: string, expectedVal: BN) {
    const accountData = await accountsContract.accounts(user);
    const depositBitmap = accountData[0];
    expect(depositBitmap).to.be.bignumber.equal(expectedVal);
}

async function expectBorrowBitmap(user: string, expectedVal: BN) {
    const accountData = await accountsContract.accounts(user);
    const borrowBitmap = accountData[1];
    expect(borrowBitmap).to.be.bignumber.equal(expectedVal);
}

async function expectCollateralBitmap(user: string, expectedVal: BN) {
    const accountData = await accountsContract.accounts(user);
    const collateralBitmap = accountData[2];
    expect(collateralBitmap).to.be.bignumber.equal(expectedVal);
}

async function expectCollInitForUser(user: string, expectedVal: boolean) {
    const accountData = await accountsContract.accounts(user);
    const isCollInit = accountData[3];
    expect(isCollInit).to.be.equal(expectedVal);
}

async function expectTokenStatusForDepositBitmap(
    user: string,
    token: string,
    expectedVal: boolean
) {
    const tokenIndex = await tokenInfoRegistry.getTokenIndex(token);
    const depositFlag = await accountsContract.isUserHasDeposits(user, tokenIndex);
    expect(depositFlag).to.be.equal(expectedVal);
}

async function expectTokenStatusForBorrowBitmap(user: string, token: string, expectedVal: boolean) {
    const tokenIndex = await tokenInfoRegistry.getTokenIndex(token);
    const borrowFlag = await accountsContract.isUserHasBorrows(user, tokenIndex);
    expect(borrowFlag).to.be.equal(expectedVal);
}

async function expectTokenStatusForCollateralBitmap(
    user: string,
    token: string,
    expectedVal: boolean
) {
    const tokenIndex = await tokenInfoRegistry.getTokenIndex(token);
    const collFlag = await accountsContract.isUserHasCollateral(user, tokenIndex);
    expect(collFlag).to.be.equal(expectedVal);
}
