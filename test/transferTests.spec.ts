import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");

contract("SavingAccount.transfer", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let numOfToken: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20MKR = await MockERC20.at(addressMKR);
        erc20TUSD = await MockERC20.at(addressTUSD);
        numOfToken = new BN(1000);
    });

    context("transfer()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("Not enough balance for transfer", async () => {
                    const numOfToken = new BN(1000);
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1, the amount of transfer is larger than user2's balance on DAI
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                    let user1Balance = await erc20DAI.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(numOfToken);

                    let user2Balance = await erc20DAI.balanceOf(user2);
                    expect(user2Balance).to.be.bignumber.equal(numOfToken);

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                    await expectRevert(
                        savingAccount.transfer(user1, addressDAI, new BN(2000), {
                            from: user2
                        }),
                        "Insufficient balance."
                    );
                });

                it("Not enough collatral for borrowed asset if transfer");
                // 1. Transfer DAI to user1 & user2.
                // 2. User2 borrow USDC and use it's DAI as collateral
                // 3. Transfer DAI from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
            });

            context("should succeed", async () => {
                it("Transfer small amount balance", async () => {
                    const numOfToken = new BN(1000);
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1. The amount of transfer should NOT trigger the compound token
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verity the new balance
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                    let user1Balance = await erc20DAI.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(numOfToken);

                    let user2Balance = await erc20DAI.balanceOf(user2);
                    expect(user2Balance).to.be.bignumber.equal(numOfToken);

                    /* let user1BalanceBeforeTransfer = await savingAccount.getAccountTotalUsdValue(
                        user1
                    );
                    console.log(
                        "user1BalanceBeforeTransfer",
                        user1BalanceBeforeTransfer.toString()
                    ); */

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                    /* let user1BalanceAfterDeposit = await savingAccount.getAccountTotalUsdValue(
                        user1
                    );
                    console.log("user1BalanceAfterDeposit", user1BalanceAfterDeposit.toString()); */

                    await savingAccount.transfer(user1, addressDAI, new BN(100), {
                        from: user2
                    });

                    let user1BalanceAfterTransfer = await savingAccount.getAccountTotalUsdValue(
                        user1
                    );
                    console.log("user1BalanceAfterTransfer", user1BalanceAfterTransfer.toString());

                    // FIXME:
                    /* expect(user1BalanceAfterTransfer).to.be.bignumber.equal(
                        numOfToken.add(new BN(10))
                    ); */
                });

                it("Transfer large amount of balance", async () => {
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1. The amount of transfer should trigger the compound token
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verify the new balance
                    const numOfToken = new BN(1000);
                    await erc20DAI.transfer(user1, numOfToken);
                    await erc20DAI.transfer(user2, numOfToken);
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, numOfToken, { from: user2 });

                    let user1Balance = await erc20DAI.balanceOf(user1);
                    expect(user1Balance).to.be.bignumber.equal(numOfToken);

                    let user2Balance = await erc20DAI.balanceOf(user2);
                    expect(user2Balance).to.be.bignumber.equal(numOfToken);

                    await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfToken, { from: user2 });

                    // transfer more than reserve
                    await savingAccount.transfer(user1, addressDAI, new BN(500), {
                        from: user2
                    });

                    // FIXME:
                    /* expect(user1BalanceAfterTransfer).to.be.bignumber.equal(
                        numOfToken.add(new BN(10))
                    ); */
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("Not enough balance for transfer", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1, the amount of transfer is larger than user2's balance on ETH
                    const ETHtransferAmount = new BN(10000).mul(eighteenPrecision);
                    let ETHbalanceOfUser2 = await web3.eth.getBalance(user2);
                    expect(ETHbalanceOfUser2).to.be.bignumber.lessThan(ETHtransferAmount);

                    await expectRevert(
                        savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                            from: user2
                        }),
                        "Insufficient balance."
                    );
                });

                it("Not enough collatral for borrowed asset if transfer");
                // 1. Transfer ETH to user1 & user2.
                // 2. User2 borrow USDC and use it's ETH as collateral
                // 3. Transfer ETH from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
            });

            context("should succeed", async () => {
                it("Transfer small amount balance", async () => {
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

                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user1
                    });
                    await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                        value: depositAmount,
                        from: user2
                    });

                    // validate savingAccount ETH balance
                    const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                    expect(ETHbalanceAfterDeposit).to.be.bignumber.equal(new BN(2000));

                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2
                    });

                    const ETHbalanceAfterDepositUser = await web3.eth.getBalance(user1);
                    /* expect(ETHbalanceBeforeDepositUser).to.be.bignumber.equal(
                        ETHbalanceAfterDepositUser
                    ); */
                });

                it("Transfer large amount of balance", async () => {
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

                    // validate savingAccount ETH balance
                    const ETHbalanceAfterDeposit = await web3.eth.getBalance(savingAccount.address);
                    expect(ETHbalanceAfterDeposit).to.be.bignumber.equal(new BN(2000));

                    // transfer ETH from user 2 to user 1
                    await savingAccount.transfer(user1, ETH_ADDRESS, ETHtransferAmount, {
                        from: user2
                    });

                    const ETHbalanceAfterDepositUser = await web3.eth.getBalance(user1);
                    /* expect(ETHbalanceBeforeDepositUser).to.be.bignumber.equal(
                        ETHbalanceAfterDepositUser
                    ); */
                });
            });
        });
    });
});
