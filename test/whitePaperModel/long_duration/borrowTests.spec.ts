import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { saveContract } from "../../../compound-protocol/scenario/src/Networks";
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");
var tokenData = require("../../../test-helpers/tokenData.json");

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.borrow", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let bank: t.BankInstance;
    let tokenRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
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
    let cTUSD_addr: any;
    let cMKR_addr: any;
    let addressCTokenForWBTC: any;

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
    let TWO_DAIS: any;
    let ONE_DAI: any;
    let HALF_DAI: any;
    let ONE_USDC: any;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        // testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        bank = await testEngine.bank;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        tokenRegistry = testEngine.tokenInfoRegistry;
        accountsContract = testEngine.accounts;
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
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cTUSD_addr = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        cMKR_addr = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(addressCTokenForWBTC);

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
        HALF_DAI = ONE_DAI.div(new BN(2));
        TWO_DAIS = ONE_DAI.mul(new BN(2));
        ONE_USDC = sixPrecision;
        await savingAccount.fastForward(1);
    });

    context("borrow()", async () => {
        context("with Token", async () => {
            context("should succeed", async () => {
                // modified
                it("RateTest1: Deposit DAI then borrow DAI", async function () {
                    this.timeout(0);
                    const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                        savingAccount.address
                    );
                    const balCTokensBefore = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await savingAccount.fastForward(1000);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    // Verify deposit
                    // -1700000000000000001
                    // await savAccBalVerify(
                    //     0,
                    //     ONE_DAI.mul(new BN(2)),
                    //     addressDAI,
                    //     cDAI,
                    //     balCTokensBefore,
                    //     BN(balSavingAccountUserBefore),
                    //     bank,
                    //     savingAccount
                    // );

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user2 }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(await cDAI.balanceOf(savingAccount.address));
                    const cDAIBorrowRateBefore = BN(await cDAI.borrowRatePerBlock());

                    const cDAISupplyRateBefore = BN(await cDAI.borrowRatePerBlock());

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    // await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    const cDAIBorrowRateAfter = BN(await cDAI.borrowRatePerBlock());

                    const cDAISupplyRateAfter = BN(await cDAI.borrowRatePerBlock());

                    // 3.1 Verify the deposit/loan/reservation/compound ledger of the pool
                    const tokenState = await savingAccount.getTokenState(addressDAI, {
                        from: user2,
                    });

                    // Verify that reservation equals to the token in pool's address
                    const reservation = BN(await erc20DAI.balanceOf(savingAccount.address));
                    // expect(tokenState[2]).to.be.bignumber.equal(reservation);

                    // Verifty that compound equals cToken underlying balance in pool's address
                    // It also verifies that (Deposit = Loan + Compound + Reservation)
                    const compoundAfterFastForward = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIAfterFastForward = BN(await cDAI.balanceOf(savingAccount.address));
                    const compoundPrincipal = compoundBeforeFastForward.add(
                        cDAIAfterFastForward
                            .sub(cDAIBeforeFastForward)
                            .mul(BN(await cDAI.exchangeRateCurrent.call()))
                            .div(eighteenPrecision)
                    );
                    // expect(BN(tokenState[0]).sub(tokenState[1]).sub(tokenState[2])).to.be.bignumber.equal(compoundAfterFastForward);

                    // 3.2 Vefity rate
                    const user1DepositPrincipal = await savingAccount.getDepositPrincipal(
                        addressDAI,
                        { from: user1 }
                    );
                    const user1DepositInterest = await savingAccount.getDepositInterest(
                        addressDAI,
                        { from: user1 }
                    );
                    const user2DepositPrincipal = await savingAccount.getDepositPrincipal(
                        addressDAI,
                        { from: user2 }
                    );
                    const user2DepositInterest = await savingAccount.getDepositInterest(
                        addressDAI,
                        { from: user2 }
                    );
                    const user1BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                        addressDAI,
                        { from: user1 }
                    );
                    const user1BorrowInterest = await savingAccount.getBorrowInterest(addressDAI, {
                        from: user1,
                    });
                    const user2BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                        addressDAI,
                        { from: user2 }
                    );
                    const user2BorrowInterest = await savingAccount.getBorrowInterest(addressDAI, {
                        from: user2,
                    });

                    // Verify the pricipal
                    // expect(user1DepositPrincipal).to.be.bignumber.equal(TWO_DAIS);
                    // expect(user2DepositPrincipal).to.be.bignumber.equal(TWO_DAIS);
                    // expect(user1BorrowPrincipal).to.be.bignumber.equal(new BN(0));
                    // expect(user2BorrowPrincipal).to.be.bignumber.equal(HALF_DAI);

                    // console.log(user1BorrowInterest.toString());
                    // console.log(user2BorrowInterest.toString());
                    // console.log(cDAIBorrowRateBefore.toString());
                    // console.log(cDAISupplyRateBefore.toString());
                    // console.log(cDAIBorrowRateAfter.toString());
                    // console.log(cDAISupplyRateAfter.toString());
                    // console.log(definerBorrowRateBefore.toString());
                    // console.log(definerSupplyRateBefore.toString());
                    // console.log(definerBorrowRateAfter.toString());
                    // console.log(definerSupplyRateAfter.toString());

                    console.log("user1DepositInterest", user1DepositInterest.toString());
                    console.log("user2DepositInterest", user2DepositInterest.toString());

                    console.log(user1BorrowInterest.toString());
                    console.log(user2BorrowInterest.toString());

                    // Verify the interest
                    // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                    const totalDepositInterest = BN(user1DepositInterest).add(user2DepositInterest);
                    const totalBorrowInterest = BN(user1BorrowInterest).add(user2BorrowInterest);
                    const totalCompoundInterest =
                        BN(compoundAfterFastForward).sub(compoundPrincipal);

                    // Second, verify the interest rate calculation. Need to compare these value to
                    // the rate simulator.
                    // expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(3007301800000)); // 3007210014379.6274
                    // expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(2997716400000)); // 2997625026684.72
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(9585494927));
                    // total Borrow Interest + total Compund Interest = total deposit Interest
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(954301061394927)); // 954301061200000
                });

                // modified
                /*
                it("Deposit DAI & USDC then borrow DAI", async () => {
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    // 1.2 Transfer USDC to user2.
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        new BN(10)
                    );
                }); */
            });
        });
    });
});
