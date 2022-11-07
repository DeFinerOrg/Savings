import { MockChainLinkAggregatorInstance } from "../../../types/truffle-contracts/index.d";
import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.repay", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;
    let tokenRegistry: t.TokenRegistryInstance;

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
    const numOfDAI = eighteenPrecision;
    const numOfWBTC = eightPrecision;
    const numOfUSDC = sixPrecision;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine("scriptFlywheel.json");
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        bank = await testEngine.bank;
        tokenRegistry = testEngine.tokenInfoRegistry;

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
        await savingAccount.fastForward(1);
    });

    context("Addtional tests for repay()", async () => {
        context(
            "Borrow out all the tokens in DeFiner, then repay, verify CToken and tokens in saving account",
            async () => {
                it("Deposit DAI, borrows USDC and wants to withdraw", async function () {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Account 1 deposit 2 whole DAI and Account 1 deposit 1 whole USDC
                     */

                    const numOfDAI = eighteenPrecision.mul(new BN(2));
                    const numOfUSDC = sixPrecision;

                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);

                    await savingAccount.fastForward(1000);

                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );
                    /*
                     * Step 2
                     * Account 1 borrows the 1 USDC from DeFiner
                     * To verify:
                     * CToken for USDC left in saving account
                     * USDC token left in saving account
                     */

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressUSDC, numOfUSDC, { from: user1 });

                    const savingAccountCUSDCTokenAfterBorrow = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterBorrow = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savAccBalVerify(
                        2,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const TokenLeft = new BN(await erc20USDC.balanceOf(savingAccount.address));

                    expect(TokenLeft).to.be.bignumber.equal(ZERO);

                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                    await savingAccount.repay(addressUSDC, numOfUSDC, { from: user1 });

                    await savAccBalVerify(
                        3,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterBorrow,
                        savingAccountUSDCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    expect(TokenLeft).to.be.bignumber.equal(ZERO);
                });
            }
        );

        // These tests can't be verified after integrated with compound
        context("Checking saving account's value after repayment", async () => {
            context("Should succeed.", async () => {
                it("Repay all the outstandings DAI token", async function () {
                    this.timeout(0);
                    /*
                     * Setting up collateral beforehand.
                     * User1 deposit a whole DAI, and user2 deposit a whole USDC.
                     * Give 1 extra DAI to user2 for repayment.
                     * User2 then borrows half a DAI.
                     * Saving account balance: 1.5*10^17 DAI, 3.5*10^17 cDAI
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const result = await tokenRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), {
                        from: user2,
                    });

                    await savAccBalVerify(
                        2,
                        numOfDAI.div(new BN(2)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );
                    /*
                     * Repay all the outstandings
                     * After repayment, saving account balance: 1.5*10^17 DAI, 8.5*10^17 cDAI
                     */

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.repay(addressDAI, numOfDAI.div(new BN(2)), { from: user2 });

                    await savAccBalVerify(
                        3,
                        numOfDAI.div(new BN(2)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );
                });

                it("Repay half the outstandings DAI token", async function () {
                    this.timeout(0);
                    /*
                     * Setting up collateral beforehand.
                     * User1 deposit a whole DAI, and user2 deposit a whole USDC.
                     * Give 1 extra DAI to user2 for repayment.
                     * User2 then borrows half a DAI.
                     * Saving account balance: 1.5*10^17 DAI, 3.5*10^17 cDAI
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const result = await tokenRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), {
                        from: user2,
                    });

                    await savAccBalVerify(
                        2,
                        numOfDAI.div(new BN(2)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.repay(addressDAI, numOfDAI.div(new BN(4)), { from: user2 });

                    await savAccBalVerify(
                        3,
                        numOfDAI.div(new BN(4)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );
                });

                it("Repay with a small amount of DAI token", async function () {
                    this.timeout(0);
                    /*
                     * Setting up collateral beforehand.
                     * User1 deposit a whole DAI, and user2 deposit a whole USDC.
                     * Give 1 extra DAI to user2 for repayment.
                     * User2 then borrows half a DAI.
                     * Saving account balance: 1.5*10^17 DAI, 3.5*10^17 cDAI
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const result = await tokenRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), {
                        from: user2,
                    });

                    await savAccBalVerify(
                        2,
                        numOfDAI.div(new BN(2)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    /*
                     * Repay 1/4 * 10^18 DAI
                     * After repayment, saving account balance: 1.5*10^17 DAI + 10 DAI, 8.5*10^17 - 5*10^17
                     */
                    await savingAccount.repay(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );
                });
            });
        });

        context("Repay partially several times.", async () => {
            context("Use DAI, should succeed", async () => {
                it("Repay twice, every time repay 0.25 * 10^18 DAI tokens", async function () {
                    this.timeout(0);

                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const result = await tokenRegistry.getTokenInfoFromAddress(addressUSDC);
                    const usdcTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        usdcTokenIndex,
                        true,
                        {
                            from: user2,
                        }
                    );
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), {
                        from: user2,
                    });

                    await savAccBalVerify(
                        2,
                        numOfDAI.div(new BN(2)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const quaterOfDAI = numOfDAI.div(new BN(4));
                    const userBalanceBeforeRepay = await accountsContract.getBorrowBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    await savingAccount.repay(addressDAI, quaterOfDAI, { from: user2 });

                    await savAccBalVerify(
                        3,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    const userBalanceAfterFirstRepay =
                        await accountsContract.getBorrowBalanceCurrent(addressDAI, user2);

                    const savingAccountCDAITokenAfterFirstRepay = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterFirstRepay = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.repay(addressDAI, quaterOfDAI, { from: user2 });

                    await savAccBalVerify(
                        3,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterFirstRepay,
                        savingAccountDAITokenAfterFirstRepay,
                        bank,
                        savingAccount
                    );

                    const userBalanceAfterSecondRepay =
                        await accountsContract.getBorrowBalanceCurrent(addressDAI, user2);

                    expect(BN(userBalanceBeforeRepay)).to.be.bignumber.equal(
                        numOfDAI.div(new BN(2))
                    );
                    expect(BN(userBalanceAfterFirstRepay)).to.be.bignumber.equal(
                        numOfDAI.div(new BN(4))
                    );
                    expect(BN(userBalanceAfterSecondRepay)).to.be.bignumber.equal(ZERO);
                });
            });

            context("Use USDC, should succeed", async () => {
                it("Repay twice, every time repay 0.25 * 10^6 USDC tokens", async function () {
                    this.timeout(0);

                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressUSDC, numOfUSDC.div(new BN(2)), {
                        from: user1,
                    });

                    await savAccBalVerify(
                        2,
                        numOfUSDC.div(new BN(2)),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterBorrow = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterBorrow = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    const quaterOfUSDC = numOfUSDC.div(new BN(4));
                    const USDCBalance = await erc20USDC.balanceOf(user1);
                    const userBalanceBeforeRepay = await accountsContract.getBorrowBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    await savingAccount.repay(addressUSDC, quaterOfUSDC, { from: user1 });

                    await savAccBalVerify(
                        3,
                        quaterOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterBorrow,
                        savingAccountUSDCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterFirstRepay = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterFirstRepay = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    const userBalanceAfterFirstRepay =
                        await accountsContract.getBorrowBalanceCurrent(addressUSDC, user1);

                    await savingAccount.repay(addressUSDC, quaterOfUSDC, { from: user1 });

                    await savAccBalVerify(
                        3,
                        quaterOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterFirstRepay,
                        savingAccountUSDCTokenAfterFirstRepay,
                        bank,
                        savingAccount
                    );

                    const userBalanceAfterSecondRepay =
                        await accountsContract.getBorrowBalanceCurrent(addressUSDC, user1);

                    expect(BN(userBalanceBeforeRepay)).to.be.bignumber.equal(
                        numOfUSDC.div(new BN(2))
                    );
                    expect(BN(userBalanceAfterFirstRepay)).to.be.bignumber.equal(
                        numOfUSDC.div(new BN(4))
                    );
                    expect(BN(userBalanceAfterSecondRepay)).to.be.bignumber.equal(ZERO);
                });
            });
        });

        context("with WBTC, 8 decimals token", async () => {
            context("should succeed", async () => {
                it("When the repayment DAI Amount is less than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);

                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(5), { from: user2 });

                    await savAccBalVerify(
                        3,
                        new BN(5),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(5)
                    );
                });

                it("When the repayment DAI Amount is equal than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment DAI Amount is greater than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // 2.1 Prepare more DAI.
                    await erc20DAI.transfer(user2, numOfDAI);
                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(20), { from: user2 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment WBTC Amount is less than the loan amount.", async function () {
                    this.timeout(0);
                    let numOfDAI = eighteenPrecision.mul(new BN(2));
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCWBTCTokenAfterDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenAfterDeposit = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterDeposit,
                        savingAccountWBTCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCWBTCTokenAfterBorrow = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenAfterBorrow = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
                    // 3. Start repayment.
                    await savingAccount.repay(addressWBTC, new BN(5), { from: user1 });

                    await savAccBalVerify(
                        3,
                        new BN(5),
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterBorrow,
                        savingAccountWBTCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
                    expect(BN(user1BalanceBefore).sub(BN(user1BalanceAfter))).to.be.bignumber.equal(
                        new BN(5)
                    );
                });

                it("When the repayment WBTC Amount is equal to the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    let numOfDAI = eighteenPrecision.mul(new BN(2));

                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCWBTCTokenAfterDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenAfterDeposit = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterDeposit,
                        savingAccountWBTCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCWBTCTokenAfterBorrow = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenAfterBorrow = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
                    // 3. Start repayment.
                    await savingAccount.repay(addressWBTC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterBorrow,
                        savingAccountWBTCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
                    expect(BN(user1BalanceBefore).sub(BN(user1BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment WBTC Amount is greater than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    let numOfDAI = eighteenPrecision.mul(new BN(2));

                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCWBTCTokenAfterDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenAfterDeposit = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const result = await tokenRegistry.getTokenInfoFromAddress(addressDAI);
                    const daiTokenIndex = result[0];
                    await accountsContract.methods["setCollateral(uint8,bool)"](
                        daiTokenIndex,
                        true,
                        {
                            from: user1,
                        }
                    );
                    await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterDeposit,
                        savingAccountWBTCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCWBTCTokenAfterBorrow = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenAfterBorrow = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );
                    // 2.1 Prepare more DAI.
                    await erc20WBTC.transfer(user1, numOfWBTC);
                    const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
                    // 3. Start repayment.
                    await savingAccount.repay(addressWBTC, new BN(20), { from: user1 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterBorrow,
                        savingAccountWBTCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );
                    // 4. Verify the repay amount.
                    const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
                    expect(BN(user1BalanceBefore).sub(BN(user1BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });
            });
        });
    });
});
