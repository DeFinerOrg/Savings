import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");

contract("SavingAccount.deposit", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
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
    const eightPrecision = new BN(10).pow(new BN(8));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cWBTC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;

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
        bank = await testEngine.bank;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];

        erc20WBTC = await ERC20.at(addressWBTC);
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);

        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        //console.log("addressCETH", addressCETH);
    });

    context("deposit()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("should succeed", async () => {
                    it("C5: when small amount of ETH is passed", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(100);
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        await savingAccount.fastForward(1000);
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

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
                    });

                    it("C6: when 1000 whole ETH are deposited", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(web3.utils.toWei("1000", "ether"));
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });
                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

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
                    });

                    it("when 100 whole ETH are deposited then some small ETH is deposited so that Compound is not triggered", async () => {
                        const depositAmount = new BN(web3.utils.toWei("100", "ether"));
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });
                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

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

                        // Deposit some ETH again
                        const depositAmount2 = new BN(1000);
                        const balCTokensBefore2 = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const ETHbalanceBeforeDeposit2 = new BN(
                            await web3.eth.getBalance(savingAccount.address)
                        );

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount2, {
                            value: depositAmount2
                        });

                        const ETHbalanceAfterDepositAgain = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Verify second deposit
                        await savAccBalVerify(
                            0,
                            depositAmount2,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensBefore2,
                            ETHbalanceBeforeDeposit2,
                            bank,
                            savingAccount
                        );

                        const expectedTokensAtSavingAccountContract = new BN(depositAmount)
                            .mul(new BN(15))
                            .div(new BN(100));
                        const expectedTokensAtSavingAccountContract2 = new BN(
                            expectedTokensAtSavingAccountContract
                        ).add(depositAmount2);

                        expect(new BN(ETHbalanceAfterDepositAgain)).to.be.bignumber.equal(
                            expectedTokensAtSavingAccountContract2
                        );

                        // Verify that deposit affects Compound balance
                        await savAccBalVerify(
                            0,
                            depositAmount2,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensBefore2,
                            new BN(ETHbalanceBeforeDeposit2),
                            bank,
                            savingAccount
                        );
                    });

                    it("when 100 whole ETH are deposited then some ETH is deposited so that Compound is triggered", async () => {
                        const depositAmount = new BN(web3.utils.toWei("100", "ether"));
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const balCTokensBefore = BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

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

                        // Deposit some ETH again
                        const balCTokensBefore2 = BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const ETHbalanceBeforeDeposit2 = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        // Verify that deposit affects Compound balance
                        await savAccBalVerify(
                            0,
                            depositAmount,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensBefore2,
                            new BN(ETHbalanceBeforeDeposit2),
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound Supported 18 decimals Token", async () => {
                context("Should suceed", async () => {
                    //single token, small amount
                    it("D5: when small amount of DAI is deposited", async function() {
                        this.timeout(0);
                        // 1. Approve 1000 tokens
                        const numOfToken = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, numOfToken);

                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20DAI.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const balSavingAccountUserAfter = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        await savAccBalVerify(
                            0,
                            numOfToken,
                            erc20DAI.address,
                            cDAI,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );
                    });

                    //single token, large amount
                    it("D6: when 1000 whole DAI are deposited", async function() {
                        this.timeout(0);
                        const ONE_DAI = new BN(10).pow(new BN(18));

                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("1000").mul(ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, numOfToken);

                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20DAI.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const balSavingAccountUserAfter = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        await savAccBalVerify(
                            0,
                            numOfToken,
                            erc20DAI.address,
                            cDAI,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound Supported 6 decimals Token", async () => {
                context("Should succeed", async () => {
                    it("F5: when small amount of USDC tokens are deposited", async function() {
                        this.timeout(0);
                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("100");
                        await erc20USDC.approve(savingAccount.address, numOfToken);

                        const balSavingAccountUserBefore = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20USDC.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        await savAccBalVerify(
                            0,
                            numOfToken,
                            erc20USDC.address,
                            cUSDC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );
                    });

                    it("F6: when 1000 whole USDC tokens are deposited", async function() {
                        this.timeout(0);
                        const ONE_USDC = new BN(10).pow(new BN(6));

                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("1000").mul(ONE_USDC);
                        await erc20USDC.approve(savingAccount.address, numOfToken);

                        const balSavingAccountUserBefore = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );

                        const balCTokensBefore = new BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20USDC.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const balSavingAccountUserAfter = await erc20USDC.balanceOf(
                            savingAccount.address
                        );

                        await savAccBalVerify(
                            0,
                            numOfToken,
                            erc20USDC.address,
                            cUSDC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound unsupported Token", async () => {
                context("Should succeed", async () => {
                    // When Compound unsupported tokens are passed
                    it("G5: when TUSD address is passed", async function() {
                        this.timeout(0);
                        // 1. Approve 1000 tokens
                        const numOfToken = new BN(1000);
                        await erc20TUSD.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20TUSD.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken;
                        const balSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
                    });

                    it("G4: when 1000 whole TUSD tokens are deposited", async function() {
                        this.timeout(0);
                        const ONE_TUSD = new BN(10).pow(new BN(18));

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );

                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("1000").mul(ONE_TUSD);
                        await erc20TUSD.approve(savingAccount.address, numOfToken);

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20TUSD.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken;
                        const balSavingAccount = await erc20TUSD.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
                    });

                    it("G5: when MKR address is passed", async function() {
                        this.timeout(0);
                        // 1. Approve 1000 tokens
                        const numOfToken = new BN(1000);
                        await erc20MKR.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20MKR.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken;
                        const balSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
                    });

                    it("G4: when 1000 whole MKR tokens are deposited", async function() {
                        this.timeout(0);
                        const ONE_MKR = new BN(10).pow(new BN(18));

                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("1000").mul(ONE_MKR);
                        await erc20MKR.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20MKR.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken;
                        const balSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);
                    });
                });
            });

            context("should fail", async () => {
                it("when unsupported token address is passed", async function() {
                    this.timeout(0);
                    const numOfToken = new BN(1000);
                    await expectRevert(
                        savingAccount.deposit(dummy, numOfToken),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function() {
                    this.timeout(0);
                    const deposits = new BN(0);

                    await expectRevert(
                        savingAccount.deposit(erc20DAI.address, deposits),
                        "Amount is zero"
                    );
                });
            });
        });

        context("With multiple tokens", async () => {
            context("Should suceed", async () => {
                it("Deposit DAI and USDC, both compound supported", async function() {
                    this.timeout(0);
                    /*
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 DAI and 1 USDC
                     */
                    const userDAIBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );
                    const userUSDCBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    const savingsCompoundDAIBeforeDeposit = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsDAIBeforeDeposit = new BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const savingsCompoundUSDCBeforeDeposit = new BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsUSDCBeforeDeposit = new BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user1, sixPrecision.mul(new BN(1)));

                    await savingAccount.fastForward(1000);

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(1)), {
                        from: user1
                    });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), {
                        from: user1
                    });

                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(1)), {
                        from: user1
                    });

                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 DAI and 1 USDC
                     * 2. CToken left in saving account should be 85% of total tokens
                     * 3. Token left in saving account should be 15% of total tokens
                     */
                    await savAccBalVerify(
                        0,
                        eighteenPrecision.mul(new BN(1)),
                        erc20DAI.address,
                        cDAI,
                        savingsCompoundDAIBeforeDeposit,
                        savingsDAIBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        0,
                        sixPrecision.mul(new BN(1)),
                        erc20USDC.address,
                        cUSDC,
                        savingsCompoundUSDCBeforeDeposit,
                        savingsUSDCBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const userDAIBalance = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    const userUSDCBalance = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    // verify 1.
                    expect(BN(userDAIBalance).sub(BN(userDAIBalanceBefore))).to.be.bignumber.equals(
                        eighteenPrecision
                    );
                    expect(
                        BN(userUSDCBalance).sub(BN(userUSDCBalanceBefore))
                    ).to.be.bignumber.equals(sixPrecision);
                });
                it("Deposit WBTC and TUSD, compound supported and unsupported", async function() {
                    this.timeout(0);
                    /*
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 WBTC and 1 TUSD
                     */
                    const userWBTCBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressWBTC,
                        user1
                    );
                    const userTUSDBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );

                    // const savingAccountCTUSDTokenBefore = await cTUSD.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                    await erc20TUSD.transfer(user1, eighteenPrecision);

                    await erc20WBTC.approve(savingAccount.address, eightPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

                    const savingsCompoundWBTCBeforeDeposit = new BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsWBTCBeforeDeposit = new BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressWBTC, eightPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision, {
                        from: user1
                    });
                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 WBTC and 1 TUSD
                     * 2. CToken left in saving account should be 85% of total tokens
                     * 3. Token left in saving account should be 15% of total tokens
                     */
                    const userWBTCBalance = await accountsContract.getDepositBalanceCurrent(
                        addressWBTC,
                        user1
                    );
                    const userTUSDBalance = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );

                    await savAccBalVerify(
                        0,
                        eightPrecision.mul(new BN(1)),
                        erc20WBTC.address,
                        cWBTC,
                        savingsCompoundWBTCBeforeDeposit,
                        savingsWBTCBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    // verify 1.
                    expect(
                        BN(userWBTCBalance).sub(BN(userWBTCBalanceBefore))
                    ).to.be.bignumber.equals(eightPrecision);
                    expect(
                        BN(userTUSDBalance).sub(BN(userTUSDBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                });
                it("Deposit MKR and TUSD, both compound unsupported", async function() {
                    this.timeout(0);
                    /*
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 MKR and 1 TUSD
                     */
                    const userMKRBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressMKR,
                        user1
                    );
                    const userTUSDBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );
                    const savingAccountMKRTokenBefore = await erc20MKR.balanceOf(
                        savingAccount.address
                    );
                    const savingAccountTUSDTokenBefore = await erc20TUSD.balanceOf(
                        savingAccount.address
                    );
                    // const savingAccountCMKRTokenBefore = await cMKR.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    // const savingAccountCTUSDTokenBefore = await cTUSD.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    await erc20MKR.transfer(user1, eighteenPrecision.mul(new BN(1)));
                    await erc20TUSD.transfer(user1, eighteenPrecision.mul(new BN(1)));

                    await erc20MKR.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 MKR and 1 TUSD
                     *
                     * 2. Token left in saving account should be 100% of total tokens
                     */
                    const userMKRBalance = await accountsContract.getDepositBalanceCurrent(
                        addressMKR,
                        user1
                    );
                    const userTUSDBalance = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );
                    const savingAccountMKRToken = await erc20MKR.balanceOf(savingAccount.address);
                    const savingAccountTUSDToken = await erc20TUSD.balanceOf(savingAccount.address);

                    // verify 1.
                    expect(BN(userMKRBalance).sub(BN(userMKRBalanceBefore))).to.be.bignumber.equals(
                        eighteenPrecision
                    );
                    expect(
                        BN(userTUSDBalance).sub(BN(userTUSDBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                    // verify 2.
                    expect(
                        BN(savingAccountMKRToken).sub(BN(savingAccountMKRTokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                    expect(
                        BN(savingAccountTUSDToken).sub(BN(savingAccountTUSDTokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                });
            });
        });
    });
});
