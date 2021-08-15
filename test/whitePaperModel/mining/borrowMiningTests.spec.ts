import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { takeSnapshot, revertToSnapShot } from "../../../test-helpers/SnapshotUtils";

var chai = require("chai");
var expect = chai.expect;
let snapshotId: string;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");

contract("borrowMiningTests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let tokenRegistry: t.TokenRegistryInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    const eighteenPrecision = new BN(10).pow(new BN(18));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;
    let addressFIN: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cWBTC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let erc20FIN: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

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
        accountsContract = await testEngine.accounts;
        tokenRegistry = testEngine.tokenInfoRegistry;

        // 1. initialization.
        tokens = await testEngine.erc20Tokens;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        addressFIN = tokens[11];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        erc20WBTC = await ERC20.at(addressWBTC);
        erc20FIN = await ERC20.at(addressFIN);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

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
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressFIN, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(ETH_ADDRESS, ONE_FIN, ONE_FIN);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
    });

    beforeEach(async () => {
        // Take snapshot of the EVM before each test
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    context("Mining tests", async () => {
        context("Single Token", async () => {
            context("borrow mining", async () => {
                context("Compound supported 18 decimal token", async () => {
                    context("should succeed", async () => {
                        it("Deposit DAI then user 1 & 2 borrow small amount of DAI on same block", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(10000);
                            // 1.1 Transfer DAI to user1 & user2.
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, new BN(5000), { from: user1 });
                            await savingAccount.deposit(addressDAI, new BN(5000), { from: user2 });
                            // 2. Start borrowing.
                            const compoundBeforeFastForward = BN(
                                await cDAI.balanceOfUnderlying.call(savingAccount.address)
                            );
                            const cDAIBeforeFastForward = BN(
                                await cDAI.balanceOf(savingAccount.address)
                            );
                            console.log(
                                "compoundBeforeFastForward",
                                compoundBeforeFastForward.toString()
                            );
                            console.log("cDAIBeforeFastForward", cDAIBeforeFastForward.toString());
                            const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                            const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                            const daiTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user1,
                                }
                            );
                            await savingAccount.borrow(addressDAI, new BN(1000), { from: user1 });

                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user2,
                                }
                            );
                            await savingAccount.borrow(addressDAI, new BN(1000), { from: user2 });
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(1000)
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFINUser2 = await erc20FIN.balanceOf(user2);
                            console.log("balFINUser2", balFINUser2.toString());
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINUser1", balFINUser1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            // Verifty that compound equals cToken underlying balance in pool's address
                            // It also verifies that (Deposit = Loan + Compound + Reservation)
                            const compoundAfterFastForward = BN(
                                await cDAI.balanceOfUnderlying.call(savingAccount.address)
                            );
                            const cDAIAfterFastForward = BN(
                                await cDAI.balanceOf(savingAccount.address)
                            );
                            const compoundPrincipal = compoundBeforeFastForward.add(
                                cDAIAfterFastForward
                                    .sub(cDAIBeforeFastForward)
                                    .mul(BN(await cDAI.exchangeRateCurrent.call()))
                                    .div(eighteenPrecision)
                            );
                            // expect(BN(tokenState[0]).sub(tokenState[1]).sub(tokenState[2])).to.be.bignumber.equal(compoundAfterFastForward);
                            console.log(
                                "compoundAfterFastForward",
                                compoundAfterFastForward.toString()
                            );
                            console.log("cDAIAfterFastForward", cDAIAfterFastForward.toString());
                            console.log("compoundPrincipal", compoundPrincipal.toString());
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
                            const user1BorrowInterest = await savingAccount.getBorrowInterest(
                                addressDAI,
                                {
                                    from: user1,
                                }
                            );
                            const user2BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                                addressDAI,
                                { from: user2 }
                            );
                            const user2BorrowInterest = await savingAccount.getBorrowInterest(
                                addressDAI,
                                {
                                    from: user2,
                                }
                            );
                            console.log("user1DepositInterest", user1DepositInterest.toString());
                            console.log("user2DepositInterest", user2DepositInterest.toString());
                            console.log(user1BorrowInterest.toString());
                            console.log(user2BorrowInterest.toString());
                            // Verify the interest
                            // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                            const totalDepositInterest =
                                BN(user1DepositInterest).add(user2DepositInterest);
                            const totalBorrowInterest =
                                BN(user1BorrowInterest).add(user2BorrowInterest);
                            const totalCompoundInterest =
                                BN(compoundAfterFastForward).sub(compoundPrincipal);
                            console.log("totalCompoundInterest", totalCompoundInterest.toString());
                            // Second, verify the interest rate calculation. Need to compare these value to
                            // the rate simulator.
                            // expect(BN(totalDepositInterest)).to.be.bignumber.equal(
                            //     new BN(3007301600000)
                            // ); // 3007210014379.6274
                            // expect(BN(totalBorrowInterest)).to.be.bignumber.equal(
                            //     new BN(2997716150000)
                            // ); // 2997625026684.72
                            // expect(BN(totalCompoundInterest)).to.be.bignumber.equal(
                            //     new BN(9585493199)
                            // );

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("101000050005000500050004")
                            );
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("101000050005000500050004")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            const FINAmountClaimedUser1 = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(FINAmountClaimedUser1)
                            );
                            const FINAmountClaimedUser2 = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(FINAmountClaimedUser2)
                            );
                        });
                        it("Deposit DAI then user 1 & 2 borrow small amount of DAI after some blocks", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(10000).mul(eightPrecision);
                            // 1.1 Transfer DAI to user1 & user2.
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(
                                addressDAI,
                                new BN(5000).mul(eightPrecision),
                                { from: user1 }
                            );
                            await savingAccount.deposit(
                                addressDAI,
                                new BN(5000).mul(eightPrecision),
                                { from: user2 }
                            );
                            // 2. Start borrowing.
                            const compoundBeforeFastForward = BN(
                                await cDAI.balanceOfUnderlying.call(savingAccount.address)
                            );
                            const cDAIBeforeFastForward = BN(
                                await cDAI.balanceOf(savingAccount.address)
                            );
                            console.log(
                                "compoundBeforeFastForward",
                                compoundBeforeFastForward.toString()
                            );
                            console.log("cDAIBeforeFastForward", cDAIBeforeFastForward.toString());
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
                            await savingAccount.borrow(
                                addressDAI,
                                new BN(1000).mul(eightPrecision),
                                { from: user2 }
                            );
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(1000).mul(eightPrecision)
                            );
                            // user 1 borrows after some blocks
                            await savingAccount.fastForward(10000);
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user1,
                                }
                            );
                            await savingAccount.borrow(
                                addressDAI,
                                new BN(1000).mul(eightPrecision),
                                { from: user1 }
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFINUser2 = await erc20FIN.balanceOf(user2);
                            console.log("balFINUser2", balFINUser2.toString());
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINUser1", balFINUser1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            const compoundAfterFastForward = BN(
                                await cDAI.balanceOfUnderlying.call(savingAccount.address)
                            );
                            const cDAIAfterFastForward = BN(
                                await cDAI.balanceOf(savingAccount.address)
                            );
                            const compoundPrincipal = compoundBeforeFastForward.add(
                                cDAIAfterFastForward
                                    .sub(cDAIBeforeFastForward)
                                    .mul(BN(await cDAI.exchangeRateCurrent.call()))
                                    .div(eighteenPrecision)
                            );
                            // expect(BN(tokenState[0]).sub(tokenState[1]).sub(tokenState[2])).to.be.bignumber.equal(compoundAfterFastForward);
                            console.log(
                                "compoundAfterFastForward",
                                compoundAfterFastForward.toString()
                            );
                            console.log("cDAIAfterFastForward", cDAIAfterFastForward.toString());
                            console.log("compoundPrincipal", compoundPrincipal.toString());
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
                            const user1BorrowInterest = await savingAccount.getBorrowInterest(
                                addressDAI,
                                {
                                    from: user1,
                                }
                            );
                            const user2BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                                addressDAI,
                                { from: user2 }
                            );
                            const user2BorrowInterest = await savingAccount.getBorrowInterest(
                                addressDAI,
                                {
                                    from: user2,
                                }
                            );
                            console.log("user1DepositInterest", user1DepositInterest.toString());
                            console.log("user2DepositInterest", user2DepositInterest.toString());
                            console.log(user1BorrowInterest.toString());
                            console.log(user2BorrowInterest.toString());
                            // Verify the interest
                            // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                            const totalDepositInterest =
                                BN(user1DepositInterest).add(user2DepositInterest);
                            const totalBorrowInterest =
                                BN(user1BorrowInterest).add(user2BorrowInterest);
                            const totalCompoundInterest =
                                BN(compoundAfterFastForward).sub(compoundPrincipal);
                            console.log("totalDepositInterest", totalDepositInterest.toString());
                            console.log("totalBorrowInterest", totalBorrowInterest.toString());
                            console.log("totalCompoundInterest", totalCompoundInterest.toString());
                            // Second, verify the interest rate calculation. Need to compare these value to
                            // the rate simulator.
                            expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(1277119)); // 3007210014379.6274
                            expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(1271274)); // 2997625026684.72
                            expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(7540));

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            console.log("balFINUser2Diff", balFINUser2Diff.toString());
                            console.log("balFINUser1Diff", balFINUser1Diff.toString());

                            expect(BN(balFINUser2Diff)).to.be.bignumber.equal(
                                new BN("116000015400862241405978")
                            );
                            expect(BN(balFINUser1Diff)).to.be.bignumber.equal(
                                new BN("105999985119111412910479")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                        it("borrowMining3: Deposit DAI then user 1 & 2 borrow large amount of DAI on same block", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(1000).mul(ONE_DAI);
                            const depositAmount = new BN(500).mul(ONE_DAI);
                            const borrowAmount = new BN(100).mul(ONE_DAI);
                            // 1.1 Transfer DAI to user1 & user2.
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                            await savingAccount.deposit(addressDAI, depositAmount, { from: user2 });
                            // 2. Start borrowing.
                            const compoundBeforeFastForward = BN(
                                await cDAI.balanceOfUnderlying.call(savingAccount.address)
                            );
                            const cDAIBeforeFastForward = BN(
                                await cDAI.balanceOf(savingAccount.address)
                            );
                            console.log(
                                "compoundBeforeFastForward",
                                compoundBeforeFastForward.toString()
                            );
                            console.log("cDAIBeforeFastForward", cDAIBeforeFastForward.toString());
                            const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                            const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                            const daiTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user1,
                                }
                            );
                            await savingAccount.borrow(addressDAI, borrowAmount, { from: user1 });

                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user2,
                                }
                            );
                            await savingAccount.borrow(addressDAI, borrowAmount, { from: user2 });
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                borrowAmount
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFINUser2 = await erc20FIN.balanceOf(user2);
                            console.log("balFINUser2", balFINUser2.toString());
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINUser1", balFINUser1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            const compoundAfterFastForward = BN(
                                await cDAI.balanceOfUnderlying.call(savingAccount.address)
                            );
                            const cDAIAfterFastForward = BN(
                                await cDAI.balanceOf(savingAccount.address)
                            );
                            const compoundPrincipal = compoundBeforeFastForward.add(
                                cDAIAfterFastForward
                                    .sub(cDAIBeforeFastForward)
                                    .mul(BN(await cDAI.exchangeRateCurrent.call()))
                                    .div(eighteenPrecision)
                            );
                            // expect(BN(tokenState[0]).sub(tokenState[1]).sub(tokenState[2])).to.be.bignumber.equal(compoundAfterFastForward);
                            console.log(
                                "compoundAfterFastForward",
                                compoundAfterFastForward.toString()
                            );
                            console.log("cDAIAfterFastForward", cDAIAfterFastForward.toString());
                            console.log("compoundPrincipal", compoundPrincipal.toString());
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
                            const user1BorrowInterest = await savingAccount.getBorrowInterest(
                                addressDAI,
                                {
                                    from: user1,
                                }
                            );
                            const user2BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                                addressDAI,
                                { from: user2 }
                            );
                            const user2BorrowInterest = await savingAccount.getBorrowInterest(
                                addressDAI,
                                {
                                    from: user2,
                                }
                            );
                            console.log("user1DepositInterest", user1DepositInterest.toString());
                            console.log("user2DepositInterest", user2DepositInterest.toString());
                            console.log(user1BorrowInterest.toString());
                            console.log(user2BorrowInterest.toString());
                            // Verify the interest
                            // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                            const totalDepositInterest =
                                BN(user1DepositInterest).add(user2DepositInterest);
                            const totalBorrowInterest =
                                BN(user1BorrowInterest).add(user2BorrowInterest);
                            const totalCompoundInterest =
                                BN(compoundAfterFastForward).sub(compoundPrincipal);
                            console.log("totalDepositInterest", totalDepositInterest.toString());
                            console.log("totalBorrowInterest", totalBorrowInterest.toString());
                            console.log("totalCompoundInterest", totalCompoundInterest.toString());
                            // Second, verify the interest rate calculation. Need to compare these value to
                            // the rate simulator.
                            expect(BN(totalDepositInterest)).to.be.bignumber.equal(
                                new BN(1109299704061956)
                            ); // 3007210014379.6274
                            expect(BN(totalBorrowInterest)).to.be.bignumber.equal(
                                new BN(1105063953654800)
                            ); // 2997625026684.72
                            expect(BN(totalCompoundInterest)).to.be.bignumber.equal(
                                new BN(5539188762448)
                            );

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));

                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("101000000209711302546000")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("101000000209711302542600")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                        it("borrowMining4: Deposit DAI then user 1 & 2 borrow large amount of DAI after some blocks", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(1000).mul(ONE_DAI);
                            const depositAmount = new BN(500).mul(ONE_DAI);
                            const borrowAmount = new BN(100).mul(ONE_DAI);
                            // 1.1 Transfer DAI to user1 & user2.
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });
                            await savingAccount.deposit(addressDAI, depositAmount, { from: user2 });
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
                            await savingAccount.borrow(addressDAI, borrowAmount, { from: user2 });
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                borrowAmount
                            );
                            // user 1 borrows after some blocks
                            await savingAccount.fastForward(10000);
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user1,
                                }
                            );
                            await savingAccount.borrow(addressDAI, borrowAmount, { from: user1 });
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFINUser2 = await erc20FIN.balanceOf(user2);
                            console.log("balFINUser2", balFINUser2.toString());
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINUser1", balFINUser1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("116000013845483105597000")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("105999986574362299011575")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                        it("Deposit DAI, USDC and borrow large amount of DAI", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfDAI = eighteenPrecision.mul(new BN(1000));
                            const numOfUSDC = sixPrecision.mul(new BN(1000));
                            const depositAmountDAI = new BN(500).mul(eighteenPrecision);
                            const depositAmountUSDC = new BN(500).mul(sixPrecision);
                            const borrowAmount = new BN(10).mul(eighteenPrecision);
                            await erc20DAI.transfer(user1, numOfDAI);
                            await erc20DAI.transfer(user2, numOfDAI);
                            await erc20USDC.transfer(user2, numOfUSDC);
                            await erc20DAI.approve(savingAccount.address, numOfDAI, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfDAI, {
                                from: user2,
                            });
                            await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressDAI, depositAmountDAI, {
                                from: user1,
                            });
                            await savingAccount.deposit(addressDAI, depositAmountDAI, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, depositAmountUSDC, {
                                from: user2,
                            });
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
                            await savingAccount.borrow(addressDAI, borrowAmount, {
                                from: user2,
                            });
                            // 3. Verify the loan amount.
                            const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                borrowAmount
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser2 = await erc20FIN.balanceOf(user2);

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("252500000258173303248999")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("50500000258173303210200")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                    });
                });

                context("Compound supported 6 decimal token", async () => {
                    context("should succeed", async () => {
                        it("Deposit DAI & USDC then borrow small amount of USDC", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(10000);
                            // 1.1 Transfer DAI to user2.
                            await erc20DAI.transfer(user2, numOfToken.mul(new BN(2)));
                            // 1.2 Transfer USDC to user1 & user2.
                            await erc20USDC.transfer(user1, numOfToken);
                            await erc20USDC.transfer(user2, numOfToken);
                            await erc20USDC.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await erc20USDC.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, new BN(5000), { from: user1 });
                            await savingAccount.deposit(addressDAI, new BN(5000), { from: user2 });
                            await savingAccount.deposit(addressUSDC, new BN(5000), { from: user2 });
                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));
                            let result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                            const daiTokenIndex = result[0];
                            result = await tokenRegistry.getTokenInfoFromAddress(addressUSDC);
                            const usdcTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8[],bool[])"](
                                [daiTokenIndex, usdcTokenIndex],
                                [true, true],
                                {
                                    from: user2,
                                }
                            );
                            await savingAccount.borrow(addressUSDC, new BN(10), { from: user2 });
                            const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(10)
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());
                            await savingAccount.fastForward(100000);
                            console.log("USDC1");
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });
                            console.log("USDC2");
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser2 = await erc20FIN.balanceOf(user2);

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("252519964064683569574765")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("50500000000000000000000")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                        it("Deposit DAI & USDC then borrow large amount of USDC", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfToken = new BN(100).mul(ONE_DAI);
                            const numOfUSDC = new BN(100).mul(sixPrecision);
                            // 1.1 Transfer DAI to user2.
                            await erc20DAI.transfer(user2, numOfToken.mul(new BN(2)));
                            // 1.2 Transfer USDC to user1 & user2.
                            await erc20USDC.transfer(user1, numOfUSDC);
                            await erc20USDC.transfer(user2, numOfUSDC);
                            await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                from: user1,
                            });
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });
                            await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, numOfUSDC.div(new BN(2)), {
                                from: user1,
                            });
                            await savingAccount.deposit(addressDAI, numOfToken.div(new BN(2)), {
                                from: user2,
                            });
                            await savingAccount.deposit(addressUSDC, numOfUSDC.div(new BN(2)), {
                                from: user2,
                            });
                            // 2. Start borrowing.
                            const user2BalanceBefore = BN(await erc20USDC.balanceOf(user2));
                            const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                            const daiTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user2,
                                }
                            );
                            await savingAccount.borrow(addressUSDC, new BN(10).mul(sixPrecision), {
                                from: user2,
                            });
                            const user2BalanceAfter = BN(await erc20USDC.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                new BN(10).mul(sixPrecision)
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user2,
                            });
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser2 = await erc20FIN.balanceOf(user2);

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("252500000164277350814620")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("50499999495000540349421")
                            );
                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                    });
                });

                context("Compound unsupported 18 decimal Token", async () => {
                    context("Should succeed", async () => {
                        it("Deposit DAI to borrow a small amount of MKR.", async function () {
                            this.timeout(0);
                            let numOfToken = new BN(100000);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);

                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20MKR.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20MKR.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });

                            await savingAccount.deposit(addressDAI, new BN(50000), {
                                from: user1,
                            });

                            await savingAccount.deposit(addressMKR, new BN(50000), {
                                from: user2,
                            });

                            // 2. Start borrowing.
                            const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));
                            const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                            const daiTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user1,
                                }
                            );
                            await savingAccount.borrow(addressMKR, new BN(10), { from: user1 });

                            // 3. Verify the loan amount.
                            const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                            expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                                new BN(10)
                            );

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user1);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser2 = await erc20FIN.balanceOf(user2);

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });

                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));

                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("100000000000000000000000")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("200000000000000000000000")
                            );
                        });

                        it("Deposit DAI to borrow a large amount of MKR.", async function () {
                            this.timeout(0);
                            let numOfToken = new BN(1000).mul(eighteenPrecision);
                            let depositAmountMKR = new BN(10).mul(eighteenPrecision);
                            let depositAmountDAI = new BN(500).mul(eighteenPrecision);
                            let borrowAmt = new BN(10).mul(eightPrecision);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);

                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20MKR.transfer(user2, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });
                            await erc20MKR.approve(savingAccount.address, numOfToken, {
                                from: user2,
                            });

                            await savingAccount.deposit(addressDAI, depositAmountDAI, {
                                from: user1,
                            });

                            await savingAccount.deposit(addressMKR, depositAmountMKR, {
                                from: user2,
                            });

                            // 2. Start borrowing.
                            const user1BalanceBefore = BN(await erc20MKR.balanceOf(user1));
                            const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                            const daiTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                daiTokenIndex,
                                true,
                                {
                                    from: user1,
                                }
                            );
                            await savingAccount.borrow(addressMKR, borrowAmt, { from: user1 });

                            // 3. Verify the loan amount.
                            const user1BalanceAfter = BN(await erc20MKR.balanceOf(user1));
                            expect(user1BalanceAfter.sub(user1BalanceBefore)).to.be.bignumber.equal(
                                borrowAmt
                            );

                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user1);
                            console.log("balFIN1", balFIN1.toString());

                            await savingAccount.fastForward(100000);

                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser2 = await erc20FIN.balanceOf(user2);

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.getClaimAmount.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.getClaimAmount.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });

                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));

                            // Claimed FIN amount should equal `getClaimAmount()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("100000000000000000000000")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("200000000588680000000000")
                            );
                        });
                    });
                });
            });
        });
    });
});
