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

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.borrowWithdrawTests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance

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
    let ZERO: any;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async function () {
        this.timeout(0)
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        bank = await testEngine.bank;
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

    context("Deposit, Borrow and Withdraw", async () => {
        context("should succeed", async () => {
            it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw after 1 week", async function () {
                this.timeout(0)
                const numOfDAI = TWO_DAIS;
                const numOfUSDC = ONE_USDC;
                const borrowAmount = numOfUSDC.div(new BN(10));
                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceBeforeDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                const balSavingAccountDAIAfterDeposit = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                // Validate the total balance on DeFiner after deposit
                const totalDefinerBalanceAfterDepositDAI = await accountsContract.getDepositBalanceCurrent(
                    erc20DAI.address,
                    user1
                );
                const totalDefinerBalanceChangeDAI = new BN(totalDefinerBalanceAfterDepositDAI).sub(
                    new BN(totalDefinerBalanceBeforeDepositDAI)
                );
                expect(totalDefinerBalanceChangeDAI).to.be.bignumber.equal(ONE_DAI);

                const totalDefinerBalanceAfterDepositUSDC = await accountsContract.getDepositBalanceCurrent(
                    erc20USDC.address,
                    user2
                );
                const totalDefinerBalanceChangeUSDC = new BN(
                    totalDefinerBalanceAfterDepositUSDC
                ).sub(new BN(totalDefinerBalanceBeforeDepositUSDC));
                expect(totalDefinerBalanceChangeUSDC).to.be.bignumber.equal(numOfUSDC);

                // 2. Borrow USDC
                await savingAccount.borrow(addressUSDC, borrowAmount, { from: user1 });
                const balSavingAccountDAIAfterBorrow = await erc20DAI.balanceOf(
                    savingAccount.address
                );

                // Amount that is locked as collateral
                const collateralLocked = borrowAmount
                    .mul(eighteenPrecision)
                    .mul(await tokenInfoRegistry.priceFromIndex(1))
                    .mul(new BN(100))
                    .div(new BN(60))
                    .div(await tokenInfoRegistry.priceFromIndex(0))
                    .div(sixPrecision);

                // 3. Verify the loan amount
                const user1BalanceAfterBorrow = await erc20USDC.balanceOf(user1);
                expect(user1BalanceAfterBorrow).to.be.bignumber.equal(borrowAmount);

                const totalDefinerBalanceAfterBorrowUSDCUser1 = await accountsContract.getBorrowBalanceCurrent(
                    erc20USDC.address,
                    user1
                );
                expect(totalDefinerBalanceAfterBorrowUSDCUser1).to.be.bignumber.equal(borrowAmount);

                // Total remaining DAI after borrow
                const remainingDAI = ONE_DAI.sub(new BN(collateralLocked));

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
                const tokenState = await savingAccount.getTokenState(addressUSDC, {
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
                ).to.be.bignumber.equal(compoundAfterFastForward); // 750000 == 750001  */

                // 4. Withdraw remaining DAI
                //await savingAccount.withdrawAllToken(erc20DAI.address, { from: user1 });
                await savingAccount.withdraw(erc20DAI.address, remainingDAI, { from: user1 });
                const balSavingAccountDAI = await erc20DAI.balanceOf(savingAccount.address);
                /* expect(balSavingAccountDAI).to.be.bignumber.equal(
                    collateralLocked.mul(new BN(15)).div(new BN(100))
                ); */

                const ownerDAIBefore = await erc20DAI.balanceOf(owner);
                const ownerDepositDAIBefore = await accountsContract.getDepositBalanceCurrent(erc20DAI.address, owner);
                console.log("ownerDAIBefore: " + ownerDAIBefore.toString());
                console.log("ownerDepositDAIBefore: " + ownerDepositDAIBefore.toString());

                await savingAccount.withdrawAll(erc20DAI.address);
                const ownerDAIAfter = await erc20DAI.balanceOf(owner);
                const ownerDepositDAIAfter = await accountsContract.getDepositBalanceCurrent(erc20DAI.address, owner);
                console.log("ownerDAIAfter: " + ownerDAIAfter.toString());
                console.log("ownerDepositDAIAfter: " + ownerDepositDAIAfter.toString());

            });
        });
    });
});
