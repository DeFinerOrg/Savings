import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.liquidate", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
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

    context("liquidate()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("when unsupported token address is passed", async function () {
                    this.timeout(0);
                    //Try depositting unsupported Token to SavingContract
                    await expectRevert(
                        savingAccount.liquidate(owner, dummy, addressDAI),
                        "Unsupported token"
                    );
                });

                it("when tokenAddress is zero", async function () {
                    this.timeout(0);
                    //Try depositting zero address
                    await expectRevert(
                        savingAccount.liquidate(owner, addressZero, addressDAI),
                        "Unsupported token"
                    );
                });

                it("when the ratio of borrowed money and collateral is less than 85%", async function () {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await expectRevert(
                        savingAccount.liquidate(user2, addressUSDC, addressDAI),
                        "The borrower is not liquidatable."
                    );
                });

                it("when collateral is not sufficient to be liquidated", async function () {
                    this.timeout(0);
                    // 2. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });

                    // 2. Start borrowing.
                    const limitAmount = ONE_USDC.mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(0));

                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                    // 3. Change the price.
                    let updatedPrice = new BN(1);
                    const originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                    await expectRevert(
                        savingAccount.liquidate(user2, addressUSDC, addressDAI),
                        "The borrower is not liquidatable."
                    );
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });
            });

            context("should succeed", async () => {
                it("When user tries to liquidate partially", async function () {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI);

                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI.div(new BN(100)));

                    // 2. Start borrowing.

                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    // 3. Change the price.
                    let USDCprice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(USDCprice).mul(new BN(7)).div(new BN(10));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );

                    const ownerUSDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user2USDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user2
                    );
                    const user2DAIBefore = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);

                    const ownerUSDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user2USDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user2
                    );
                    const user2DAIAfter = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    expect(BN(user2USDCAfter).add(BN(ownerUSDCAfter))).to.be.bignumber.equal(
                        BN(user2USDCBefore)
                    );
                    expect(BN(user2DAIBefore).sub(BN(user2DAIAfter))).to.be.bignumber.equal(
                        BN(ownerDAIBefore).sub(ownerDAIAfter)
                    );

                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const usdcPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();

                    const daiDiff = BN(ownerDAIBefore).sub(ownerDAIAfter);

                    const usdcEarned = BN(daiDiff)
                        .mul(BN(daiPrice))
                        .div(BN(usdcPrice))
                        .mul(new BN(100))
                        .div(new BN(95))
                        .mul(sixPrecision)
                        .div(eighteenPrecision);

                    expect(BN(usdcEarned)).to.be.bignumber.equal(ownerUSDCAfter);

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user2);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(true);

                    await mockChainlinkAggregatorforUSDC.updateAnswer(USDCprice);
                });

                it("When user tries to liquidate fully - 1", async function () {
                    this.timeout(0);
                    // 2. Approve 1000 tokens
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

                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );

                    const ownerUSDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user2USDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user2
                    );
                    const user2DAIBefore = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);

                    const ownerUSDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user2USDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user2
                    );
                    const user2DAIAfter = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    expect(BN(user2USDCAfter).add(BN(ownerUSDCAfter))).to.be.bignumber.equal(
                        BN(user2USDCBefore)
                    );
                    expect(BN(user2DAIBefore).sub(BN(user2DAIAfter))).to.be.bignumber.equal(
                        BN(ownerDAIBefore).sub(ownerDAIAfter)
                    );

                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const usdcPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();

                    const daiDiff = BN(ownerDAIBefore).sub(ownerDAIAfter);

                    const liquidatedDebt = borrowAmt
                        .sub(
                            ONE_USDC.mul(eighteenPrecision)
                                .mul(new BN(usdcPrice))
                                .mul(new BN(60))
                                .div(sixPrecision)
                                .div(new BN(daiPrice))
                                .div(new BN(100))
                        )
                        .mul(new BN(95))
                        .mul(new BN(100))
                        .div(new BN(35))
                        .div(new BN(100));

                    const usdcEarned = BN(daiDiff)
                        .mul(BN(daiPrice))
                        .div(BN(usdcPrice))
                        .mul(new BN(100))
                        .div(new BN(95))
                        .mul(sixPrecision)
                        .div(eighteenPrecision);

                    expect(BN(usdcEarned)).to.be.bignumber.equal(ownerUSDCAfter);

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user2);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });

                it("When user tries to liquidate fully - 2", async function () {
                    this.timeout(0);
                    // 2. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI);

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

                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );

                    const ownerUSDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user2USDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user2
                    );
                    const user2DAIBefore = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);

                    const ownerUSDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user2USDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user2
                    );
                    const user2DAIAfter = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    expect(BN(user2USDCAfter).add(BN(ownerUSDCAfter))).to.be.bignumber.equal(
                        BN(user2USDCBefore)
                    );
                    expect(BN(user2DAIBefore).sub(BN(user2DAIAfter))).to.be.bignumber.equal(
                        BN(ownerDAIBefore).sub(ownerDAIAfter)
                    );

                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const usdcPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();

                    const daiDiff = BN(ownerDAIBefore).sub(ownerDAIAfter);

                    const liquidatedDebt = borrowAmt
                        .sub(
                            ONE_USDC.mul(eighteenPrecision)
                                .mul(new BN(usdcPrice))
                                .mul(new BN(60))
                                .div(sixPrecision)
                                .div(new BN(daiPrice))
                                .div(new BN(100))
                        )
                        .mul(new BN(95))
                        .mul(new BN(100))
                        .div(new BN(35))
                        .div(new BN(100));

                    const usdcEarned = BN(daiDiff)
                        .mul(BN(daiPrice))
                        .div(BN(usdcPrice))
                        .mul(new BN(100))
                        .div(new BN(95))
                        .mul(sixPrecision)
                        .div(eighteenPrecision);

                    expect(BN(usdcEarned)).to.be.bignumber.equal(ownerUSDCAfter);

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user2);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });

                it("Borrow USDC, when user tries to liquidate partially", async function () {
                    this.timeout(0);
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_USDC)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));

                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC.div(new BN(100)));
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice).mul(new BN(7)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );

                    const ownerUSDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user1USDCBefore = await accountsContract.getBorrowBalanceCurrent(
                        addressUSDC,
                        user1
                    );
                    const user1DAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    await savingAccount.liquidate(user1, addressUSDC, addressDAI);

                    const ownerUSDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user1USDCAfter = await accountsContract.getBorrowBalanceCurrent(
                        addressUSDC,
                        user1
                    );
                    const user1DAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    expect(BN(user1DAIAfter).add(BN(ownerDAIAfter))).to.be.bignumber.equal(
                        BN(user1DAIBefore)
                    );
                    expect(BN(user1USDCBefore).sub(BN(user1USDCAfter))).to.be.bignumber.equal(
                        BN(ownerUSDCBefore).sub(ownerUSDCAfter)
                    );
                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const usdcPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();

                    const usdcDiff = BN(ownerUSDCBefore).sub(ownerUSDCAfter);
                    const daiEarned = BN(usdcDiff)
                        .mul(eighteenPrecision)
                        .mul(BN(usdcPrice))
                        .mul(new BN(100))
                        .div(BN(daiPrice))
                        .div(new BN(95))
                        .div(sixPrecision);

                    // console.log(usdcDiff.toString());
                    // console.log(daiEarned.toString());
                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                    expect(BN(daiEarned)).to.be.bignumber.equal(ownerDAIAfter);

                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(true);
                });

                it("Borrow USDC, When user tries to liquidate fully", async function () {
                    this.timeout(0);
                    // 2. Approve 1000 tokens
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_USDC)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC);
                    const ctokenBal = await cUSDC.balanceOfUnderlying.call(savingAccount.address);
                    // console.log(ctokenBal.toString());
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice).mul(new BN(7)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    const ownerUSDCBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user1USDCBefore = await accountsContract.getBorrowBalanceCurrent(
                        addressUSDC,
                        user1
                    );
                    const user1DAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    await savingAccount.liquidate(user1, addressUSDC, addressDAI);

                    const ownerUSDCAfter = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    const ownerDAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user1USDCAfter = await accountsContract.getBorrowBalanceCurrent(
                        addressUSDC,
                        user1
                    );
                    const user1DAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    expect(BN(user1DAIAfter).add(BN(ownerDAIAfter))).to.be.bignumber.equal(
                        BN(user1DAIBefore)
                    );
                    expect(BN(user1USDCBefore).sub(BN(user1USDCAfter))).to.be.bignumber.equal(
                        BN(ownerUSDCBefore).sub(ownerUSDCAfter)
                    );
                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const usdcPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();

                    const usdcDiff = BN(ownerUSDCBefore).sub(ownerUSDCAfter);
                    const daiEarned = BN(usdcDiff)
                        .mul(eighteenPrecision)
                        .mul(BN(usdcPrice))
                        .mul(new BN(100))
                        .div(BN(daiPrice))
                        .div(new BN(95))
                        .div(sixPrecision);
                    const liquidatedDebt = borrowAmt
                        .sub(
                            ONE_DAI.mul(sixPrecision)
                                .mul(new BN(daiPrice))
                                .mul(new BN(60))
                                .div(eighteenPrecision)
                                .div(new BN(usdcPrice))
                                .div(new BN(100))
                        )
                        .mul(new BN(95))
                        .mul(new BN(100))
                        .div(new BN(35))
                        .div(new BN(100));

                    // console.log(usdcDiff.toString());
                    // console.log(liquidatedDebt.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);
                    expect(BN(daiEarned)).to.be.bignumber.equal(ownerDAIAfter);

                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("when the ratio of borrowed money and collateral is less than 85%", async function () {
                    this.timeout(0);
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });

                    await expectRevert(
                        savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI),
                        "The borrower is not liquidatable."
                    );
                });

                it("when collateral is not sufficient to be liquidated", async function () {
                    this.timeout(0);
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    // 3. Change the price.
                    let updatedPrice = new BN(1);
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    await expectRevert(
                        savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI),
                        "The borrower is not liquidatable."
                    );
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                });
            });

            context("should succeed", async () => {
                it("When user tries to liquidate partially", async function () {
                    this.timeout(0);
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });

                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH.div(new BN(100)), {
                        value: ONE_ETH.div(new BN(100)),
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    const ownerETHBefore = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        owner
                    );
                    const ownerDAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user1ETHBefore = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    const user1DAIBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    await savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI);

                    const ownerETHAfter = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        owner
                    );
                    const ownerDAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    const user1ETHAfter = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    const user1DAIAfter = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);
                    expect(liquidateBefore).to.equal(true);
                    // expect(liquidateAfter).to.equal(true);
                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                });

                it("When user tries to liquidate fully", async function () {
                    this.timeout(0);
                    // 2. Approve 1000 tokens
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)));
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)));
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value

                    let updatedPrice = BN(DAIprice).mul(new BN(7)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );

                    await savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI, { from: user2 });

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                });
            });
        });
    });
});
