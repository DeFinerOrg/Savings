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
    let mockChainlinkAggregatorforETHAddress: any;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
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
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforTUSDAddress
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

    context("capitalUtilizationRatio()", async () => {
        context("with Compound unsupported tokens", async () => {
            context("should succeed", async () => {
                it("when capital utilization ratio = 1 for Compound unsupported tokens", async function () {
                    this.timeout(0);
                    let ONE_TUSD = eighteenPrecision;
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

                    let borrowAPR = new BN(await bankContract.getBorrowRatePerBlock(addressTUSD));
                    let depositAPR = new BN(await bankContract.getDepositRatePerBlock(addressTUSD));
                    console.log("borrowAPR", borrowAPR.toString());
                    console.log("depositAPR", depositAPR.toString());

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
            });
        });
    });
});
