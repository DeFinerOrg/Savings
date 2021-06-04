import { TokenRegistryContract } from "./../../../types/truffle-contracts/index.d";
import { BigNumber } from "bignumber.js";
import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../../test-helpers/lib/lib";
import { takeSnapshot, revertToSnapShot } from "../../../test-helpers/SnapshotUtils";
let snapshotId: string;

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

contract("SavingAccount.withdraw", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

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
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cETH_addr: any;
    let cETH: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;

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
    let ONE_DAI: any;
    let ONE_USDC: any;
    let ZERO: any;
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
        accountsContract = await testEngine.accounts;
        bank = await testEngine.bank;
        // initialization.
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
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        cETH = await MockCToken.at(cETH_addr);

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
        ONE_USDC = sixPrecision;
        ZERO = new BN(0);
        // Take snapshot of the EVM before each test
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    context("withdraw()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("should succeed", async () => {
                    it("C3: when partial ETH withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(1000);
                        const withdrawAmount = new BN(20);
                        await savingAccount.fastForward(1000);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );
                        let ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount,
                        });

                        // Validate the total balance on DeFiner after deposit
                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                        const balCTokensAfterDeposit = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
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

                        // Withdrawing ETH
                        await savingAccount.withdraw(ETH_ADDRESS, withdrawAmount);

                        let ETHbalanceAfterWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        let accountBalanceDiff = new BN(ETHbalanceBeforeWithdraw).sub(
                            new BN(ETHbalanceAfterWithdraw)
                        );

                        // Validate savingAccount ETH balance
                        expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount);

                        // Validate DeFiner balance
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensAfterDeposit,
                            new BN(ETHbalanceBeforeWithdraw),
                            bank,
                            savingAccount
                        );
                    });

                    it("C6: when 100 whole ETH withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(web3.utils.toWei("1000", "ether"));
                        const withdrawAmount = new BN(web3.utils.toWei("100", "ether"));
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = await cETH.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        let ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount,
                        });

                        // Validate the total balance on DeFiner after deposit
                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                        const balCTokensAfterDeposit = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
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

                        // Withdrawing ETH
                        await savingAccount.withdraw(ETH_ADDRESS, withdrawAmount);

                        let ETHbalanceAfterWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        let accountBalanceDiff = new BN(ETHbalanceBeforeWithdraw).sub(
                            new BN(ETHbalanceAfterWithdraw)
                        );

                        // Validate DeFiner balance
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensAfterDeposit,
                            new BN(ETHbalanceBeforeWithdraw),
                            bank,
                            savingAccount
                        );
                    });

                    it("C4: when full ETH withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(web3.utils.toWei("100", "ether"));
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const compCETHBefore = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        const balCTokensBefore = await cETH.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        let ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount,
                        });

                        // Validate the total balance on DeFiner after deposit
                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                        const balCTokensAfterDeposit = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
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

                        // Withdrawing ETH
                        await savingAccount.withdrawAll(ETH_ADDRESS);

                        // Validate savingAccount ETH balance
                        await savAccBalVerify(
                            1,
                            depositAmount,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensAfterDeposit,
                            new BN(ETHbalanceBeforeWithdraw),
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound Supported 18 decimals Token", async () => {
                context("Should suceed", async () => {
                    it("D3: when partial tokens are withdrawn", async function () {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20DAI.approve(savingAccount.address, numOfTokens);

                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const savingAccountCDAITokenAfterDeposit = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountDAITokenAfterDeposit = BN(
                            await erc20DAI.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            numOfTokens,
                            erc20DAI.address,
                            cDAI,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );
                        let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20DAI.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdrawAmount
                        );

                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            erc20DAI.address,
                            cDAI,
                            savingAccountCDAITokenAfterDeposit,
                            savingAccountDAITokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    it("D6: when 100 whole suported tokens are withdrawn", async function () {
                        this.timeout(0);
                        const ONE_DAI = new BN(10).pow(new BN(18));
                        const numOfTokens = new BN("1000").mul(ONE_DAI);
                        const withdrawAmount = new BN("100").mul(ONE_DAI);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // Approve 1000 tokens
                        await erc20DAI.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const savingAccountCDAITokenAfterDeposit = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountDAITokenAfterDeposit = BN(
                            await erc20DAI.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            numOfTokens,
                            erc20DAI.address,
                            cDAI,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20DAI.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            erc20DAI.address,
                            cDAI,
                            savingAccountCDAITokenAfterDeposit,
                            savingAccountDAITokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    it("D4: when full tokens withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(1000);
                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await erc20DAI.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(owner);
                        let accountBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);

                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const compCDAIBefore = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );

                        const compDAIBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const savingAccountCDAITokenAfterDeposit = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountDAITokenAfterDeposit = BN(
                            await erc20DAI.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            depositAmount,
                            erc20DAI.address,
                            cDAI,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // Withdrawing DAI
                        await savingAccount.withdrawAll(erc20DAI.address);
                        let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(owner);

                        let cDAIAfterWithdraw = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );

                        expect(cDAIAfterWithdraw).to.be.bignumber.equals(new BN(0));

                        // Verify user balance
                        expect(userBalanceBeforeWithdrawDAI).to.be.bignumber.equal(
                            userBalanceAfterWithdrawDAI
                        );

                        await savAccBalVerify(
                            1,
                            depositAmount,
                            erc20DAI.address,
                            cDAI,
                            savingAccountCDAITokenAfterDeposit,
                            savingAccountDAITokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    it("D4: when full tokens withdrawn after some blocks", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, new BN(1500));
                        let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(owner);
                        let accountBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                owner
                            );
                        const compCDAIBefore = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );

                        const compDAIBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, depositAmount);

                        const savingAccountCDAITokenAfterDeposit = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountDAITokenAfterDeposit = BN(
                            await erc20DAI.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            depositAmount,
                            erc20DAI.address,
                            cDAI,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        await savingAccount.fastForward(10000);
                        // deposit for rate checkpoint
                        await savingAccount.deposit(erc20DAI.address, new BN(10));

                        // Withdrawing DAI
                        await savingAccount.withdrawAll(erc20DAI.address);
                        let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(owner);

                        // Verify user balance
                        expect(userBalanceBeforeWithdrawDAI).to.be.bignumber.equal(
                            userBalanceAfterWithdrawDAI
                        );

                        await savAccBalVerify(
                            1,
                            depositAmount,
                            erc20DAI.address,
                            cDAI,
                            savingAccountCDAITokenAfterDeposit,
                            savingAccountDAITokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound Supported 6 decimals Token", async () => {
                context("Should succeed", async () => {
                    //Partial withdrawal of tokens with 6 decimals
                    it("F3: when partial USDC withdrawn", async function () {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20USDC.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDC.address,
                                owner
                            );

                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);
                        const balSavingAccountUserBefore = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20USDC.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDC.address,
                                owner
                            );
                        const savingAccountCUSDCTokenAfterDeposit = BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountUSDCTokenAfterDeposit = BN(
                            await erc20USDC.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            numOfTokens,
                            erc20USDC.address,
                            cUSDC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );
                        let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20USDC.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            erc20USDC.address,
                            cUSDC,
                            savingAccountCUSDCTokenAfterDeposit,
                            savingAccountUSDCTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    it("F6: when 100 whole USDC tokens are withdrawn", async function () {
                        this.timeout(0);
                        const ONE_USDC = new BN(10).pow(new BN(6));
                        const withdrawAmount = new BN("100").mul(ONE_USDC);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDC.address,
                                owner
                            );
                        const balSavingAccountUserBefore = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);
                        const balCTokensBefore = new BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // Approve 1000 tokens
                        const numOfTokens = new BN("1000").mul(ONE_USDC);
                        await erc20USDC.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20USDC.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDC.address,
                                owner
                            );
                        const savingAccountCUSDCTokenAfterDeposit = BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountUSDCTokenAfterDeposit = BN(
                            await erc20USDC.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            numOfTokens,
                            erc20USDC.address,
                            cUSDC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20USDC.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate savingAccount contract balance
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            erc20USDC.address,
                            cUSDC,
                            savingAccountCUSDCTokenAfterDeposit,
                            savingAccountUSDCTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    // Full withdrawal of tokens with 6 decimals
                    it("F4: when full USDC withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(1000);
                        await erc20USDC.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawUSDC = await erc20USDC.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDC.address,
                                owner
                            );
                        let accountBalanceBeforeWithdrawUSDC = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalancBeforeWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDC.address,
                                owner
                            );
                        const compCUSDCBefore = await cUSDC.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);
                        const balSavingAccountUserBefore = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20USDC.address, depositAmount);

                        const savingAccountCUSDCTokenAfterDeposit = BN(
                            await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountUSDCTokenAfterDeposit = BN(
                            await erc20USDC.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            depositAmount,
                            erc20USDC.address,
                            cUSDC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // Withdrawing USDC
                        await savingAccount.withdrawAll(erc20USDC.address);
                        let userBalanceAfterWithdrawUSDC = await erc20USDC.balanceOf(owner);
                        let accountBalanceAfterWithdrawUSDC = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdrawUSDC).to.be.bignumber.equal(
                            userBalanceAfterWithdrawUSDC
                        );

                        // Verify DeFiner balance
                        await savAccBalVerify(
                            1,
                            depositAmount,
                            erc20USDC.address,
                            cUSDC,
                            savingAccountCUSDCTokenAfterDeposit,
                            savingAccountUSDCTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    it("F3: when partial USDT withdrawn", async function () {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20USDT.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDT.address,
                                owner
                            );
                        let accountBalanceBeforeWithdrawUSDT = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20USDT.balanceOf(cUSDT_addr);
                        const balSavingAccountUserBefore = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cUSDT.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20USDT.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDT.address,
                                owner
                            );
                        const savingAccountCUSDTTokenAfterDeposit = BN(
                            await cUSDT.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountUSDTTokenAfterDeposit = BN(
                            await erc20USDT.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            numOfTokens,
                            erc20USDT.address,
                            cUSDT,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20USDT.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20USDT.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20USDT.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate savingAccount contract balance
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            erc20USDT.address,
                            cUSDT,
                            savingAccountCUSDTTokenAfterDeposit,
                            savingAccountUSDTTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    it("F4: when full USDT withdrawn", async () => {
                        const depositAmount = new BN(1000);
                        await erc20USDT.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawUSDT = await erc20USDT.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDT.address,
                                owner
                            );
                        let accountBalanceBeforeWithdrawUSDT = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20USDT.address,
                                owner
                            );
                        const compUSDTBefore = await erc20USDT.balanceOf(cUSDT_addr);
                        const compCUSDTBefore = await cUSDT.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20USDT.balanceOf(cUSDT_addr);
                        const balSavingAccountUserBefore = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cUSDT.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20USDT.address, depositAmount);

                        const savingAccountCUSDTTokenAfterDeposit = BN(
                            await cUSDT.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountUSDTTokenAfterDeposit = BN(
                            await erc20USDT.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            depositAmount,
                            erc20USDT.address,
                            cUSDT,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // Withdrawing USDT
                        await savingAccount.withdrawAll(erc20USDT.address);
                        let userBalanceAfterWithdrawUSDT = await erc20USDT.balanceOf(owner);

                        expect(userBalanceBeforeWithdrawUSDT).to.be.bignumber.equal(
                            userBalanceAfterWithdrawUSDT
                        );

                        // Verify DeFiner balance
                        await savAccBalVerify(
                            1,
                            depositAmount,
                            erc20USDT.address,
                            cUSDT,
                            savingAccountCUSDTTokenAfterDeposit,
                            savingAccountUSDTTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound Supported 8 decimals Token", async () => {
                context("Should succeed", async () => {
                    //Partial withdrawal of tokens with 8 decimals
                    it("E3: when partial WBTC withdrawn", async function () {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20WBTC.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20WBTC.address,
                                owner
                            );
                        const accountBalanceBeforeWithdrawWBTC = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20WBTC.balanceOf(cWBTC_addr);
                        const balSavingAccountUserBefore = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20WBTC.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        let userBalanceBeforeWithdraw = await erc20WBTC.balanceOf(owner);

                        const savingAccountCWBTCTokenAfterDeposit = BN(
                            await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountWBTCTokenAfterDeposit = BN(
                            await erc20WBTC.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            numOfTokens,
                            erc20WBTC.address,
                            cWBTC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20WBTC.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20WBTC.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw
                        await savAccBalVerify(
                            1,
                            withdrawAmount,
                            erc20WBTC.address,
                            cWBTC,
                            savingAccountCWBTCTokenAfterDeposit,
                            savingAccountWBTCTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });

                    // Full withdrawal of tokens with 8 decimals
                    it("E4: when full WBTC withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(1000);

                        await erc20WBTC.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawWBTC = await erc20WBTC.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20WBTC.address,
                                owner
                            );
                        const totalDefinerBalancBeforeWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20WBTC.address,
                                owner
                            );
                        let accountBalanceBeforeWithdrawWBTC = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        const compWBTCBefore = await erc20WBTC.balanceOf(cWBTC_addr);
                        const compCWBTCBefore = await cWBTC.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20WBTC.balanceOf(cWBTC_addr);
                        const balSavingAccountUserBefore = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20WBTC.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const savingAccountCWBTCTokenAfterDeposit = BN(
                            await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountWBTCTokenAfterDeposit = BN(
                            await erc20WBTC.balanceOf(savingAccount.address)
                        );

                        await savAccBalVerify(
                            0,
                            depositAmount,
                            erc20WBTC.address,
                            cWBTC,
                            balCTokensBefore,
                            BN(balSavingAccountUserBefore),
                            bank,
                            savingAccount
                        );

                        // Withdrawing WBTC
                        await savingAccount.withdrawAll(erc20WBTC.address);
                        let userBalanceAfterWithdrawWBTC = await erc20WBTC.balanceOf(owner);
                        let accountBalanceAfterWithdrawWBTC = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdrawWBTC).to.be.bignumber.equal(
                            userBalanceAfterWithdrawWBTC
                        );
                        expect(
                            BN(accountBalanceAfterWithdrawWBTC).sub(
                                BN(accountBalanceBeforeWithdrawWBTC)
                            )
                        ).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        await savAccBalVerify(
                            1,
                            depositAmount,
                            erc20WBTC.address,
                            cWBTC,
                            savingAccountCWBTCTokenAfterDeposit,
                            savingAccountWBTCTokenAfterDeposit,
                            bank,
                            savingAccount
                        );
                    });
                });
            });

            context("Compound unsupported Token", async () => {
                context("Should succeed", async () => {
                    it("G3: when partial TUSD withdrawn", async function () {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20TUSD.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20TUSD.address,
                                owner
                            );

                        // deposit tokens
                        await savingAccount.deposit(erc20TUSD.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20TUSD.address,
                                owner
                            );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                        // Withdraw Token from SavingContract

                        await savingAccount.withdraw(erc20TUSD.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(new BN(20));
                        const newbalSavingAccount = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20TUSD.address,
                                owner
                            );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdrawAmount
                        );
                    });

                    it("G6: when 1000 whole TUSD withdrawn", async function () {
                        this.timeout(0);
                        const ONE_TUSD = new BN(10).pow(new BN(18));
                        const newbalSavingAccountInit = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );

                        // Approve 1000 tokens
                        const numOfTokens = new BN("10000").mul(ONE_TUSD);
                        await erc20TUSD.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20TUSD.address, numOfTokens);

                        // Number of tokens to withdraw
                        const withdrawAmount = new BN("1000").mul(ONE_TUSD);

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20TUSD.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(
                            new BN("1000").mul(ONE_TUSD)
                        );
                        const newbalSavingAccount = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            new BN(newbalSavingAccount).sub(new BN(newbalSavingAccountInit))
                        );
                    });

                    it("G3: when partial MKR withdrawn", async function () {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);

                        await erc20MKR.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20MKR.address,
                                owner
                            );

                        // deposit tokens
                        await savingAccount.deposit(erc20MKR.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20MKR.address,
                                owner
                            );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        // Number of tokens to withdraw
                        const withdrawAmount = new BN(20);

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20MKR.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(new BN(20));
                        const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20MKR.address,
                                owner
                            );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdrawAmount
                        );
                    });

                    it("G6: when 1000 whole MKR withdrawn", async function () {
                        this.timeout(0);
                        const ONE_MKR = new BN(10).pow(new BN(18));

                        // Approve 1000 tokens
                        const numOfTokens = new BN("10000").mul(ONE_MKR);
                        await erc20MKR.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20MKR.address, numOfTokens);

                        // Number of tokens to withdraw
                        const withdrawAmount = new BN("1000").mul(ONE_MKR);

                        // validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                            savingAccount.address
                        );
                        expect(withdrawAmount).to.be.bignumber.lessThan(
                            balSavingAccountBeforeWithdraw
                        );

                        let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                        // Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20MKR.address, withdrawAmount);

                        // Validate user balance
                        let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdrawAmount).to.be.bignumber.equal(userBalanceDiff);

                        // Validate Withdraw

                        // Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(
                            new BN("1000").mul(ONE_MKR)
                        );
                        const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);

                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );
                    });

                    it("G4: when full TUSD withdrawn", async function () {
                        this.timeout(0);
                        const depositAmount = new BN(1000);

                        await erc20TUSD.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawTUSD = await erc20TUSD.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20TUSD.address,
                                owner
                            );

                        // deposit tokens
                        await savingAccount.deposit(erc20TUSD.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20TUSD.address,
                                owner
                            );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Withdrawing TUSD
                        await savingAccount.withdrawAll(erc20TUSD.address);
                        let userBalanceAfterWithdrawTUSD = await erc20TUSD.balanceOf(owner);
                        let accountBalanceAfterWithdrawTUSD = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdrawTUSD).to.be.bignumber.equal(
                            userBalanceAfterWithdrawTUSD
                        );
                        expect(accountBalanceAfterWithdrawTUSD).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20TUSD.address,
                                owner
                            );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    });

                    it("G4: when full MKR withdrawn", async () => {
                        const depositAmount = new BN("1000");
                        await erc20MKR.approve(savingAccount.address, depositAmount);

                        let userBalanceBeforeWithdrawMKR = await erc20MKR.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20MKR.address,
                                owner
                            );

                        // deposit tokens
                        await savingAccount.deposit(erc20MKR.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20MKR.address,
                                owner
                            );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Withdrawing MKR
                        await savingAccount.withdrawAll(erc20MKR.address);
                        let userBalanceAfterWithdrawMKR = await erc20MKR.balanceOf(owner);
                        let accountBalanceAfterWithdrawMKR = await erc20MKR.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdrawMKR).to.be.bignumber.equal(
                            userBalanceAfterWithdrawMKR
                        );
                        expect(accountBalanceAfterWithdrawMKR).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw =
                            await accountsContract.getDepositBalanceCurrent(
                                erc20MKR.address,
                                owner
                            );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    });
                });
            });

            context("should fail", async () => {
                it("when unsupported token address is passed", async function () {
                    this.timeout(0);
                    const withdrawAmount = new BN(20);

                    //Try depositting unsupported Token to SavingContract
                    await expectRevert(
                        savingAccount.withdraw(dummy, withdrawAmount),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function () {
                    this.timeout(0);
                    const withdrawAmount = ZERO;

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, withdrawAmount),
                        "Amount is zero"
                    );
                });

                it("when a user tries to withdraw who has not deposited before", async function () {
                    this.timeout(0);
                    const withdrawAmount = new BN(20);

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, withdrawAmount),
                        "Insufficient balance."
                    );
                });

                it("when user tries to withdraw more than his balance", async function () {
                    this.timeout(0);
                    const numOfTokens = new BN(10);
                    const totalDefinerBalanceBeforeDeposit =
                        await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);

                    await savingAccount.deposit(ETH_ADDRESS, numOfTokens, {
                        value: numOfTokens,
                    });

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit =
                        await accountsContract.getDepositBalanceCurrent(ETH_ADDRESS, owner);
                    const totalDefinerBalanceChange = new BN(totalDefinerBalanceAfterDeposit).sub(
                        new BN(totalDefinerBalanceBeforeDeposit)
                    );
                    expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                    const withdrawAmount = new BN(20);
                    await expectRevert(
                        savingAccount.withdraw(ETH_ADDRESS, withdrawAmount),
                        "SafeMath: subtraction overflow"
                    );
                });
            });
        });
    });
});
