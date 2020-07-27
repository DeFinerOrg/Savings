import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.repay", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

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
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForWBTC: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;
    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20USDT: t.ERC20Instance;
    let erc20WBTC: t.ERC20Instance;
    let erc20TUSD: t.ERC20Instance;
    let erc20MKR: t.ERC20Instance;
    let ZERO: any;
    let ONE_YEAR: any;
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    const numOfDAI = eighteenPrecision;
    const numOfWBTC = eightPrecision;
    const numOfUSDC = sixPrecision;
    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
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
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
        ZERO = new BN(0);
        ONE_YEAR = new BN(365).mul(new BN(24).mul(new BN(3600)));
    });

    context("Addtional tests for repay()", async () => {
        context(
            "Borrow out all the tokens in DeFiner, then repay, verify CToken and tokens in saving acount",
            async () => {
                it("Deposit DAI, borrows USDC and wants to withdraw", async () => {
                    /*
                     * Step 1
                     * Account 1 deposit 2 whole DAI and Account 1 deposit 1 whole USDC
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
                     * Account 1 borrows the 1 USDC from DeFiner
                     * To verify:
                     * CToken for USDC left in saving account
                     * USDC token left in saving account
                     */
                    const CTokenLeftBefore = new BN(
                        await cTokenUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const TokenLeftBefore = new BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    await savingAccount.borrow(addressUSDC, numOfUSDC, { from: user1 });
                    const CTokenLeft = new BN(
                        await cTokenUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const TokenLeft = new BN(await erc20USDC.balanceOf(savingAccount.address));
                    expect(CTokenLeft).to.be.bignumber.equal(ZERO);
                    expect(TokenLeft).to.be.bignumber.equal(ZERO);
                });
            }
        );

        // These tests can't be verified after integrated with compound
        // context("Checking saving account's value after repayment", async () => {
        //     context("Should succeed.", async () => {
        //         beforeEach(async () => {
        //             /*
        //              * Setting up collateral beforehand.
        //              * User1 deposit a whole DAI, and user2 deposit a whole USDC.
        //              * Give 1 extra DAI to user2 for repayment.
        //              * User2 then borrows half a DAI.
        //              * Saving account balance: 1.5*10^17 DAI, 3.5*10^17 cDAI
        //              */
        //             await erc20DAI.transfer(user1, numOfDAI);
        //             await erc20USDC.transfer(user2, numOfUSDC);
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
        //             await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
        //             await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
        //             await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
        //             await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
        //             await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), { from: user2 });
        //         });
        //         it("Repay all the outstandings DAI token", async () => {
        //             /*
        //              * Repay all the outstandings
        //              * After repayment, saving account balance: 1.5*10^17 DAI, 8.5*10^17 cDAI
        //              */

        //             const realCTokenBalanceBefore = await cTokenDAI.balanceOf(savingAccount.address);
        //             const realDAIBalanceBefore = await erc20DAI.balanceOf(savingAccount.address);
        //             await savingAccount.repay(addressDAI, numOfDAI.div(new BN(2)), { from: user2 });
        //             const expectedCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100));
        //             const expectedDAIBalance = numOfDAI.mul(new BN(15)).div(new BN(100));
        //             const realCTokenBalance = await cTokenDAI.balanceOf(savingAccount.address);
        //             const realDAIBalance = await erc20DAI.balanceOf(savingAccount.address);
        //             expect(expectedCTokenBalance).to.be.bignumber.equal(realCTokenBalance);
        //             expect(expectedDAIBalance).to.be.bignumber.equal(realDAIBalance);
        //         });
        //         it("Repay half the outstandings DAI token", async () => {
        //             /*
        //              * Repay 1/4 * 10^18 DAI
        //              * After repayment, saving account balance: 1.5*10^17 DAI, 6*10^17 cDAI
        //              */
        //             // 8.5*10^17 - 5*10^17 = 3.5*10^17 cDAI
        //             const expectedBeforeCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100)).sub(numOfDAI.div(new BN(2)));
        //             // 8.5*10^17 - 2.5*10^17 = 6*10^17 cDAI
        //             const expectedCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100)).sub(numOfDAI.div(new BN(4)));
        //             const expectedDAIBalance = numOfDAI.mul(new BN(15)).div(new BN(100));

        //             const realCTokenBalanceBefore = await cTokenDAI.balanceOf(savingAccount.address);
        //             const realDAIBalanceBefore = await erc20DAI.balanceOf(savingAccount.address);
        //             await savingAccount.repay(addressDAI, numOfDAI.div(new BN(4)), { from: user2 });
        //             const realCTokenBalance = await cTokenDAI.balanceOf(savingAccount.address);
        //             const realDAIBalance = await erc20DAI.balanceOf(savingAccount.address);

        //             expect(BN(realCTokenBalance).sub(BN(realCTokenBalanceBefore))).to.be.bignumber.equal(expectedCTokenBalance);
        //             expect(BN(realDAIBalance).sub(BN(realDAIBalanceBefore))).to.be.bignumber.equal(expectedDAIBalance);
        //         });
        //         it("Repay with a small amount of DAI token", async () => {
        //             /*
        //              * Repay 1/4 * 10^18 DAI
        //              * After repayment, saving account balance: 1.5*10^17 DAI + 10 DAI, 8.5*10^17 - 5*10^17
        //              */
        //             const realCTokenBalanceBefore = await cTokenDAI.balanceOf(savingAccount.address);
        //             const realDAIBalanceBefore = await erc20DAI.balanceOf(savingAccount.address);
        //             await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
        //             // 8.5*10^17 - 5*10^17 + 10 cDAI
        //             const expectedCTokenBalance = numOfDAI.mul(new BN(85)).div(new BN(100)).sub(numOfDAI.div(new BN(2)));
        //             const expectedDAIBalance = numOfDAI.mul(new BN(15)).div(new BN(100)).add(new BN(10));
        //             const realCTokenBalance = await cTokenDAI.balanceOf(savingAccount.address);
        //             const realDAIBalance = await erc20DAI.balanceOf(savingAccount.address);
        //             expect(BN(realCTokenBalance).sub(BN(realCTokenBalanceBefore))).to.be.bignumber.equal(expectedCTokenBalance);
        //             expect(BN(realDAIBalance).sub(BN(realDAIBalanceBefore))).to.be.bignumber.equal(expectedDAIBalance);
        //         });
        //     });
        // });
        context("Repay partially several times.", async () => {
            context("Use DAI, should succeed", async () => {
                beforeEach(async () => {
                    /*
                     * Setting up collateral beforehand.
                     * User1 deposit a whole DAI, and user2 deposit a whole USDC.
                     * Give 1 extra DAI to user2 for repayment.
                     * User2 then borrows half a DAI.
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                    await savingAccount.borrow(addressDAI, numOfDAI.div(new BN(2)), {
                        from: user2
                    });
                });
                it("Repay twice, every time repay 0.25 * 10^18 DAI tokens", async () => {
                    const quaterOfDAI = numOfDAI.div(new BN(4));
                    const userBalanceBeforeRepay = await savingAccount.tokenBalance(addressDAI, {
                        from: user2
                    });
                    expect(BN(userBalanceBeforeRepay[1])).to.be.bignumber.equal(
                        numOfDAI.div(new BN(2))
                    );
                    await savingAccount.repay(addressDAI, quaterOfDAI, { from: user2 });
                    const userBalanceAfterFirstRepay = await savingAccount.tokenBalance(
                        addressDAI,
                        { from: user2 }
                    );
                    expect(BN(userBalanceAfterFirstRepay[1])).to.be.bignumber.equal(
                        numOfDAI.div(new BN(4))
                    );
                    await savingAccount.repay(addressDAI, quaterOfDAI, { from: user2 });

                    const userBalanceAfterSecondRepay = await savingAccount.tokenBalance(
                        addressDAI,
                        { from: user2 }
                    );
                    expect(BN(userBalanceAfterSecondRepay[1])).to.be.bignumber.equal(ZERO);
                });
            });
            context("Use USDC, should succeed", async () => {
                beforeEach(async () => {
                    /*
                     * Setting up collateral beforehand.
                     * User1 deposit a whole DAI, and user2 deposit a whole USDC.
                     * Give 1 extra DAI to user2 for repayment.
                     * User1 then borrows half a USDC.
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user2, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                    await savingAccount.borrow(addressUSDC, numOfUSDC.div(new BN(2)), {
                        from: user1
                    });
                });
                it("Repay twice, every time repay 0.25 * 10^6 USDC tokens", async () => {
                    const quaterOfUSDC = numOfUSDC.div(new BN(4));
                    const USDCBalance = await erc20USDC.balanceOf(user1);
                    const userBalanceBeforeRepay = await savingAccount.tokenBalance(addressUSDC, {
                        from: user1
                    });

                    expect(BN(userBalanceBeforeRepay[1])).to.be.bignumber.equal(
                        numOfUSDC.div(new BN(2))
                    );
                    await savingAccount.repay(addressUSDC, quaterOfUSDC, { from: user1 });
                    const userBalanceAfterFirstRepay = await savingAccount.tokenBalance(
                        addressUSDC,
                        { from: user1 }
                    );
                    expect(BN(userBalanceAfterFirstRepay[1])).to.be.bignumber.equal(
                        numOfUSDC.div(new BN(4))
                    );
                    await savingAccount.repay(addressUSDC, quaterOfUSDC, { from: user1 });

                    const userBalanceAfterSecondRepay = await savingAccount.tokenBalance(
                        addressUSDC,
                        { from: user1 }
                    );

                    expect(BN(userBalanceAfterSecondRepay[1])).to.be.bignumber.equal(ZERO);
                });
            });
        });
        context("with WBTC, 8 decimals token", async () => {
            context("should succeed", async () => {
                beforeEach(async () => {
                    // 1.1 Set up collateral.
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20WBTC.transfer(user2, numOfWBTC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user2 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user2 });
                });

                it("when supported token address is passed", async () => {
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment DAI Amount is less than the loan amount.", async () => {
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(5), { from: user2 });
                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(5)
                    );
                });

                it("When the repayment DAI Amount is equal than the loan amount.", async () => {
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(10), { from: user2 });
                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment DAI Amount is greater than the loan amount.", async () => {
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });
                    // 2.1 Prepare more DAI.
                    await erc20DAI.transfer(user2, numOfDAI);
                    const user2BalanceBefore = await erc20DAI.balanceOf(user2);
                    // 3. Start repayment.
                    await savingAccount.repay(addressDAI, new BN(20), { from: user2 });
                    // 4. Verify the repay amount.
                    const user2BalanceAfter = await erc20DAI.balanceOf(user2);
                    expect(BN(user2BalanceBefore).sub(BN(user2BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment WBTC Amount is less than the loan amount.", async () => {
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });
                    const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
                    // 3. Start repayment.
                    await savingAccount.repay(addressWBTC, new BN(5), { from: user1 });
                    // 4. Verify the repay amount.
                    const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
                    expect(BN(user1BalanceBefore).sub(BN(user1BalanceAfter))).to.be.bignumber.equal(
                        new BN(5)
                    );
                });

                it("When the repayment WBTC Amount is equal than the loan amount.", async () => {
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });
                    const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
                    // 3. Start repayment.
                    await savingAccount.repay(addressWBTC, new BN(10), { from: user1 });
                    // 4. Verify the repay amount.
                    const user1BalanceAfter = await erc20WBTC.balanceOf(user1);
                    expect(BN(user1BalanceBefore).sub(BN(user1BalanceAfter))).to.be.bignumber.equal(
                        new BN(10)
                    );
                });

                it("When the repayment WBTC Amount is greater than the loan amount.", async () => {
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });
                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    // 2. Start borrowing.
                    await savingAccount.borrow(addressWBTC, new BN(10), { from: user1 });
                    // 2.1 Prepare more DAI.
                    await erc20WBTC.transfer(user1, numOfWBTC);
                    const user1BalanceBefore = await erc20WBTC.balanceOf(user1);
                    // 3. Start repayment.
                    await savingAccount.repay(addressWBTC, new BN(20), { from: user1 });
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
