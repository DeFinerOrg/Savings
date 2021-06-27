import * as t from "../../../../types/truffle-contracts/index";
import { TestEngineV1_1 } from "../../../../test-helpers/TestEngineV1_1";
import { takeSnapshot, revertToSnapShot } from "../../../../test-helpers/SnapshotUtils";
import { upgradeFrom_v1_1_to_v1_2 } from "../../../../test-helpers/UpgradeUtils";

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccountWithController: t.SavingAccountWithControllerContract = artifacts.require(
    "SavingAccountWithController"
);
const Accounts: t.AccountsContract = artifacts.require("Accounts");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");

var chai = require("chai");
var expect = chai.expect;

let snapshotId: string;

const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
const ZERO = new BN(0);
const ENABLED = true;
const DISABLED = false;

let testEngine: TestEngineV1_1;
let savingAccount: t.SavingAccountWithControllerInstance;
let accountsContract: t.AccountsWithControllerInstance;
let accountsV1_2: t.AccountsInstance;
let tokenInfoRegistry: t.TokenRegistryInstance;
let bank: t.BankWithControllerInstance;

contract("Collateral Feature Upgrade Tests", async (accounts) => {
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

    before(async () => {
        // ==============================
        // This deployes V1.1 Contracts
        // ==============================
        testEngine = new TestEngineV1_1();

        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = testEngine.tokenInfoRegistry;
        accountsContract = testEngine.accounts;
        accountsV1_2 = await Accounts.at(accountsContract.address);
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

    beforeEach(async () => {
        // Take snapshot of the EVM before each test
        snapshotId = await takeSnapshot();
        // rest the variable
        accountsContract = testEngine.accounts;
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    it("should deploy version 1.1 contracts", async () => {
        // ensure that the version 'v1.1' contracts are deployed
        await ensureDeployedContractOfVersion("v1.1");

        await upgradeContracts();

        await ensureDeployedContractOfVersion("v1.2");
    });

    it("should default to disable all for new user", async () => {
        // TODO
    });

    describe("when an existing user", async () => {
        describe("calls a functions", async () => {
            it("should initialize collateral status when existing user borrow");

            it("should initialize collateral status when existing user withdraw");

            it("should initialize collateral status when existing user deposit");

            it("should initialize collateral status when existing user repay");

            it("should initialize collateral status when existing user calls setCollateral");
        });

        describe("calls init collateral", async () => {
            it("user can init collateral status for his own account");

            it("no change should be done upon second time call to init collateral");
        });

        describe("has deposits", async () => {
            it("should enable collateral for single deposit token", async () => {
                await ensureDeployedContractOfVersion("v1.1");

                const user = user1;
                const depositAmount = new BN(100);
                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount,
                    from: user,
                });

                // Upgrade
                await upgradeContracts();

                await ensureDeployedContractOfVersion("v1.2");
                await expectAllCollStatusDisabledForUser(user);

                // init collateral status
                await accountsV1_2.initCollateralFlag(user);
                await expectCollateralEnabledFor(user, [ETH_ADDRESS]);
            });

            it("should enable collateral for multiple  deposit token", async () => {
                await ensureDeployedContractOfVersion("v1.1");

                const user = user1;
                const ethDepositAmount = new BN(100);
                await savingAccount.deposit(ETH_ADDRESS, ethDepositAmount, {
                    value: ethDepositAmount,
                    from: user,
                });

                const tusdDepositAmount = new BN(100);
                await erc20TUSD.transfer(user, tusdDepositAmount, { from: owner });
                await erc20TUSD.approve(savingAccount.address, tusdDepositAmount, { from: user });
                await savingAccount.deposit(addressTUSD, tusdDepositAmount, { from: user });

                // Upgrade
                await upgradeContracts();

                await ensureDeployedContractOfVersion("v1.2");
                await expectAllCollStatusDisabledForUser(user);

                // init collateral status
                await accountsV1_2.initCollateralFlag(user);
                await expectCollateralEnabledFor(user, [ETH_ADDRESS, addressTUSD]);
            });
        });

        describe("has borrows", async () => {
            it("should enable collateral for all his deposit tokens");
        });
    });
});

async function ensureDeployedContractOfVersion(version: string) {
    expect(await savingAccount.version()).to.be.equal(version);
    expect(await accountsContract.version()).to.be.equal(version);
    expect(await bank.version()).to.be.equal(version);
}

async function upgradeContracts() {
    await ensureDeployedContractOfVersion("v1.1");
    await upgradeFrom_v1_1_to_v1_2(testEngine);
    await ensureDeployedContractOfVersion("v1.2");
}

async function expectAllCollStatusDisabledForUser(user: string) {
    // method-1: getCollateralStatus()
    const collStatus = await accountsV1_2.getCollateralStatus(user);
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

async function expectCollateralBitmap(user: string, expectedVal: BN) {
    const accountData = await accountsV1_2.accounts(user);
    const collateralBitmap = accountData[2];
    expect(collateralBitmap).to.be.bignumber.equal(expectedVal);
}

async function expectCollateralEnabledFor(user: string, tokens: string[]) {
    const tokensCount = await tokenInfoRegistry.getCoinLength();
    for (let i = 0; i < tokensCount.toNumber(); i++) {
        const collFlag = await accountsV1_2.isUserHasCollateral(user, i);
        const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(i);
        const tokenAddr = tokenInfo[0];

        if (tokens.includes(tokenAddr)) {
            // this exception index should be enabled
            expect(collFlag).to.be.equal(ENABLED);
        } else {
            // rest all should be disabled
            expect(collFlag).to.be.equal(DISABLED);
        }
    }
}
