import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { takeSnapshot, revertToSnapShot } from "../../../test-helpers/SnapshotUtils";
import { saveContract } from "../../../compound-protocol/scenario/src/Networks";
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");
var chai = require("chai");
var expect = chai.expect;
let snapshotId: string;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.FINMining", async (accounts) => {
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
    let addressFIN: any;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforWBTCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForTUSD: any;
    let addressCTokenForMKR: any;
    let addressCTokenForWBTC: any;

    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;

    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let erc20FIN: t.MockErc20Instance;

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
    let ONE_FIFTH_DAI: any;
    let ONE_USDC: any;
    let ONE_FIN: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        // testEngine.deploy("whitePaperModel.scen");
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
        addressFIN = tokens[11];

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
        erc20FIN = await ERC20.at(addressFIN);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForTUSD = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        addressCTokenForMKR = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);

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
        ONE_FIFTH_DAI = ONE_DAI.div(new BN(5));
        TWO_DAIS = ONE_DAI.mul(new BN(2));
        ONE_USDC = sixPrecision;
        ONE_FIN = eighteenPrecision;

        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressDAI, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressUSDC, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressTUSD, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressMKR, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressWBTC, ONE_FIN, ONE_FIN);

        await savingAccount.setFINAddress(addressFIN);
    });

    beforeEach(async () => {
        // Take snapshot of the EVM before each test
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    context("borrow()", async () => {
        context("with Token", async () => {
            context("should succeed", async () => {
                // modified
                it("FinMiningTest1: Two users deposit in the same block with one borrow", async function () {
                    this.timeout(0);
                    await erc20FIN.transfer(savingAccount.address, ONE_FIN.mul(new BN(1000000)));
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const cDAIBorrowRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    // await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    const cDAIBorrowRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

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
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIAfterFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const compoundPrincipal = compoundBeforeFastForward.add(
                        cDAIAfterFastForward
                            .sub(cDAIBeforeFastForward)
                            .mul(BN(await cTokenDAI.exchangeRateCurrent.call()))
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
                    expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(954301061000000));
                    expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(954291475650000));
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(9585493200)); // 9585493199
                    // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(954301061143200)); // 954301061000000

                    const balFINUser1 = await erc20FIN.balanceOf(user1);

                    // FIN balance before claim
                    const claimableAmountUser1 = await savingAccount.claim.call({
                        from: user1,
                    });

                    await savingAccount.claim({ from: user1 });
                    const balFIN = await erc20FIN.balanceOf(user1);
                    const balFINUser1Diff = BN(balFIN).sub(BN(balFINUser1));

                    // Claimed FIN amount should equal `claim()`
                    expect(BN(claimableAmountUser1)).to.be.bignumber.equal(BN(balFINUser1Diff));
                    expect(BN(balFIN)).to.be.bignumber.equal(new BN("50000000239519464333467"));
                });

                it("FinMiningTest2: Two user deposit in different blocks with one borrow", async function () {
                    this.timeout(0);
                    await erc20FIN.transfer(savingAccount.address, ONE_FIN.mul(new BN(1000000)));
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    await savingAccount.fastForward(100000);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const cDAIBorrowRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    // await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    const cDAIBorrowRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

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
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIAfterFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const compoundPrincipal = compoundBeforeFastForward.add(
                        cDAIAfterFastForward
                            .sub(cDAIBeforeFastForward)
                            .mul(BN(await cTokenDAI.exchangeRateCurrent.call()))
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
                    expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(954307873240042));
                    expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(954291497399999));
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(9585661757));
                    // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(954301083061756)); // 954307873240042

                    const balFINUser1 = await erc20FIN.balanceOf(user1);

                    // FIN balance before claim
                    const claimableAmountUser1 = await savingAccount.claim.call({
                        from: user1,
                    });

                    await savingAccount.claim({ from: user1 });
                    const balFIN = await erc20FIN.balanceOf(user1);
                    expect(BN(balFIN)).to.be.bignumber.equal(new BN("150000001088317675732373"));
                    const balFINUser1Diff = BN(balFIN).sub(BN(balFINUser1));

                    // Claimed FIN amount should equal `claim()`
                    expect(BN(claimableAmountUser1)).to.be.bignumber.equal(BN(balFINUser1Diff));
                });

                it("FinMiningTest3: Three user deposit in different blocks with one borrow", async function () {
                    this.timeout(0);
                    await erc20FIN.transfer(savingAccount.address, ONE_FIN.mul(new BN(1000000)));
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await erc20DAI.transfer(user3, TWO_DAIS);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user3 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    await savingAccount.fastForward(100000);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const cDAIBorrowRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    await savingAccount.fastForward(100000);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user3 });

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    // await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    const cDAIBorrowRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

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
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIAfterFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const compoundPrincipal = compoundBeforeFastForward.add(
                        cDAIAfterFastForward
                            .sub(cDAIBeforeFastForward)
                            .mul(BN(await cTokenDAI.exchangeRateCurrent.call()))
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
                    const user3DepositPrincipal = await savingAccount.getDepositPrincipal(
                        addressDAI,
                        { from: user3 }
                    );
                    const user3DepositInterest = await savingAccount.getDepositInterest(
                        addressDAI,
                        { from: user3 }
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
                    const user3BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                        addressDAI,
                        { from: user3 }
                    );
                    const user3BorrowInterest = await savingAccount.getBorrowInterest(addressDAI, {
                        from: user3,
                    });

                    console.log("1111", user3DepositPrincipal.toString());

                    console.log("user1DepositInterest", user1DepositInterest.toString());
                    console.log("user2DepositInterest", user2DepositInterest.toString());
                    console.log("user3DepositInterest", user3DepositInterest.toString());

                    console.log("user1BorrowInterest", user1BorrowInterest.toString());
                    console.log("user2BorrowInterest", user2BorrowInterest.toString());
                    console.log("user3BorrowInterest", user3BorrowInterest.toString());

                    // Verify the interest
                    // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                    const totalDepositInterest = BN(user1DepositInterest)
                        .add(user2DepositInterest)
                        .add(user3DepositInterest);
                    const totalBorrowInterest = BN(user1BorrowInterest)
                        .add(user2BorrowInterest)
                        .add(user3BorrowInterest);
                    const totalCompoundInterest =
                        BN(compoundAfterFastForward).sub(compoundPrincipal);

                    // Second, verify the interest rate calculation. Need to compare these value to
                    // the rate simulator.
                    expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(1815398643768557));
                    expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(1815365898207456));
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(19168622913)); // 19168622492
                    // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(1815385066830369)); // 367597864096682

                    const balFINUser1 = await erc20FIN.balanceOf(user1);

                    // FIN balance before claim
                    const claimableAmountUser1 = await savingAccount.claim.call({
                        from: user1,
                    });

                    await savingAccount.claim({ from: user1 });
                    const balFIN = await erc20FIN.balanceOf(user1);
                    expect(BN(balFIN)).to.be.bignumber.equal(new BN("183338634741097975162430")); // 1.8333335036068736e-12
                    const balFINUser1Diff = BN(balFIN).sub(BN(balFINUser1));

                    // Claimed FIN amount should equal `claim()`
                    expect(BN(claimableAmountUser1)).to.be.bignumber.equal(BN(balFINUser1Diff));
                });

                it("FinMiningTest4: Two user deposit in different blocks with two borrows", async function () {
                    this.timeout(0);
                    await erc20FIN.transfer(savingAccount.address, ONE_FIN.mul(new BN(1000000)));
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressDAI, ONE_FIFTH_DAI, { from: user1 });

                    await savingAccount.fastForward(100000);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const cDAIBorrowRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.borrow(addressDAI, ONE_FIFTH_DAI, { from: user1 });
                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    // await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    const cDAIBorrowRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

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
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIAfterFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const compoundPrincipal = compoundBeforeFastForward.add(
                        cDAIAfterFastForward
                            .sub(cDAIBeforeFastForward)
                            .mul(BN(await cTokenDAI.exchangeRateCurrent.call()))
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
                    expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(1899912869531228));
                    expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(1899899688379264));
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(7988185581));
                    // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(1899907676564845)); // 1899912869531228

                    const balFINUser1 = await erc20FIN.balanceOf(user1);

                    // FIN balance before claim
                    const claimableAmountUser1 = await savingAccount.claim.call({
                        from: user1,
                    });

                    await savingAccount.claim({ from: user1 });
                    const balFIN = await erc20FIN.balanceOf(user1);
                    expect(BN(balFIN)).to.be.bignumber.equal(new BN("278616881423910733951608"));
                    const balFINUser1Diff = BN(balFIN).sub(BN(balFINUser1));

                    // Claimed FIN amount should equal `claim()`
                    expect(BN(claimableAmountUser1)).to.be.bignumber.equal(BN(balFINUser1Diff));
                });

                it("FinMiningTest5: Three user deposit in different blocks with two borrows", async function () {
                    this.timeout(0);
                    await erc20FIN.transfer(savingAccount.address, ONE_FIN.mul(new BN(1000000)));
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await erc20DAI.transfer(user3, TWO_DAIS);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user3 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressDAI, ONE_FIFTH_DAI, { from: user1 });

                    await savingAccount.fastForward(100000);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const cDAIBorrowRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateBefore = BN(await cTokenDAI.borrowRatePerBlock());

                    await savingAccount.fastForward(100000);
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user3 });

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.borrow(addressDAI, ONE_FIFTH_DAI, { from: user1 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });
                    // await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 });

                    // await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 });

                    const cDAIBorrowRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

                    const cDAISupplyRateAfter = BN(await cTokenDAI.borrowRatePerBlock());

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
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIAfterFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );
                    const compoundPrincipal = compoundBeforeFastForward.add(
                        cDAIAfterFastForward
                            .sub(cDAIBeforeFastForward)
                            .mul(BN(await cTokenDAI.exchangeRateCurrent.call()))
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
                    const user3DepositPrincipal = await savingAccount.getDepositPrincipal(
                        addressDAI,
                        { from: user3 }
                    );
                    const user3DepositInterest = await savingAccount.getDepositInterest(
                        addressDAI,
                        { from: user3 }
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
                    const user3BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                        addressDAI,
                        { from: user3 }
                    );
                    const user3BorrowInterest = await savingAccount.getBorrowInterest(addressDAI, {
                        from: user3,
                    });

                    console.log("1111", user3DepositPrincipal.toString());

                    console.log("user1DepositInterest", user1DepositInterest.toString());
                    console.log("user2DepositInterest", user2DepositInterest.toString());
                    console.log("user3DepositInterest", user3DepositInterest.toString());

                    console.log("user1BorrowInterest", user1BorrowInterest.toString());
                    console.log("user2BorrowInterest", user2BorrowInterest.toString());
                    console.log("user3BorrowInterest", user3BorrowInterest.toString());

                    // Verify the interest
                    // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                    const totalDepositInterest = BN(user1DepositInterest)
                        .add(user2DepositInterest)
                        .add(user3DepositInterest);
                    const totalBorrowInterest = BN(user1BorrowInterest)
                        .add(user2BorrowInterest)
                        .add(user3BorrowInterest);
                    const totalCompoundInterest =
                        BN(compoundAfterFastForward).sub(compoundPrincipal);

                    // Second, verify the interest rate calculation. Need to compare these value to
                    // the rate simulator.
                    expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(3211357809383536));
                    expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(3211329856056485));
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(15974120732));
                    // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(3211345830177217)); // 3211357809383536

                    const balFINUser1 = await erc20FIN.balanceOf(user1);

                    // FIN balance before claim
                    const claimableAmountUser1 = await savingAccount.claim.call({
                        from: user1,
                    });

                    await savingAccount.claim({ from: user1 });
                    const balFIN = await erc20FIN.balanceOf(user1);
                    expect(BN(balFIN)).to.be.bignumber.equal(new BN("340574663609428305790285")); // 7.85729643603791*0.2 + 1.8333341356503024
                    const balFINUser1Diff = BN(balFIN).sub(BN(balFINUser1));

                    // Claimed FIN amount should equal `claim()`
                    expect(BN(claimableAmountUser1)).to.be.bignumber.equal(BN(balFINUser1Diff));
                });
            });
        });
    });
});
