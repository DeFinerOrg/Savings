import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.withdraw", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let ZERO: any;
    let ONE_YEAR: any;
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function() {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function() {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20WBTC = await ERC20.at(addressWBTC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        ZERO = new BN(0);
        ONE_YEAR = new BN(365).mul(new BN(24).mul(new BN(3600)));
    });

    context("Addtional tests for withdraw", async () => {
        context("Deposit and withdraw with multiple kinds of tokens.", async () => {
            context("Should succeed", async () => {
                it("Deposit DAI and USDC, withdraw partially", async function() {
                    this.timeout(0);
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * User 1 withdraw the half of the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. userUSDCBalanceAfterWithdraw - userUSDCBalanceBeforeWithdraw = halfOfUSDCs
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const halfOfUSDCs = numOfUSDCs.div(new BN(2));
                    const userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    const userUSDCBalanceBeforeWithdraw = await erc20USDC.balanceOf(user1);

                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    await savingAccount.withdraw(erc20USDC.address, halfOfUSDCs, { from: user1 });

                    const savingAccountCDAITokenAfterWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenAfterWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    const userUSDCBalanceAfterWithdraw = await erc20USDC.balanceOf(user1);

                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    expect(
                        BN(userUSDCBalanceAfterWithdraw).sub(BN(userUSDCBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfUSDCs));
                    expect(
                        savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenBeforeDeposit)
                    ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCUSDCTokenAfterDeposit.sub(
                            savingAccountCUSDCTokenBeforeDeposit
                        )
                    ).to.be.bignumber.equal(new BN(numOfUSDCs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenAfterWithdraw)
                    ).to.be.bignumber.equal(
                        new BN(numOfDAIs)
                            .div(new BN(2))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCUSDCTokenAfterDeposit.sub(
                            savingAccountCUSDCTokenAfterWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfUSDCs)
                            .div(new BN(2))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                });
                it("Deposit DAI and USDC, withdraw fully", async function() {
                    this.timeout(0);
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    /*
                     * Step 2
                     * User 1 withdraw all the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = numOfDAIs
                     * 2. userUSDCBalanceAfterWithdraw - userUSDCBalanceBeforeWithdraw = numOfUSDCs
                     */
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceBeforeWithdraw = await erc20USDC.balanceOf(user1);

                    await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });
                    await savingAccount.withdrawAll(erc20USDC.address, { from: user1 });
                    const savingAccountCDAITokenAfterWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenAfterWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceAfterWithdraw = await erc20USDC.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(numOfDAIs);
                    // Verify 2.
                    expect(
                        BN(userUSDCBalanceAfterWithdraw).sub(BN(userUSDCBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(numOfUSDCs));
                    expect(
                        savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenBeforeDeposit)
                    ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCUSDCTokenAfterDeposit.sub(
                            savingAccountCUSDCTokenBeforeDeposit
                        )
                    ).to.be.bignumber.equal(new BN(numOfUSDCs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenAfterWithdraw)
                    ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCUSDCTokenAfterDeposit.sub(
                            savingAccountCUSDCTokenAfterWithdraw
                        )
                    ).to.be.bignumber.equal(new BN(numOfUSDCs).mul(new BN(85)).div(new BN(100)));
                });
            });
            it("Deposit DAI and TUSD, withdraw partially", async function() {
                this.timeout(0);
                const numOfDAIs = new BN(1).mul(eighteenPrecision);
                const numOfTUSDs = new BN(1).mul(eighteenPrecision);
                /*
                 * Step 1
                 * Assign 10^18 DAI and 10^18 TUSD to user 1
                 * Then deposit all these tokens to DeFiner
                 */
                await erc20DAI.transfer(user1, numOfDAIs);
                await erc20TUSD.transfer(user1, numOfTUSDs);
                await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });

                const savingAccountCDAITokenBeforeDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );

                await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });

                const savingAccountCDAITokenAfterDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                /*
                 * Step 2
                 * User 1 withdraw the half of the tokens it deposits to DeFiner
                 * To verify:
                 * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                 * 2. userTUSDBalanceAfterWithdraw - userTUSDBalanceBeforeWithdraw = halfOfTUSDs
                 */
                const halfOfDAIs = numOfDAIs.div(new BN(2));
                const halfOfTUSDs = numOfTUSDs.div(new BN(2));

                let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);

                await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                await savingAccount.withdraw(erc20TUSD.address, halfOfTUSDs, { from: user1 });

                const savingAccountCDAITokenAfterWithdraw = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );

                let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                let userTUSDBalanceAfterWithdraw = await erc20TUSD.balanceOf(user1);
                // Verify 1.
                expect(
                    BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                ).to.be.bignumber.equal(BN(halfOfDAIs));
                // Verify 2.
                expect(
                    BN(userTUSDBalanceAfterWithdraw).sub(BN(userTUSDBalanceBeforeWithdraw))
                ).to.be.bignumber.equal(BN(halfOfTUSDs));

                expect(
                    savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenBeforeDeposit)
                ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
                expect(
                    savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenAfterWithdraw)
                ).to.be.bignumber.equal(
                    new BN(numOfDAIs)
                        .div(new BN(2))
                        .mul(new BN(85))
                        .div(new BN(100))
                );
            });
            it("Deposit DAI and TUSD, withdraw fully", async function() {
                this.timeout(0);
                const numOfDAIs = new BN(1).mul(eighteenPrecision);
                const numOfTUSDs = new BN(1).mul(eighteenPrecision);
                /*
                 * Step 1
                 * Assign 10^18 DAI and 10^18 TUSD to user 1
                 * Then deposit all these tokens to DeFiner
                 */
                await erc20DAI.transfer(user1, numOfDAIs);
                await erc20TUSD.transfer(user1, numOfTUSDs);
                await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });

                const savingAccountCDAITokenBeforeDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );

                await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });

                const savingAccountCDAITokenAfterDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                /*
                 * Step 2
                 * User 1 withdraw the half of the tokens it deposits to DeFiner
                 * To verify:
                 * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = numOfDAIs
                 * 2. userTUSDBalanceAfterWithdraw - userTUSDBalanceBeforeWithdraw = numOfTUSDs
                 */
                let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);

                await savingAccount.withdrawAll(erc20DAI.address, { from: user1 });
                await savingAccount.withdrawAll(erc20TUSD.address, { from: user1 });

                const savingAccountCDAITokenAfterWithdraw = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );

                let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                let userTUSDBalanceAfterWithdraw = await erc20TUSD.balanceOf(user1);
                // Verify 1.
                expect(
                    BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                ).to.be.bignumber.equal(BN(numOfDAIs));
                // Verify 2.
                expect(
                    BN(userTUSDBalanceAfterWithdraw).sub(BN(userTUSDBalanceBeforeWithdraw))
                ).to.be.bignumber.equal(BN(numOfTUSDs));
                expect(
                    savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenBeforeDeposit)
                ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
                expect(
                    savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenAfterWithdraw)
                ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
            });
            context("Should fail", async () => {
                it("Deposit DAI and USDC, withdraw more USDC tokens than it deposits", async function() {
                    this.timeout(0);
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the DAI tokens it deposits to DeFiner and doubel the tokens of USDC
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. withdraw double USDC tokens will fail
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const doubleOfUSDCs = numOfUSDCs.mul(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    await expectRevert(
                        savingAccount.withdraw(erc20USDC.address, doubleOfUSDCs, { from: user1 }),
                        "Insufficient balance."
                    );
                });
                it("Deposit DAI and TUSD, withdraw more USDC tokens than it deposits", async function() {
                    this.timeout(0);
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    const numOfTUSDs = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20TUSD.transfer(user1, numOfTUSDs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSDs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSDs, { from: user1 });
                    /*
                     * Step 2
                     * User 1 withdraw the half of the DAI tokens it deposits to DeFiner and double the TUSD tokens
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. withdraw double TUSD tokens will fail
                     */
                    const halfOfDAIs = numOfDAIs.div(new BN(2));
                    const doubleOfTUSDs = numOfTUSDs.mul(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAIs, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAIs));
                    // Verify 2.
                    await expectRevert(
                        savingAccount.withdraw(erc20TUSD.address, doubleOfTUSDs, { from: user1 }),
                        "Insufficient balance."
                    );
                });
            });
        });
        context("Withdraw when there is still borrow outstandings", async function() {
            it("Deposit DAI, borrows USDC and wants to withdraw all", async function() {
                this.timeout(0);
                /*
                 * Step 1
                 * Account 1 deposits 2 DAI, Account 2 deposits 1 USDC
                 */
                const numOfDAI = eighteenPrecision.mul(new BN(2));
                const numOfUSDC = sixPrecision;
                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                /*
                 * Step 2
                 * Account 0 borrows 10 tokens from DeFiner
                 * Then tries to withdraw all the tokens
                 * Should fail, beacuse user has to repay all the outstandings before withdrawing.
                 */
                const borrows = new BN(10);
                await savingAccount.borrow(addressUSDC, borrows, { from: user1 });
                await expectRevert(
                    savingAccount.withdrawAll(erc20DAI.address, { from: user1 }),
                    "Insufficient collateral when withdraw."
                );
            });
            it("Deposit DAI, borrows USDC and wants to withdraw", async function() {
                this.timeout(0);
                /*
                 * Step 1
                 * Account 1 deposits 2 DAI, Account 2 deposits 1 USDC
                 */
                const numOfDAI = eighteenPrecision.mul(new BN(2));
                const numOfUSDC = sixPrecision;
                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                const savingAccountCDAITokenBeforeDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const savingAccountCUSDCTokenBeforeDeposit = BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                const savingAccountCDAITokenAfterDeposit = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const savingAccountCUSDCTokenAfterDeposit = BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );
                /*
                 * Step 2
                 * Account 0 borrows 10 tokens from DeFiner
                 * Then tries to withdraw all the tokens
                 * Should fail, beacuse user has to repay all the outstandings before withdrawing.
                 */
                const userTotalBalanceBefore = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );
                const borrows = new BN(10);
                await savingAccount.borrow(addressUSDC, borrows, { from: user1 });

                const savingAccountCUSDCTokenAfterBorrow = BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );
                const UserTokenLeftBefore = new BN(await erc20DAI.balanceOf(user1));

                await savingAccount.withdraw(erc20DAI.address, new BN(100), { from: user1 });

                const savingAccountCDAITokenAfterWithdraw = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                // const TokenLeft = new BN(await erc20DAI.balanceOf(savingAccount.address));
                const UserTokenLeft = new BN(await erc20DAI.balanceOf(user1));

                // const CTokenLeft = new BN(await cDAI.balanceOfUnderlying.call(savingAccount.address));
                const userTotalBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );

                // expect(TokenLeft).to.be.bignumber.equal(numOfDAI.mul(new BN(15)).div(new BN(100)).sub(new BN(100)));
                // expect(CTokenLeft).to.be.bignumber.equal(numOfDAI.mul(new BN(85)).div(new BN(100)));
                expect(BN(UserTokenLeft).sub(BN(UserTokenLeftBefore))).to.be.bignumber.equal(
                    new BN(100)
                );
                // Verify 2.
                expect(BN(userTotalBalance).sub(BN(userTotalBalanceBefore))).to.be.bignumber.equal(
                    new BN(10)
                );
                expect(
                    savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenBeforeDeposit)
                ).to.be.bignumber.equal(new BN(numOfDAI).mul(new BN(85)).div(new BN(100)));
                expect(
                    savingAccountCUSDCTokenAfterDeposit.sub(savingAccountCUSDCTokenBeforeDeposit)
                ).to.be.bignumber.equal(new BN(numOfUSDC).mul(new BN(85)).div(new BN(100)));
                expect(
                    savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenAfterWithdraw)
                ).to.be.bignumber.equal(new BN(0));
                expect(
                    savingAccountCUSDCTokenAfterDeposit.sub(savingAccountCUSDCTokenAfterBorrow)
                ).to.be.bignumber.equal(new BN(0));
            });
        });
        context("Withdraw partially multiple times", async () => {
            context("Should succeed", async () => {
                it("Use DAI which 18 is decimals, deposit some tokens and withdraw all of them in four times", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^18 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfDAIs = numOfDAIs.div(new BN(4));
                    const userDAIBalanceBeforeFirstWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const savingAccountCDAITokenAfterFirstWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const userDAIBalanceBeforeSecondWithdraw = await erc20DAI.balanceOf(user1);

                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeThirdWithdraw = await erc20DAI.balanceOf(user1);
                    const savingAccountCDAITokenAfterSecondWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeForthWithdraw = await erc20DAI.balanceOf(user1);
                    const savingAccountCDAITokenAfterThirdWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceAfterForthWithdraw = await erc20DAI.balanceOf(user1);
                    const savingAccountCDAITokenAfterForthWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const userTotalBalance = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeSecondWithdraw).sub(
                            userDAIBalanceBeforeFirstWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfDAIs);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeThirdWithdraw).sub(
                            userDAIBalanceBeforeSecondWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfDAIs);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeForthWithdraw).sub(userDAIBalanceBeforeThirdWithdraw)
                    ).to.be.bignumber.equal(quaterOfDAIs);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterForthWithdraw).sub(userDAIBalanceBeforeForthWithdraw)
                    ).to.be.bignumber.equal(quaterOfDAIs);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                    expect(
                        savingAccountCDAITokenAfterDeposit.sub(savingAccountCDAITokenBeforeDeposit)
                    ).to.be.bignumber.equal(new BN(numOfDAIs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCDAITokenAfterDeposit.sub(
                            savingAccountCDAITokenAfterFirstWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfDAIs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCDAITokenAfterFirstWithdraw.sub(
                            savingAccountCDAITokenAfterSecondWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfDAIs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCDAITokenAfterSecondWithdraw.sub(
                            savingAccountCDAITokenAfterThirdWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfDAIs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                });
                it("Use USDC which 6 is decimals, deposit some tokens and withdraw all of them in four times", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^6 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfUSDCs = new BN(1).mul(sixPrecision);
                    await erc20USDC.transfer(user1, numOfUSDCs);
                    await erc20USDC.approve(savingAccount.address, numOfUSDCs, { from: user1 });

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    await savingAccount.deposit(addressUSDC, numOfUSDCs, { from: user1 });
                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^6 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfUSDCs = numOfUSDCs.div(new BN(4));
                    const userUSDCBalanceBeforeFirstWithdraw = await erc20USDC.balanceOf(user1);

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceBeforeSecondWithdraw = await erc20USDC.balanceOf(user1);
                    const savingAccountCUSDCTokenAfterFirstWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceBeforeThirdWithdraw = await erc20USDC.balanceOf(user1);
                    const savingAccountCUSDCTokenAfterSecondWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceBeforeForthWithdraw = await erc20USDC.balanceOf(user1);
                    const savingAccountCUSDCTokenAfterThirdWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDCs, { from: user1 });
                    const userUSDCBalanceAfterForthWithdraw = await erc20USDC.balanceOf(user1);
                    const savingAccountCUSDCTokenAfterForthWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const userTotalBalance = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceBeforeSecondWithdraw).sub(
                            userUSDCBalanceBeforeFirstWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDCs);
                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceBeforeThirdWithdraw).sub(
                            userUSDCBalanceBeforeSecondWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDCs);
                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceBeforeForthWithdraw).sub(
                            userUSDCBalanceBeforeThirdWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDCs);
                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceAfterForthWithdraw).sub(
                            userUSDCBalanceBeforeForthWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDCs);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                    expect(
                        savingAccountCUSDCTokenAfterDeposit.sub(
                            savingAccountCUSDCTokenBeforeDeposit
                        )
                    ).to.be.bignumber.equal(new BN(numOfUSDCs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCUSDCTokenAfterDeposit.sub(
                            savingAccountCUSDCTokenAfterFirstWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfUSDCs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCUSDCTokenAfterFirstWithdraw.sub(
                            savingAccountCUSDCTokenAfterSecondWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfUSDCs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCUSDCTokenAfterSecondWithdraw.sub(
                            savingAccountCUSDCTokenAfterThirdWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfUSDCs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                });
                it("Use WBTC which 8 is decimals, deposit some tokens and withdraw all of them in four times", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^6 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfWBTCs = new BN(1).mul(eightPrecision);
                    await erc20WBTC.transfer(user1, numOfWBTCs);
                    await erc20WBTC.approve(savingAccount.address, numOfWBTCs, { from: user1 });

                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    await savingAccount.deposit(addressWBTC, numOfWBTCs, { from: user1 });
                    const savingAccountCWBTCTokenAfterDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfWBTCs = numOfWBTCs.div(new BN(4));
                    const userWBTCBalanceBeforeFirstWithdraw = await erc20WBTC.balanceOf(user1);
                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceBeforeSecondWithdraw = await erc20WBTC.balanceOf(user1);
                    const savingAccountCWBTCTokenAfterFirstWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceBeforeThirdWithdraw = await erc20WBTC.balanceOf(user1);
                    const savingAccountCWBTCTokenAfterSecondWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceBeforeForthWithdraw = await erc20WBTC.balanceOf(user1);
                    const savingAccountCWBTCTokenAfterThirdWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTCs, { from: user1 });
                    const userWBTCBalanceAfterForthWithdraw = await erc20WBTC.balanceOf(user1);
                    const savingAccountCWBTCTokenAfterForthWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const userTotalBalance = await accountsContract.getDepositBalanceCurrent(
                        addressWBTC,
                        user1
                    );
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceBeforeSecondWithdraw).sub(
                            userWBTCBalanceBeforeFirstWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTCs);
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceBeforeThirdWithdraw).sub(
                            userWBTCBalanceBeforeSecondWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTCs);
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceBeforeForthWithdraw).sub(
                            userWBTCBalanceBeforeThirdWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTCs);
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceAfterForthWithdraw).sub(
                            userWBTCBalanceBeforeForthWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTCs);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                    expect(
                        savingAccountCWBTCTokenAfterDeposit.sub(
                            savingAccountCWBTCTokenBeforeDeposit
                        )
                    ).to.be.bignumber.equal(new BN(numOfWBTCs).mul(new BN(85)).div(new BN(100)));
                    expect(
                        savingAccountCWBTCTokenAfterDeposit.sub(
                            savingAccountCWBTCTokenAfterFirstWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfWBTCs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCWBTCTokenAfterFirstWithdraw.sub(
                            savingAccountCWBTCTokenAfterSecondWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfWBTCs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                    expect(
                        savingAccountCWBTCTokenAfterSecondWithdraw.sub(
                            savingAccountCWBTCTokenAfterThirdWithdraw
                        )
                    ).to.be.bignumber.equal(
                        new BN(numOfWBTCs)
                            .div(new BN(4))
                            .mul(new BN(85))
                            .div(new BN(100))
                    );
                });
            });
            context("Should fail", async () => {
                it("Use DAI, deposit 10^18 tokens, withdraw 1/4 of them the first time, then withdraw 10^18 tokens", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^18 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfDAIs = new BN(1).mul(eighteenPrecision);
                    await erc20DAI.transfer(user1, numOfDAIs);
                    await erc20DAI.approve(savingAccount.address, numOfDAIs, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAIs, { from: user1 });
                    /*
                     * Step 2
                     * Withdraw 1/4 of 10^18 tokens, then withdraw 10^18 tokens
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after the first withdraw
                     * 2. The second withdraw should fail
                     */
                    const quaterOfDAIs = numOfDAIs.div(new BN(4));
                    const userDAIBalanceBeforeFirstWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAIs, { from: user1 });
                    const userDAIBalanceBeforeSecondWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeSecondWithdraw).sub(
                            userDAIBalanceBeforeFirstWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfDAIs);
                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, numOfDAIs, { from: user1 }),
                        "Insufficient balance."
                    );
                });
            });
        });
    });
});
