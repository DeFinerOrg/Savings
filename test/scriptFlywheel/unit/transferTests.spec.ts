import { MaxReserveRatioUpdated } from "./../../../types/GlobalConfig.d";
import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");

contract("SavingAccount.transfer", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const user4 = accounts[4];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let numOfToken: any;

    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        bank = await testEngine.bank;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        numOfToken = new BN(1000);
    });

    // Funtion to verify Compound balance in tests
    const compoundVerifyETH = async (
        depositAmount: BN,
        balCTokenContractBefore: BN,
        balCTokensBefore: BN
    ) => {
        // Some tokens are sent to Compound contract
        const expectedTokensAtCTokenContract = depositAmount
            .mul(new BN(2))
            .mul(new BN(85))
            .div(new BN(100));
        const balCTokenContract = await web3.eth.getBalance(cETH_addr);
        expect(
            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCTokenContract))
        ).to.be.bignumber.equal(balCTokenContract);

        // cToken must be minted for SavingAccount
        const expectedCTokensAtSavingAccount = depositAmount
            .mul(new BN(2))
            .mul(new BN(85))
            .div(new BN(100));
        const balCTokensAfter = new BN(await cETH.balanceOfUnderlying.call(savingAccount.address));
        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
            balCTokensAfter.sub(balCTokensBefore)
        );
    };

    context("transfer()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("B9: Not enough balance for transfer", async function () {
                    this.timeout(0);
                    const numOfToken = new BN(1000);
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1, the amount of transfer is larger than user2's balance on DAI
                    const user1BalanceBefore = await erc20DAI.balanceOf(user1);
                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    const balCDAIContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                    const balCDAIBeforeUser = await cDAI.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balSavingAccountBefore = await erc20DAI.balanceOf(savingAccount.address);

                    await savingAccount.fastForward(1000);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                    let user1Balance = await erc20DAI.balanceOf(user1);
                    expect(BN(user1Balance).sub(BN(user1BalanceBefore))).to.be.bignumber.equal(
                        numOfToken
                    );

                    let user2Balance = await erc20DAI.balanceOf(user2);
                    expect(BN(user2Balance).sub(BN(user2BalanceBefore))).to.be.bignumber.equal(
                        numOfToken
                    );

                    let user1TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );
                    let user2TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                    await savAccBalVerify(
                        0,
                        numOfToken.mul(new BN(2)),
                        addressDAI,
                        cDAI,
                        new BN(balCDAIBeforeUser),
                        new BN(balSavingAccountBefore),
                        bank,
                        savingAccount
                    );

                    // Verify balances of user1 & user2 after deposit
                    let user1BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );
                    let user2BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user2
                    );

                    expect(
                        new BN(user1BalanceAfterDeposit).sub(new BN(user1TotalBalanceBefore))
                    ).to.be.bignumber.equal(numOfToken);
                    expect(
                        new BN(user2BalanceAfterDeposit).sub(new BN(user2TotalBalanceBefore))
                    ).to.be.bignumber.equal(numOfToken);

                    await expectRevert(
                        savingAccount.transfer(user1, addressDAI, new BN(2000), {
                            from: user2,
                        }),
                        "SafeMath: subtraction overflow"
                    );
                });

                it("N9: Not enough collatral for borrowed asset if transfer", async function () {
                    this.timeout(0);
                    // 1. Transfer DAI to user1 & user2.
                    // 2. User2 borrow USDC and uses it's DAI as collateral
                    // 3. Transfer DAI from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    const borrowAmount = numOfUSDC.div(new BN(10));
                    const balCDAIContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                    const balCUSDCContractBefore = await erc20USDC.balanceOf(cUSDC_addr);
                    const balCDAIBeforeUser = await cDAI.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balSavingAccountBefore = await erc20DAI.balanceOf(savingAccount.address);
                    const balCUSDCBeforeUser = await cUSDC.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balSavingAccountBeforeUSDC = await erc20USDC.balanceOf(
                        savingAccount.address
                    );

                    await erc20DAI.transfer(user2, numOfDAI);
                    await erc20USDC.transfer(user1, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                    //1. Deposit DAI & USDC
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

                    await savAccBalVerify(
                        0,
                        numOfDAI,
                        addressDAI,
                        cDAI,
                        new BN(balCDAIBeforeUser),
                        new BN(balSavingAccountBefore),
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        new BN(balCUSDCBeforeUser),
                        new BN(balSavingAccountBeforeUSDC),
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    // 2. Borrow USDC
                    const user2USDCBalanceBefore = await erc20USDC.balanceOf(user2);

                    await savingAccount.borrow(addressUSDC, borrowAmount, { from: user2 });

                    // Amount that is locked as collateral
                    const collateralLocked = borrowAmount
                        .mul(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(eighteenPrecision)
                        .mul(new BN(100))
                        .div(new BN(60))
                        .div(await tokenInfoRegistry.priceFromIndex(0))
                        .div(new BN(sixPrecision));

                    // 3. Verify the loan amount
                    const user2USDCBalanceAfter = await erc20USDC.balanceOf(user2);
                    expect(
                        BN(user2USDCBalanceAfter).sub(BN(user2USDCBalanceBefore))
                    ).to.be.bignumber.equal(borrowAmount);

                    await savAccBalVerify(
                        2,
                        borrowAmount,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // Total remaining DAI after borrow
                    const remainingDAI = numOfDAI.sub(collateralLocked);

                    await expectRevert(
                        savingAccount.transfer(
                            user1,
                            addressDAI,
                            remainingDAI.add(eighteenPrecision),
                            {
                                from: user2,
                            }
                        ),
                        "Insufficient collateral when withdraw."
                    );
                });
            });

            context("Compound Supported 18 decimals Token", async () => {
                context("should succeed", async () => {
                    it("E9: Transfer small amount balance", async function () {
                        this.timeout(0);
                        const numOfToken = new BN(1000);
                        // 1. Transfer DAI to user1 & user2.
                        // 2. Transfer DAI from user2 to user1. The amount of transfer should NOT trigger the compound token
                        // withdraw of user2 and compound token deposit of user1.
                        // 3. Verity the new balance
                        let user1BalanceBefore = await erc20DAI.balanceOf(user1);
                        let user2BalanceBefore = await erc20DAI.balanceOf(user2);

                        const balCDAIContractBeforeUser1 = await erc20DAI.balanceOf(cDAI_addr, {
                            from: user1,
                        });
                        const balCDAIBeforeUser = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        const balSavingAccountBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        await erc20DAI.transfer(user1, numOfToken);
                        await erc20DAI.transfer(user2, numOfToken);
                        await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                        await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                        let user1Balance = await erc20DAI.balanceOf(user1);
                        expect(BN(user1Balance).sub(BN(user1BalanceBefore))).to.be.bignumber.equal(
                            numOfToken
                        );

                        let user2Balance = await erc20DAI.balanceOf(user2);
                        expect(BN(user2Balance).sub(BN(user2BalanceBefore))).to.be.bignumber.equal(
                            numOfToken
                        );

                        let user1TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        let user2TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user2
                        );

                        await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                        await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                        await savAccBalVerify(
                            0,
                            numOfToken.mul(new BN(2)),
                            addressDAI,
                            cDAI,
                            new BN(balCDAIBeforeUser),
                            new BN(balSavingAccountBefore),
                            bank,
                            savingAccount
                        );

                        // Verify balances of user1 & user2 after deposit
                        let user1BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        let user2BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user2
                        );
                        expect(
                            new BN(user1BalanceAfterDeposit).sub(new BN(user1TotalBalanceBefore))
                        ).to.be.bignumber.equal(numOfToken);
                        expect(
                            new BN(user2BalanceAfterDeposit).sub(new BN(user2TotalBalanceBefore))
                        ).to.be.bignumber.equal(numOfToken);

                        const balCDAIBeforeTransfer = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balCDAIContractBeforeTransfer = await erc20DAI.balanceOf(cDAI_addr);

                        // Transfer 100 tokens from user2 to user1
                        await savingAccount.transfer(user1, addressDAI, new BN(100), {
                            from: user2,
                        });

                        // Verify balances of user1 & user2 after transfer
                        let user1BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        let user2BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user2
                        );
                        expect(new BN(user1BalanceAfterTransfer)).to.be.bignumber.equal(
                            new BN(user1BalanceAfterDeposit).add(new BN(100))
                        );
                        expect(new BN(user2BalanceAfterTransfer)).to.be.bignumber.equal(
                            new BN(user1BalanceAfterDeposit).sub(new BN(100))
                        );

                        // Verify Compound balance after transfer
                        const balCDAIContractAfterTransfer = await erc20DAI.balanceOf(cDAI_addr, {
                            from: user2,
                        });
                        expect(balCDAIContractAfterTransfer).to.be.bignumber.equal(
                            balCDAIContractBeforeTransfer
                        );

                        const balCDAIAfterTransfer = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        expect(
                            BN(balCDAIAfterTransfer).sub(BN(balCDAIBeforeTransfer))
                        ).to.be.bignumber.equals(new BN(0));
                    });

                    it("F9: Transfer large amount of balance", async function () {
                        this.timeout(0);
                        // 1. Transfer DAI to user1 & user2.
                        // 2. Transfer DAI from user2 to user1. The amount of transfer should trigger the compound token
                        // withdraw of user2 and compound token deposit of user1.
                        // 3. Verify the new balance
                        const numOfToken = new BN(1000);
                        let user1BalanceBefore = await erc20DAI.balanceOf(user1);
                        let user2BalanceBefore = await erc20DAI.balanceOf(user2);

                        const balCDAIContractBeforeUser1 = await erc20DAI.balanceOf(cDAI_addr, {
                            from: user1,
                        });
                        const balCDAIBeforeUser = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );

                        const balCDAIContractBeforeUser2 = await erc20DAI.balanceOf(cDAI_addr, {
                            from: user2,
                        });

                        const balCDAIBeforeUser2 = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address,
                            {
                                from: user2,
                            }
                        );
                        const balSavingAccountBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        await erc20DAI.transfer(user1, numOfToken);
                        await erc20DAI.transfer(user2, numOfToken);
                        await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                        await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                        let user1Balance = await erc20DAI.balanceOf(user1);
                        expect(BN(user1Balance).sub(BN(user1BalanceBefore))).to.be.bignumber.equal(
                            numOfToken
                        );

                        let user2Balance = await erc20DAI.balanceOf(user2);
                        expect(BN(user2Balance).sub(BN(user2BalanceBefore))).to.be.bignumber.equal(
                            numOfToken
                        );

                        let user1TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        let user2TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user2
                        );

                        await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                        await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                        await savAccBalVerify(
                            0,
                            numOfToken.mul(new BN(2)),
                            addressDAI,
                            cDAI,
                            new BN(balCDAIBeforeUser),
                            new BN(balSavingAccountBefore),
                            bank,
                            savingAccount
                        );

                        // Verify balances of user1 & user2 after deposit
                        let user1BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        let user2BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user2
                        );
                        expect(
                            new BN(user1BalanceAfterDeposit).sub(new BN(user1TotalBalanceBefore))
                        ).to.be.bignumber.equal(numOfToken);
                        expect(
                            new BN(user2BalanceAfterDeposit).sub(new BN(user2TotalBalanceBefore))
                        ).to.be.bignumber.equal(numOfToken);

                        const balCDAIBeforeTransfer = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balCDAIContractBeforeTransfer = await erc20DAI.balanceOf(cDAI_addr);

                        // transfer more than reserve
                        await savingAccount.transfer(user1, addressDAI, new BN(500), {
                            from: user2,
                        });

                        // Verify Compound balance after transfer
                        const balCDAIContractAfterTransfer = await erc20DAI.balanceOf(cDAI_addr, {
                            from: user2,
                        });
                        expect(balCDAIContractAfterTransfer).to.be.bignumber.equal(
                            balCDAIContractBeforeTransfer
                        );

                        const balcDAIAfterTransfer = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        expect(balcDAIAfterTransfer).to.be.bignumber.equal(balCDAIBeforeTransfer);

                        // Verify balances of user1 & user2 after transfer
                        let user1BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        let user2BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user2
                        );
                        expect(new BN(user1BalanceAfterTransfer)).to.be.bignumber.equal(
                            new BN(user1BalanceAfterDeposit).add(new BN(500))
                        );
                        expect(new BN(user2BalanceAfterTransfer)).to.be.bignumber.equal(
                            new BN(user1BalanceAfterDeposit).sub(new BN(500))
                        );
                    });
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("H9: Not enough balance for transfer", async function () {
                    this.timeout(0);
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1, the amount of transfer is larger than user2's balance on ETH
                    const depositAmount = new BN(1000);
                    const ETHtransferAmount = new BN(2000);
                    const balCETHContractBefore = await web3.eth.getBalance(cETH_addr);
                    const ETHbalanceOfUser2 = await web3.eth.getBalance(user2);
                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const balCTokensBefore = new BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );

                    // User 2 deposits ETH
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2,
                    });

                    // verify deposit
                    await savAccBalVerify(
                        0,
                        depositAmount,
                        ETH_ADDRESS,
                        cETH,
                        balCTokensBefore,
                        new BN(ETHbalanceBeforeDeposit),
                        bank,
                        savingAccount
                    );

                    const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                    expect(new BN(ETHbalanceAfterDeposit)).to.be.bignumber.equal(
                        new BN(depositAmount).mul(new BN(15)).div(new BN(100))
                    );

                    // Some tokens are sent to Compound contract
                    const expectedTokensAtCTokenContract = new BN(depositAmount)
                        .mul(new BN(85))
                        .div(new BN(100));
                    const balCETHContract = await web3.eth.getBalance(cETH_addr);
                    expect(
                        new BN(balCETHContractBefore).add(new BN(expectedTokensAtCTokenContract))
                    ).to.be.bignumber.equal(balCETHContract);

                    // cToken must be minted for SavingAccount
                    const expectedCTokensAtSavingAccount = new BN(depositAmount)
                        .mul(new BN(85))
                        .div(new BN(100));
                    // get exchange rate and then verify
                    const balCTokens = await cETH.balanceOfUnderlying.call(savingAccount.address, {
                        from: user1,
                    });
                    expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                        new BN(balCTokens)
                    );

                    await expectRevert(
                        savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                            from: user2,
                        }),
                        "SafeMath: subtraction overflow"
                    );
                });

                it("Not enough collatral for borrowed asset if transfer (for ETH)", async function () {
                    this.timeout(0);
                    // 1. Transfer ETH to user1 & user2.
                    // 2. User2 borrow DAI and uses it's ETH as collateral
                    // 3. Transfer ETH from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
                    const depositAmount = new BN(1000);
                    const DAIBorrowAmount = new BN(600);

                    const user1BalanceDAIInit = await erc20DAI.balanceOf(user1);
                    const user2BalanceDAIInit = await erc20DAI.balanceOf(user2);
                    const balCETHContractBefore = await web3.eth.getBalance(cETH_addr);
                    const balCDAIContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                    const balCTokensBefore = new BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const balCDAIBeforeUser = await cDAI.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const balSavingAccountBefore = await erc20DAI.balanceOf(savingAccount.address);

                    // User 1 deposits DAI
                    await erc20DAI.transfer(user1, depositAmount);
                    await erc20DAI.approve(savingAccount.address, depositAmount, {
                        from: user1,
                    });
                    await savingAccount.deposit(addressDAI, depositAmount, { from: user1 });

                    // Verify DAI deposit
                    await savAccBalVerify(
                        0,
                        depositAmount,
                        addressDAI,
                        cDAI,
                        new BN(balCDAIBeforeUser),
                        new BN(balSavingAccountBefore),
                        bank,
                        savingAccount
                    );

                    // User 1 deposits ETH
                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const ETHbalanceBeforeDepositUser = await web3.eth.getBalance(user1);

                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user1,
                    });

                    // User 2 deposits ETH
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2,
                    });

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    // verify deposit
                    await savAccBalVerify(
                        0,
                        depositAmount.mul(new BN(2)),
                        ETH_ADDRESS,
                        cETH,
                        balCTokensBefore,
                        new BN(ETHbalanceBeforeDeposit),
                        bank,
                        savingAccount
                    );

                    const user2BalanceDAIBeforeBorrow = await erc20DAI.balanceOf(user2);

                    // User 2 borrowed DAI
                    await savingAccount.borrow(addressDAI, DAIBorrowAmount, { from: user2 });

                    // Verify the loan amount.
                    await savAccBalVerify(
                        2,
                        DAIBorrowAmount,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const user2BalanceDAI = await erc20DAI.balanceOf(user2); //600 DAI
                    expect(
                        new BN(user2BalanceDAI).sub(new BN(user2BalanceDAIBeforeBorrow))
                    ).to.be.bignumber.equal(new BN(600));

                    // ETH Amount that is locked as collateral
                    const collateralLocked = depositAmount
                        .mul(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(eighteenPrecision)
                        .mul(new BN(100))
                        .div(new BN(60))
                        .div(new BN(eighteenPrecision));

                    await expectRevert(
                        savingAccount.transfer(user1, ETH_ADDRESS, collateralLocked, {
                            from: user2,
                        }),
                        "SafeMath: subtraction overflow"
                    );
                });
            });

            context("should succeed", async () => {
                it("K9: Transfer small amount balance", async function () {
                    this.timeout(0);
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1. The amount of transfer should NOT trigger the compound token
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verity the new balance
                    const depositAmount = new BN(1000);
                    const ETHtransferAmount = new BN(50);

                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const ETHbalanceBeforeDepositUser = await web3.eth.getBalance(user1);

                    const balCETHContractBefore = await web3.eth.getBalance(cETH_addr);

                    let user1TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    let user2TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );

                    const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                    const balCTokensBefore = new BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );

                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user1,
                    });
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2,
                    });

                    // Verify balances of user1 & user2 after deposit
                    let user1BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    let user2BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    expect(
                        new BN(user1BalanceAfterDeposit).sub(new BN(user1TotalBalanceBefore))
                    ).to.be.bignumber.equal(depositAmount);
                    expect(
                        new BN(user2BalanceAfterDeposit).sub(new BN(user2TotalBalanceBefore))
                    ).to.be.bignumber.equal(depositAmount);

                    // validate savingAccount ETH balance
                    await savAccBalVerify(
                        0,
                        depositAmount.mul(new BN(2)),
                        ETH_ADDRESS,
                        cETH,
                        balCTokensBefore,
                        new BN(ETHbalanceBeforeDeposit),
                        bank,
                        savingAccount
                    );

                    const balCETHContract = await web3.eth.getBalance(cETH_addr);
                    const balCETHBeforeTransfer = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address, { from: user2 })
                    );

                    // transfer ETH from user2 to user1
                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2,
                    });

                    const ETHbalanceAfterTransfer = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    expect(ETHbalanceAfterTransfer).to.be.bignumber.equal(
                        new BN(2000).mul(new BN(15)).div(new BN(100))
                    );

                    // Verify balances of user1 & user2 after transfer
                    let user1BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    let user2BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    expect(new BN(user1BalanceAfterTransfer)).to.be.bignumber.equal(
                        new BN(user1BalanceAfterDeposit).add(ETHtransferAmount)
                    );
                    expect(new BN(user2BalanceAfterTransfer)).to.be.bignumber.equal(
                        new BN(user1BalanceAfterDeposit).sub(ETHtransferAmount)
                    );

                    const balCETHAfterTransfer = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address, { from: user2 })
                    );
                    const balCETHContractAfterTransfer = await web3.eth.getBalance(cETH_addr);

                    // Verify the Compound balance after transfer
                    expect(balCETHBeforeTransfer).to.be.bignumber.equals(balCETHAfterTransfer);
                    expect(balCETHContract).to.be.bignumber.equals(balCETHContractAfterTransfer);
                });

                it("L9: Transfer large amount of balance", async function () {
                    this.timeout(0);
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1. The amount of transfer should trigger the compound token
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verify the new balance
                    const depositAmount = new BN(web3.utils.toWei("1000", "ether"));
                    const ETHtransferAmount = web3.utils.toWei("500", "ether");

                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const balCTokensBefore = new BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );

                    // deposit ETH
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user1,
                    });
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2,
                    });

                    // Verify balances of user1 & user2 after deposit
                    let user1BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    let user2BalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );

                    expect(new BN(user1BalanceAfterDeposit)).to.be.bignumber.equal(depositAmount);
                    expect(new BN(user2BalanceAfterDeposit)).to.be.bignumber.equal(depositAmount);

                    // validate savingAccount ETH balance
                    await savAccBalVerify(
                        0,
                        depositAmount.mul(new BN(2)),
                        ETH_ADDRESS,
                        cETH,
                        balCTokensBefore,
                        new BN(ETHbalanceBeforeDeposit),
                        bank,
                        savingAccount
                    );

                    const balCETHContract = await web3.eth.getBalance(cETH_addr);
                    const balCTokens = await cETH.balanceOfUnderlying.call(savingAccount.address, {
                        from: user1,
                    });

                    // transfer ETH from user 2 to user 1
                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2,
                    });

                    const balCETHContractAfterTransfer = await web3.eth.getBalance(cETH_addr);
                    const balCTokensAfterTransfer = await cETH.balanceOfUnderlying.call(
                        savingAccount.address,
                        {
                            from: user2,
                        }
                    );

                    // Verify the Compound balance after transfer
                    expect(balCETHContractAfterTransfer).to.be.bignumber.equal(balCETHContract);
                    expect(balCTokensAfterTransfer).to.be.bignumber.equal(balCTokens);

                    // Verify balances of user1 & user2 after transfer
                    let user1BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    let user2BalanceAfterTransfer = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );
                    expect(new BN(user1BalanceAfterTransfer)).to.be.bignumber.equal(
                        new BN(user1BalanceAfterDeposit).add(new BN(ETHtransferAmount))
                    );
                    expect(new BN(user2BalanceAfterTransfer)).to.be.bignumber.equal(
                        new BN(user1BalanceAfterDeposit).sub(new BN(ETHtransferAmount))
                    );
                });
            });
        });
    });
});
