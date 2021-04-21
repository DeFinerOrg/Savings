import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.borrow", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
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

    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_USDC: any;

    before(function() {
        // Things to initialize before all test
        this.timeout(0);

        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function() {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        bank = await testEngine.bank;

        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;

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
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0];

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

        ONE_DAI = eighteenPrecision;
        ONE_USDC = sixPrecision;
        numOfToken = new BN(1000);
    });

    context("borrow()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("when unsupported token address is passed", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(dummy, new BN(10), { from: user2 }),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressDAI, new BN(0), { from: user2 }),
                        "Borrow zero amount of token is not allowed."
                    );
                });

                it("when user tries to borrow token, but he has not deposited any token before", async function() {
                    this.timeout(0);
                    // 1. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressDAI, new BN(10), { from: user2 }),
                        "The user doesn't have any deposits."
                    );
                });

                it("when there is no liquidity for the asked token", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressDAI, new BN(1001), { from: user2 }),
                        "Lack of liquidity when borrow."
                    );
                });
            });

            context("should succeed", async () => {
                // modified
                it("Deposit DAI then borrow DAI", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken.mul(new BN(2)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                // modified
                it("Deposit DAI & USDC then borrow DAI", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken.mul(new BN(2)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));

                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });
                // modified
                it("Deposit DAI & USDC then borrow USDC", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user2.
                    await erc20DAI.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user1 & user2.
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken.mul(new BN(2)),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));

                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });
                // modified
                it("when supported token address is passed", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("when borrow amount of token is equal to ILTV of his collateral value", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20USDC.transfer(user2, sixPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });
                    await erc20USDC.approve(savingAccount.address, sixPrecision, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });
                    await savingAccount.deposit(addressUSDC, sixPrecision, { from: user2 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        sixPrecision,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const limitAmount = eighteenPrecision
                        .mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(0));

                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });

                    await savAccBalVerify(
                        2,
                        limitAmount,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        limitAmount
                    );
                });

                it("when borrowing a whole DAI", async function() {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(10)), {
                        from: user2
                    });

                    await savAccBalVerify(
                        2,
                        numOfDAI.div(new BN(10)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        numOfDAI.div(new BN(10))
                    );
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("when unsupported token address is passed", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(dummy, new BN(10), { from: user2 }),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(0), { from: user1 }),
                        "Borrow zero amount of token is not allowed."
                    );
                });

                it("when user tries to borrow ETH, but he has not deposited any token before", async function() {
                    this.timeout(0);

                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken
                    });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 }),
                        "The user doesn't have any deposits."
                    );
                });

                it("when user tries to borrow more than initial LTV (ILTV)", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const balance = numOfToken
                        .mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(85))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(0));
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, balance, { from: user1 }),
                        "Insufficient collateral when borrow."
                    );
                });

                it("when there is no liquidity for the asked ETH", async () => {
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user2,
                        value: numOfToken
                    });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(ETH_ADDRESS, new BN(1001), { from: user1 }),
                        "Lack of liquidity when borrow."
                    );
                });
            });

            context("should succeed", async () => {
                it("Deposit ETH & USDC then borrow ETH", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    // 1.2 Transfer USDC to user1.
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, {
                        from: user1
                    });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const user1ETHValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );

                    expect(new BN(user1ETHValue)).to.be.bignumber.equal(new BN(10));
                });

                it("Deposit DAI & ETH then borrow ETH", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                    const user1ETHValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    expect(new BN(user1ETHValue)).to.be.bignumber.equal(new BN(10));
                });

                it("Deposit ETH then borrow ETH", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken
                    });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterSecondDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterSecondDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterSecondDeposit,
                        savingAccountETHTokenAfterSecondDeposit,
                        bank,
                        savingAccount
                    );

                    const user1ETHValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );

                    expect(new BN(user1ETHValue)).to.be.bignumber.equal(new BN(10));
                });

                it("when supported token address is passed", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user1ETHValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );

                    expect(new BN(user1ETHValue)).to.be.bignumber.equal(new BN(10));
                });

                it("when borrow amount of ETH less then ILTV of his collateral value", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(1), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(1),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user1ETHBorrowValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    expect(new BN(user1ETHBorrowValue)).to.be.bignumber.equal(new BN(1));
                });

                it("when supported token address is passed", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user1ETHValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );

                    expect(new BN(user1ETHValue)).to.be.bignumber.equal(new BN(10));
                });

                it("when borrow amount of ETH is equal to ILTV of his collateral value", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(0));
                    await savingAccount.borrow(ETH_ADDRESS, limitAmount, { from: user1 });

                    await savAccBalVerify(
                        2,
                        limitAmount,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user2ETHBorrowValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    expect(new BN(user2ETHBorrowValue)).to.be.bignumber.equal(limitAmount);
                });

                it("When the amount is large, deposit DAI to borrow ETH.", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, eighteenPrecision);
                    await erc20DAI.approve(savingAccount.address, eighteenPrecision, {
                        from: user1
                    });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        from: user2,
                        value: eighteenPrecision
                    });
                    await savingAccount.deposit(addressDAI, eighteenPrecision, { from: user1 });
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfETH = eighteenPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfETH, {
                        from: user2,
                        value: numOfETH
                    });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision.mul(new BN(11)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eighteenPrecision.mul(new BN(11)),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1ETHBorrowValue = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );
                    expect(new BN(user1ETHBorrowValue)).to.be.bignumber.equal(new BN(10));
                });
            });
        });

        context("Token without Compound (MKR, TUSD)", async () => {
            context("should fail", async () => {
                it("when borrow MKR，amount is zero", async function() {
                    this.timeout(0);
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressMKR, new BN(0), { from: user2 }),
                        "Borrow zero amount of token is not allowed."
                    );
                });

                it("when borrow TUSD，amount is zero", async function() {
                    this.timeout(0);
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressTUSD, new BN(0), { from: user1 }),
                        "Borrow zero amount of token is not allowed."
                    );
                });

                it("when user tries to borrow MKR, but he has not deposited any token before", async function() {
                    this.timeout(0);
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressMKR, new BN(10), { from: user2 }),
                        "The user doesn't have any deposits."
                    );
                });

                it("when user tries to borrow TUSD, but he has not deposited any token before", async function() {
                    this.timeout(0);
                    await erc20TUSD.transfer(user1, numOfToken);
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user1 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressTUSD, new BN(10), { from: user2 }),
                        "The user doesn't have any deposits."
                    );
                });

                // yichun: this one is not doing what's it is described
                it("when there is no liquidity for the asked MKR", async function() {
                    this.timeout(0);
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressMKR, new BN(1001), { from: user2 }),
                        "Insufficient collateral when borrow."
                    );
                });

                it("when there is no liquidity for the asked TUSD", async function() {
                    this.timeout(0);
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressTUSD, new BN(1001), { from: user1 }),
                        "Lack of liquidity when borrow."
                    );
                });
            });

            context("should succeed", async () => {
                // modified
                it("Deposit MKR then borrow MKR", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));

                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                        new BN(1)
                    );
                });
                // modified
                it("Deposit TUSD then borrow TUSD", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20TUSD.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20TUSD.balanceOf(user2));

                    await savingAccount.borrow(addressTUSD, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20TUSD.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                // modified
                it("Deposit MKR & TUSD then borrow MKR", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20MKR.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20MKR.balanceOf(user2));

                    await savingAccount.borrow(addressMKR, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20MKR.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });
                // modified
                it("Deposit MKR & TUSD then borrow TUSD", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20TUSD.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20TUSD.balanceOf(user2));
                    await savingAccount.borrow(addressTUSD, new BN(10), { from: user2 });
                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20TUSD.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });
                // modified
                it("When depositing DAI to borrow MKR.", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));
                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                        new BN(1)
                    );
                });
                // modified
                it("When depositing DAI to borrow TUSD.", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20TUSD.balanceOf(user1));
                    await savingAccount.borrow(addressTUSD, new BN(1), { from: user1 });
                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20TUSD.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                        new BN(1)
                    );
                });
            });
        });

        context("Token with 6 decimal", async () => {
            context("should fail", async () => {
                it("when borrow USDC, amount is zero", async function() {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressUSDC, new BN(0), { from: user1 }),
                        "Borrow zero amount of token is not allowed."
                    );
                });

                it("when user tries to borrow USDC, but he has not deposited any token before", async function() {
                    this.timeout(0);
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user1 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressUSDC, new BN(10), { from: user2 }),
                        "The user doesn't have any deposits."
                    );
                });

                it("when there is no liquidity for the asked USDC", async function() {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await expectRevert(
                        savingAccount.borrow(addressUSDC, new BN(1001), { from: user1 }),
                        "Insufficient collateral when borrow."
                    );
                });
            });

            context("should succeed", async () => {
                // modified
                it("Deposit USDC then borrow USDC", async function() {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20USDC.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken.mul(new BN(2)),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });
                // modified
                it("When depositing DAI to borrow USDC.", async function() {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20USDC.balanceOf(user1));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("when borrow amount of token is equal to ILTV of his collateral value", async function() {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.mul(new BN(1));
                    const numOfUSDC = sixPrecision.mul(new BN(1));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const limitAmount = numOfUSDC
                        .mul(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(1));

                    const user1BalanceBefore = BN(await erc20USDC.balanceOf(user1));
                    await savingAccount.borrow(addressUSDC, limitAmount, { from: user1 });

                    await savAccBalVerify(
                        2,
                        limitAmount,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                        limitAmount
                    );
                });

                it("When the DAI is large, deposit DAI to borrow USDC.", async function() {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user1BalanceBefore = BN(await erc20USDC.balanceOf(user1));
                    await savingAccount.borrow(addressUSDC, numOfUSDC.div(new BN(10)), {
                        from: user1
                    });

                    await savAccBalVerify(
                        2,
                        numOfUSDC.div(new BN(10)),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user1BalanceAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                        numOfUSDC.div(new BN(10))
                    );
                });
                // modified
                it("when borrow USDC of token is equal to ILTV of his collateral value", async function() {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const limitAmount = numOfToken
                        .mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(0));
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });

                    await savAccBalVerify(
                        2,
                        limitAmount,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Verify the loan amount.
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        limitAmount
                    );
                });
            });
        });

        context("With multiple tokens", async () => {
            context(
                "Use compound supported and unsupported tokens together (WBTC, TUSD)",
                async () => {
                    context("Should fail", async () => {
                        it("Deposits WBTC, borrows TUSD and the collateral is not enough", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1000)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1000)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            await savingAccount.fastForward(1000);

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1000)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows more TUSD than its borrowing power, should fail
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();

                            let borrow = eighteenPrecision.mul(WBTCPrice).div(TUSDPrice);

                            await expectRevert(
                                savingAccount.borrow(addressTUSD, borrow, { from: user1 }),
                                "Lack of liquidity when borrow."
                            );
                        });
                        it("Deposits TUSD, borrows WBTC and the collateral is not enough", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 100 WBTC
                             * Account2: deposits 1 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account11 Borrows more WBTC than its borrowing power, should fail
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = eightPrecision.mul(TUSDPrice).div(WBTCPrice);
                            await expectRevert(
                                savingAccount.borrow(addressWBTC, borrow, { from: user2 }),
                                "Insufficient collateral when borrow."
                            );
                        });
                        it("Deposits WBTC, borrows TUSD and the amount is zero", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows 0 TUSD
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(0);
                            await expectRevert(
                                savingAccount.borrow(addressTUSD, borrow, { from: user1 }),
                                "Borrow zero amount of token is not allowed."
                            );
                        });
                        it("Deposits TUSD, borrows WBTC and the amount is zero", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 100 WBTC
                             * Account2: deposits 1 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );
                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account11 Borrows 0 WBTC
                             * To verify:
                             * 1. Fail at borrowing
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(0);
                            await expectRevert(
                                savingAccount.borrow(addressWBTC, borrow, { from: user2 }),
                                "Borrow zero amount of token is not allowed."
                            );
                        });
                    });
                    context("Should succeeed", async () => {
                        it("Deposits WBTC, borrows a small amount of TUSD ", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCBeforeDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );

                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCAfterDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows 10 TUSD
                             * To verify:
                             * 1. Account1 increases 10 TUSD
                             * 2. After deposit, 85% WBTC from savings goes to Compound
                             * 3. After borrowing, the amount of WBTC that savings deposits to Compound doesn't change
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(10);

                            const user1TUSDBefore = await erc20TUSD.balanceOf(user1);

                            await savingAccount.borrow(addressTUSD, borrow, { from: user1 });

                            const savingsCompoundWBTCAfterBorrow = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            const user1TUSDAfter = await erc20TUSD.balanceOf(user1);

                            expect(
                                BN(user1TUSDAfter).sub(BN(user1TUSDBefore))
                            ).to.be.bignumber.equals(borrow);

                            expect(
                                savingsCompoundWBTCAfterDeposit.sub(
                                    savingsCompoundWBTCBeforeDeposit
                                )
                            ).to.be.bignumber.equals(
                                eightPrecision
                                    .mul(new BN(1))
                                    .mul(new BN(85))
                                    .div(new BN(100))
                            );

                            expect(
                                savingsCompoundWBTCAfterBorrow.sub(savingsCompoundWBTCAfterDeposit)
                            ).to.be.bignumber.equals(new BN(0));
                        });

                        it("Deposits TUSD, borrows a small amount of WBTC ", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCBeforeDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(100)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCAfterDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account2: Borrows 1 WBTC
                             * To verify:
                             * 1. Account2 increases 1 WBTC
                             * 2. After deposit, 85% WBTC from savings goes to Compound
                             * 3. After borrowing, the amount of WBTC that savings deposits to Compound doesn't change
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                            let borrow = new BN(1);
                            let accWBTCBefore = await erc20WBTC.balanceOf(user2);

                            await savingAccount.borrow(addressWBTC, borrow, { from: user2 });

                            const savingsCompoundWBTCAfterBorrow = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            let accWBTCAfter = await erc20WBTC.balanceOf(user2);
                            expect(BN(accWBTCAfter).sub(BN(accWBTCBefore))).to.be.bignumber.equals(
                                borrow
                            );

                            expect(
                                savingsCompoundWBTCAfterDeposit.sub(
                                    savingsCompoundWBTCBeforeDeposit
                                )
                            ).to.be.bignumber.equals(
                                eightPrecision
                                    .mul(new BN(1))
                                    .mul(new BN(85))
                                    .div(new BN(100))
                            );

                            expect(
                                savingsCompoundWBTCAfterBorrow.sub(savingsCompoundWBTCAfterDeposit)
                            ).to.be.bignumber.equals(new BN(0));
                        });
                        it("Deposits WBTC, borrows the same amount of borrowing power ", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 1 WBTC
                             * Account2: deposits 100 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10000)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(10000)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCBeforeDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(1)),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(10000)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCAfterDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account1: Borrows the same as the borrowing power
                             * To verify:
                             * 1. Account1 increases the same amount of borrow power of TUSD
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();

                            let borrow = eighteenPrecision
                                .mul(TUSDPrice)
                                .div(WBTCPrice)
                                .div(new BN(100))
                                .mul(new BN(60));
                            let accTUSDBefore = await erc20TUSD.balanceOf(user1);

                            await savingAccount.borrow(addressTUSD, borrow, { from: user1 });
                            const savingsCompoundWBTCAfterBorrow = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            let accTUSDAfter = await erc20TUSD.balanceOf(user1);

                            expect(BN(accTUSDAfter).sub(accTUSDBefore)).to.be.bignumber.equals(
                                borrow
                            );

                            expect(
                                savingsCompoundWBTCAfterDeposit.sub(
                                    savingsCompoundWBTCBeforeDeposit
                                )
                            ).to.be.bignumber.equals(
                                eightPrecision
                                    .mul(new BN(1))
                                    .mul(new BN(85))
                                    .div(new BN(100))
                            );

                            expect(
                                savingsCompoundWBTCAfterBorrow.sub(savingsCompoundWBTCAfterDeposit)
                            ).to.be.bignumber.equals(new BN(0));
                        });
                        it("Deposits TUSD, borrows the same amount of borrowing power", async function() {
                            this.timeout(0);
                            /*
                             * Step 1. Assign tokens to each user and deposit them to DeFiner
                             * Account1: deposits 100 WBTC
                             * Account2: deposits 1 TUSD
                             */
                            await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(100)));
                            await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));

                            await erc20WBTC.approve(
                                savingAccount.address,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );

                            await erc20TUSD.approve(
                                savingAccount.address,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCBeforeDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            await savingAccount.deposit(
                                addressWBTC,
                                eightPrecision.mul(new BN(100)),
                                { from: user1 }
                            );

                            await savingAccount.deposit(
                                addressTUSD,
                                eighteenPrecision.mul(new BN(1)),
                                { from: user2 }
                            );

                            const savingsCompoundWBTCAfterDeposit = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            /*
                             * Step 2. Assign tokens to each user and deposit them to DeFiner
                             * Account2:Borrows the same as the borrowing power
                             * To verify:
                             * 1. Account1 increases the same amount of borrow power of TUSD
                             * 2. After deposit, 85% WBTC from savings goes to Compound
                             * 3. After borrowing, the amount of WBTC that savings deposits to Compound doesn't change
                             */
                            let WBTCPrice = await mockChainlinkAggregatorforWBTC.latestAnswer();
                            let TUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();

                            let borrow = eightPrecision
                                .mul(TUSDPrice)
                                .div(WBTCPrice)
                                .div(new BN(100))
                                .mul(new BN(60));

                            let user1WBTCBefore = await erc20WBTC.balanceOf(user2);

                            await savingAccount.borrow(addressWBTC, borrow, { from: user2 });

                            const savingsCompoundWBTCAfterBorrow = new BN(
                                await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                            );

                            let user1WBTCAfter = await erc20WBTC.balanceOf(user2);

                            expect(
                                BN(user1WBTCAfter).sub(BN(user1WBTCBefore))
                            ).to.be.bignumber.equals(borrow);

                            expect(
                                savingsCompoundWBTCAfterDeposit.sub(
                                    savingsCompoundWBTCBeforeDeposit
                                )
                            ).to.be.bignumber.equals(
                                eightPrecision
                                    .mul(new BN(100))
                                    .mul(new BN(85))
                                    .div(new BN(100))
                            );

                            expect(
                                savingsCompoundWBTCAfterBorrow.sub(savingsCompoundWBTCAfterDeposit)
                            ).to.be.bignumber.equals(new BN(0));
                        });
                    });
                }
            );
        });

        context("Call multiple times", async () => {
            context("Should succeed", async () => {
                it("Uses 18 decimals, TUSD", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Account 1: Deposits 100 whole DAI tokens
                     * Account 2: Depoists 100 whole TUSD tokens
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(100)));
                    await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(100)),
                        { from: user1 }
                    );
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(100)),
                        { from: user2 }
                    );

                    const savingsCompoundDAIBeforeDeposit = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsDAIBeforeDeposit = new BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(100)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(100)), {
                        from: user2
                    });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision.mul(new BN(100)),
                        erc20DAI.address,
                        cDAI,
                        savingsCompoundDAIBeforeDeposit,
                        savingsDAIBeforeDeposit,
                        bank,
                        savingAccount
                    );
                    /*
                     * Step 2
                     * Account 1: Borrows 10 whole TUSD twice
                     * To verify:
                     * 1. Account 1's TUSD balance should be 10 after the first borrow
                     * 2. Account 1's TUSD balance should be 20 after the second borrow
                     */
                    let borrow = eighteenPrecision.mul(new BN(10));
                    let accTUSDBeforeFirst = await erc20TUSD.balanceOf(user1);

                    await savingAccount.borrow(addressTUSD, borrow, { from: user1 });

                    let accTUSDAfterFirst = await erc20TUSD.balanceOf(user1);

                    await savingAccount.borrow(addressTUSD, borrow, { from: user1 });

                    let accTUSDAfterSecond = await erc20TUSD.balanceOf(user1);

                    // Verify 1.
                    expect(
                        BN(accTUSDAfterFirst).sub(BN(accTUSDBeforeFirst))
                    ).to.be.bignumber.equals(borrow);

                    // Verify 2.
                    expect(
                        BN(accTUSDAfterSecond).sub(BN(accTUSDBeforeFirst))
                    ).to.be.bignumber.equals(borrow.mul(new BN(2)));
                });

                it("Uses 6 decimals, USDC", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Account 1: Deposits 100 whole DAI tokens
                     * Account 2: Depoists 100 whole USDC tokens
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(100)));
                    await erc20USDC.transfer(user2, sixPrecision.mul(new BN(100)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(100)),
                        { from: user1 }
                    );
                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(100)), {
                        from: user2
                    });

                    const savingsCompoundDAIBeforeDeposit = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsDAIBeforeDeposit = new BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingsCompoundUSDCBeforeDeposit = new BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsUSDCBeforeDeposit = new BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(100)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(100)), {
                        from: user2
                    });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision.mul(new BN(100)),
                        erc20DAI.address,
                        cDAI,
                        savingsCompoundDAIBeforeDeposit,
                        savingsDAIBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        sixPrecision.mul(new BN(100)),
                        erc20USDC.address,
                        cUSDC,
                        savingsCompoundUSDCBeforeDeposit,
                        savingsUSDCBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingsCompoundUSDCAfterDeposit = new BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsUSDCAfterDeposit = new BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    /*
                     * Step 2
                     * Account 1: Borrows 10 whole USDC twice
                     * To verify:
                     * 1. Account 1's USDC balance should be 10 after the first borrow
                     * 2. Account 1's USDC balance should be 20 after the second borrow
                     */
                    let borrow = sixPrecision.mul(new BN(10));
                    let accUSDCBeforeFirst = await erc20USDC.balanceOf(user1);

                    await savingAccount.borrow(addressUSDC, borrow, { from: user1 });

                    await savAccBalVerify(
                        2,
                        borrow,
                        erc20USDC.address,
                        cUSDC,
                        savingsCompoundUSDCAfterDeposit,
                        savingsUSDCAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingsCompoundUSDCAfterFirstBorrow = new BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsUSDCAfterFirstBorrow = new BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    let accUSDCAfterFirst = await erc20USDC.balanceOf(user1);

                    await savingAccount.borrow(addressUSDC, borrow, { from: user1 });

                    let accUSDCAfterSecond = await erc20USDC.balanceOf(user1);

                    await savAccBalVerify(
                        2,
                        borrow,
                        erc20USDC.address,
                        cUSDC,
                        savingsCompoundUSDCAfterFirstBorrow,
                        savingsUSDCAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    // Verify 1.
                    expect(
                        BN(accUSDCAfterFirst).sub(BN(accUSDCBeforeFirst))
                    ).to.be.bignumber.equals(borrow);

                    // Verify 2.
                    expect(
                        BN(accUSDCAfterSecond).sub(BN(accUSDCBeforeFirst))
                    ).to.be.bignumber.equals(borrow.mul(new BN(2)));
                });

                it("Uses 8 decimals, WBTC", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Account 1: Deposits 1000 whole DAI tokens
                     * Account 2: Depoists 1000 whole WBTC tokens
                     */
                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(1000)));
                    await erc20WBTC.transfer(user2, eightPrecision.mul(new BN(1000)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1000)),
                        { from: user1 }
                    );
                    await erc20WBTC.approve(
                        savingAccount.address,
                        eightPrecision.mul(new BN(1000)),
                        { from: user2 }
                    );

                    const savingsCompoundDAIBeforeDeposit = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsDAIBeforeDeposit = new BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingsCompoundWBTCBeforeDeposit = new BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsWBTCBeforeDeposit = new BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1000)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressWBTC, eightPrecision.mul(new BN(1000)), {
                        from: user2
                    });

                    await savAccBalVerify(
                        0,
                        eighteenPrecision.mul(new BN(1000)),
                        erc20DAI.address,
                        cDAI,
                        savingsCompoundDAIBeforeDeposit,
                        savingsDAIBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        eightPrecision.mul(new BN(1000)),
                        erc20WBTC.address,
                        cWBTC,
                        savingsCompoundWBTCBeforeDeposit,
                        savingsWBTCBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingsCompoundWBTCAfterDeposit = new BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsWBTCAfterDeposit = new BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    /*
                     * Step 2
                     * Account 1: Borrows 0.01 whole WBTC twice
                     * To verify:
                     * 1. Account 1's WBTC balance should be 10 after the first borrow
                     * 2. Account 1's WBTC balance should be 20 after the second borrow
                     */
                    let borrow = eightPrecision.div(new BN(100));
                    let accWBTCAfterFirstBefore = await erc20WBTC.balanceOf(user1);

                    await savingAccount.borrow(addressWBTC, borrow, { from: user1 });

                    await savAccBalVerify(
                        2,
                        borrow,
                        erc20WBTC.address,
                        cWBTC,
                        savingsCompoundWBTCAfterDeposit,
                        savingsWBTCAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingsCompoundWBTCAfterFirstBorrow = new BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsWBTCAfterFirstBorrow = new BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    let accWBTCAfterFirst = await erc20WBTC.balanceOf(user1);
                    await savingAccount.borrow(addressWBTC, borrow, { from: user1 });

                    const savingsCompoundDAIAfterSecondBorrow = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingsCompoundWBTCAfterSecondBorrow = new BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    let accWBTCAfterSecond = await erc20WBTC.balanceOf(user1);

                    await savAccBalVerify(
                        2,
                        borrow,
                        erc20WBTC.address,
                        cWBTC,
                        savingsCompoundWBTCAfterFirstBorrow,
                        savingsWBTCAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    // Verify 1.
                    expect(
                        BN(accWBTCAfterFirst).sub(BN(accWBTCAfterFirstBefore))
                    ).to.be.bignumber.equals(borrow);
                    // Verify 2.
                    expect(
                        BN(accWBTCAfterSecond).sub(BN(accWBTCAfterFirstBefore))
                    ).to.be.bignumber.equals(borrow.mul(new BN(2)));
                });
            });
        });
    });
});
