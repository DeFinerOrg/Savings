import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;

    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;

    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForWBTC: any;
    let addressCTokenForETH: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;

    let numOfToken: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(async function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        await testEngine.deployCompound(accounts);
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        bank = await testEngine.bank;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);

        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForETH = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        cDAI = await MockCToken.at(addressCTokenForDAI);
        cUSDC = await MockCToken.at(addressCTokenForUSDC);
        cUSDT = await MockCToken.at(addressCTokenForUSDT);
        cWBTC = await MockCToken.at(addressCTokenForWBTC);
        cETH = await MockCToken.at(addressCTokenForETH);

        numOfToken = new BN(1000);
    });

    context("repay()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                beforeEach(async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await savingAccount.fastForward(1000);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
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

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        1,
                        new BN(10),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );
                });

                it("when unsupported token address passed", async function () {
                    this.timeout(0);
                    // 3. Start repayment.
                    await expectRevert(
                        savingAccount.repay(dummy, new BN(10), { from: user2 }),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function () {
                    this.timeout(0);
                    // 3. Start repayment.
                    await expectRevert(
                        savingAccount.repay(addressDAI, new BN(0), { from: user2 }),
                        "Amount is zero"
                    );
                });
            });

            context("should succeed", async () => {
                it("when supported token address is passed", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
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

                    // 2. Start borrowing.
                    const user2BalanceBorrowBefore = BN(await erc20DAI.balanceOf(user2));

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

                    const user2BalanceBorrowAfter = BN(await erc20DAI.balanceOf(user2));
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
                    const user2BalanceRepayAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceRepayAfter)
                    ).to.be.bignumber.equal(new BN(10));
                });

                it("When the repayment tokenAmount is less than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
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
                    // 2. Start borrowing.
                    const user2BalanceBorrowBefore = BN(await erc20DAI.balanceOf(user2));

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
                    const user2BalanceBorrowAfter = BN(await erc20DAI.balanceOf(user2));
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
                    const user2BalanceRepayAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceRepayAfter)
                    ).to.be.bignumber.equal(new BN(5));
                });

                it("When the repayment tokenAmount is equal than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
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

                    // 2. Start borrowing.
                    const user2BalanceBorrowBefore = BN(await erc20DAI.balanceOf(user2));

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

                    const user2BalanceBorrowAfter = BN(await erc20DAI.balanceOf(user2));

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
                    const user2BalanceRepayAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceRepayAfter)
                    ).to.be.bignumber.equal(new BN(10));
                });

                it("When the repayment tokenAmount is greater than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
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

                    // 2. Start borrowing.
                    const user2BalanceBorrowBefore = BN(await erc20DAI.balanceOf(user2));
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

                    const user2BalanceBorrowAfter = BN(await erc20DAI.balanceOf(user2));
                    // 2.1 Prepare more DAI.
                    await erc20DAI.transfer(user2, numOfToken);
                    const user2BalanceRepayBefore = BN(await erc20DAI.balanceOf(user2));
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
                    const user2BalanceRepayAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user2BalanceRepayBefore.sub(user2BalanceRepayAfter)
                    ).to.be.bignumber.equal(new BN(10));
                });

                it("When the repayment USDCAmount is less than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });

                    await savAccBalVerify(
                        0,
                        numOfToken.add(numOfDAI),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20USDC.balanceOf(user1));
                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user1 });

                    const user1BalanceBorrowAfter = BN(await erc20USDC.balanceOf(user1));

                    await savAccBalVerify(
                        2,
                        new BN(10),
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

                    // 3. Start repayment.
                    await savingAccount.repay(addressUSDC, new BN(5), { from: user1 });
                    // 4. Verify the repay amount.
                    const user1BalanceRepayAfter = BN(await erc20USDC.balanceOf(user1));

                    await savAccBalVerify(
                        3,
                        new BN(5),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterBorrow,
                        savingAccountUSDCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(5));
                });

                it("When the repayment USDCAmount is equal than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });

                    await savAccBalVerify(
                        0,
                        numOfToken.add(numOfDAI),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20USDC.balanceOf(user1));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user1 });
                    const user1BalanceBorrowAfter = BN(await erc20USDC.balanceOf(user1));

                    await savAccBalVerify(
                        2,
                        new BN(10),
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

                    // 3. Start repayment.
                    await savingAccount.repay(addressUSDC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterBorrow,
                        savingAccountUSDCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user1BalanceRepayAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });

                it("When the repayment USDCAmount is greater than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20USDC.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                    const numOfDAI = eighteenPrecision.div(new BN(1000));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });

                    await savAccBalVerify(
                        0,
                        numOfToken.add(numOfDAI),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20USDC.balanceOf(user1));

                    await savingAccount.borrow(addressUSDC, new BN(10), { from: user1 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
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

                    const user1BalanceBorrowAfter = BN(await erc20USDC.balanceOf(user1));
                    // 2.1 Prepare more DAI.
                    await erc20USDC.transfer(user1, numOfToken);

                    // 3. Start repayment.
                    await savingAccount.repay(addressUSDC, new BN(20), { from: user1 });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterBorrow,
                        savingAccountUSDCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user1BalanceRepayAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(10));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(numOfToken);
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                beforeEach(async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken,
                    });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 });
                });
                it("when unsupported token address passed", async function () {
                    this.timeout(0);
                    // 3. Start repayment.
                    await expectRevert(
                        savingAccount.repay(dummy, new BN(10), {
                            from: user2,
                            value: new BN(10),
                        }),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function () {
                    this.timeout(0);
                    // 3. Start repayment.
                    await expectRevert(
                        savingAccount.repay(ETH_ADDRESS, new BN(0), {
                            from: user2,
                            value: new BN(0),
                        }),
                        "Amount is zero"
                    );
                });
            });

            context("should succeed", async () => {
                it("when the repayment ETHAmount is less than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken,
                    });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

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

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );
                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterBorrow = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterBorrow = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    // 3. Start repayment.
                    await savingAccount.repay(ETH_ADDRESS, new BN(5), {
                        from: user2,
                        value: new BN(5),
                    });

                    await savAccBalVerify(
                        3,
                        new BN(5),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterBorrow,
                        savingAccountETHTokenAfterBorrow,
                        bank,
                        savingAccount
                    );
                    // 4. Verify the repay amount.
                    const user2ETHValueDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    const user2ETHValueBorrow = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    expect(
                        new BN(user2ETHValueDeposit).add(new BN(user2ETHValueBorrow))
                    ).to.be.bignumber.equal(new BN(5));
                });

                it("when the repayment ETHAmount is greater than the loan amount.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, numOfToken, {
                        from: user1,
                        value: numOfToken,
                    });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });

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

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, new BN(10), { from: user2 });

                    await savAccBalVerify(
                        2,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterBorrow = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterBorrow = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );

                    // 3. Start repayment.
                    await savingAccount.repay(ETH_ADDRESS, new BN(20), {
                        from: user2,
                        value: new BN(20),
                    });

                    await savAccBalVerify(
                        3,
                        new BN(10),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterBorrow,
                        savingAccountETHTokenAfterBorrow,
                        bank,
                        savingAccount
                    );
                    // 4. Verify the repay amount.
                    const user2ETHValueDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    const user2ETHValueBorrow = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    expect(
                        new BN(user2ETHValueDeposit).add(new BN(user2ETHValueBorrow))
                    ).to.be.bignumber.equal(new BN(0));
                });
            });
        });

        context("Repayment of large amounts.", async () => {
            context("should succeed", async () => {
                it("When the tokenAmount that needs to be repaid is the whole token.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    const DAINumOfToken = eighteenPrecision.mul(new BN(10));
                    const USDCNumOfToken = sixPrecision.mul(new BN(10));

                    await erc20DAI.transfer(user1, DAINumOfToken);
                    await erc20USDC.transfer(user2, USDCNumOfToken);
                    await erc20DAI.approve(savingAccount.address, DAINumOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, USDCNumOfToken, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, DAINumOfToken, { from: user2 });

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

                    await savingAccount.deposit(addressDAI, DAINumOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, USDCNumOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        DAINumOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        USDCNumOfToken,
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

                    // 2. Start borrowing.
                    const user2BalanceBorrowBefore = BN(await erc20DAI.balanceOf(user2));

                    await savingAccount.borrow(addressDAI, DAINumOfToken.div(new BN(10)), {
                        from: user2,
                    });

                    await savAccBalVerify(
                        2,
                        DAINumOfToken.div(new BN(10)),
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

                    const user2BalanceBorrowAfter = BN(await erc20DAI.balanceOf(user2));
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, DAINumOfToken.div(new BN(10)), {
                        from: user2,
                    });

                    await savAccBalVerify(
                        3,
                        DAINumOfToken.div(new BN(10)),
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterBorrow,
                        savingAccountDAITokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user2BalanceRepayAfter = BN(await erc20DAI.balanceOf(user2));
                    expect(
                        user2BalanceBorrowAfter.sub(user2BalanceBorrowBefore)
                    ).to.be.bignumber.equal(DAINumOfToken.div(new BN(10)));
                    expect(
                        user2BalanceRepayAfter.sub(user2BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });

                it("When the USDCAmount that needs to be repaid is the whole token.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    const DAINumOfToken = eighteenPrecision.mul(new BN(10));
                    const USDCNumOfToken = sixPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, DAINumOfToken);
                    await erc20USDC.transfer(user2, USDCNumOfToken);
                    await erc20DAI.approve(savingAccount.address, DAINumOfToken, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, USDCNumOfToken, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, DAINumOfToken, { from: user1 });

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

                    await savingAccount.deposit(addressDAI, DAINumOfToken, { from: user1 });
                    await savingAccount.deposit(addressUSDC, USDCNumOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        DAINumOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        USDCNumOfToken,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20USDC.balanceOf(user1));

                    await savingAccount.borrow(addressUSDC, USDCNumOfToken.div(new BN(10)), {
                        from: user1,
                    });

                    await savAccBalVerify(
                        2,
                        USDCNumOfToken.div(new BN(10)),
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

                    const user1BalanceBorrowAfter = BN(await erc20USDC.balanceOf(user1));
                    // 3. Start repayment.
                    await savingAccount.repay(addressUSDC, USDCNumOfToken.div(new BN(10)), {
                        from: user1,
                    });

                    await savAccBalVerify(
                        3,
                        USDCNumOfToken.div(new BN(10)),
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterBorrow,
                        savingAccountUSDCTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Verify the repay amount.
                    const user1BalanceRepayAfter = BN(await erc20USDC.balanceOf(user1));
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(USDCNumOfToken.div(new BN(10)));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });

                it("When the ETHAmount that needs to be repaid is the whole ETH.", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    const DAINumOfToken = eighteenPrecision.mul(new BN(1000));
                    const ETHNumOfToken = eighteenPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, DAINumOfToken);
                    await erc20DAI.approve(savingAccount.address, DAINumOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    await savingAccount.deposit(addressDAI, DAINumOfToken, { from: user1 });
                    await savingAccount.deposit(ETH_ADDRESS, ETHNumOfToken, {
                        from: user2,
                        value: ETHNumOfToken,
                    });

                    await savAccBalVerify(
                        0,
                        DAINumOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        ETHNumOfToken,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(ETH_ADDRESS, ETHNumOfToken.div(new BN(10)), {
                        from: user1,
                    });

                    await savAccBalVerify(
                        2,
                        ETHNumOfToken.div(new BN(10)),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenAfterBorrow = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountETHTokenAfterBorrow = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    const user1ETHValueBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    const user1ETHValueBeforeBorrow = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    // 3. Start repayment.
                    await savingAccount.repay(ETH_ADDRESS, ETHNumOfToken.div(new BN(10)), {
                        from: user1,
                        value: ETHNumOfToken.div(new BN(10)),
                    });

                    await savAccBalVerify(
                        3,
                        ETHNumOfToken.div(new BN(10)),
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterBorrow,
                        savingAccountETHTokenAfterBorrow,
                        bank,
                        savingAccount
                    );

                    const user1ETHValueAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    const user1ETHValueAfterBorrow = await accountsContract.getBorrowBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    // 4. Verify the repay amount.
                    expect(
                        new BN(user1ETHValueBeforeDeposit).add(new BN(user1ETHValueBeforeBorrow))
                    ).to.be.bignumber.equal(ETHNumOfToken.div(new BN(10)));
                    expect(
                        new BN(user1ETHValueAfterDeposit).add(new BN(user1ETHValueAfterBorrow))
                    ).to.be.bignumber.equal(new BN(0));
                });
            });
        });

        context("Token without Compound (MKR, TUSD)", async () => {
            context("should fail", async () => {
                it("when repaying MKR, amount is zero", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });
                    // 3. Start repayment.
                    await expectRevert(
                        savingAccount.repay(addressMKR, new BN(0), { from: user1 }),
                        "Amount is zero"
                    );
                });

                it("when repaying TUSD, amount is zero", async function () {
                    this.timeout(0);
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    await savingAccount.borrow(addressTUSD, new BN(1), { from: user1 });
                    // 3. Start repayment.
                    await expectRevert(
                        savingAccount.repay(addressTUSD, new BN(0), { from: user1 }),
                        "Amount is zero"
                    );
                });
            });
            context("should succeed", async () => {
                it("When repaying MKR.", async function () {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20MKR.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20MKR.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfToken, { from: user2 });
                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20MKR.balanceOf(user1));

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savingAccount.borrow(addressMKR, new BN(1), { from: user1 });

                    const user1BalanceBorrowAfter = BN(await erc20MKR.balanceOf(user1));
                    // 3. Start repayment.
                    await savingAccount.repay(addressMKR, new BN(1), { from: user1 });

                    const user1BalanceRepayAfter = BN(await erc20MKR.balanceOf(user1));
                    // 4. Verify the loan amount.
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(1));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });

                it("When repaying a whole MKR.", async function () {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.mul(new BN(1000));
                    const numOfMKR = eighteenPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20MKR.transfer(user2, numOfMKR);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20MKR.approve(savingAccount.address, numOfMKR, { from: user2 });
                    await erc20MKR.approve(savingAccount.address, numOfMKR, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressMKR, numOfMKR, { from: user2 });

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

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20MKR.balanceOf(user1));

                    await savingAccount.borrow(addressMKR, numOfMKR.div(new BN(10)), {
                        from: user1,
                    });
                    const user1BalanceBorrowAfter = BN(await erc20MKR.balanceOf(user1));
                    // 3. Start repayment.
                    await savingAccount.repay(addressMKR, numOfMKR.div(new BN(10)), {
                        from: user1,
                    });
                    const user1BalanceRepayAfter = BN(await erc20MKR.balanceOf(user1));
                    // 4. Verify the loan amount.
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(numOfMKR.div(new BN(10)));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });

                it("When repaying TUSD.", async function () {
                    this.timeout(0);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20TUSD.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfToken, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20TUSD.balanceOf(user1));
                    await savingAccount.borrow(addressTUSD, new BN(1), { from: user1 });
                    const user1BalanceBorrowAfter = BN(await erc20TUSD.balanceOf(user1));
                    // 3. Start repayment.
                    await savingAccount.repay(addressTUSD, new BN(1), { from: user1 });
                    const user1BalanceRepayAfter = BN(await erc20TUSD.balanceOf(user1));
                    // 4. Verify the loan amount.
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(1));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });

                it("When repaying a whole TUSD.", async function () {
                    this.timeout(0);
                    const numOfDAI = eighteenPrecision.mul(new BN(1000));
                    const numOfTUSD = eighteenPrecision.mul(new BN(10));
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20TUSD.transfer(user2, numOfTUSD);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSD, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSD, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSD, { from: user2 });

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

                    // 2. Start borrowing.
                    const user1BalanceBorrowBefore = BN(await erc20TUSD.balanceOf(user1));
                    await savingAccount.borrow(addressTUSD, new BN(1), { from: user1 });
                    const user1BalanceBorrowAfter = BN(await erc20TUSD.balanceOf(user1));
                    // 3. Start repayment.
                    await savingAccount.repay(addressTUSD, new BN(1), { from: user1 });
                    const user1BalanceRepayAfter = BN(await erc20TUSD.balanceOf(user1));
                    // 4. Verify the loan amount.
                    expect(
                        user1BalanceBorrowAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(1));
                    expect(
                        user1BalanceRepayAfter.sub(user1BalanceBorrowBefore)
                    ).to.be.bignumber.equal(new BN(0));
                });
            });
        });
    });
});
