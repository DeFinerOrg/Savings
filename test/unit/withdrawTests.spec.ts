import { TokenRegistryContract } from "./../../types/truffle-contracts/index.d";
import { BigNumber } from "bignumber.js";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
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
    });

    context("withdraw()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("should succeed", async () => {
                    it("C3: when partial ETH withdrawn", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(1000);
                        const withdrawAmount = new BN(20);
                        await savingAccount.fastForward(1000);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );
                        let ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        // Validate the total balance on DeFiner after deposit
                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
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

                    it("C6: when 100 whole ETH withdrawn", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(web3.utils.toWei("1000", "ether"));
                        const withdrawAmount = new BN(web3.utils.toWei("100", "ether"));
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = await cETH.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        let ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        // Validate the total balance on DeFiner after deposit
                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
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

                    it("C4: when full ETH withdrawn", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(web3.utils.toWei("100", "ether"));
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
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
                            value: depositAmount
                        });

                        // Validate the total balance on DeFiner after deposit
                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
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
                    it("D3: when partial tokens are withdrawn", async function() {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20DAI.approve(savingAccount.address, numOfTokens);

                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
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

                    it("D6: when 100 whole suported tokens are withdrawn", async function() {
                        this.timeout(0);
                        const ONE_DAI = new BN(10).pow(new BN(18));
                        const numOfTokens = new BN("1000").mul(ONE_DAI);
                        const withdrawAmount = new BN("100").mul(ONE_DAI);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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

                    it("D4: when full tokens withdrawn", async function() {
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

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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

                    it("D4: when full tokens withdrawn after some blocks", async function() {
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

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                    it("F3: when partial USDC withdrawn", async function() {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20USDC.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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

                    it("F6: when 100 whole USDC tokens are withdrawn", async function() {
                        this.timeout(0);
                        const ONE_USDC = new BN(10).pow(new BN(6));
                        const withdrawAmount = new BN("100").mul(ONE_USDC);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                    it("F4: when full USDC withdrawn", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(1000);
                        await erc20USDC.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawUSDC = await erc20USDC.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        let accountBalanceBeforeWithdrawUSDC = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalancBeforeWithdraw = await accountsContract.getDepositBalanceCurrent(
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

                    it("F3: when partial USDT withdrawn", async function() {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20USDT.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDT.address,
                            owner
                        );
                        let accountBalanceBeforeWithdrawUSDT = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeWithdraw = await accountsContract.getDepositBalanceCurrent(
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
                    it("E3: when partial WBTC withdrawn", async function() {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20WBTC.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
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
                    it("E4: when full WBTC withdrawn", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(1000);

                        await erc20WBTC.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawWBTC = await erc20WBTC.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20WBTC.address,
                            owner
                        );
                        const totalDefinerBalancBeforeWithdraw = await accountsContract.getDepositBalanceCurrent(
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
                    it("G3: when partial TUSD withdrawn", async function() {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        const withdrawAmount = new BN(20);

                        await erc20TUSD.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20TUSD.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
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

                    it("G6: when 1000 whole TUSD withdrawn", async function() {
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

                    it("G3: when partial MKR withdrawn", async function() {
                        this.timeout(0);
                        // Approve 1000 tokens
                        const numOfTokens = new BN(1000);

                        await erc20MKR.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20MKR.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
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

                    it("G6: when 1000 whole MKR withdrawn", async function() {
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

                    it("G4: when full TUSD withdrawn", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(1000);

                        await erc20TUSD.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawTUSD = await erc20TUSD.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20TUSD.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    });

                    it("G4: when full MKR withdrawn", async () => {
                        const depositAmount = new BN("1000");
                        await erc20MKR.approve(savingAccount.address, depositAmount);

                        let userBalanceBeforeWithdrawMKR = await erc20MKR.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20MKR.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
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
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(totalDefinerBalancAfterWithdraw);
                    });
                });
            });

            context("should fail", async () => {
                it("when unsupported token address is passed", async function() {
                    this.timeout(0);
                    const withdrawAmount = new BN(20);

                    //Try depositting unsupported Token to SavingContract
                    await expectRevert(
                        savingAccount.withdraw(dummy, withdrawAmount),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async function() {
                    this.timeout(0);
                    const withdrawAmount = ZERO;

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, withdrawAmount),
                        "Amount is zero"
                    );
                });

                it("when a user tries to withdraw who has not deposited before", async function() {
                    this.timeout(0);
                    const withdrawAmount = new BN(20);

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, withdrawAmount),
                        "Insufficient balance."
                    );
                });

                it("when user tries to withdraw more than his balance", async function() {
                    this.timeout(0);
                    const numOfTokens = new BN(10);
                    const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        owner
                    );

                    await savingAccount.deposit(ETH_ADDRESS, numOfTokens, {
                        value: numOfTokens
                    });

                    // Validate the total balance on DeFiner after deposit
                    const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                        ETH_ADDRESS,
                        owner
                    );
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

        context("Deposit and withdraw with multiple kinds of tokens.", async () => {
            context("Should succeed", async () => {
                it("Deposit DAI and USDC, withdraw partially", async function() {
                    this.timeout(0);
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    const numOfUSDC = new BN(1).mul(sixPrecision);
                    await savingAccount.fastForward(1000);

                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user1, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

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
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

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
                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    /*
                     * Step 2
                     * User 1 withdraw the half of the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. userUSDCBalanceAfterWithdraw - userUSDCBalanceBeforeWithdraw = halfOfUSDCs
                     */
                    const halfOfDAI = numOfDAI.div(new BN(2));
                    const halfOfUSDC = numOfUSDC.div(new BN(2));
                    const userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    const userUSDCBalanceBeforeWithdraw = await erc20USDC.balanceOf(user1);

                    await savingAccount.withdraw(erc20DAI.address, halfOfDAI, { from: user1 });
                    await savingAccount.withdraw(erc20USDC.address, halfOfUSDC, { from: user1 });

                    await savAccBalVerify(
                        1,
                        halfOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        1,
                        halfOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    const userUSDCBalanceAfterWithdraw = await erc20USDC.balanceOf(user1);

                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAI));
                    // Verify 2.
                    expect(
                        BN(userUSDCBalanceAfterWithdraw).sub(BN(userUSDCBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfUSDC));
                });

                it("Deposit DAI and USDC, withdraw fully", async function() {
                    this.timeout(0);
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    const numOfUSDC = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user1, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

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
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

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
                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
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

                    await savAccBalVerify(
                        1,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    await savAccBalVerify(
                        1,
                        numOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userUSDCBalanceAfterWithdraw = await erc20USDC.balanceOf(user1);

                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(numOfDAI);
                    // Verify 2.
                    expect(
                        BN(userUSDCBalanceAfterWithdraw).sub(BN(userUSDCBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(numOfUSDC));
                });

                it("Deposit DAI and TUSD, withdraw partially", async function() {
                    this.timeout(0);
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    const numOfTUSD = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20TUSD.transfer(user1, numOfTUSD);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSD, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSD, { from: user1 });

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

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * User 1 withdraw the half of the tokens it deposits to DeFiner
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. userTUSDBalanceAfterWithdraw - userTUSDBalanceBeforeWithdraw = halfOfTUSDs
                     */
                    const halfOfDAI = numOfDAI.div(new BN(2));
                    const halfOfTUSD = numOfTUSD.div(new BN(2));

                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);

                    await savingAccount.withdraw(erc20DAI.address, halfOfDAI, { from: user1 });
                    await savingAccount.withdraw(erc20TUSD.address, halfOfTUSD, { from: user1 });

                    await savAccBalVerify(
                        1,
                        halfOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceAfterWithdraw = await erc20TUSD.balanceOf(user1);

                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAI));
                    // Verify 2.
                    expect(
                        BN(userTUSDBalanceAfterWithdraw).sub(BN(userTUSDBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfTUSD));
                });

                it("Deposit DAI and TUSD, withdraw fully", async function() {
                    this.timeout(0);
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    const numOfTUSD = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20TUSD.transfer(user1, numOfTUSD);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSD, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSD, { from: user1 });

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

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
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

                    await savAccBalVerify(
                        1,
                        numOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceAfterWithdraw = await erc20TUSD.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(numOfDAI));
                    // Verify 2.
                    expect(
                        BN(userTUSDBalanceAfterWithdraw).sub(BN(userTUSDBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(numOfTUSD));
                });
            });

            context("Should fail", async () => {
                it("Deposit DAI and USDC, withdraw more USDC tokens than it deposits", async function() {
                    this.timeout(0);
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    const numOfUSDC = new BN(1).mul(sixPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^6 USDC to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20USDC.transfer(user1, numOfUSDC);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

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
                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

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
                    /*
                     * Step 2
                     * User 1 withdraw the half of the DAI tokens it deposits to DeFiner and doubel the tokens of USDC
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. withdraw double USDC tokens will fail
                     */
                    const halfOfDAI = numOfDAI.div(new BN(2));
                    const doubleOfUSDC = numOfUSDC.mul(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAI, { from: user1 });
                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        halfOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAI));

                    // Verify 2.
                    await expectRevert(
                        savingAccount.withdraw(erc20USDC.address, doubleOfUSDC, { from: user1 }),
                        "SafeMath: subtraction overflow"
                    );
                });
                it("Deposit DAI and TUSD, withdraw more USDC tokens than it deposits", async function() {
                    this.timeout(0);
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    const numOfTUSD = new BN(1).mul(eighteenPrecision);
                    /*
                     * Step 1
                     * Assign 10^18 DAI and 10^18 TUSD to user 1
                     * Then deposit all these tokens to DeFiner
                     */
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20TUSD.transfer(user1, numOfTUSD);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                    await erc20TUSD.approve(savingAccount.address, numOfTUSD, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                    await savingAccount.deposit(addressTUSD, numOfTUSD, { from: user1 });

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

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * User 1 withdraw the half of the DAI tokens it deposits to DeFiner and double the TUSD tokens
                     * To verify:
                     * 1. userDAIBalanceAfterWithdraw - userDAIBalanceBeforeWithdraw = halfOfDAIs
                     * 2. withdraw double TUSD tokens will fail
                     */
                    const halfOfDAI = numOfDAI.div(new BN(2));
                    const doubleOfTUSD = numOfTUSD.mul(new BN(2));
                    let userDAIBalanceBeforeWithdraw = await erc20DAI.balanceOf(user1);
                    let userTUSDBalanceBeforeWithdraw = await erc20TUSD.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, halfOfDAI, { from: user1 });

                    let userDAIBalanceAfterWithdraw = await erc20DAI.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        halfOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterWithdraw).sub(BN(userDAIBalanceBeforeWithdraw))
                    ).to.be.bignumber.equal(BN(halfOfDAI));

                    // Verify 2.
                    await expectRevert(
                        savingAccount.withdraw(erc20TUSD.address, doubleOfTUSD, { from: user1 }),
                        "SafeMath: subtraction overflow"
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

                const savingAccountCUSDCTokenAfterDeposit = BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );

                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
                );

                /*
                 * Step 2
                 * Account 0 borrows 10 tokens from DeFiner
                 * Then tries to withdraw all the tokens
                 * Should fail, beacuse user has to repay all the outstandings before withdrawing.
                 */
                const borrows = new BN(10);
                await savingAccount.borrow(addressUSDC, borrows, { from: user1 });

                await savAccBalVerify(
                    2,
                    borrows,
                    erc20USDC.address,
                    cUSDC,
                    savingAccountCUSDCTokenAfterDeposit,
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );

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

                const savingAccountCUSDCTokenAfterDeposit = BN(
                    await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                );
                const savingAccountUSDCTokenAfterDeposit = BN(
                    await erc20USDC.balanceOf(savingAccount.address)
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

                await savAccBalVerify(
                    2,
                    borrows,
                    erc20USDC.address,
                    cUSDC,
                    savingAccountCUSDCTokenAfterDeposit,
                    savingAccountUSDCTokenAfterDeposit,
                    bank,
                    savingAccount
                );

                const savingAccountCDAITokenAfterBorrow = BN(
                    await cDAI.balanceOfUnderlying.call(savingAccount.address)
                );
                const savingAccountDAITokenAfterBorrow = BN(
                    await erc20DAI.balanceOf(savingAccount.address)
                );

                const UserTokenLeftBefore = new BN(await erc20DAI.balanceOf(user1));

                await savingAccount.withdraw(erc20DAI.address, new BN(100), { from: user1 });

                await savAccBalVerify(
                    1,
                    new BN(100),
                    erc20DAI.address,
                    cDAI,
                    savingAccountCDAITokenAfterBorrow,
                    savingAccountDAITokenAfterBorrow,
                    bank,
                    savingAccount
                );

                const UserTokenLeft = new BN(await erc20DAI.balanceOf(user1));

                // const CTokenLeft = new BN(await cDAI.balanceOfUnderlying.call(savingAccount.address));
                const userTotalBalance = await accountsContract.getBorrowBalanceCurrent(
                    addressUSDC,
                    user1
                );

                expect(BN(UserTokenLeft).sub(BN(UserTokenLeftBefore))).to.be.bignumber.equal(
                    new BN(100)
                );
                // Verify 2.
                expect(BN(userTotalBalance).sub(BN(userTotalBalanceBefore))).to.be.bignumber.equal(
                    new BN(10)
                );
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
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });

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

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfDAI = numOfDAI.div(new BN(4));
                    const userDAIBalanceBeforeFirstWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAI, { from: user1 });

                    await savAccBalVerify(
                        1,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCDAITokenAfterFirstWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterFirstWithdraw = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const userDAIBalanceBeforeSecondWithdraw = await erc20DAI.balanceOf(user1);

                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAI, { from: user1 });

                    await savAccBalVerify(
                        1,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterFirstWithdraw,
                        savingAccountDAITokenAfterFirstWithdraw,
                        bank,
                        savingAccount
                    );

                    const userDAIBalanceBeforeThirdWithdraw = await erc20DAI.balanceOf(user1);

                    const savingAccountCDAITokenAfterSecondWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterSecondWithdraw = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAI, { from: user1 });

                    await savAccBalVerify(
                        1,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterSecondWithdraw,
                        savingAccountDAITokenAfterSecondWithdraw,
                        bank,
                        savingAccount
                    );

                    const userDAIBalanceBeforeForthWithdraw = await erc20DAI.balanceOf(user1);

                    const savingAccountCDAITokenAfterThirdWithdraw = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterThirdWithdraw = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAI, { from: user1 });
                    const userDAIBalanceAfterForthWithdraw = await erc20DAI.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterThirdWithdraw,
                        savingAccountDAITokenAfterThirdWithdraw,
                        bank,
                        savingAccount
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
                    ).to.be.bignumber.equal(quaterOfDAI);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeThirdWithdraw).sub(
                            userDAIBalanceBeforeSecondWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfDAI);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeForthWithdraw).sub(userDAIBalanceBeforeThirdWithdraw)
                    ).to.be.bignumber.equal(quaterOfDAI);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceAfterForthWithdraw).sub(userDAIBalanceBeforeForthWithdraw)
                    ).to.be.bignumber.equal(quaterOfDAI);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                });
                it("Use USDC which 6 is decimals, deposit some tokens and withdraw all of them in four times", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^6 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfUSDC = new BN(1).mul(sixPrecision);
                    await erc20USDC.transfer(user1, numOfUSDC);
                    await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user1 });

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user1 });

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

                    const savingAccountCUSDCTokenAfterDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^6 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfUSDC = numOfUSDC.div(new BN(4));
                    const userUSDCBalanceBeforeFirstWithdraw = await erc20USDC.balanceOf(user1);

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDC, { from: user1 });
                    const userUSDCBalanceBeforeSecondWithdraw = await erc20USDC.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        quaterOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterDeposit,
                        savingAccountUSDCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterFirstWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterFirstWithdraw = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDC, { from: user1 });
                    const userUSDCBalanceBeforeThirdWithdraw = await erc20USDC.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        quaterOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterFirstWithdraw,
                        savingAccountUSDCTokenAfterFirstWithdraw,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterSecondWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterSecondWithdraw = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDC, { from: user1 });
                    const userUSDCBalanceBeforeForthWithdraw = await erc20USDC.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        quaterOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterSecondWithdraw,
                        savingAccountUSDCTokenAfterSecondWithdraw,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenAfterThirdWithdraw = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountUSDCTokenAfterThirdWithdraw = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20USDC.address, quaterOfUSDC, { from: user1 });
                    const userUSDCBalanceAfterForthWithdraw = await erc20USDC.balanceOf(user1);

                    await savAccBalVerify(
                        1,
                        quaterOfUSDC,
                        erc20USDC.address,
                        cUSDC,
                        savingAccountCUSDCTokenAfterThirdWithdraw,
                        savingAccountUSDCTokenAfterThirdWithdraw,
                        bank,
                        savingAccount
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
                    ).to.be.bignumber.equal(quaterOfUSDC);
                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceBeforeThirdWithdraw).sub(
                            userUSDCBalanceBeforeSecondWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDC);
                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceBeforeForthWithdraw).sub(
                            userUSDCBalanceBeforeThirdWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDC);
                    // Verify 1.
                    expect(
                        BN(userUSDCBalanceAfterForthWithdraw).sub(
                            userUSDCBalanceBeforeForthWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfUSDC);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                });
                it("Use WBTC which 8 is decimals, deposit some tokens and withdraw all of them in four times", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^6 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfWBTC = new BN(1).mul(eightPrecision);
                    await erc20WBTC.transfer(user1, numOfWBTC);
                    await erc20WBTC.approve(savingAccount.address, numOfWBTC, { from: user1 });

                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressWBTC, numOfWBTC, { from: user1 });

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
                    /*
                     * Step 2
                     * Withdraw 1/4 of the whole 10^18 tokens for four times
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after every withdraw
                     * 2. Tokens in DeFiner of user1 should be 0 after four withdraws
                     */
                    const quaterOfWBTC = numOfWBTC.div(new BN(4));
                    const userWBTCBalanceBeforeFirstWithdraw = await erc20WBTC.balanceOf(user1);

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTC, { from: user1 });
                    await savAccBalVerify(
                        1,
                        quaterOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterDeposit,
                        savingAccountWBTCTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const userWBTCBalanceBeforeSecondWithdraw = await erc20WBTC.balanceOf(user1);

                    const savingAccountCWBTCTokenAfterFirstWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenAfterFirstWithdraw = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTC, { from: user1 });
                    await savAccBalVerify(
                        1,
                        quaterOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterFirstWithdraw,
                        savingAccountWBTCTokenAfterFirstWithdraw,
                        bank,
                        savingAccount
                    );

                    const userWBTCBalanceBeforeThirdWithdraw = await erc20WBTC.balanceOf(user1);
                    const savingAccountCWBTCTokenAfterSecondWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenAfterSecondWithdraw = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTC, { from: user1 });
                    await savAccBalVerify(
                        1,
                        quaterOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterSecondWithdraw,
                        savingAccountWBTCTokenAfterSecondWithdraw,
                        bank,
                        savingAccount
                    );

                    const userWBTCBalanceBeforeForthWithdraw = await erc20WBTC.balanceOf(user1);
                    const savingAccountCWBTCTokenAfterThirdWithdraw = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenAfterThirdWithdraw = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.withdraw(erc20WBTC.address, quaterOfWBTC, { from: user1 });
                    await savAccBalVerify(
                        1,
                        quaterOfWBTC,
                        erc20WBTC.address,
                        cWBTC,
                        savingAccountCWBTCTokenAfterThirdWithdraw,
                        savingAccountWBTCTokenAfterThirdWithdraw,
                        bank,
                        savingAccount
                    );

                    const userWBTCBalanceAfterForthWithdraw = await erc20WBTC.balanceOf(user1);

                    const userTotalBalance = await accountsContract.getDepositBalanceCurrent(
                        addressWBTC,
                        user1
                    );
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceBeforeSecondWithdraw).sub(
                            userWBTCBalanceBeforeFirstWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTC);
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceBeforeThirdWithdraw).sub(
                            userWBTCBalanceBeforeSecondWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTC);
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceBeforeForthWithdraw).sub(
                            userWBTCBalanceBeforeThirdWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTC);
                    // Verify 1.
                    expect(
                        BN(userWBTCBalanceAfterForthWithdraw).sub(
                            userWBTCBalanceBeforeForthWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfWBTC);
                    // Verify 2.
                    expect(BN(userTotalBalance)).to.be.bignumber.equal(new BN(0));
                });
            });
            context("Should fail", async () => {
                it("Use DAI, deposit 10^18 tokens, withdraw 1/4 of them the first time, then withdraw 10^18 tokens", async function() {
                    this.timeout(0);
                    /*
                     * Step 1
                     * Assign 10^18 tokens to account 1 and deposit them all to DeFiner
                     */
                    const numOfDAI = new BN(1).mul(eighteenPrecision);
                    await erc20DAI.transfer(user1, numOfDAI);
                    await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });

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

                    const savingAccountCDAITokenAfterDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingAccountDAITokenAfterDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    /*
                     * Step 2
                     * Withdraw 1/4 of 10^18 tokens, then withdraw 10^18 tokens
                     * To verify
                     * 1. Tokens in user's account increase 1/4 * 10^18 after the first withdraw
                     * 2. The second withdraw should fail
                     */
                    const quaterOfDAI = numOfDAI.div(new BN(4));
                    const userDAIBalanceBeforeFirstWithdraw = await erc20DAI.balanceOf(user1);
                    await savingAccount.withdraw(erc20DAI.address, quaterOfDAI, { from: user1 });

                    await savAccBalVerify(
                        1,
                        quaterOfDAI,
                        erc20DAI.address,
                        cDAI,
                        savingAccountCDAITokenAfterDeposit,
                        savingAccountDAITokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    const userDAIBalanceBeforeSecondWithdraw = await erc20DAI.balanceOf(user1);
                    // Verify 1.
                    expect(
                        BN(userDAIBalanceBeforeSecondWithdraw).sub(
                            userDAIBalanceBeforeFirstWithdraw
                        )
                    ).to.be.bignumber.equal(quaterOfDAI);

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, numOfDAI, { from: user1 }),
                        "SafeMath: subtraction overflow"
                    );
                });
            });
        });
    });
});
