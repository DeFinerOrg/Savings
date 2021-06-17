import * as t from "../../../../types/truffle-contracts/index";
import { TestEngine } from "../../../../test-helpers/TestEngine";

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");

const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";

contract("Collateral Feature Tests", async (accounts) => {
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

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

        await savingAccount.fastForward(1);
    });

    describe("setCollateral()", async () => {
        it("should fail when token is not present");

        describe("Enable Collateral", async () => {
            it("should enable collateral for a single token", async () => {
                const collStatus = await accountsContract.getCollateralStatus(user1);
                await expectAllDisabled(collStatus);

                await accountsContract.accounts(user1);

                await accountsContract.methods["setCollateral(uint8,bool)"](addressDAI, true, {
                    from: user1,
                });
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

async function expectAllDisabled(collStatus: [string[], boolean[]]) {
    const tokens = collStatus[0];
    const status = collStatus[1];

    expect(tokens.length > 0, "no tokens");
    expect(tokens.length == status.length, "length mismatch");

    for (let i = 0; i < tokens.length; i++) {
        expect(status[i] == false, "status is enabled");
    }
}
