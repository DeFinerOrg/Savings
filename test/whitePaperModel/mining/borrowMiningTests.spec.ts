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
    let addressUSDT: any;
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
    let erc20USDT: t.MockErc20Instance;
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
    let ONE_USDT: any;
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
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        addressFIN = tokens[11];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
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
        ONE_USDT = sixPrecision;
        ONE_FIN = eighteenPrecision;

        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressDAI, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressUSDC, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressUSDT, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressTUSD, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressMKR, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressWBTC, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressFIN, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(ETH_ADDRESS, ONE_FIN, ONE_FIN);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);

        await savingAccount.setFINAddress(addressFIN);
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
                                from: user2,
                            });

                            await savingAccount.claim({ from: user2 });
                            await savingAccount.claim({ from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("101000050005000500050003")
                            );
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("101000050005000500050003")
                            );
                            // Claimed FIN amount should equal `claim()`
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
                            // expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(1277119)); // 3007210014379.6274
                            // expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(1271274)); // 2997625026684.72
                            expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(7540));
                            // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                            expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(503531871));

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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
                                new BN("116005360207156919771056")
                            );
                            expect(BN(balFINUser1Diff)).to.be.bignumber.equal(
                                new BN("105994640312528259672563")
                            );
                            // Claimed FIN amount should equal `claim()`
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
                            // expect(BN(totalDepositInterest)).to.be.bignumber.equal(
                            //     new BN(1109299704061956)
                            // ); // 3007210014379.6274
                            // expect(BN(totalBorrowInterest)).to.be.bignumber.equal(
                            //     new BN(1105063953654800)
                            // ); // 2997625026684.72
                            expect(BN(totalCompoundInterest)).to.be.bignumber.equal(
                                new BN(5539188762448)
                            );
                            // totalBorrowInterest + totalCompundInterest = totalDepositInterest
                            expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN("482079492322675448"));

                            // FIN balance before claim
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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
                                new BN("101000000209608336746000")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("101000000209608336743601")
                            );
                            // Claimed FIN amount should equal `claim()`
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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
                                new BN("116005357901771998745700")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("105994642517861476621325")
                            );
                            // Claimed FIN amount should equal `claim()`
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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
                                new BN("252500000258168660755999")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("50500000258168660738400")
                            );
                            // Claimed FIN amount should equal `claim()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                        it("Deposit DAI, USDC and borrow large amount of DAI (using claimForToken)", async function () {
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claimForToken.call(
                                addressDAI,
                                {
                                    from: user2,
                                }
                            );

                            const balFINBeforeUser2 = await erc20FIN.balanceOf(user2);
                            const balFINBeforeUser1 = new BN(await erc20FIN.balanceOf(user1));
                            const claimableDAIUser1 = new BN(
                                await savingAccount.claimForToken.call(addressDAI, { from: user1 })
                            );
                            const claimableDAIUser2 = new BN(
                                await savingAccount.claimForToken.call(addressDAI, { from: user2 })
                            );

                            await savingAccount.claimForToken(addressDAI, { from: user2 });
                            await savingAccount.claim({ from: user1 });

                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                balFINBeforeUser2.add(claimableDAIUser2)
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                balFINBeforeUser1.add(claimableDAIUser1)
                            );
                            // Claimed FIN amount should equal `claim()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });

                        it("when borrow and claimForToken happen on different blocks", async function () {
                            this.timeout(0);
                            const ZERO = new BN(0);
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            expect(claimableAmountUser1).to.be.bignumber.greaterThan(ZERO);
                            const claimableAmountUser2 = await savingAccount.claimForToken.call(
                                addressDAI,
                                { from: user2 }
                            );
                            expect(claimableAmountUser2).to.be.bignumber.greaterThan(ZERO);

                            await savingAccount.fastForward(100000);

                            const claimableAmountUser3 = await savingAccount.claimForToken.call(
                                addressDAI,
                                { from: user2 }
                            );
                            expect(claimableAmountUser3).to.be.bignumber.greaterThan(ZERO);
                            expect(claimableAmountUser3).to.be.bignumber.greaterThan(
                                claimableAmountUser2
                            );
                        });
                        it("Deposit DAI then user 1 & 2 borrow large amount of DAI after some blocks (using claimForToken)", async function () {
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
                            const claimableAmountUser1 = await savingAccount.claimForToken.call(
                                addressDAI,
                                {
                                    from: user1,
                                }
                            );
                            const claimableAmountUser2 = await savingAccount.claimForToken.call(
                                addressDAI,
                                {
                                    from: user2,
                                }
                            );

                            await savingAccount.claimForToken(addressDAI, { from: user2 });
                            await savingAccount.claimForToken(addressDAI, { from: user1 });
                            const balFINAfterUser2 = await erc20FIN.balanceOf(user2);
                            const balFINAfterUser1 = await erc20FIN.balanceOf(user1);
                            const balFINUser1Diff = BN(balFINAfterUser1).sub(BN(balFINUser1));
                            const balFINUser2Diff = BN(balFINAfterUser2).sub(BN(balFINUser2));
                            console.log("balFINAfterUser2", balFINAfterUser2.toString());
                            console.log("balFINAfterUser1", balFINAfterUser1.toString());

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("116005357901771998745700")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("105994642517861476621325")
                            );
                            // Claimed FIN amount should equal `claim()`
                            console.log("claimableAmountUser1", claimableAmountUser1.toString());

                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            console.log("11");

                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );
                        });
                        it("Deposit DAI then user 2 borrows large amount of DAI after some blocks (claimForToken)", async function () {
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
                            console.log("------------------ deposit -------------------");

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
                            console.log("------------------ user 2 borrows -------------------");
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            // 4. Claim the minted tokens
                            // fastforward
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                from: user1,
                            });

                            const balFINUser2 = await erc20FIN.balanceOf(user2);
                            console.log("balFINUser2", balFINUser2.toString());
                            const balFINUser1 = await erc20FIN.balanceOf(user1);
                            console.log("balFINUser1", balFINUser1.toString());

                            // FIN balance before claim
                            // User 1
                            const claimDAIUser1 = new BN(
                                await savingAccount.claimForToken.call(addressDAI, {
                                    from: user1,
                                })
                            );
                            console.log("claimDAIUser1", claimDAIUser1.toString());

                            const totalClaimableAmountUser1 = new BN(
                                await savingAccount.claim.call({
                                    from: user1,
                                })
                            );
                            console.log(
                                "totalClaimableAmountUser1",
                                totalClaimableAmountUser1.toString()
                            );

                            // User 2
                            const claimDAIUser2 = new BN(
                                await savingAccount.claimForToken.call(addressDAI, {
                                    from: user2,
                                })
                            );
                            console.log("claimDAIUser2", claimDAIUser2.toString());

                            const totalClaimableAmountUser2 = new BN(
                                await savingAccount.claim.call({
                                    from: user2,
                                })
                            );
                            console.log(
                                "totalClaimableAmountUser2",
                                totalClaimableAmountUser2.toString()
                            );

                            expect(totalClaimableAmountUser2).to.be.bignumber.greaterThan(
                                new BN(0)
                            );
                            expect(totalClaimableAmountUser1).to.be.bignumber.greaterThan(
                                new BN(0)
                            );
                            expect(claimDAIUser1).to.be.bignumber.equal(totalClaimableAmountUser1);
                            expect(claimDAIUser2).to.be.bignumber.equal(totalClaimableAmountUser2);
                        });
                        it("deposit ETH, borrow USDT and claim the mined tokens", async function () {
                            this.timeout(0);
                            await erc20FIN.transfer(
                                savingAccount.address,
                                ONE_FIN.mul(new BN(1000000))
                            );
                            await savingAccount.fastForward(100000);
                            const numOfUSDT = ONE_USDT.mul(new BN(1000));
                            const depositAmountUSDT = new BN(500).mul(ONE_USDT);
                            const depositAmountETH = new BN(1000).mul(eighteenPrecision);
                            const borrowAmount = new BN(10).mul(ONE_USDT);
                            await erc20USDT.transfer(user1, numOfUSDT);

                            // deposit ETH & USDT
                            await erc20USDT.approve(savingAccount.address, numOfUSDT, {
                                from: user2,
                            });
                            await erc20USDT.approve(savingAccount.address, numOfUSDT, {
                                from: user1,
                            });

                            // user 1 deposits USDT
                            await savingAccount.deposit(addressUSDT, depositAmountUSDT, {
                                from: user1,
                            });

                            // user 2 deposits ETH
                            await savingAccount.deposit(ETH_ADDRESS, depositAmountETH, {
                                value: depositAmountETH,
                                from: user2,
                            });
                            // 2. Start borrowing.
                            const result = await tokenRegistry.getTokenInfoFromAddress(ETH_ADDRESS);
                            const ethTokenIndex = result[0];
                            await accountsContract.methods["setCollateral(uint8,bool)"](
                                ethTokenIndex,
                                true,
                                {
                                    from: user2,
                                }
                            );
                            // user 2 borrows USDT
                            const user2BalanceBefore = BN(await erc20USDT.balanceOf(user2));
                            await savingAccount.borrow(addressUSDT, borrowAmount, {
                                from: user2,
                            });
                            // 3. Verify the loan amount.
                            const user2BalanceAfter = BN(await erc20USDT.balanceOf(user2));
                            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                                borrowAmount
                            );
                            // Deposit an extra token to create a new rate check point
                            await savingAccount.fastForward(1000);
                            await savingAccount.deposit(erc20USDT.address, new BN(10), {
                                from: user1,
                            });
                            // 4. Claim the minted tokens
                            // fastforward
                            const balFIN1 = await erc20FIN.balanceOf(user2);
                            console.log("balFIN1", balFIN1.toString());
                            await savingAccount.fastForward(100000);
                            // Deposit an extra tokens to create a new rate check point
                            await savingAccount.deposit(erc20USDT.address, new BN(10), {
                                from: user1,
                            });

                            // FIN balance before claim
                            const claimableUSDTAmountUser2 = new BN(
                                await savingAccount.claimForToken.call(addressUSDT, {
                                    from: user2,
                                })
                            );
                            console.log(
                                "claimableUSDTAmountUser2",
                                claimableUSDTAmountUser2.toString()
                            );

                            const claimableETHAmountUser2 = new BN(
                                await savingAccount.claimForToken.call(ETH_ADDRESS, {
                                    from: user2,
                                })
                            );
                            console.log(
                                "claimableDepositAmountUser2",
                                claimableETHAmountUser2.toString()
                            );

                            const claimableUSDTAmountUser1 = await savingAccount.claimForToken.call(
                                addressUSDT,
                                {
                                    from: user1,
                                }
                            );
                            console.log(
                                "claimableUSDTAmountUser1",
                                claimableUSDTAmountUser1.toString()
                            );

                            let totalClaimUser2 = new BN(
                                await savingAccount.claim.call({ from: user2 })
                            );
                            console.log("totalClaimUser2", totalClaimUser2.toString());

                            let totalClaimUser1 = await savingAccount.claim.call({ from: user1 });
                            console.log("totalClaimUser1", totalClaimUser1.toString());

                            expect(claimableUSDTAmountUser2).to.be.bignumber.greaterThan(new BN(0));
                            expect(claimableETHAmountUser2).to.be.bignumber.greaterThan(new BN(0));
                            expect(
                                claimableUSDTAmountUser2.add(claimableETHAmountUser2)
                            ).to.be.bignumber.equal(totalClaimUser2);
                        });
                        it("zero claim test", async function () {
                            let zeroClaimAmt = new BN(
                                await savingAccount.claim.call({ from: user1 })
                            );
                            expect(zeroClaimAmt).to.be.bignumber.equal(new BN(0));
                        });
                        it("zero claimForToken test", async function () {
                            let zeroClaimAmt = new BN(
                                await savingAccount.claimForToken.call(addressDAI, { from: user1 })
                            );
                            expect(zeroClaimAmt).to.be.bignumber.equal(new BN(0));
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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
                            // Claimed FIN amount should equal `claim()`
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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
                                new BN("252500000164385417652706")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("50499999495108607187507")
                            );
                            // Claimed FIN amount should equal `claim()`
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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

                            // Claimed FIN amount should equal `claim()`
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
                            const claimableAmountUser1 = await savingAccount.claim.call({
                                from: user1,
                            });
                            const claimableAmountUser2 = await savingAccount.claim.call({
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

                            // Claimed FIN amount should equal `claim()`
                            expect(BN(claimableAmountUser1)).to.be.bignumber.equal(
                                BN(balFINUser1Diff)
                            );
                            expect(BN(claimableAmountUser2)).to.be.bignumber.equal(
                                BN(balFINUser2Diff)
                            );

                            expect(BN(balFINAfterUser2)).to.be.bignumber.equal(
                                new BN("99999999999990974130000")
                            );
                            expect(BN(balFINAfterUser1)).to.be.bignumber.equal(
                                new BN("200000000588679999999999")
                            );
                        });
                    });
                });
            });
        });
    });
});
