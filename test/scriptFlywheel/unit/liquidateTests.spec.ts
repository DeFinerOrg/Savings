import { TokenRegistryContract } from ".././../../types/truffle-contracts/index.d";
import { BigNumber } from "bignumber.js";
import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.liquidate", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
    let bankContract: t.BankInstance;

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
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
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
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        bankContract = await testEngine.bank;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        addressUSDT = tokens[2];

        addressWBTC = tokens[8];

        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDTAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforTUSDAddress
        );
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforMKRAddress
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
            /*context("should fail", async () => {
                it("when unsupported token address is passed", async function () {
                    this.timeout(0);
                    let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                        addressTUSD
                    );
                    let MKRCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(addressMKR);
                    console.log("TUSDCompoundFlag", TUSDCompoundFlag);
                    console.log("MKRCompoundFlag", MKRCompoundFlag);

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
                        "borrower is not liquidatable"
                    );
                });

                it("when collateral is not sufficient to be liquidated", async function () {
                    this.timeout(0);
                    const originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
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

                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: user2 }
                    );
                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                    // 3. Change the price.
                    let updatedPrice = new BN(1);
                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                    await expectRevert(
                        savingAccount.liquidate(user2, addressUSDC, addressDAI),
                        "amount must be > 0"
                    );
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });
            });*/

            context("should succeed", async () => {
                /*it("When user tries to liquidate partially", async function () {
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
                    let result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: user2 }
                    );
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

                    result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true
                    );

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressDAI);
                    let depositStore = await bankContract.getTotalDepositStore(addressDAI);
                    console.log("U1", U1.toString());
                    console.log("depositStore", depositStore.toString());
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
                    let USDCPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    console.log("USDCPrice", USDCPrice.toString());
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: user2 }
                    );
                    const userBorrowVal = await accountsContract.getBorrowETH(user2);
                    const user2Deposits = await accountsContract.getDepositETH(user2);
                    let user2BorrowPowerInit = await accountsContract.getBorrowPower(user2);
                    console.log("user 2 BP Before Borrow:", user2BorrowPowerInit.toString());
                    console.log("userBorrowVal", userBorrowVal.toString());
                    console.log("user2Deposits", user2Deposits.toString());
                    console.log("================ user 2 borrows DAI ================");
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    const user2DepositsAfterBorrow = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow = await accountsContract.getBorrowPower(user2);
                    let LTV = BN(userBorrowValAfterBorrow)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterBorrow));
                    console.log("user 2 BP After Borrow:", user2BorrowPowerAfterBorrow.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("LTV", LTV.toString());
                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice).mul(new BN(65)).div(new BN(100));
                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                    console.log("================== price updated ====================");
                    const user2DepositsAfterPiceDrop = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterPriceDrop = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow2 = await accountsContract.getBorrowPower(user2);
                    let LTV2 = BN(userBorrowValAfterPriceDrop)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterPiceDrop));
                    console.log(
                        "user 2 BP After price inc:",
                        user2BorrowPowerAfterBorrow2.toString()
                    );
                    console.log(
                        "user Borrow Val After price drop:",
                        userBorrowValAfterPriceDrop.toString()
                    );
                    console.log(
                        "user2DepositsAfterPiceDrop",
                        user2DepositsAfterPiceDrop.toString()
                    );
                    console.log("LTV2", LTV2.toString());
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

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressDAI);
                    let depositStore = await bankContract.getTotalDepositStore(addressDAI);
                    console.log("U1", U1.toString());
                    console.log("depositStore", depositStore.toString());
                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);
                    console.log("====================== User2 Liquidated =======================");
                    const user2DepositsAfterLiquidate = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user2
                    );
                    let userLTVAfterLiquidate = BN(userBorrowValAfterLiquidate)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterLiquidate));
                    console.log(
                        "user 2 BP After price inc:",
                        user2BorrowPowerAfterLiquidate.toString()
                    );
                    console.log(
                        "user Borrow Val After price drop:",
                        userBorrowValAfterLiquidate.toString()
                    );
                    console.log(
                        "user2DepositsAfterLiquidate",
                        user2DepositsAfterLiquidate.toString()
                    );
                    console.log("userLTVAfterLiquidate", userLTVAfterLiquidate.toString());
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

                    // check that the user's LTV equals ILTV of it's collateral after liquidate
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.greaterThan(new BN(58));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.lessThan(new BN(61));

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
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: user2 }
                    );
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

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressDAI);
                    let depositStore = await bankContract.getTotalDepositStore(addressDAI);
                    console.log("U1", U1.toString());
                    console.log("depositStore", depositStore.toString());
                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);

                    const user2DepositsAfterLiquidate = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user2
                    );
                    let userLTVAfterLiquidate = BN(userBorrowValAfterLiquidate)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterLiquidate));

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

                    // check that the user's LTV equals ILTV of it's collateral after liquidate
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.greaterThan(new BN(58));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.lessThan(new BN(61));

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
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
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

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                    let depositStore = await bankContract.getTotalDepositStore(addressUSDC);
                    let tokenState = await bankContract.getTokenState(addressUSDC);
                    console.log("U1", U1.toString());
                    console.log("loans", tokenState[1].toString());
                    console.log("depositStore", depositStore.toString());
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
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
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

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                    let depositStore = await bankContract.getTotalDepositStore(addressUSDC);
                    let tokenState = await bankContract.getTokenState(addressUSDC);
                    console.log("U1", U1.toString());
                    console.log("loans", tokenState[1].toString());
                    console.log("depositStore", depositStore.toString());

                    await savingAccount.liquidate(user1, addressUSDC, addressDAI);

                    const user2DepositsAfterLiquidate = await accountsContract.getDepositETH(user1);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    let user2BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user2
                    );
                    let userLTVAfterLiquidate = BN(userBorrowValAfterLiquidate)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterLiquidate));

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

                    // check that the user's LTV equals ILTV of it's collateral after liquidate
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.greaterThan(new BN(58));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.lessThan(new BN(61));

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

                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    let ownerDAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );

                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerUSDCAfter)).to.be.bignumber.lessThan(BN(ownerUSDCBefore));
                    // borrower's collateral should reduce
                    expect(BN(user1DAIAfter)).to.be.bignumber.lessThan(BN(user1DAIBefore));
                    // liquidator gets the collateral tokens
                    expect(BN(ownerDAIAfter)).to.be.bignumber.greaterThan(BN(ownerDAIBefore));
                    console.log("ownerDAIAfter", ownerDAIAfter.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);
                    expect(BN(daiEarned)).to.be.bignumber.equal(ownerDAIAfter);

                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                });
                it("When user tries to liquidate fully (when borrowed token's collateral factor is 0) ", async function () {
                    this.timeout(0);
                    // Set BorrowLTV of DAI token to 0
                    await testEngine.tokenInfoRegistry.updateBorrowLTV(addressDAI, new BN(0));

                    // ensure that borrowLTV is 0
                    const DAIBorrowLTV = await testEngine.tokenInfoRegistry.getBorrowLTV(
                        addressDAI
                    );
                    expect(DAIBorrowLTV).to.be.bignumber.equal(new BN(0));

                    // 2. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(2)));
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)));
                    let USDCPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    console.log("USDCPrice", USDCPrice.toString());

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );

                    const userBorrowVal = await accountsContract.getBorrowETH(user2);
                    const user2Deposits = await accountsContract.getDepositETH(user2);
                    let user2BorrowPowerInit = await accountsContract.getBorrowPower(user2);
                    console.log("user 2 BP Before Borrow:", user2BorrowPowerInit.toString());
                    console.log("userBorrowVal", userBorrowVal.toString());
                    console.log("user2Deposits", user2Deposits.toString());
                    console.log("================ user 2 borrows DAI ================");

                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });

                    const user2DepositsAfterBorrow = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow = await accountsContract.getBorrowPower(user2);
                    let userLTVAfterBorrow = BN(userBorrowValAfterBorrow)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterBorrow));
                    console.log("user 2 BP After Borrow:", user2BorrowPowerAfterBorrow.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userLTVAfterBorrow", userLTVAfterBorrow.toString());

                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice).mul(new BN(15)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    console.log("================== price updated ====================");

                    const user2DepositsAfterPiceDrop = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterPriceDrop = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow2 = await accountsContract.getBorrowPower(user2);
                    let LTV2 = BN(userBorrowValAfterPriceDrop)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterPiceDrop));
                    console.log(
                        "user 2 BP After price inc:",
                        user2BorrowPowerAfterBorrow2.toString()
                    );
                    console.log(
                        "user Borrow Val After price drop:",
                        userBorrowValAfterPriceDrop.toString()
                    );
                    console.log(
                        "user2DepositsAfterPiceDrop",
                        user2DepositsAfterPiceDrop.toString()
                    );
                    console.log("LTV2", LTV2.toString());

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
                    console.log("ownerDAIBefore", ownerDAIBefore.toString());

                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);
                    console.log("====================== User2 Liquidated =======================");

                    const user2DepositsAfterLiquidate = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user2
                    );
                    let userLTVAfterLiquidate = BN(userBorrowValAfterLiquidate)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterLiquidate));
                    console.log(
                        "user 2 BP After liquidation:",
                        user2BorrowPowerAfterLiquidate.toString()
                    );
                    console.log(
                        "user Borrow Val After liquidate:",
                        userBorrowValAfterLiquidate.toString()
                    );
                    console.log(
                        "user2DepositsAfterLiquidate",
                        user2DepositsAfterLiquidate.toString()
                    );
                    console.log("userLTVAfterLiquidate", userLTVAfterLiquidate.toString());

                    // check that the user's LTV equals ILTV of it's collateral after liquidate
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.greaterThan(new BN(58));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.lessThan(new BN(61));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.equal(BN(userLTVAfterBorrow));

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
                    console.log("ownerDAIAfter", ownerDAIAfter.toString());

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

                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    let ownerDAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );

                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerDAIBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerDAIBefore)
                    );
                    // borrower's collateral should reduce
                    expect(BN(user2USDCAfter)).to.be.bignumber.lessThan(BN(user2USDCBefore));
                    // liquidator gets the collateral tokens
                    expect(BN(ownerUSDCAfter)).to.be.bignumber.greaterThan(BN(ownerUSDCBefore));

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user2);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });
                it("Liquidate fully when user's collateral token's collateral factor is 20 and borrowed token's LTV is 0", async function () {
                    this.timeout(0);
                    // Set BorrowLTV of DAI token to 0
                    await testEngine.tokenInfoRegistry.updateBorrowLTV(addressDAI, new BN(0));
                    await testEngine.tokenInfoRegistry.updateBorrowLTV(addressUSDC, new BN(20));

                    // ensure that borrowLTV is 0 and collateral LTV is 20
                    const DAIBorrowLTV = await testEngine.tokenInfoRegistry.getBorrowLTV(
                        addressDAI
                    );
                    const USDCBorrowLTV = await testEngine.tokenInfoRegistry.getBorrowLTV(
                        addressUSDC
                    );
                    expect(DAIBorrowLTV).to.be.bignumber.equal(new BN(0));
                    expect(USDCBorrowLTV).to.be.bignumber.equal(new BN(20));

                    // 2. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(2)));
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)));
                    let USDCPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    console.log("USDCPrice", USDCPrice.toString());

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(20))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );

                    const userBorrowVal = await accountsContract.getBorrowETH(user2);
                    const user2Deposits = await accountsContract.getDepositETH(user2);
                    let user2BorrowPowerInit = await accountsContract.getBorrowPower(user2);
                    console.log("user 2 BP Before Borrow:", user2BorrowPowerInit.toString());
                    console.log("userBorrowVal", userBorrowVal.toString());
                    console.log("user2Deposits", user2Deposits.toString());
                    console.log("================ user 2 borrows DAI ================");

                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });

                    const user2DepositsAfterBorrow = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow = await accountsContract.getBorrowPower(user2);
                    let userLTVAfterBorrow = BN(userBorrowValAfterBorrow)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterBorrow));
                    console.log("user 2 BP After Borrow:", user2BorrowPowerAfterBorrow.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userLTVAfterBorrow", userLTVAfterBorrow.toString());

                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice).mul(new BN(22)).div(new BN(100));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                    console.log("================== price updated ====================");

                    const user2DepositsAfterPiceDrop = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterPriceDrop = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow2 = await accountsContract.getBorrowPower(user2);
                    let LTV2 = BN(userBorrowValAfterPriceDrop)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterPiceDrop));
                    console.log(
                        "user 2 BP After price inc:",
                        user2BorrowPowerAfterBorrow2.toString()
                    );
                    console.log(
                        "user Borrow Val After price drop:",
                        userBorrowValAfterPriceDrop.toString()
                    );
                    console.log(
                        "user2DepositsAfterPiceDrop",
                        user2DepositsAfterPiceDrop.toString()
                    );
                    console.log("LTV2", LTV2.toString());

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
                    console.log("ownerDAIBefore", ownerDAIBefore.toString());

                    await savingAccount.liquidate(user2, addressDAI, addressUSDC);
                    console.log("====================== User2 Liquidated =======================");

                    const user2DepositsAfterLiquidate = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user2
                    );
                    let userLTVAfterLiquidate = BN(userBorrowValAfterLiquidate)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterLiquidate));
                    console.log(
                        "user 2 BP After liquidation:",
                        user2BorrowPowerAfterLiquidate.toString()
                    );
                    console.log(
                        "user Borrow Val After liquidate:",
                        userBorrowValAfterLiquidate.toString()
                    );
                    console.log(
                        "user2DepositsAfterLiquidate",
                        user2DepositsAfterLiquidate.toString()
                    );
                    console.log("userLTVAfterLiquidate", userLTVAfterLiquidate.toString());

                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.equal(BN(userLTVAfterBorrow));

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
                    console.log("ownerDAIAfter", ownerDAIAfter.toString());

                    // check that the user's LTV equals ILTV of it's collateral after liquidate
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.greaterThan(new BN(18));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.lessThan(new BN(21));

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

                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    let ownerDAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );

                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerDAIBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerDAIBefore)
                    );
                    // borrower's collateral should reduce
                    expect(BN(user2USDCAfter)).to.be.bignumber.lessThan(BN(user2USDCBefore));
                    // liquidator gets the collateral tokens
                    expect(BN(ownerUSDCAfter)).to.be.bignumber.greaterThan(BN(ownerUSDCBefore));

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user2);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });
                it("when borrow LTV is greater than 95%", async function () {
                    this.timeout(0);
                    // 2. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });

                    // 2. Start borrowing.
                    const limitAmount = ONE_USDC.mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .div(await tokenInfoRegistry.priceFromIndex(0));

                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: user2 }
                    );

                    await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });

                    const user2DepositsAfterBorrow = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterBorrow = await accountsContract.getBorrowPower(user2);
                    let userLTVAfterBorrow = BN(userBorrowValAfterBorrow)
                        .mul(new BN(100))
                        .div(BN(user2DepositsAfterBorrow));
                    console.log("user 2 BP After Borrow:", user2BorrowPowerAfterBorrow.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userLTVAfterBorrow", userLTVAfterBorrow.toString());

                    // 3. Change the price.
                    let updatedPrice = new BN(1);
                    const originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                    // Check that borrow LTV > 95%
                    const userBorrowVal = await accountsContract.getBorrowETH(user2);
                    const getDeposits = await accountsContract.getDepositETH(user2);
                    const userBorrowPower = await accountsContract.getBorrowPower(user2);
                    let UB = new BN(userBorrowVal).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(95));
                    console.log("userBorrowVal", userBorrowVal.toString());
                    console.log("userBorrowPower", userBorrowPower.toString());
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());

                    expect(UB).to.be.bignumber.greaterThan(UD);

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
                    console.log("------------------ user liquidated ------------------");

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
                    const user2DepositsAfterLiquidate = await accountsContract.getDepositETH(user2);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user2);
                    let user2BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user2
                    );
                    console.log(
                        "user 2 BP After liquidation:",
                        user2BorrowPowerAfterLiquidate.toString()
                    );
                    console.log(
                        "user Borrow Val After liquidate:",
                        userBorrowValAfterLiquidate.toString()
                    );
                    console.log(
                        "user2DepositsAfterLiquidate",
                        user2DepositsAfterLiquidate.toString()
                    );

                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    let ownerDAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );

                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerDAIBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerDAIBefore)
                    );
                    // borrower's collateral should reduce
                    expect(BN(user2USDCAfter)).to.be.bignumber.lessThan(BN(user2USDCBefore));
                    // liquidator gets the collateral tokens
                    expect(BN(ownerUSDCAfter)).to.be.bignumber.greaterThan(BN(ownerUSDCBefore));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });
                it("when capital utilization ratio = 1 for Compound unsupported tokens", async function () {
                    this.timeout(0);
                    let ONE_TUSD = eighteenPrecision;
                    // await tokenInfoRegistry.updateTokenSupportedOnCompoundFlag(addressTUSD, false);
                    let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                        addressTUSD
                    );
                    console.log("TUSDCompoundFlag", TUSDCompoundFlag);

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_TUSD)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                    const borrowAmt2 = ONE_DAI.sub(BN(borrowAmt));
                    console.log("borrowAmt2", borrowAmt2.toString());

                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20TUSD.transfer(user2, ONE_TUSD);
                    await erc20DAI.transfer(owner, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                    await savingAccount.deposit(addressTUSD, ONE_TUSD, {
                        from: user2,
                    });
                    let user2TUSDBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user2
                    );
                    console.log("user2TUSDBalAfterDeposit", user2TUSDBalAfterDeposit.toString());

                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: owner }
                    );
                    console.log("borrowAmt", borrowAmt.toString());

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    console.log("U1", U1.toString());

                    await savingAccount.borrow(addressTUSD, borrowAmt, { from: user1 });
                    await savingAccount.borrow(addressTUSD, borrowAmt2);
                    console.log("---------------------- borrow -------------------------");

                    let U2 = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    console.log("U2", U2.toString());

                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    const userBorrowPower = await accountsContract.getBorrowPower(user1);
                    let depositStore = await bankContract.getTokenState(addressTUSD);
                    console.log("totalDeposits: ", depositStore[0].toString());
                    console.log("totalLoans: ", depositStore[1].toString());

                    let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(95));
                    let LTV = BN(userBorrowValAfterBorrow).mul(new BN(100).div(BN(getDeposits)));
                    console.log("getDeposits", getDeposits.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userBorrowPower", userBorrowPower.toString());
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);

                    expect(liquidateAfter).to.equal(true);
                    expect(UB).to.be.bignumber.greaterThan(UD);

                    // user2's balance before liquidation
                    let user2DAIBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                    console.log(
                        "user2DAIBalBeforeLiquidate",
                        user2DAIBalBeforeLiquidate.toString()
                    );

                    // check if U = 1
                    let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);

                    // user2 liquidates the user
                    await savingAccount.liquidate(user1, addressTUSD, addressDAI, { from: user2 });
                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    console.log("---------------------- user liquidated -------------------------");
                    let user2TUSDBalAfterLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                    console.log(
                        "user2TUSDBalAfterLiquidate",
                        user2TUSDBalAfterLiquidate.toString()
                    );

                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(user2TUSDBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(user2TUSDBalAfterDeposit)
                    );
                    // borrower's collateral should reduce
                    expect(BN(userBorrowValAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(userBorrowValAfterBorrow)
                    );
                    // liquidator gets the collateral tokens
                    expect(BN(user2DAIBalBeforeLiquidate)).to.be.bignumber.lessThan(
                        BN(user2DAIBalAfterLiquidate)
                    );
                });
                it("when capital utilization ratio = 1 for Compound supported tokens", async function () {
                    this.timeout(0);
                    let ONE_TUSD = eighteenPrecision;
                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(3))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));
                    const borrowAmt2 = ONE_TUSD.sub(BN(borrowAmt));
                    console.log("borrowAmt2", borrowAmt2.toString());

                    await erc20TUSD.transfer(user1, ONE_TUSD);
                    await erc20DAI.transfer(user2, ONE_DAI);
                    await erc20TUSD.transfer(owner, ONE_TUSD);
                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD, { from: owner });
                    await savingAccount.deposit(addressTUSD, ONE_TUSD, { from: user1 });
                    await savingAccount.deposit(addressTUSD, ONE_TUSD, { from: owner });
                    await savingAccount.deposit(addressDAI, ONE_DAI, {
                        from: user2,
                    });
                    let user2DAIBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    console.log("user2DAIBalAfterDeposit", user2DAIBalAfterDeposit.toString());

                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressTUSD);
                    const tusdTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        tusdTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        tusdTokenIndex,
                        true,
                        { from: owner }
                    );
                    console.log("borrowAmt", borrowAmt.toString());

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressDAI);
                    console.log("U1", U1.toString());

                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user1 });
                    console.log("---------------------- user1 borrows -------------------------");
                    await savingAccount.borrow(addressDAI, borrowAmt2);
                    console.log("---------------------- owner borrows -------------------------");

                    let U2 = await bankContract.getCapitalUtilizationRatio(addressDAI);
                    console.log("U2", U2.toString());

                    // 3. Change the price.
                    let TUSDprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(TUSDprice).mul(new BN(6)).div(new BN(10));

                    await mockChainlinkAggregatorforTUSD.updateAnswer(updatedPrice);

                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    const userBorrowPower = await accountsContract.getBorrowPower(user1);
                    let depositStore = await bankContract.getTokenState(addressTUSD);
                    console.log("totalDeposits: ", depositStore[0].toString());
                    console.log("totalLoans: ", depositStore[1].toString());

                    let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(95));
                    let LTV = BN(userBorrowValAfterBorrow).mul(new BN(100).div(BN(getDeposits)));
                    console.log("getDeposits", getDeposits.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userBorrowPower", userBorrowPower.toString());
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);

                    expect(liquidateAfter).to.equal(true);
                    expect(UB).to.be.bignumber.greaterThan(UD);

                    // user2's balance before liquidation
                    let user2TUSDBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                    console.log(
                        "user2TUSDBalBeforeLiquidate",
                        user2TUSDBalBeforeLiquidate.toString()
                    );

                    // check if U = 1
                    let U = await bankContract.getCapitalUtilizationRatio(addressDAI);
                    expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);

                    // user2 liquidates the user
                    await savingAccount.liquidate(user1, addressDAI, addressTUSD, { from: user2 });
                    let user2TUSDBalAfterLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                    console.log("---------------------- user liquidated -------------------------");
                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    console.log("user2DAIBalAfterLiquidate", user2DAIBalAfterLiquidate.toString());

                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(user2DAIBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(user2DAIBalAfterDeposit)
                    );
                    // borrower's collateral should reduce
                    expect(BN(userBorrowValAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(userBorrowValAfterBorrow)
                    );
                    // liquidator gets the collateral tokens
                    expect(BN(user2TUSDBalBeforeLiquidate)).to.be.bignumber.lessThan(
                        BN(user2TUSDBalAfterLiquidate)
                    );
                });
                it("when LTV > 100%", async function () {
                    this.timeout(0);
                    // get initial oracle prices
                    const ethPriceInit = await mockChainlinkAggregatorforETH.latestAnswer();
                    const daiPriceInit = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const tusdPriceInit =
                        await mockChainlinkAggregatorforTUSD.latestAnswer();
                    const usdtPriceInit =
                        await mockChainlinkAggregatorforUSDT.latestAnswer();

                    const ZERO = new BN(0);
                    const ONE_USD = new BN(1);
                    const ONE_ETH = eighteenPrecision;
                    const ONE_TUSD = eighteenPrecision;
                    const ONE_USDT = sixPrecision;

                    // set oracle prices
                    const ETH_USD_RATE = new BN(2000);
                    let ONE_USD_IN_ETH = ONE_ETH.div(ETH_USD_RATE);
                    await mockChainlinkAggregatorforETH.updateAnswer(ONE_ETH); // remain constant
                    await mockChainlinkAggregatorforDAI.updateAnswer(ONE_USD_IN_ETH);
                    await mockChainlinkAggregatorforTUSD.updateAnswer(ONE_USD_IN_ETH);
                    await mockChainlinkAggregatorforUSDT.updateAnswer(ONE_USD_IN_ETH);

                    // get oracle prices
                    const ethPrice = await mockChainlinkAggregatorforETH.latestAnswer();
                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const tusdPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    const usdtPrice = await mockChainlinkAggregatorforUSDT.latestAnswer();

                    const ethPriceInUSD = ethPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("ETH price in USD", ethPriceInUSD.toString());
                    expect(ethPriceInUSD).to.be.bignumber.equal(ETH_USD_RATE);
                    const daiPriceInUSD = daiPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("DAI price in USD", daiPriceInUSD.toString());
                    expect(daiPriceInUSD).to.be.bignumber.equal(ONE_USD);
                    const tusdPriceInUSD = tusdPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("TUSD price in USD", tusdPriceInUSD.toString());
                    expect(tusdPriceInUSD).to.be.bignumber.equal(ONE_USD);
                    const usdtPriceInUSD = usdtPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("USDT price in USD", usdtPriceInUSD.toString());
                    expect(usdtPriceInUSD).to.be.bignumber.equal(ONE_USD);

                    // approve tokens
                    await erc20TUSD.approve(
                        savingAccount.address,
                        ONE_TUSD.mul(new BN(10000)),
                        { from: owner }
                    );
                    await erc20DAI.approve(
                        savingAccount.address,
                        ONE_DAI.mul(new BN(10000)),
                        { from: user1 }
                    );
                    await erc20TUSD.approve(
                        savingAccount.address,
                        ONE_TUSD.mul(new BN(6000)),
                        { from: user2 }
                    );

                    // owner - deposit 10000 USDT
                    await savingAccount.deposit(addressTUSD, ONE_TUSD.mul(new BN(10000)), {
                        from: owner,
                    });

                    // 1. Transfer tokens to user1 & user2
                    await erc20DAI.transfer(user1, ONE_DAI.mul(new BN(10000)));
                    await erc20TUSD.transfer(user2, ONE_TUSD.mul(new BN(6000)));

                    // 2. User1 deposits 10000 DAI & User2 deposits 6000 TUSD
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(10000)), {
                        from: user1,
                    });
                    await savingAccount.deposit(addressTUSD, ONE_TUSD.mul(new BN(6000)), {
                        from: user2,
                    });

                    // enable DAI as collateral
                    const indexDAI = await tokenInfoRegistry.getTokenIndex(addressDAI);
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        indexDAI,
                        true,
                        { from: user1 }
                    );

                    // user's borrow power
                    let user1BorrowPower = await accountsContract.getBorrowPower(user1);
                    let borrowPowerInUSD = user1BorrowPower.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("user1BorrowPower in ETH", user1BorrowPower.toString());
                    console.log("user1BorrowPower in USD", borrowPowerInUSD.toString());

                    let collAmtInETH = await accountsContract.getDepositETH(user1);
                    let collateralAmtInUSD = collAmtInETH.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log(
                        "user collateral amount in USD:",
                        collateralAmtInUSD.toString()
                    );

                    // 3. User1 borrows 6000 TUSD
                    await savingAccount.borrow(addressTUSD, ONE_TUSD.mul(new BN(6000)), {
                        from: user1,
                    });
                    console.log("---------------- user1 borrowed 6000 TUSD ----------------------");

                    const borrowedAmtInETH = await accountsContract.getBorrowETH(user1);
                    const borrowedAmtInUSD = borrowedAmtInETH
                        .mul(ETH_USD_RATE)
                        .div(ONE_ETH);
                    console.log("borrowedAmtInETH", borrowedAmtInETH.toString());
                    console.log(
                        "user borrowed amount in USD:",
                        borrowedAmtInUSD.toString()
                    );
                    
                    let collateralRatio = borrowedAmtInUSD
                        .mul(new BN(100))
                        .div(collateralAmtInUSD);
                    console.log("collateral ratio in % :", collateralRatio.toString());
                    expect(collateralRatio).to.be.bignumber.equal(new BN(60)); // 60%

                    // increase TUSD price
                    await mockChainlinkAggregatorforTUSD.updateAnswer(ONE_USD_IN_ETH.mul(new BN(2)));
                    const updatedTUSDPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    const tusdPriceInUSDAfter = updatedTUSDPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("TUSD price in USD", tusdPriceInUSDAfter.toString());

                    console.log("--------------- price updated -----------------");
                    let collAmtInETH2 = BN(await accountsContract.getDepositETH(user1));
                    let CCV = collAmtInETH2.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log(
                        "CCV in USD:",
                        CCV.toString()
                    );
                    const borrowedAmtInETH2 = await accountsContract.getBorrowETH(user1);
                    const CBB = BN(borrowedAmtInETH2
                        .mul(ETH_USD_RATE)
                        .div(ONE_ETH));
                    console.log("borrowedAmtInETH2", borrowedAmtInETH2.toString());
                    console.log(
                        "user borrowed amount in USD:",
                        CBB.toString()
                    );
                    
                    let collateralRatio2 = CBB
                        .mul(new BN(100))
                        .div(CCV);
                    console.log("collateral ratio in % :", collateralRatio2.toString());
                    expect(collateralRatio2).to.be.bignumber.equal(new BN(120));

                    let isAccountLiquidatable =
                        await accountsContract.isAccountLiquidatable.call(user1);
                    console.log("isAccountLiquidatable", isAccountLiquidatable);
                    expect(isAccountLiquidatable).to.be.equal(true);

                    // 4. Owner liquidates User1
                    let ownerDAIBalBeforeLiquidate =
                        BN(await accountsContract.getDepositBalanceCurrent(addressDAI, owner));
                    console.log(
                        "ownerDAIBalBeforeLiquidate",
                        ownerDAIBalBeforeLiquidate.toString()
                    );

                    let CCVtimesILTV = CCV.mul(new BN(6)).div(new BN(10));
                    console.log("CCVtimesILTV", CCVtimesILTV.toString());
                    
                    // TODO: calculate UAAL
                    let UAAL = CBB.sub(CCVtimesILTV) 

                    await savingAccount.liquidate(user1, addressTUSD, addressDAI, { from: owner });

                    let ownerDAIBalAfterLiquidate =
                        BN(await accountsContract.getDepositBalanceCurrent(addressDAI, owner));
                    console.log(
                        "ownerDAIBalAfterLiquidate",
                        ownerDAIBalAfterLiquidate.toString()
                    );

                    // owner gets the collateral
                    expect(ownerDAIBalAfterLiquidate).to.be.bignumber.equal(ONE_DAI.mul(new BN(10000)));

                    // reset the prices
                    await mockChainlinkAggregatorforETH.updateAnswer(ethPriceInit);
                    await mockChainlinkAggregatorforDAI.updateAnswer(daiPriceInit);
                    await mockChainlinkAggregatorforTUSD.updateAnswer(tusdPriceInit);
                    await mockChainlinkAggregatorforUSDT.updateAnswer(usdtPriceInit);

                });*/
                it("when collateral is Compound unsupported & LTV > 100%", async function () {
                    this.timeout(0);
                    // get initial oracle prices
                    const ethPriceInit = await mockChainlinkAggregatorforETH.latestAnswer();
                    const daiPriceInit = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const tusdPriceInit =
                        await mockChainlinkAggregatorforTUSD.latestAnswer();
                    const usdtPriceInit =
                        await mockChainlinkAggregatorforUSDT.latestAnswer();

                    const ZERO = new BN(0);
                    const ONE_USD = new BN(1);
                    const ONE_ETH = eighteenPrecision;
                    const ONE_TUSD = eighteenPrecision;
                    const ONE_USDT = sixPrecision;

                    // set oracle prices
                    const ETH_USD_RATE = new BN(2000);
                    let ONE_USD_IN_ETH = ONE_ETH.div(ETH_USD_RATE);
                    await mockChainlinkAggregatorforETH.updateAnswer(ONE_ETH); // remain constant
                    await mockChainlinkAggregatorforDAI.updateAnswer(ONE_USD_IN_ETH);
                    await mockChainlinkAggregatorforTUSD.updateAnswer(ONE_USD_IN_ETH);
                    await mockChainlinkAggregatorforUSDT.updateAnswer(ONE_USD_IN_ETH);

                    // get oracle prices
                    const ethPrice = await mockChainlinkAggregatorforETH.latestAnswer();
                    const daiPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    const tusdPrice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    const usdtPrice = await mockChainlinkAggregatorforUSDT.latestAnswer();

                    const ethPriceInUSD = ethPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("ETH price in USD", ethPriceInUSD.toString());
                    expect(ethPriceInUSD).to.be.bignumber.equal(ETH_USD_RATE);
                    const daiPriceInUSD = daiPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("DAI price in USD", daiPriceInUSD.toString());
                    expect(daiPriceInUSD).to.be.bignumber.equal(ONE_USD);
                    const tusdPriceInUSD = tusdPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("TUSD price in USD", tusdPriceInUSD.toString());
                    expect(tusdPriceInUSD).to.be.bignumber.equal(ONE_USD);
                    const usdtPriceInUSD = usdtPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("USDT price in USD", usdtPriceInUSD.toString());
                    expect(usdtPriceInUSD).to.be.bignumber.equal(ONE_USD);

                    // approve tokens
                    await erc20USDT.approve(
                        savingAccount.address,
                        ONE_TUSD.mul(new BN(10000)),
                        { from: owner }
                    );
                    await erc20TUSD.approve(
                        savingAccount.address,
                        ONE_TUSD.mul(new BN(10000)),
                        { from: user1 }
                    );
                    await erc20USDT.approve(
                        savingAccount.address,
                        ONE_USDT.mul(new BN(6000)),
                        { from: user2 }
                    );

                    // owner - deposit 1000 USDT
                    await savingAccount.deposit(addressUSDT, ONE_USDT.mul(new BN(10000)), {
                        from: owner,
                    });
                    let ownerUSDTBalAfterDeposit =
                        await accountsContract.getDepositBalanceCurrent(addressUSDT, owner);
                    console.log("ownerUSDTBalAfterDeposit", ownerUSDTBalAfterDeposit.toString());

                    // 1. Transfer tokens to user1 & user2
                    await erc20TUSD.transfer(user1, ONE_TUSD.mul(new BN(10000)));
                    await erc20USDT.transfer(user2, ONE_USDT.mul(new BN(6000)));

                    // 2. User1 deposits 10000 TUSD & User2 deposits 6000 USDT
                    await savingAccount.deposit(addressTUSD, ONE_TUSD.mul(new BN(10000)), {
                        from: user1,
                    });
                    await savingAccount.deposit(addressUSDT, ONE_USDT.mul(new BN(6000)), {
                        from: user2,
                    });

                    console.log("---------------- user1 depositted 10000 TUSD (Compound unsupported) ----------------------");

                    // enable TUSD as collateral
                    const indexTUSD = await tokenInfoRegistry.getTokenIndex(addressTUSD);
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        indexTUSD,
                        true,
                        { from: user1 }
                    );

                    let user1TUSDBalAfterDeposit =
                        await accountsContract.getDepositBalanceCurrent(addressTUSD, user1);
                    console.log("user1TUSDBalAfterDeposit", user1TUSDBalAfterDeposit.toString());

                    // user's borrow power
                    let user1BorrowPower = await accountsContract.getBorrowPower(user1);
                    let borrowPowerInUSD = user1BorrowPower.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("user1BorrowPower in ETH", user1BorrowPower.toString());
                    console.log("user1BorrowPower in USD", borrowPowerInUSD.toString());

                    let collAmtInETH = await accountsContract.getDepositETH(user1);
                    let collateralAmtInUSD = collAmtInETH.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log(
                        "user collateral amount in USD:",
                        collateralAmtInUSD.toString()
                    );

                    // 3. User1 borrows 6000 USDT
                    await savingAccount.borrow(addressUSDT, ONE_USDT.mul(new BN(6000)), {
                        from: user1,
                    });
                    console.log("---------------- user1 borrowed 6000 USDT ----------------------");

                    const borrowedAmtInETH = await accountsContract.getBorrowETH(user1);
                    const borrowedAmtInUSD = borrowedAmtInETH
                        .mul(ETH_USD_RATE)
                        .div(ONE_ETH);
                    console.log("borrowedAmtInETH", borrowedAmtInETH.toString());
                    console.log(
                        "user borrowed amount in USD:",
                        borrowedAmtInUSD.toString()
                    );
                    
                    let collateralRatio = borrowedAmtInUSD
                        .mul(new BN(100))
                        .div(collateralAmtInUSD);
                    console.log("collateral ratio in % :", collateralRatio.toString());
                    expect(collateralRatio).to.be.bignumber.equal(new BN(60)); // 60%

                    // increase USDT price
                    await mockChainlinkAggregatorforUSDT.updateAnswer(ONE_USD_IN_ETH.mul(new BN(3)));
                    const updatedUSDTPrice = await mockChainlinkAggregatorforUSDT.latestAnswer();
                    const usdtPriceInUSDAfter = updatedUSDTPrice.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("USDT price in USD", usdtPriceInUSDAfter.toString());

                    console.log("--------------- price updated -----------------");
                    let collAmtInETH2 = BN(await accountsContract.getDepositETH(user1));
                    let CCV = collAmtInETH2.mul(ETH_USD_RATE).div(ONE_ETH);
                    console.log("collAmtInETH2", collAmtInETH2.toString());
                    console.log(
                        "CCV in USD:",
                        CCV.toString()
                    );
                    const borrowedAmtInETH2 = await accountsContract.getBorrowETH(user1);
                    const CBB = BN(borrowedAmtInETH2
                        .mul(ETH_USD_RATE)
                        .div(ONE_ETH));
                    console.log("borrowedAmtInETH2", borrowedAmtInETH2.toString());
                    console.log(
                        "user borrowed amount in USD:",
                        CBB.toString()
                    );
                    
                    let collateralRatio2 = CBB
                        .mul(new BN(100))
                        .div(CCV);
                    console.log("collateral ratio in % :", collateralRatio2.toString());
                    expect(collateralRatio2).to.be.bignumber.equal(new BN(180));

                    let isAccountLiquidatable =
                        await accountsContract.isAccountLiquidatable.call(user1);
                    console.log("isAccountLiquidatable", isAccountLiquidatable);
                    expect(isAccountLiquidatable).to.be.equal(true);

                    // 4. Owner liquidates User1
                    let ownerTUSDBalBeforeLiquidate =
                        BN(await accountsContract.getDepositBalanceCurrent(addressTUSD, owner));
                    console.log(
                        "ownerTUSDBalBeforeLiquidate",
                        ownerTUSDBalBeforeLiquidate.toString()
                    );

                    let CCVtimesILTV = CCV.mul(new BN(6)).div(new BN(10));
                    console.log("CCVtimesILTV", CCVtimesILTV.toString());
                    
                    let liquidationDiscountRatio = new BN(5);
                    let ILTV = new BN(60);
                    let den = new BN(100).sub(liquidationDiscountRatio).sub(ILTV);
                    console.log("den", den.toString());
                    
                    // calculate UAAL
                    let UAAL = (CBB.sub(CCVtimesILTV)).mul(new BN(100)).div(den);

                    console.log("CBB of user", CBB.toString());
                    console.log("CCV of user", CCV.toString());
                    console.log("UAAL of the user", UAAL.toString());
                     
                    await savingAccount.liquidate(user1, addressUSDT, addressTUSD, { from: owner });

                    let ownerTUSDBalAfterLiquidate =
                        BN(await accountsContract.getDepositBalanceCurrent(addressTUSD, owner));
                    console.log(
                        "ownerTUSDBalAfterLiquidate",
                        ownerTUSDBalAfterLiquidate.toString()
                    );

                    let ownerUSDTBalAfterLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressUSDT, owner);
                    console.log("ownerUSDTBalAfterLiquidate", ownerUSDTBalAfterLiquidate.toString());

                    let user1TUSDBalAfterLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressTUSD, user1);
                    console.log("user1TUSDBalAfterLiquidate", user1TUSDBalAfterLiquidate.toString());
                    
                    // borrower's collateral should reduce
                    expect(BN(user1TUSDBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(user1TUSDBalAfterDeposit)
                    );
                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerUSDTBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerUSDTBalAfterDeposit)
                    );
                    // owner gets the collateral
                    expect(ownerTUSDBalAfterLiquidate).to.be.bignumber.equal(ONE_TUSD.mul(new BN(10000)));

                    // reset the prices
                    await mockChainlinkAggregatorforETH.updateAnswer(ethPriceInit);
                    await mockChainlinkAggregatorforDAI.updateAnswer(daiPriceInit);
                    await mockChainlinkAggregatorforTUSD.updateAnswer(tusdPriceInit);
                    await mockChainlinkAggregatorforUSDT.updateAnswer(usdtPriceInit);

                });
                /*it("user deposits DAI, borrows USDC, TUSD and owner liquidates with USDC", async function () {
                    this.timeout(0);
                    let ONE_TUSD = eighteenPrecision;
                    // await tokenInfoRegistry.updateTokenSupportedOnCompoundFlag(addressTUSD, false);
                    let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                        addressTUSD
                    );
                    console.log("TUSDCompoundFlag", TUSDCompoundFlag);

                    const USDCborrowAmt = ONE_USDC.mul(new BN(4800));
                    const TUSDborrowAmt = ONE_TUSD.mul(new BN(1000))
                    console.log("USDCborrowAmt", USDCborrowAmt.toString());
                    console.log("TUSDborrowAmt", TUSDborrowAmt.toString());

                    // Transfer 10,000 DAI to user 1
                    await erc20DAI.transfer(user1, ONE_DAI.mul(new BN(10000)));
                    // Transfer 1000 TUSD to user 2
                    await erc20TUSD.transfer(user2, ONE_TUSD.mul(new BN(1000)));
                    // Transfer 5000 USDC to user 2
                    await erc20USDC.transfer(user2, ONE_USDC.mul(new BN(5000)));
                    // Transfer 1000 USDC to owner
                    await erc20USDC.transfer(owner, ONE_USDC.mul(new BN(1000)));

                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(10000)), { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD.mul(new BN(1000)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(5000)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(1000)), { from: owner });

                    // user 1 deposits 10,000 DAI
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(10000)), { from: user1 });
                    // user 2 deposits 1000 TUSD & 5000 USDC
                    await savingAccount.deposit(addressTUSD, ONE_TUSD.mul(new BN(1000)), {
                        from: user2,
                    });
                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(5000)), {
                        from: user2,
                    });
                    // owner deposits 1000 USDC
                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(1000)), { from: owner });

                    let ownerUSDCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    console.log("ownerUSDCBalAfterDeposit", ownerUSDCBalAfterDeposit.toString());

                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    const result2 = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result2[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: owner }
                    );

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    console.log("U1", U1.toString());

                    // user 1 borrows 4800 USDC
                    await savingAccount.borrow(addressUSDC, USDCborrowAmt, { from: user1 });
                    // user 1 borrows 1000 TUSD
                    await savingAccount.borrow(addressTUSD, TUSDborrowAmt, { from: user1 });
                    console.log("---------------------- borrow -------------------------");

                    let U2 = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    console.log("U2", U2.toString());

                    let UB1 = BN(await accountsContract.getBorrowETH(user1));
                    let UD1 = BN(await accountsContract.getDepositETH(user1));
                    console.log("UD1", UD1.toString());
                    console.log("UB1", UB1.toString());

                    // 3. Change the price.
                    let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    // increase TUSD price by 30%
                    let updatedPrice = BN(TUSDprice).mul(new BN(100)).div(new BN(10));

                    await mockChainlinkAggregatorforTUSD.updateAnswer(updatedPrice);

                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    const userBorrowPower = await accountsContract.getBorrowPower(user1);
                    let depositStore = await bankContract.getTokenState(addressTUSD);
                    console.log("totalDeposits: ", depositStore[0].toString());
                    console.log("totalLoans: ", depositStore[1].toString());

                    let UB2 = new BN(userBorrowValAfterBorrow);
                    let UD2 = new BN(getDeposits);
                    let LTV = BN(userBorrowValAfterBorrow).mul(new BN(100).div(BN(getDeposits)));
                    console.log("getDeposits", getDeposits.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userBorrowPower", userBorrowPower.toString());
                    console.log("UD2", UD2.toString());
                    console.log("UB2", UB2.toString());
                    console.log("LTV",LTV.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);

                    expect(liquidateAfter).to.equal(true);
                    expect(UB2).to.be.bignumber.greaterThan(UD2);

                    // user2's balance before liquidation
                    let ownerDAIBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressDAI, owner);
                    console.log(
                        "ownerDAIBalBeforeLiquidate",
                        ownerDAIBalBeforeLiquidate.toString()
                    );

                    // check if U = 1
                    // let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    // expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);

                    // owner liquidates the user
                    let usdcBalOwner = BN(await accountsContract.getDepositBalanceCurrent(addressUSDC,owner));
                    console.log("usdcBalOwner",usdcBalOwner.toString());
                    
                    await savingAccount.liquidate(user1, addressUSDC, addressDAI, { from: owner });
                    let ownerDAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        owner
                    );
                    console.log("---------------------- user liquidated -------------------------");
                    let ownerUSDCBalAfterLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressUSDC, owner);
                    console.log(
                        "ownerUSDCBalAfterLiquidate",
                        ownerUSDCBalAfterLiquidate.toString()
                    );

                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerUSDCBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerUSDCBalAfterDeposit)
                    );
                    // borrower's collateral should reduce
                    expect(BN(userBorrowValAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(userBorrowValAfterBorrow)
                    );
                    // liquidator gets the collateral tokens
                    expect(BN(ownerDAIBalBeforeLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerDAIBalAfterLiquidate)
                    );

                    console.log("ownerDAIBalBeforeLiquidate",ownerDAIBalBeforeLiquidate.toString());
                    
                    let balChange = BN(ownerDAIBalAfterLiquidate).sub(BN(ownerDAIBalBeforeLiquidate));
                    console.log("balChange",balChange.toString());
                });*/
                /*it("user deposits TUSD, borrows USDC, MKR and owner liquidates with USDC", async function () {
                    this.timeout(0);
                    let ONE_TUSD = eighteenPrecision;
                    let ONE_MKR = eighteenPrecision;
                    // await tokenInfoRegistry.updateTokenSupportedOnCompoundFlag(addressTUSD, false);
                    let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                        addressTUSD
                    );
                    console.log("TUSDCompoundFlag", TUSDCompoundFlag);

                    // Updating MKR price 
                    let TUSDpriceInit = BN(await mockChainlinkAggregatorforTUSD.latestAnswer());
                    await mockChainlinkAggregatorforMKR.updateAnswer(TUSDpriceInit);

                    const USDCborrowAmt = ONE_USDC.mul(new BN(4800));
                    const MKRborrowAmt = ONE_MKR.mul(new BN(1000))
                    console.log("USDCborrowAmt", USDCborrowAmt.toString());
                    console.log("MKRborrowAmt", MKRborrowAmt.toString());

                    // Transfer 10,000 TUSD to user 1
                    await erc20TUSD.transfer(user1, ONE_TUSD.mul(new BN(10000)));
                    // Transfer 1000 MKR to user 2
                    await erc20MKR.transfer(user2, ONE_MKR.mul(new BN(1000)));
                    // Transfer 5000 USDC to user 2
                    await erc20USDC.transfer(user2, ONE_USDC.mul(new BN(5000)));
                    // Transfer 1000 USDC to owner
                    await erc20USDC.transfer(owner, ONE_USDC.mul(new BN(1000)));

                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD.mul(new BN(10000)), { from: user1 });
                    await erc20MKR.approve(savingAccount.address, ONE_MKR.mul(new BN(1000)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(5000)), { from: user2 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(1000)), { from: owner });

                    // user 1 deposits 10,000 TUSD
                    await savingAccount.deposit(addressTUSD, ONE_TUSD.mul(new BN(10000)), { from: user1 });
                    // user 2 deposits 1000 MKR & 5000 USDC
                    await savingAccount.deposit(addressMKR, ONE_MKR.mul(new BN(1000)), {
                        from: user2,
                    });
                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(5000)), {
                        from: user2,
                    });
                    // owner deposits 1000 USDC
                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(1000)), { from: owner });

                    let ownerUSDCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        owner
                    );
                    console.log("ownerUSDCBalAfterDeposit", ownerUSDCBalAfterDeposit.toString());

                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressTUSD);
                    const tusdTokenIndex = result[0];
                    const result2 = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result2[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        tusdTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        { from: owner }
                    );

                    let U1 = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    console.log("U1", U1.toString());

                    // user 1 borrows 4800 USDC
                    await savingAccount.borrow(addressUSDC, USDCborrowAmt, { from: user1 });
                    // user 1 borrows 1000 MKR
                    await savingAccount.borrow(addressMKR, MKRborrowAmt, { from: user1 });
                    console.log("---------------------- borrow -------------------------");

                    let U2 = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    console.log("U2", U2.toString());

                    // 3. Change the price.
                    let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                    // update price of TUSD to 50% of it's value
                    let updatedPrice = BN(TUSDprice).mul(new BN(5)).div(new BN(10));

                    await mockChainlinkAggregatorforTUSD.updateAnswer(updatedPrice);

                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    const userBorrowPower = await accountsContract.getBorrowPower(user1);
                    let depositStore = await bankContract.getTokenState(addressMKR);
                    console.log("totalDeposits: ", depositStore[0].toString());
                    console.log("totalLoans: ", depositStore[1].toString());

                    let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(95));
                    let LTV = BN(userBorrowValAfterBorrow).mul(new BN(100).div(BN(getDeposits)));
                    console.log("getDeposits", getDeposits.toString());
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userBorrowPower", userBorrowPower.toString());
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());
                    console.log("LTV",LTV.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);

                    expect(liquidateAfter).to.equal(true);
                    expect(UB).to.be.bignumber.greaterThan(UD);

                    // owner's balance before liquidation
                    let ownerMKRBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressMKR, owner);
                    console.log(
                        "ownerMKRBalBeforeLiquidate",
                        ownerMKRBalBeforeLiquidate.toString()
                    );

                    // check if U = 1
                    // let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                    // expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);

                    // owner liquidates the user
                    let usdcBalOwner = BN(await accountsContract.getDepositBalanceCurrent(addressUSDC,owner));
                    console.log("usdcBalOwner",usdcBalOwner.toString());
                    
                    await savingAccount.liquidate(user1, addressUSDC, addressTUSD, { from: owner });
                    let ownerMKRBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressMKR,
                        owner
                    );
                    console.log("---------------------- user liquidated -------------------------");
                    let ownerUSDCBalAfterLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressUSDC, owner);
                    console.log(
                        "ownerUSDCBalAfterLiquidate",
                        ownerUSDCBalAfterLiquidate.toString()
                    );

                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(ownerUSDCBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerUSDCBalAfterDeposit)
                    );
                    // borrower's collateral should reduce
                    expect(BN(userBorrowValAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(userBorrowValAfterBorrow)
                    );
                    // liquidator gets the collateral tokens
                    expect(BN(ownerMKRBalBeforeLiquidate)).to.be.bignumber.lessThan(
                        BN(ownerMKRBalAfterLiquidate)
                    );
                });*/
            });
        });

        /*context("with ETH", async () => {
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
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    let U1 = await bankContract.getCapitalUtilizationRatio(ETH_ADDRESS);

                    await expectRevert(
                        savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI),
                        "borrower is not liquidatable"
                    );
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
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
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
                    let result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });

                    const user1DepositsAfterBorrow = await accountsContract.getDepositETH(user1);
                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                    let userLTVAfterBorrow = BN(userBorrowValAfterBorrow)
                        .mul(new BN(100))
                        .div(BN(user1DepositsAfterBorrow));

                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value

                    let updatedPrice = BN(DAIprice).mul(new BN(7)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // 4. Start liquidation.
                    const liquidateBefore = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );

                    let user1DAIBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressDAI, user1);
                    let user2DAIBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                    let user2ETHBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, user2);

                    await savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI, { from: user2 });

                    let user1DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );
                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    let user2ETHBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    const user1DepositsAfterLiquidate = await accountsContract.getDepositETH(user1);
                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    let user1BorrowPowerAfterLiquidate = await accountsContract.getBorrowPower(
                        user1
                    );
                    let userLTVAfterLiquidate = BN(userBorrowValAfterLiquidate)
                        .mul(new BN(100))
                        .div(BN(user1DepositsAfterLiquidate));
                    console.log(
                        "user 1 BP After liquidation:",
                        user1BorrowPowerAfterLiquidate.toString()
                    );
                    console.log(
                        "user Borrow Val After liquidate:",
                        userBorrowValAfterLiquidate.toString()
                    );
                    console.log(
                        "user1DepositsAfterLiquidate",
                        user1DepositsAfterLiquidate.toString()
                    );
                    console.log("userLTVAfterLiquidate", userLTVAfterLiquidate.toString());

                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.equal(BN(userLTVAfterBorrow));

                    // check that the user's LTV equals ILTV of it's collateral after liquidate
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.greaterThan(new BN(58));
                    expect(BN(userLTVAfterLiquidate)).to.be.bignumber.lessThan(new BN(61));

                    // liquidator's depositted tokens should decrease
                    expect(BN(user2ETHBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(user2ETHBalBeforeLiquidate)
                    );
                    // borrower's collateral should reduce
                    expect(BN(user1DAIBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(user1DAIBalBeforeLiquidate)
                    );
                    // liquidator gets the collateral tokens
                    expect(BN(user2DAIBalAfterLiquidate)).to.be.bignumber.greaterThan(
                        BN(user2DAIBalBeforeLiquidate)
                    );

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);
                    expect(liquidateBefore).to.equal(true);
                    expect(liquidateAfter).to.equal(false);
                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                });

                it("when borrow LTV is greater than 95% (for ETH)", async function () {
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
                        value: ONE_ETH,
                    });
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH,
                    });
                    let user2ETHBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    console.log("user2ETHBalAfterDeposit", user2ETHBalAfterDeposit.toString());

                    // 2. Start borrowing.
                    const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user1 }
                    );
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });

                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    // Check that borrow LTV > 95%
                    const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    const userBorrowPower = await accountsContract.getBorrowPower(user1);
                    let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(95));
                    let LTV = BN(userBorrowValAfterBorrow).div(BN(getDeposits)).mul(new BN(100));
                    console.log("userBorrowValAfterBorrow", userBorrowValAfterBorrow.toString());
                    console.log("userBorrowPower", userBorrowPower.toString());
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());
                    console.log("LTV", LTV.toString());

                    const liquidateAfter = await accountsContract.isAccountLiquidatable.call(user1);

                    expect(liquidateAfter).to.equal(true);
                    expect(BN(LTV)).to.be.bignumber.greaterThan(new BN(95));
                    expect(UB).to.be.bignumber.greaterThan(UD);

                    // user2's balance before liquidation
                    let user2DAIBalBeforeLiquidate =
                        await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                    console.log(
                        "user2DAIBalBeforeLiquidate",
                        user2DAIBalBeforeLiquidate.toString()
                    );

                    // user2 liquidates the user
                    await savingAccount.liquidate(user1, ETH_ADDRESS, addressDAI, { from: user2 });
                    let user2DAIBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );
                    let user2ETHBalAfterLiquidate = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    console.log("user2ETHBalAfterLiquidate", user2ETHBalAfterLiquidate.toString());

                    const userBorrowValAfterLiquidate = await accountsContract.getBorrowETH(user1);
                    console.log("userBorrowVal2", userBorrowValAfterLiquidate.toString());

                    // liquidator's depositted tokens should decrease
                    expect(BN(user2ETHBalAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(user2ETHBalAfterDeposit)
                    );
                    // borrower's collateral should reduce
                    expect(BN(userBorrowValAfterLiquidate)).to.be.bignumber.lessThan(
                        BN(userBorrowValAfterBorrow)
                    );
                    // liquidator gets the collateral tokens
                    expect(BN(user2DAIBalBeforeLiquidate).add(ONE_DAI)).to.be.bignumber.equal(
                        BN(user2DAIBalAfterLiquidate)
                    );
                });
            });
        });*/
    });
});
