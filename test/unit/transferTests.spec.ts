import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.ERC20Contract = artifacts.require("ERC20");

contract("SavingAccount.transfer", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenInfoRegistryInstance;
    let accountsContract: t.AccountsInstance;

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
    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20MKR: t.ERC20Instance;
    let erc20TUSD: t.ERC20Instance;
    let numOfToken: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
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
        numOfToken = new BN(1000);
    });

    context("transfer()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("B9: Not enough balance for transfer", async () => {
                    const numOfToken = new BN(1000);
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1, the amount of transfer is larger than user2's balance on DAI
                    let user1BalanceBefore = await erc20DAI.balanceOf(user1);
                    let user2BalanceBefore = await erc20DAI.balanceOf(user2);

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
                            from: user2
                        }),
                        "Insufficient balance."
                    );
                });

                it("N9: Not enough collatral for borrowed asset if transfer", async () => {
                    // 1. Transfer DAI to user1 & user2.
                    // 2. User2 borrow USDC and uses it's DAI as collateral
                    // 3. Transfer DAI from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
                    const numOfDAI = eighteenPrecision.mul(new BN(10));
                    const numOfUSDC = sixPrecision.mul(new BN(10));
                    const borrowAmount = numOfUSDC.div(new BN(10));
                    await erc20DAI.transfer(user2, numOfDAI);
                    await erc20USDC.transfer(user1, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                    //1. Deposit DAI & USDC
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user2 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

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

                    // Total remaining DAI after borrow
                    const remainingDAI = numOfDAI.sub(collateralLocked);

                    await expectRevert(
                        savingAccount.transfer(
                            user1,
                            addressDAI,
                            remainingDAI.add(eighteenPrecision),
                            {
                                from: user2
                            }
                        ),
                        "Insufficient collateral."
                    );
                });
            });

            context("Compound Supported 18 decimals Token", async () => {
                context("should succeed", async () => {
                    it("E9: Transfer small amount balance", async () => {
                        const numOfToken = new BN(1000);
                        // 1. Transfer DAI to user1 & user2.
                        // 2. Transfer DAI from user2 to user1. The amount of transfer should NOT trigger the compound token
                        // withdraw of user2 and compound token deposit of user1.
                        // 3. Verity the new balance
                        let user1BalanceBefore = await erc20DAI.balanceOf(user1);
                        let user2BalanceBefore = await erc20DAI.balanceOf(user2);

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

                        // Transfer 100 tokens from user2 to user1
                        await savingAccount.transfer(user1, addressDAI, new BN(100), {
                            from: user2
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
                    });

                    it("F9: Transfer large amount of balance", async () => {
                        // 1. Transfer DAI to user1 & user2.
                        // 2. Transfer DAI from user2 to user1. The amount of transfer should trigger the compound token
                        // withdraw of user2 and compound token deposit of user1.
                        // 3. Verify the new balance
                        let user1BalanceBefore = await erc20DAI.balanceOf(user1);
                        let user2BalanceBefore = await erc20DAI.balanceOf(user2);

                        const numOfToken = new BN(1000);
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

                        // transfer more than reserve
                        await savingAccount.transfer(user1, addressDAI, new BN(500), {
                            from: user2
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
                it("H9: Not enough balance for transfer", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1, the amount of transfer is larger than user2's balance on ETH
                    const ETHtransferAmount = eighteenPrecision.mul(eighteenPrecision);
                    let ETHbalanceOfUser2 = await web3.eth.getBalance(user2);
                    // Can't test this since the eth value is not set to 1000 now
                    // expect(ETHbalanceOfUser2).to.be.bignumber.lessThan(ETHtransferAmount);

                    await expectRevert(
                        savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                            from: user2
                        }),
                        "Insufficient balance."
                    );
                });

                it("Not enough collatral for borrowed asset if transfer (for ETH)", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. User2 borrow USDC and use it's ETH as collateral
                    // 3. Transfer ETH from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
                    const depositAmount = new BN(10000);
                    const ETHtransferAmount = new BN(1100);
                    const USDCBorrowAmount = new BN(600);

                    const user1BalanceUSDCInit = await erc20USDC.balanceOf(user1);
                    const user2BalanceUSDCInit = await erc20USDC.balanceOf(user2);
                    console.log("user1BalanceUSDCInit", user1BalanceUSDCInit);
                    console.log("user2BalanceUSDCInit", user2BalanceUSDCInit);

                    // User 1 deposits USDC
                    await erc20USDC.transfer(user1, depositAmount);
                    await erc20USDC.approve(savingAccount.address, depositAmount, {
                        from: user1
                    });
                    await savingAccount.deposit(addressUSDC, depositAmount, { from: user1 });

                    const expectedTokensAtSavingAccountContractUSDC = depositAmount
                        .mul(new BN(15))
                        .div(new BN(100));
                    const balSavingAccountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                    expect(expectedTokensAtSavingAccountContractUSDC).to.be.bignumber.equal(
                        balSavingAccountUSDC
                    );

                    // User 1 deposits ETH
                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const ETHbalanceBeforeDepositUser = await web3.eth.getBalance(user1);

                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        value: eighteenPrecision,
                        from: user1
                    });

                    // User 2 deposits ETH
                    await savingAccount.deposit(ETH_ADDRESS, eighteenPrecision, {
                        value: eighteenPrecision,
                        from: user2
                    });

                    // verify deposit
                    const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                    expect(new BN(ETHbalanceAfterDeposit)).to.be.bignumber.equal(
                        new BN(eighteenPrecision)
                            .mul(new BN(2))
                            .mul(new BN(15))
                            .div(new BN(100))
                    );

                    const user2BalanceUSDCBeforeBorrow = await erc20USDC.balanceOf(user2);

                    // User 2 borrowed USDC
                    await savingAccount.borrow(addressUSDC, USDCBorrowAmount, { from: user2 });

                    // Verify the loan amount.
                    const user2BalanceUSDC = await erc20USDC.balanceOf(user2);
                    expect(
                        new BN(user2BalanceUSDC).sub(new BN(user2BalanceUSDCBeforeBorrow))
                    ).to.be.bignumber.equal(new BN(600));

                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2
                    });
                });
            });

            context("should succeed", async () => {
                it("K9: Transfer small amount balance", async () => {
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

                    let user1TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user1
                    );
                    let user2TotalBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        user2
                    );

                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user1
                    });
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2
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
                    const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                    expect(ETHbalanceAfterDeposit).to.be.bignumber.equal(
                        new BN(2000).mul(new BN(15)).div(new BN(100))
                    );

                    // transfer ETH from user2 to user1
                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2
                    });
                    // Error: -- Reason given: Insufficient collateral..

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
                });

                it("L9: Transfer large amount of balance", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1. The amount of transfer should trigger the compound token
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verify the new balance
                    const depositAmount = new BN(1000);
                    const ETHtransferAmount = new BN(500);

                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const ETHbalanceBeforeDepositUser = await web3.eth.getBalance(user1);

                    // deposit ETH
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user1
                    });
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2
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
                    const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                    expect(ETHbalanceAfterDeposit).to.be.bignumber.equal(
                        new BN(2000).mul(new BN(15)).div(new BN(100))
                    );

                    // transfer ETH from user 2 to user 1
                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2
                    });

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
                });
            });
        });
    });
});
