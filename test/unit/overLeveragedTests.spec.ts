import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.overLeveraged", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_ETH: any;
    let ONE_USDC: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        addressUSDT = tokens[2];

        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_ETH = eighteenPrecision;
        ONE_USDC = sixPrecision;

        await savingAccount.fastForward(1000);
    });

    context("over leveraged", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("OverLeveragedTest1: user deposits DAI, borrows ETH and tries to withdraw without repaying", async function () {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    // await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)));
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    //await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)));
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));

                    console.log("borrowAmt", borrowAmt.toString());

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    console.log("DAIprice", DAIprice.toString());

                    // update price of DAI to 70% of it's value

                    let updatedPrice = BN(DAIprice).mul(new BN(65)).div(new BN(100));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    // 4. withdraw
                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    await expectRevert(
                        savingAccount.withdrawAll(addressDAI, { from: user1 }),
                        "Insufficient collateral when withdraw."
                    );

                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                });

                it("OverLeveragedTest2: user deposits USDC, borrows DAI and withdraws without reaying", async function () {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(2)));
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)));

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });

                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice).mul(new BN(7)).div(new BN(10));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                    // 4. wihdraw
                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    await expectRevert(
                        savingAccount.withdrawAll(addressUSDC, { from: user2 }),
                        "Insufficient collateral when withdraw."
                    );

                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });

                it("OverLeveragedTest3: user deposits USDC, borrows DAI, deposits DAI, borrows DAI and withdraws without repaying", async function () {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI.mul(new BN(100)));
                    await erc20USDC.transfer(user2, ONE_USDC.mul(new BN(100)));
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)), {
                        from: user1,
                    });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(100)), {
                        from: user2,
                    });
                    await erc20DAI.approve(
                        savingAccount.address,
                        ONE_DAI.mul(new BN(100)).mul(new BN(2))
                    );
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)), {
                        from: user1,
                    });
                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(100)), {
                        from: user2,
                    });
                    await savingAccount.deposit(
                        addressDAI,
                        ONE_DAI.mul(new BN(100)).mul(new BN(2))
                    );

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI.mul(new BN(100)))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);

                    // 2. borrow and deposit
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    let user2bal = await erc20DAI.balanceOf(user2);

                    await erc20DAI.approve(savingAccount.address, borrowAmt, {
                        from: user2,
                    });
                    await savingAccount.deposit(addressDAI, borrowAmt, { from: user2 });

                    // 3 fastforward and borrow again
                    await savingAccount.fastForward(1000);
                    // await savingAccount.deposit(addressDAI, new BN(10));

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .mul(new BN(50))
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));
                    await savingAccount.borrow(addressDAI, borrowAmt2, { from: user2 });

                    // 4. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    let updatedPrice = BN(originPrice).mul(new BN(70)).div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );
                    // expect(isUserLiquidatable).to.equal(true);

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressUSDC, { from: user2 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });

                it(
                    "OverLeveragedTest4: user deposits DAI, borrows ETH, deposits ETH, borrows USDC and withdraws without repaying", async function () {
                    this.timeout(0);

                    // 1. Approve tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)));
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)));
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));

                    console.log("borrowAmt", borrowAmt.toString());

                    // 2. Borrow and deposit
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, borrowAmt, {
                        from: user1,
                        value: borrowAmt,
                    });

                    // 3. fastforward and borrow
                    await savingAccount.fastForward(1000);
                    await savingAccount.deposit(ETH_ADDRESS, new BN(10), {
                        from: owner,
                        value: new BN(10),
                    });

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(9)))
                        .mul(new BN(50))
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                    await savingAccount.borrow(addressDAI, borrowAmt2, { from: user1 });

                    // 4. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(originPrice).mul(new BN(80)).div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    // expect(isUserLiquidatable).to.equal(true);

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressDAI, { from: user1 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                    }
                );

                it(
                    "OverLeveragedTest5: user deposits MKR, borrows DAI, deposits DAI, borrows TUSD and withdraws without repaying"
                );
            });
        });
    });
});
