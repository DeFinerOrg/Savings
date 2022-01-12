import { TokenRegistryContract } from "../../../types/truffle-contracts";
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
    const eightPrecision = new BN(10).pow(new BN(8));
    const OKEX_BPY = new BN(10512000);

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let addressBAT: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cBAT_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cBAT: t.MockCTokenInstance;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let mockChainlinkAggregatorforBATAddress: any;
    let mockChainlinkAggregatorforWBTCAddress: any;

    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20BAT: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;

    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforBAT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforWBTC: t.MockChainLinkAggregatorInstance;

    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_ETH: any;
    let ONE_USDC: any;
    let ONE_BAT: any;
    let ONE_WBTC: any;

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
        addressBAT = tokens[5];
        addressWBTC = tokens[8];

        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];
        mockChainlinkAggregatorforBATAddress = mockChainlinkAggregators[5];
        mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];

        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20BAT = await ERC20.at(addressBAT);
        erc20WBTC = await ERC20.at(addressWBTC);

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforTUSDAddress
        );
        mockChainlinkAggregatorforBAT = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforBATAddress
        );
        mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforWBTCAddress
        );
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cBAT_addr = await testEngine.tokenInfoRegistry.getCToken(addressBAT);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        cBAT = await MockCToken.at(cBAT_addr);
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_ETH = eighteenPrecision;
        ONE_USDC = sixPrecision;
        ONE_BAT = eighteenPrecision;
        ONE_WBTC = eightPrecision;

        await savingAccount.fastForward(1000);
    });

    context("getBorrowRatePerBlock()", async () => {
        context("Compound supported tokens", async () => {
            context("with 18 decimal Token", async () => {
                context("should succeed", async () => {
                    it("when U = 1 for Compound supported tokens", async function () {
                        this.timeout(0);
                        let BATCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressBAT
                        );
                        expect(BATCompoundFlag).to.be.equal(true);

                        let BATpriceInit = BN(await mockChainlinkAggregatorforBAT.latestAnswer());
                        // set price of BAT at $0.7
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforBAT.updateAnswer(newBATprice);
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        const borrowAmt2 = ONE_DAI.sub(BN(borrowAmt));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20BAT.transfer(user2, ONE_BAT);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20BAT.approve(savingAccount.address, ONE_BAT, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressBAT, ONE_BAT, {
                            from: user2,
                        });
                        let user2BATBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressBAT,
                            user2
                        );
                        console.log("user2BATBalAfterDeposit", user2BATBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U1", U1.toString());
    
                        await savingAccount.borrow(addressBAT, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressBAT, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressBAT);
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
                        let U = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressBAT));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressBAT));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforBAT.updateAnswer(BATpriceInit);
                    });
        
                    it("when U is between 0.9999 & 1 for Compound supported tokens", async function () {
                        this.timeout(0);
                        let BATCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressBAT
                        );
                        expect(BATCompoundFlag).to.be.equal(true);

                        let BATpriceInit = BN(await mockChainlinkAggregatorforBAT.latestAnswer());
                        // set price of BAT at $0.7
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforBAT.updateAnswer(newBATprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(10))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20BAT.transfer(user2, ONE_BAT);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20BAT.approve(savingAccount.address, ONE_BAT, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressBAT, ONE_BAT, {
                            from: user2,
                        });
                        let user2BATBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressBAT, user2);
                        console.log(
                            "user2BATBalAfterDeposit",
                            user2BATBalAfterDeposit.toString()
                        );

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressBAT, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressBAT, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressBAT);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.9999 < U < 1
                        let U = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        // ensure that U > 0.999... && U < 1
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN("9990")).div(new BN(10000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision);

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressBAT)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressBAT)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforBAT.updateAnswer(BATpriceInit);
                    });

                    it("when U is between 0.90 and 0.95 for Compound supported tokens", async function () {
                        this.timeout(0);
                        let BATCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressBAT
                        );
                        expect(BATCompoundFlag).to.be.equal(true);

                        let BATpriceInit = BN(await mockChainlinkAggregatorforBAT.latestAnswer());
                        // set price of BAT at $0.7
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforBAT.updateAnswer(newBATprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(5))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20BAT.transfer(user2, ONE_BAT);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20BAT.approve(savingAccount.address, ONE_BAT, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressBAT, ONE_BAT, {
                            from: user2,
                        });
                        let user2BATBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressBAT, user2);
                        console.log("user2BATBalAfterDeposit", user2BATBalAfterDeposit.toString());

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressBAT, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressBAT, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressBAT);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.90 < U < 0.95
                        let U = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        // ensure that U > 0.90 && U < 0.95
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(9)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(
                            eighteenPrecision.mul(new BN(95)).div(new BN(100))
                        );

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressBAT)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressBAT)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforBAT.updateAnswer(BATpriceInit);
                    });

                    it("when U is between 0.8999 & 0.90 for Compound supported tokens", async function () {
                        this.timeout(0);
                        let BATCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressBAT
                        );
                        expect(BATCompoundFlag).to.be.equal(true);

                        let BATpriceInit = BN(await mockChainlinkAggregatorforBAT.latestAnswer());
                        // set price of BAT at $0.7
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforBAT.updateAnswer(newBATprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(3))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20BAT.transfer(user2, ONE_BAT);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20BAT.approve(savingAccount.address, ONE_BAT, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressBAT, ONE_BAT, {
                            from: user2,
                        });
                        let user2BATBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressBAT, user2);
                        console.log("user2BATBalAfterDeposit", user2BATBalAfterDeposit.toString());

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressBAT, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressBAT, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 50% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(5)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressBAT);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.899 < U < 0.90
                        let U = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U", U.toString());
                        
                        // ensure that U > 0.899 && U < 0.9
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(899)).div(new BN(1000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(
                            eighteenPrecision.mul(new BN(9)).div(new BN(10))
                        );

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressBAT)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressBAT)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforBAT.updateAnswer(BATpriceInit);
                    });

                    it("when U is between 0.80 and 0.85 for Compound supported tokens", async function () {
                        this.timeout(0);
                        let BATCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressBAT
                        );
                        expect(BATCompoundFlag).to.be.equal(true);

                        let BATpriceInit = BN(await mockChainlinkAggregatorforBAT.latestAnswer());
                        // set price of BAT at $0.7
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforBAT.updateAnswer(newBATprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(57))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(2))
                            .div(new BN(100))
                            .mul(ONE_BAT)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(5)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20BAT.transfer(user2, ONE_BAT);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20BAT.approve(savingAccount.address, ONE_BAT, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressBAT, ONE_BAT, {
                            from: user2,
                        });
                        let user2BATBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressBAT, user2);
                        console.log("user2BATBalAfterDeposit", user2BATBalAfterDeposit.toString());

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressBAT, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressBAT, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 50% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(5)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressBAT);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.899 < U < 0.90
                        let U = await bankContract.getCapitalUtilizationRatio(addressBAT);
                        console.log("U", U.toString());
                        
                        // ensure that U > 0.8 && U < 0.85
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(8)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(
                            eighteenPrecision.mul(new BN(85)).div(new BN(100))
                        );

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressBAT)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressBAT)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforBAT.updateAnswer(BATpriceInit);
                    });
                });
            });

            context("with 6 decimal Token", async () => {
                context("should succeed", async () => {
                    it("when U = 1 for 6 decimal token", async function (){
                        this.timeout(0);
                        let USDCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(USDCCompoundFlag).to.be.equal(true);

                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let USDCprice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        const borrowAmt2 = ONE_USDC.sub(BN(borrowAmt));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, {
                            from: user2,
                        });
                        let user2USDCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressUSDC,
                            user2
                        );
                        console.log("user2USDCBalAfterDeposit", user2USDCBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U1", U1.toString());
    
                        await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressUSDC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressUSDC);
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
                        let U = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressUSDC));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressUSDC));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                    });

                    it("when U is between 0.9999 & 1 for 6 decimal token", async function (){
                        this.timeout(0);
                        let USDCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(USDCCompoundFlag).to.be.equal(true);

                        let USDCpriceInit = BN(await mockChainlinkAggregatorforUSDC.latestAnswer());
                        // set price of USDC at $1
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        // let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(3999))
                            .div(new BN(10000))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, {
                            from: user2,
                        });
                        let user2USDCBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressUSDC, user2);
                        console.log(
                            "user2USDCBalAfterDeposit",
                            user2USDCBalAfterDeposit.toString()
                        );

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressUSDC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressUSDC);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.9999 < U < 1
                        let U = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        // ensure that U > 0.999... && U < 1
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN("9990")).div(new BN(10000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision);

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressUSDC)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressUSDC)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforBAT.updateAnswer(USDCpriceInit);
                    });

                    it("when U is between 0.90 and 0.95 for 6 decimal token", async function() {
                        this.timeout(0);
                        let USDCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(USDCCompoundFlag).to.be.equal(true);

                        let USDCpriceInit = BN(await mockChainlinkAggregatorforUSDC.latestAnswer());
                        // set price of USDC at $1
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        // let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(33))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, {
                            from: user2,
                        });
                        let user2USDCBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressUSDC, user2);
                        console.log(
                            "user2USDCBalAfterDeposit",
                            user2USDCBalAfterDeposit.toString()
                        );

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressUSDC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressUSDC);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.9 < U < 0.95
                        let U = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(9)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision.mul(new BN(95)).div(new BN(100)));

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressUSDC)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressUSDC)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(USDCpriceInit);
                    });

                    it("when U is between 0.8999 & 0.90 for 6 decimal token", async function (){
                        this.timeout(0);
                        let USDCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(USDCCompoundFlag).to.be.equal(true);

                        let USDCpriceInit = BN(await mockChainlinkAggregatorforUSDC.latestAnswer());
                        // set price of USDC at $1
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        // let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(2999))
                            .div(new BN(10000))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, {
                            from: user2,
                        });
                        let user2USDCBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressUSDC, user2);
                        console.log(
                            "user2USDCBalAfterDeposit",
                            user2USDCBalAfterDeposit.toString()
                        );

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressUSDC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressUSDC);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.8999 < U < 1
                        let U = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN("8990")).div(new BN(10000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision.mul(new BN(9)).div(new BN(10)));

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressUSDC)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressUSDC)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(USDCpriceInit);
                    });

                    it("when U is between 0.80 and 0.85 for 6 decimal token", async function() {
                        this.timeout(0);
                        let USDCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(USDCCompoundFlag).to.be.equal(true);

                        let USDCpriceInit = BN(await mockChainlinkAggregatorforUSDC.latestAnswer());
                        // set price of USDC at $1
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        // let newBATprice = BN(DAIprice).mul(new BN(7)).div(new BN(10));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(23))
                            .div(new BN(100))
                            .mul(ONE_USDC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(1)));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());

                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: owner });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, {
                            from: user2,
                        });
                        let user2USDCBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressUSDC, user2);
                        console.log(
                            "user2USDCBalAfterDeposit",
                            user2USDCBalAfterDeposit.toString()
                        );

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

                        let U1 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressUSDC, borrowAmt, { from: user1 });
                        await savingAccount.borrow(addressUSDC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");

                        let U2 = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        console.log("U2", U2.toString());

                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));

                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressUSDC);
                        console.log("totalDeposits: ", depositStore[0].toString());
                        console.log("totalLoans: ", depositStore[1].toString());

                        let UB = new BN(userBorrowValAfterBorrow).mul(new BN(100));
                        let UD = new BN(getDeposits).mul(new BN(95));
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.8 < U <0.85
                        let U = await bankContract.getCapitalUtilizationRatio(addressUSDC);
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(8)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision.mul(new BN(85)).div(new BN(100)));

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressUSDC)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressUSDC)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                        await mockChainlinkAggregatorforUSDC.updateAnswer(USDCpriceInit);
                    });
                });
            });

            context("with 8 decimal Token", async () => {
                context("should succeed", async () => {
                    it("when U = 1 for 8 decimal token", async function() {
                        this.timeout(0);
                        let WBTCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(WBTCCompoundFlag).to.be.equal(true);

                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let WBTCprice = await mockChainlinkAggregatorforWBTC.latestAnswer();

                        let newWBTCPrice = await DAIprice.mul(new BN(15)).div(new BN(10));
                        await mockChainlinkAggregatorforWBTC.updateAnswer(newWBTCPrice);

                        console.log("WBTCprice", WBTCprice.toString());
                        console.log("DAIprice", DAIprice.toString());
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));
                        const borrowAmt2 = ONE_WBTC.sub(BN(borrowAmt));
                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20WBTC.transfer(user2, ONE_WBTC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20WBTC.approve(savingAccount.address, ONE_WBTC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(10)), { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)), { from: owner });
                        await savingAccount.deposit(addressWBTC, ONE_WBTC, {
                            from: user2,
                        });
                        let user2WBTCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressWBTC,
                            user2
                        );
                        console.log("user2WBTCBalAfterDeposit", user2WBTCBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressWBTC, borrowAmt, { from: user1 });
                        console.log("USER 1 BORROWS");                        
                        await savingAccount.borrow(addressWBTC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressWBTC);
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
                        let U = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        expect(new BN(U)).to.be.bignumber.equal(eighteenPrecision);
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressWBTC));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressWBTC));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforWBTC.updateAnswer(WBTCprice);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    });

                    it("when U is between 0.9999 & 1 for 8 decimal token", async function(){
                        this.timeout(0);
                        let WBTCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(WBTCCompoundFlag).to.be.equal(true);

                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let WBTCprice = await mockChainlinkAggregatorforWBTC.latestAnswer();

                        let newWBTCPrice = await DAIprice.mul(new BN(15)).div(new BN(10));
                        await mockChainlinkAggregatorforWBTC.updateAnswer(newWBTCPrice);

                        console.log("WBTCprice", WBTCprice.toString());
                        console.log("DAIprice", DAIprice.toString());
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(899))
                            .div(new BN(1000))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));

                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20WBTC.transfer(user2, ONE_WBTC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20WBTC.approve(savingAccount.address, ONE_WBTC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(10)), { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)), { from: owner });
                        await savingAccount.deposit(addressWBTC, ONE_WBTC, {
                            from: user2,
                        });
                        let user2WBTCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressWBTC,
                            user2
                        );
                        console.log("user2WBTCBalAfterDeposit", user2WBTCBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressWBTC, borrowAmt, { from: user1 });
                        console.log("USER 1 BORROWS");                        
                        await savingAccount.borrow(addressWBTC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressWBTC);
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
    
                        // check if 0.9999 < U < 1
                        let U = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        // ensure that U > 0.999... && U < 1
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN("9990")).div(new BN(10000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision);
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressWBTC));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressWBTC));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforWBTC.updateAnswer(WBTCprice);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    });

                    it("when U is between 0.90 and 0.95 for 8 decimal token", async function(){
                        this.timeout(0);
                        let WBTCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(WBTCCompoundFlag).to.be.equal(true);

                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let WBTCprice = await mockChainlinkAggregatorforWBTC.latestAnswer();

                        let newWBTCPrice = await DAIprice.mul(new BN(15)).div(new BN(10));
                        await mockChainlinkAggregatorforWBTC.updateAnswer(newWBTCPrice);

                        console.log("WBTCprice", WBTCprice.toString());
                        console.log("DAIprice", DAIprice.toString());
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(80))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));

                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20WBTC.transfer(user2, ONE_WBTC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20WBTC.approve(savingAccount.address, ONE_WBTC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(10)), { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)), { from: owner });
                        await savingAccount.deposit(addressWBTC, ONE_WBTC, {
                            from: user2,
                        });
                        let user2WBTCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressWBTC,
                            user2
                        );
                        console.log("user2WBTCBalAfterDeposit", user2WBTCBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressWBTC, borrowAmt, { from: user1 });
                        console.log("USER 1 BORROWS");                        
                        await savingAccount.borrow(addressWBTC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressWBTC);
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
    
                        // check if 0.9 < U < 0.95
                        let U = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(9)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision.mul(new BN(95)).div(new BN(100)));
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressWBTC));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressWBTC));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforWBTC.updateAnswer(WBTCprice);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    });

                    it("when U is between 0.8999 & 0.90 for 8 decimal token", async function (){
                        this.timeout(0);
                        let WBTCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(WBTCCompoundFlag).to.be.equal(true);

                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let WBTCprice = await mockChainlinkAggregatorforWBTC.latestAnswer();

                        let newWBTCPrice = await DAIprice.mul(new BN(15)).div(new BN(10));
                        await mockChainlinkAggregatorforWBTC.updateAnswer(newWBTCPrice);

                        console.log("WBTCprice", WBTCprice.toString());
                        console.log("DAIprice", DAIprice.toString());
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(749))
                            .div(new BN(1000))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));

                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20WBTC.transfer(user2, ONE_WBTC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20WBTC.approve(savingAccount.address, ONE_WBTC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(10)), { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)), { from: owner });
                        await savingAccount.deposit(addressWBTC, ONE_WBTC, {
                            from: user2,
                        });
                        let user2WBTCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressWBTC,
                            user2
                        );
                        console.log("user2WBTCBalAfterDeposit", user2WBTCBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressWBTC, borrowAmt, { from: user1 });
                        console.log("USER 1 BORROWS");                        
                        await savingAccount.borrow(addressWBTC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressWBTC);
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
    
                        // check if 0.8999 < U < 0.90
                        let U = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        // ensure that U > 0.899... && U < 0.90
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN("8990")).div(new BN(10000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision.mul(new BN(9)).div(new BN(10)));
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressWBTC));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressWBTC));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforWBTC.updateAnswer(WBTCprice);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    });

                    it("when U is between 0.80 and 0.85 for 8 decimal token", async function(){
                        this.timeout(0);
                        let WBTCCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressUSDC
                        );
                        expect(WBTCCompoundFlag).to.be.equal(true);

                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let WBTCprice = await mockChainlinkAggregatorforWBTC.latestAnswer();

                        let newWBTCPrice = await DAIprice.mul(new BN(15)).div(new BN(10));
                        await mockChainlinkAggregatorforWBTC.updateAnswer(newWBTCPrice);

                        console.log("WBTCprice", WBTCprice.toString());
                        console.log("DAIprice", DAIprice.toString());
                        
                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(65))
                            .div(new BN(100))
                            .mul(ONE_WBTC)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(8)));

                        console.log("borrowAmt1", borrowAmt.toString());
                        console.log("borrowAmt2", borrowAmt2.toString());
    
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20WBTC.transfer(user2, ONE_WBTC);
                        await erc20DAI.transfer(owner, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20WBTC.approve(savingAccount.address, ONE_WBTC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(10)), { from: owner });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)), { from: owner });
                        await savingAccount.deposit(addressWBTC, ONE_WBTC, {
                            from: user2,
                        });
                        let user2WBTCBalAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressWBTC,
                            user2
                        );
                        console.log("user2WBTCBalAfterDeposit", user2WBTCBalAfterDeposit.toString());
    
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
    
                        let U1 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U1", U1.toString());

                        await savingAccount.borrow(addressWBTC, borrowAmt, { from: user1 });
                        console.log("USER 1 BORROWS");                        
                        await savingAccount.borrow(addressWBTC, borrowAmt2);
                        console.log("---------------------- borrow -------------------------");
    
                        let U2 = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        console.log("U2", U2.toString());
    
                        // 3. Change the price.
                        // update price of DAI to 60% of it's value
                        let updatedPrice = BN(DAIprice).mul(new BN(6)).div(new BN(10));
    
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
    
                        const userBorrowValAfterBorrow = await accountsContract.getBorrowETH(user1);
                        const getDeposits = await accountsContract.getDepositETH(user1);
                        const userBorrowPower = await accountsContract.getBorrowPower(user1);
                        let depositStore = await bankContract.getTokenState(addressWBTC);
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
    
                        // check if 0.8 < U < 0.85
                        let U = await bankContract.getCapitalUtilizationRatio(addressWBTC);
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN(8)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision.mul(new BN(85)).div(new BN(100)));
    
                        let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressWBTC));
                        let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressWBTC));
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());
    
                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforWBTC.updateAnswer(WBTCprice);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    });
                });
            });
        });

        context("with Compound unsupported tokens", async () => {
            context("should succeed", async () => {
                it("when capital utilization ratio = 1 for Compound unsupported tokens", async function () {
                    this.timeout(0);
                    let ONE_TUSD = eighteenPrecision;
                    let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                        addressTUSD
                    );
                    expect(TUSDCompoundFlag).to.be.equal(false);

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_TUSD)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                    const borrowAmt2 = ONE_DAI.sub(BN(borrowAmt));
                    console.log("borrowAmt1", borrowAmt.toString());
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
                    // update price of DAI to 60% of it's value
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

                    let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressTUSD));
                    let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressTUSD));
                    console.log("borrowAPR", borrowAPR.toString());
                    console.log("depositAPR", depositAPR.toString());

                    // When U = 1, for Compound unsupported tokens:
                    // borrowRatePerBlock = rateCurveConstant * 1000 / BLOCKS_PER_YEAR
                    //                    = (3 * (10**16) * 1000 ) / 10512000
                    //                    = 2853881278538
                    expect(borrowAPR).to.be.bignumber.equal(new BN("2853881278538"));
                    expect(depositAPR).to.be.bignumber.equal(new BN("2853881278538"));

                    await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                });

                context("when U is between 0.90 and 0.9999", async () => {
                    it("when capital utilization ratio > 0.9999 & < 1 for Compound unsupported tokens", async function () {
                        this.timeout(0);
                        let ONE_TUSD = eighteenPrecision;
                        let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressTUSD
                        );
                        expect(TUSDCompoundFlag).to.be.equal(false);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(3536))
                            .div(new BN(10000))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        console.log("borrowAmt1", borrowAmt.toString());
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
                        let user2TUSDBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                        console.log(
                            "user2TUSDBalAfterDeposit",
                            user2TUSDBalAfterDeposit.toString()
                        );

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
                        // update price of DAI to 60% of it's value
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
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // check if 0.9999 < U < 1
                        let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                        // ensure that U > 0.999... && U < 1
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            eighteenPrecision.mul(new BN("9990").div(new BN(10000)))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(eighteenPrecision);

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressTUSD)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressTUSD)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR per block", borrowAPR.toString());
                        console.log("depositAPR per block", depositAPR.toString());

                        // When U = 1, for Compound unsupported tokens:
                        // borrowRatePerBlock = rateCurveConstant * 1000 / BLOCKS_PER_YEAR
                        //                    = (3 * (10**16) * 1000 ) / 10512000
                        //                    = 2853881278538
                        expect(borrowAPR).to.be.bignumber.equal(new BN("2853881278538"));
                        expect(depositAPR).to.be.bignumber.equal(new BN("2853789239581"));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                    });
                    it("when capital utilization ratio > 0.90 & < 0.95 for Compound unsupported tokens", async function () {
                        this.timeout(0);
                        let ONE_TUSD = eighteenPrecision;
                        let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressTUSD
                        );
                        expect(TUSDCompoundFlag).to.be.equal(false);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(28))
                            .div(new BN(100))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        console.log("borrowAmt1", borrowAmt.toString());
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
                        let user2TUSDBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                        console.log(
                            "user2TUSDBalAfterDeposit",
                            user2TUSDBalAfterDeposit.toString()
                        );

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
                        // update price of DAI to 60% of it's value
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
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        // hardcoded value to ensure that U > 0.90 && U < 0.95
                        let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);

                        // ensure that U > 0.90... && U < 0.95
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            ONE_DAI.mul(new BN(9)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(
                            ONE_DAI.mul(new BN(95)).div(new BN(100))
                        );

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressTUSD)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressTUSD)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                    });
                });

                context("when U is between 0.80 and 0.90", async () => {
                    it("when capital utilization ratio > 0.899 & < 0.90 for Compound unsupported tokens", async function () {
                        this.timeout(0);
                        let ONE_TUSD = eighteenPrecision;
                        let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressTUSD
                        );
                        expect(TUSDCompoundFlag).to.be.equal(false);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(2581))
                            .div(new BN(10000))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        console.log("borrowAmt1", borrowAmt.toString());
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
                        let user2TUSDBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                        console.log(
                            "user2TUSDBalAfterDeposit",
                            user2TUSDBalAfterDeposit.toString()
                        );

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
                        // update price of DAI to 60% of it's value
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
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                        // ensure that U > 0.8990... && U < 0.90
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            ONE_DAI.mul(new BN(8990)).div(new BN(10000))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(
                            ONE_DAI.mul(new BN(9)).div(new BN(10))
                        );

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressTUSD)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressTUSD)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                    });
                    it("when capital utilization ratio > 0.80 & < 0.85 for Compound unsupported tokens", async function () {
                        this.timeout(0);
                        let ONE_TUSD = eighteenPrecision;
                        let TUSDCompoundFlag = await tokenInfoRegistry.isSupportedOnCompound(
                            addressTUSD
                        );
                        expect(TUSDCompoundFlag).to.be.equal(false);

                        const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        const borrowAmt2 = new BN(await tokenInfoRegistry.priceFromIndex(0))
                            .mul(new BN(20))
                            .div(new BN(100))
                            .mul(ONE_TUSD)
                            .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                        console.log("borrowAmt1", borrowAmt.toString());
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
                        let user2TUSDBalAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(addressTUSD, user2);
                        console.log(
                            "user2TUSDBalAfterDeposit",
                            user2TUSDBalAfterDeposit.toString()
                        );

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
                        // update price of DAI to 60% of it's value
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
                        let LTV = BN(userBorrowValAfterBorrow).mul(
                            new BN(100).div(BN(getDeposits))
                        );
                        console.log("getDeposits", getDeposits.toString());
                        console.log(
                            "userBorrowValAfterBorrow",
                            userBorrowValAfterBorrow.toString()
                        );
                        console.log("userBorrowPower", userBorrowPower.toString());
                        console.log("UD", UD.toString());
                        console.log("UB", UB.toString());

                        const liquidateAfter = await accountsContract.isAccountLiquidatable.call(
                            user1
                        );

                        expect(liquidateAfter).to.equal(true);
                        expect(UB).to.be.bignumber.greaterThan(UD);

                        // user2's balance before liquidation
                        let user2DAIBalBeforeLiquidate =
                            await accountsContract.getDepositBalanceCurrent(addressDAI, user2);
                        console.log(
                            "user2DAIBalBeforeLiquidate",
                            user2DAIBalBeforeLiquidate.toString()
                        );

                        let U = await bankContract.getCapitalUtilizationRatio(addressTUSD);
                        // ensure that U > 0.80... && U < 0.85
                        expect(new BN(U)).to.be.bignumber.greaterThan(
                            ONE_DAI.mul(new BN(8)).div(new BN(10))
                        );
                        expect(new BN(U)).to.be.bignumber.lessThan(
                            ONE_DAI.mul(new BN(85)).div(new BN(100))
                        );

                        let borrowAPR = new BN(
                            await bankContract.getBorrowRatePerBlock(addressTUSD)
                        );
                        let depositAPR = new BN(
                            await bankContract.getDepositRatePerBlock(addressTUSD)
                        );
                        let borrowAPRYearly = borrowAPR.mul(OKEX_BPY);
                        let depositAPRYearly = depositAPR.mul(OKEX_BPY);
                        console.log("Yearly borrowAPR", borrowAPRYearly.toString());
                        console.log("Yearly depositAPR", depositAPRYearly.toString());
                        console.log("borrowAPR", borrowAPR.toString());
                        console.log("depositAPR", depositAPR.toString());

                        expect(borrowAPR).to.be.bignumber.greaterThan(new BN(0));
                        expect(depositAPR).to.be.bignumber.greaterThan(new BN(0));

                        await mockChainlinkAggregatorforDAI.updateAnswer(BN(DAIprice));
                    });
                });
            });
        });
    });
});