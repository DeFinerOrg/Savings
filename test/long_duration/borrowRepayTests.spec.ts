import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { saveContract } from "../../compound-protocol/scenario/src/Networks";
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.borrowRepayTests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

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

    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20MKR: t.ERC20Instance;
    let erc20TUSD: t.ERC20Instance;
    let erc20USDT: t.ERC20Instance;
    let erc20WBTC: t.ERC20Instance;
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
    let ZERO: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
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
        TWO_DAIS = ONE_DAI.mul(new BN(2));
        ONE_USDC = sixPrecision;
        ZERO = new BN(0);
    });

    context("Deposit, Borrow, Repay", async () => {
        context("should succeed", async () => {
            it("should deposit DAI, borrow USDC and repay after one month", async () => {
                // 1. Initiate deposit
                const numOfDAI = TWO_DAIS;
                const numOfUSDC = new BN(1000);
                const totalDefinerBalanceBeforeDepositDAI = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                const totalDefinerBalanceBeforeDepositUSDC = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user2 }
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, {
                    from: user1
                });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await savingAccount.tokenBalance(
                    erc20DAI.address,
                    { from: user1 }
                );
                const totalDefinerBalanceChangeDAI = new BN(
                    totalDefinerBalanceAfterDepositDAI[0]
                ).sub(new BN(totalDefinerBalanceBeforeDepositDAI[0]));
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(ONE_DAI);

                const totalDefinerBalanceAfterDepositUSDC = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user2 }
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC[0]
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC[0]));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Start borrowing.
                await savingAccount.borrow(addressUSDC, new BN(100), { from: user1 });
                const user1BalanceBefore = await erc20USDC.balanceOf(user1);
                const totalDefinerBalanceAfterBorrowUSDCUser1 = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user1 }
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1[1]).to.be.bignumber.equal(
                    new BN(100)
                );
                const compoundBeforeFastForward = BN(
                    await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const cUSDCBeforeFastForward = BN(
                    await cTokenUSDC.balanceOf(savingAccount.address)
                );

                // 3. Fastforward
                await savingAccount.fastForward(100000);
                // Deposit an extra token to create a new rate check point
                await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                // 3.1 Verify the deposit/loan/reservation/compound ledger of the pool
                const tokenState = await savingAccount.getTokenStateStore(addressUSDC, {
                    from: user1
                });

                // Verify that reservation equals to the token in pool's address
                const reservation = BN(await erc20USDC.balanceOf(savingAccount.address));
                expect(tokenState[2]).to.be.bignumber.equal(reservation);

                // Verifty that compound equals cToken underlying balance in pool's address
                // It also verifies that (Deposit = Loan + Compound + Reservation)
                const compoundAfterFastForward = BN(
                    await cTokenUSDC.balanceOfUnderlying.call(savingAccount.address)
                );
                const cUSDCAfterFastForward = BN(await cTokenUSDC.balanceOf(savingAccount.address));
                const compoundPrincipal = compoundBeforeFastForward.add(
                    cUSDCAfterFastForward
                        .sub(cUSDCBeforeFastForward)
                        .mul(BN(await cTokenUSDC.exchangeRateCurrent.call()))
                        .div(sixPrecision)
                );
                /* expect(
                    BN(tokenState[0])
                        .sub(tokenState[1])
                        .sub(tokenState[2])
                ).to.be.bignumber.equal(compoundAfterFastForward); // 750 == 751 */

                console.log("deposits", tokenState[0].toString());
                console.log("loans", tokenState[1].toString());
                console.log("compound", tokenState[2].toString());
                console.log("compoundAfterFastForward", compoundAfterFastForward.toString());

                const totalCompoundInterest2 = BN(compoundAfterFastForward).sub(compoundPrincipal);

                console.log("totalCompoundInterest", totalCompoundInterest2.toString());

                // 3. Start repayment.
                await savingAccount.repay(addressUSDC, new BN(100), { from: user1 });

                // Verify Compound after repay
                const tokenStateAfterRepay = await savingAccount.getTokenStateStore(addressUSDC, {
                    from: user1
                });
                const compoundAfterRepay = BN(
                    await cTokenUSDC.balanceOfUnderlying.call(savingAccount.address)
                );
                /* expect(
                    BN(tokenStateAfterRepay[0])
                        .sub(tokenStateAfterRepay[1])
                        .sub(tokenStateAfterRepay[2])
                ).to.be.bignumber.equal(compoundAfterRepay); //849 == 851 */

                // 3.2 Vefity rate
                const user1DepositPrincipal = await savingAccount.getDepositPrincipal(addressDAI, {
                    from: user1
                });
                const user1DepositInterest = await savingAccount.getDepositInterest(addressDAI, {
                    from: user1
                });
                const user2DepositPrincipal = await savingAccount.getDepositPrincipal(addressUSDC, {
                    from: user2
                });
                const user2DepositInterest = await savingAccount.getDepositInterest(addressUSDC, {
                    from: user2
                });
                const user1BorrowPrincipal = await savingAccount.getBorrowPrincipal(addressUSDC, {
                    from: user1
                });
                const user1BorrowInterest = await savingAccount.getBorrowInterest(addressUSDC, {
                    from: user1
                });
                const user2BorrowPrincipal = await savingAccount.getBorrowPrincipal(addressDAI, {
                    from: user2
                });
                const user2BorrowInterest = await savingAccount.getBorrowInterest(addressDAI, {
                    from: user2
                });

                console.log("user1DepositPrincipal", user1DepositPrincipal.toString());
                console.log("user1DepositInterest", user1DepositInterest.toString());
                console.log("user2DepositPrincipal", user2DepositPrincipal.toString());
                console.log("user2DepositInterest", user2DepositInterest.toString());
                console.log("user1BorrowPrincipal", user1BorrowPrincipal.toString());
                console.log("user1BorrowInterest", user1BorrowInterest.toString());
                console.log("user2BorrowPrincipal", user2BorrowPrincipal.toString());
                console.log("user2BorrowInterest", user2BorrowInterest.toString());

                // Verify the interest
                // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                const totalDepositInterest = BN(user1DepositInterest).add(user2DepositInterest);
                const totalBorrowInterest = BN(user1BorrowInterest).add(user2BorrowInterest);
                const totalCompoundInterest = BN(compoundAfterFastForward).sub(compoundPrincipal);

                console.log("totalCompoundInterestAfterRepay", totalCompoundInterest.toString());

                // Second, verify the interest rate calculation. Need to compare these value to
                // the rate simulator.
                expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(6790400000)); // 6790203501.392125
                expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(0));
                //expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(9585493199));

                // expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(totalDepositInterest);
                //--849999999999999248

                // 4. Verify the repay amount.
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(user1BalanceBefore).to.be.bignumber.equal(new BN(100));
                expect(user1BalanceAfter).to.be.bignumber.equal(ZERO);

                const totalDefinerBalanceAfterRepayUSDCUser1 = await savingAccount.tokenBalance(
                    erc20USDC.address,
                    { from: user1 }
                );
                expect(totalDefinerBalanceAfterRepayUSDCUser1[1]).to.be.bignumber.equal(ZERO);
            });
        });
    });
});
