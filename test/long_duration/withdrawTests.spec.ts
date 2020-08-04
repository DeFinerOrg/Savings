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

contract("SavingAccount.borrow", async (accounts) => {
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

    context("borrow()", async () => {
        context("with Token", async () => {
            context("should succeed", async () => {
                it("when tokens are withdrawn with interest", async () => {
                    // 1.1 Transfer DAI to user1.
                    await erc20DAI.transfer(user1, TWO_DAIS);
                    await erc20DAI.approve(savingAccount.address, TWO_DAIS, { from: user1 });

                    let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    const totalDefinerBalanceBeforeDeposit = await savingAccount.tokenBalance(
                        erc20DAI.address,
                        { from: user1 }
                    );

                    // deposit tokens
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await savingAccount.tokenBalance(
                        erc20DAI.address,
                        { from: user1 }
                    );
                    const totalDefinerBalanceChange = new BN(
                        totalDefinerBalanceAfterDeposit[0]
                    ).sub(new BN(totalDefinerBalanceBeforeDeposit[0]));
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(ONE_DAI);

                    const compoundBeforeFastForward = BN(
                        await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const cDAIBeforeFastForward = BN(
                        await cTokenDAI.balanceOf(savingAccount.address)
                    );

                    // 3. Fastforward
                    await savingAccount.fastForward(100000);
                    const balCTokenContract2 = await cTokenDAI.balanceOfUnderlying.call(
                        savingAccount.address,
                        { from: user1 }
                    );

                    // Deposit an extra token to create a new rate check point
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    // 3.1 Verify the deposit/loan/reservation/compound ledger of the pool
                    const tokenState = await savingAccount.getTokenStateStore(addressDAI, {
                        from: user2
                    });

                    // Verify that reservation equals to the token in pool's address
                    const reservation = BN(await erc20DAI.balanceOf(savingAccount.address));
                    expect(tokenState[2]).to.be.bignumber.equal(reservation);

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
                    expect(
                        BN(tokenState[0])
                            .sub(tokenState[1])
                            .sub(tokenState[2])
                    ).to.be.bignumber.equal(compoundAfterFastForward);

                    //Withdrawing DAI
                    await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });

                    let userBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let accountBalanceAfterWithdraw = await erc20DAI.balanceOf(
                        savingAccount.address
                    );
                    expect(userBalanceAfterWithdraw).to.be.bignumber.equal(
                        new BN("2000000006790400000") //24239
                    );
                    //expect(accountBalanceAfterWithdraw).to.be.bignumber.equal(ZERO);

                    // 3.2 Vefity rate
                    const user1DepositPrincipal = await savingAccount.getDepositPrincipal(
                        addressDAI,
                        { from: user1 }
                    );
                    const user1DepositInterest = await savingAccount.getDepositInterest(
                        addressDAI,
                        { from: user1 }
                    );
                    const user1BorrowPrincipal = await savingAccount.getBorrowPrincipal(
                        addressDAI,
                        { from: user1 }
                    );
                    const user1BorrowInterest = await savingAccount.getBorrowInterest(addressDAI, {
                        from: user1
                    });

                    // Verify the pricipal
                    //expect(user1DepositInterest).to.be.bignumber.equal(TWO_DAIS); // 0???
                    expect(user1BorrowInterest).to.be.bignumber.equal(new BN(0));

                    const totalCompoundInterest = BN(compoundAfterFastForward).sub(
                        compoundPrincipal
                    );
                    expect(BN(totalCompoundInterest)).to.be.bignumber.equal(new BN(6790561600));
                });
            });
        });
    });
});
