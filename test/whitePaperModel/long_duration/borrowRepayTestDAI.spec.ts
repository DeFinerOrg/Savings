import { GlobalConfigContract } from './../../../types/truffle-contracts/GlobalConfig.d';
import { BankContract, BankInstance } from './../../../types/truffle-contracts/Bank.d';
import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { saveContract } from "../../../compound-protocol/scenario/src/Networks";
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.borrowRepayTestDAI", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let bankContract: t.BankInstance;
    let tokenRegistry: t.TokenRegistryInstance;

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
    let cWBTC_addr: any;

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
    let BLOCKS_PER_YEAR: any;

    before(function () {
        this.timeout(0);
        // Things to initialize before all test
        testEngine = new TestEngine();
        // testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        bankContract = await testEngine.bank;
        tokenRegistry = await testEngine.tokenInfoRegistry;
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
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cTUSD_addr = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        cMKR_addr = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);

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

        BLOCKS_PER_YEAR = new BN(2102400);
        await savingAccount.fastForward(1);
    });

    context("borrow()", async () => {
        context("with Token", async () => {
            context("should succeed", async () => {
                // modified
                it("RateTest5: Deposit DAI then borrow DAI, repay the loan amount and then winthdraw all", async function () {
                    this.timeout(0);
                    // 1.1 Transfer DAI to user1 & user2.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.transfer(user2, TWO_DAIS);
                    await savingAccount.fastForward(1000);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user2 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user2 }); // 1000000000000000000

                    // 2. Start borrowing.
                    const user2BalanceBefore = BN(await erc20DAI.balanceOf(user2));
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        { from: user2 }
                    );
                    await savingAccount.borrow(addressDAI, HALF_DAI, { from: user2 }); // 500000000000000000
                    const user2BalanceAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.bignumber.equal(
                        HALF_DAI
                    );
                    const compoundBeforeFastForward = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(await cDAI.balanceOf(savingAccount.address));

                    let capUtilRatioDAI1 = BN(await bankContract.getCapitalUtilizationRatio(addressDAI));
                    console.log("capUtilRatioDAI1",capUtilRatioDAI1.toString());

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    const user2BorrowPrincipalBefore = await savingAccount.getBorrowPrincipal(
                        addressDAI,
                        { from: user2 }
                    );
                    const user2BorrowInterestBefore = await savingAccount.getBorrowInterest(
                        addressDAI,
                        {
                            from: user2,
                        }
                    );
                    console.log(
                        "user2BorrowPrincipalBefore",
                        user2BorrowPrincipalBefore.toString()
                    );
                    console.log("user2BorrowInterestBefore", user2BorrowInterestBefore.toString()); // borrowInterest == 0

                    let capUtilRatioDAIBeforeRepay = BN(await bankContract.getCapitalUtilizationRatio(addressDAI));
                    console.log("capUtilRatioDAIBeforeRepay",capUtilRatioDAIBeforeRepay.toString());
                    // Repay DAI and withdraw all
                    await savingAccount.repay(addressDAI, ONE_DAI, { from: user2 });

                    await savingAccount.withdrawAll(erc20DAI.address, { from: user2 });

                    let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(user2);
                    console.log(
                        "userBalanceAfterWithdrawDAI",
                        userBalanceAfterWithdrawDAI.toString()
                    );

                    // 3.1 Verify the deposit/loan/reservation/compound ledger of the pool
                    const tokenState = await savingAccount.getTokenState(addressDAI, {
                        from: user2,
                    });

                    // Verify that reservation equals to the token in pool's address
                    const reservation = BN(await erc20DAI.balanceOf(savingAccount.address));
                    expect(tokenState[2]).to.be.bignumber.equal(reservation);

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
                    expect(
                        BN(tokenState[0]).sub(tokenState[1]).sub(tokenState[2])
                    ).to.be.bignumber.equal(compoundAfterFastForward);

                    // 3.2 Vefity rate
                    const user1DepositPrincipal = await savingAccount.getDepositPrincipal(
                        addressDAI,
                        { from: user1 }
                    );
                    let lastDepBlock = BN(await accountsContract.getLastDepositBlock(user1,addressDAI));
                    let depositRate = BN(await bankContract.depositeRateIndex(addressDAI,lastDepBlock));
                    console.log("lastDepBlock",lastDepBlock.toString());
                    console.log("depositRate",depositRate.toString());
                    
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
                    expect(user1DepositPrincipal).to.be.bignumber.equal(TWO_DAIS);
                    expect(user2DepositPrincipal).to.be.bignumber.equal(new BN(0));
                    expect(user1BorrowPrincipal).to.be.bignumber.equal(new BN(0));
                    expect(user2BorrowPrincipal).to.be.bignumber.equal(new BN(0));

                    // Verify the interest
                    // First do a sanity check on (Deposit interest = Borrow interest + Compound interest)
                    const totalDepositInterest = BN(user1DepositInterest).add(user2DepositInterest); // 96633026800000 + 0
                    const totalBorrowInterest = BN(user1BorrowInterest).add(user2BorrowInterest);
                    const totalCompoundInterest =
                        BN(compoundAfterFastForward).sub(compoundPrincipal);                    
                    // console.log("totalDepositInterestBefore", totalDepositInterestBefore.toString());
                    // Second, verify the interest rate calculation. Need to compare these value to
                    // the rate simulator.
                    // expect(BN(totalDepositInterest)).to.be.bignumber.equal(new BN(1503650900000)); // 3007210014379.6274/2 || 1503559214300
                    expect(BN(totalBorrowInterest)).to.be.bignumber.equal(new BN(0));
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(9585494927));
                    expect(BN(totalBorrowInterest).add(totalCompoundInterest)).to.be.bignumber.equal(new BN(9585494927));
                });
            });
        });
    });
});
