import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
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

    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;

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
    let numOfToken: any;
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

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
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
        cTokenDAI = await MockCToken.at(cDAI_addr);
        cTokenUSDC = await MockCToken.at(cUSDC_addr);
        cTokenUSDT = await MockCToken.at(cUSDT_addr);
        cTokenWBTC = await MockCToken.at(cWBTC_addr);
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
        numOfToken = new BN(1000);
        ZERO = new BN(0);
    });
    context("withdraw()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("should succeed", async () => {
                    it("C3: when partial ETH withdrawn", async () => {
                        const depositAmount = new BN(100);
                        const withdrawAmount = new BN(20);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );

                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);

                        //Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        console.log(
                            "totalDefinerBalanceBeforeDeposit",
                            totalDefinerBalanceBeforeDeposit.toString()
                        );
                        console.log(
                            "totalDefinerBalanceAfterDeposit",
                            totalDefinerBalanceAfterDeposit.toString()
                        );

                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        //Withdrawing ETH
                        await savingAccount.withdraw(ETH_ADDRESS, withdrawAmount);

                        let ETHbalanceAfterWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        let accountBalanceDiff = new BN(ETHbalanceBeforeWithdraw).sub(
                            new BN(ETHbalanceAfterWithdraw)
                        );

                        console.log(
                            "ETHbalanceBeforeWithdraw",
                            ETHbalanceBeforeWithdraw.toString()
                        );
                        console.log("ETHbalanceAfterWithdraw", ETHbalanceAfterWithdraw.toString());

                        // Validate savingAccount ETH balance
                        //expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount);

                        // Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdrawAmount
                        );

                        // Amount in Compound
                        const expectedTokensAtCToken = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCToken = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                        ).to.be.bignumber.equal(balCToken);

                        // 4.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10))
                        );
                    });

                    it("C6: when 1000 whole ETH withdrawn", async () => {
                        const depositAmount = web3.utils.toWei("2000", "ether");
                        const withdrawAmount = web3.utils.toWei("1000", "ether");
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);

                        //Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        //Withdrawing ETH
                        await savingAccount.withdraw(ETH_ADDRESS, withdrawAmount);

                        let ETHbalanceAfterWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        let accountBalanceDiff = new BN(ETHbalanceBeforeWithdraw).sub(
                            new BN(ETHbalanceAfterWithdraw)
                        );

                        // accountBalanceDiff = 150000000000000000000

                        // validate savingAccount ETH balance
                        //expect(accountBalanceDiff).to.be.bignumber.equal(withdrawAmount);

                        // Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdrawAmount
                        );

                        // Amount in Compound
                        const expectedTokensAtCToken = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCToken = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                        ).to.be.bignumber.equal(balCToken);

                        // 4.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10))
                        );
                    });

                    it("C4: when full ETH withdrawn", async () => {
                        const depositAmount = web3.utils.toWei("100", "ether");
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);

                        // Depositting ETH Token to SavingContract
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        // Validate the total balance on DeFiner after deposit
                        const expectedTokensAtSavingAccountContract = new BN(depositAmount)
                            .mul(new BN(15))
                            .div(new BN(100));
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        let ETHbalanceBeforeWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        expect(ETHbalanceBeforeWithdraw).to.be.bignumber.equal(
                            expectedTokensAtSavingAccountContract
                        );

                        // Withdrawing ETH
                        await savingAccount.withdrawAll(ETH_ADDRESS);

                        // Validate savingAccount ETH balance
                        let ETHbalanceAfterWithdraw = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        expect(ETHbalanceAfterWithdraw).to.be.bignumber.equal(ZERO);

                        // Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        expect(new BN(totalDefinerBalancAfterWithdraw)).to.be.bignumber.equal(ZERO);

                        // Verify Compound balance
                        const compETHfter = await web3.eth.getBalance(cETH_addr);
                        expect(ZERO).to.be.bignumber.equal(
                            BN(compETHfter).sub(BN(balCTokenContractBefore))
                        );

                        // Verify CToken balance
                        const compCETHfter = await cTokenDAI.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(
                            BN(compCETHfter).sub(BN(balCTokenContractBefore))
                        );
                    });
                });
            });

            context("Compound Supported 18 decimals Token", async () => {
                context("Should suceed", async () => {
                    it("D3: when partial tokens are withdrawn", async () => {
                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN(20);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
                        let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20DAI.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens
                            .mul(new BN(15))
                            .div(new BN(100))
                            .sub(new BN(20));
                        const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );

                        // 4.3 Amount in Compound
                        const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                        const balCToken = await erc20DAI.balanceOf(cDAI_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                        ).to.be.bignumber.equal(balCToken);

                        // 4.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfTokens
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10))
                        );
                    });

                    it("D6: when 100 whole suported tokens are withdrawn", async () => {
                        const ONE_DAI = new BN(10).pow(new BN(18));
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN("1000").mul(ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN("100").mul(ONE_DAI);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20DAI.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens
                            .mul(new BN(15))
                            .div(new BN(100))
                            .sub(new BN("100").mul(ONE_DAI));
                        const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                        /* expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            new BN(newbalSavingAccount)
                        ); */

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );

                        // 4.2 Amount in Compound
                        const expectedTokensAtCToken = numOfTokens
                            .sub(new BN("100").mul(ONE_DAI))
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCToken = await erc20DAI.balanceOf(cDAI_addr);
                        expect(
                            expectedTokensAtCToken.add(balCTokenContractBefore)
                        ).to.be.bignumber.equal(new BN(balCToken));

                        // 4.3 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfTokens
                            .sub(new BN("100").mul(ONE_DAI))
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10))
                        );
                    });

                    it("D4: when full tokens withdrawn", async () => {
                        const depositAmount = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(owner);
                        let accountBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const compCDAIBefore = await cTokenDAI.balanceOf(savingAccount.address);

                        const compDAIBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);
                        console.log((await erc20DAI.balanceOf(savingAccount.address)).toString());
                        console.log(
                            (
                                await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                            ).toString()
                        );

                        //Withdrawing DAI
                        await savingAccount.withdrawAll(erc20DAI.address);
                        let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(owner);
                        let accountBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        // Verify user balance
                        expect(userBalanceBeforeWithdrawDAI).to.be.bignumber.equal(
                            userBalanceAfterWithdrawDAI
                        );
                        // Verify contract balance
                        expect(
                            BN(accountBalanceAfterWithdrawDAI).sub(accountBalanceBeforeWithdrawDAI)
                        ).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(
                            BN(totalDefinerBalancAfterWithdraw).sub(
                                BN(totalDefinerBalanceBeforeDeposit)
                            )
                        );

                        // Verify Compound balance
                        const compDAIAfter = await erc20DAI.balanceOf(cDAI_addr);
                        expect(ZERO).to.be.bignumber.equal(BN(compDAIAfter).sub(BN(compDAIBefore)));

                        // Verify CToken balance
                        const compCDAIAfter = await cTokenDAI.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(
                            BN(compCDAIAfter).sub(BN(compCDAIBefore))
                        );
                    });

                    it("D4: when full tokens withdrawn after some blocks", async () => {
                        const depositAmount = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, new BN(1500));
                        let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(owner);
                        let accountBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const compCDAIBefore = await cTokenDAI.balanceOf(savingAccount.address);

                        const compDAIBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);
                        console.log((await erc20DAI.balanceOf(savingAccount.address)).toString());
                        console.log(
                            (
                                await cTokenDAI.balanceOfUnderlying.call(savingAccount.address)
                            ).toString()
                        );

                        await savingAccount.fastForward(10000);
                        // deposit for rate checkpoint
                        await savingAccount.deposit(erc20DAI.address, new BN(10));

                        //Withdrawing DAI
                        await savingAccount.withdrawAll(erc20DAI.address);
                        let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(owner);
                        let accountBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );

                        // Verify user balance
                        expect(userBalanceBeforeWithdrawDAI).to.be.bignumber.equal(
                            userBalanceAfterWithdrawDAI
                        );
                        // Verify contract balance
                        expect(
                            BN(accountBalanceAfterWithdrawDAI).sub(accountBalanceBeforeWithdrawDAI)
                        ).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(
                            BN(totalDefinerBalancAfterWithdraw).sub(
                                BN(totalDefinerBalanceBeforeDeposit)
                            )
                        );

                        // Verify Compound balance
                        const compDAIAfter = await erc20DAI.balanceOf(cDAI_addr);
                        expect(ZERO).to.be.bignumber.equal(BN(compDAIAfter).sub(BN(compDAIBefore)));

                        // Verify CToken balance
                        const compCDAIAfter = await cTokenDAI.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(
                            BN(compCDAIAfter).sub(BN(compCDAIBefore))
                        );
                    });

                    it("when tokens are withdrawn with interest", async () => {
                        // TODO:
                        const depositAmount = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, depositAmount);
                        let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, depositAmount, {
                            from: owner
                        });

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Advancing blocks by 150
                        let latestBlock = await web3.eth.getBlock("latest");
                        let targetBlock = new BN(latestBlock.number).add(new BN(150));
                        await time.advanceBlockTo(targetBlock);

                        //Withdrawing DAI
                        await savingAccount.withdrawAll(erc20DAI.address, { from: owner });

                        let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                        let accountBalanceAfterWithdraw = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdraw).to.be.bignumber.equal(
                            userBalanceAfterWithdraw
                        );
                        expect(accountBalanceAfterWithdraw).to.be.bignumber.equal(ZERO);
                    });
                });
            });

            context("Compound Supported 6 decimals Token", async () => {
                context("Should succeed", async () => {
                    //Partial withdrawal of tokens with 6 decimals
                    it("F3: when partial USDC withdrawn", async () => {
                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        await erc20USDC.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20USDC.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN(20);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);
                        let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20USDC.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens
                            .mul(new BN(15))
                            .div(new BN(100))
                            .sub(new BN(20));
                        const newbalSavingAccount = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );

                        // 4.3 Amount in Compound
                        const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                        const balCToken = await erc20USDC.balanceOf(cUSDC_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                        ).to.be.bignumber.equal(balCToken);

                        // 4.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfTokens
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10).pow(new BN(5)))
                        );
                    });

                    it("F6: when 100 whole USDC tokens are withdrawn", async () => {
                        const ONE_USDC = new BN(10).pow(new BN(6));
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);
                        const balCTokenInit = await erc20USDC.balanceOf(cUSDC_addr);

                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN("1000").mul(ONE_USDC);
                        await erc20USDC.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20USDC.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN("100").mul(ONE_USDC);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20USDC.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20USDC.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20USDC.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens
                            .mul(new BN(15))
                            .div(new BN(100))
                            .sub(new BN("100").mul(ONE_USDC));
                        const newbalSavingAccount = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        /* expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        ); */

                        // 4.2 Amount in Compound
                        const expectedTokensAtCToken = numOfTokens
                            .sub(new BN("100").mul(ONE_USDC))
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCToken = await erc20USDC.balanceOf(cUSDC_addr);
                        expect(
                            expectedTokensAtCToken.add(balCTokenContractBefore)
                        ).to.be.bignumber.equal(balCToken);

                        // 4.3 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfTokens
                            .sub(new BN("100").mul(ONE_USDC))
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenUSDC.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10).pow(new BN(5)))
                        );
                    });

                    //Full withdrawal of tokens with 6 decimals
                    it("F4: when full USDC withdrawn", async () => {
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
                        const compUSDCBefore = await erc20USDC.balanceOf(cUSDC_addr);
                        const compCUSDCBefore = await cTokenUSDC.balanceOf(savingAccount.address);

                        // deposit tokens
                        await savingAccount.deposit(erc20USDC.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));

                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        //Withdrawing USDC
                        await savingAccount.withdrawAll(erc20USDC.address);
                        let userBalanceAfterWithdrawUSDC = await erc20USDC.balanceOf(owner);
                        let accountBalanceAfterWithdrawUSDC = await erc20USDC.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdrawUSDC).to.be.bignumber.equal(
                            userBalanceAfterWithdrawUSDC
                        );
                        expect(
                            BN(accountBalanceAfterWithdrawUSDC).sub(
                                BN(accountBalanceBeforeWithdrawUSDC)
                            )
                        ).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(
                            BN(totalDefinerBalancAfterWithdraw).sub(
                                BN(totalDefinerBalancBeforeWithdraw)
                            )
                        );

                        // Verify Compound balance
                        const compUSDCAfter = await erc20USDC.balanceOf(cUSDC_addr);
                        expect(ZERO).to.be.bignumber.equal(BN(compUSDCAfter).sub(compUSDCBefore));

                        // Verify CToken balance
                        const compCUSDCAfter = await cTokenUSDC.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(BN(compCUSDCAfter).sub(compCUSDCBefore));
                    });

                    it("F3: when partial USDT withdrawn", async () => {
                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        await erc20USDT.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDT.address,
                            owner
                        );
                        const balCTokenContractBefore = await erc20USDT.balanceOf(cUSDT_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20USDT.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDT.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN(20);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20USDT.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20USDT.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20USDT.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens
                            .mul(new BN(15))
                            .div(new BN(100))
                            .sub(new BN(20));
                        const newbalSavingAccount = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20USDT.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );

                        // 4.2 Amount in Compound
                        const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                        const balCToken = await erc20USDT.balanceOf(cUSDT_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                        ).to.be.bignumber.equal(balCToken);

                        // 4.3 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfTokens
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenUSDT.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10).pow(new BN(5)))
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
                        const compCUSDTBefore = await cTokenUSDT.balanceOf(savingAccount.address);

                        // deposit tokens
                        await savingAccount.deposit(erc20USDT.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDT.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        //Withdrawing USDT
                        await savingAccount.withdrawAll(erc20USDT.address);
                        let userBalanceAfterWithdrawUSDT = await erc20USDT.balanceOf(owner);
                        let accountBalanceAfterWithdrawUSDT = await erc20USDT.balanceOf(
                            savingAccount.address
                        );
                        expect(userBalanceBeforeWithdrawUSDT).to.be.bignumber.equal(
                            userBalanceAfterWithdrawUSDT
                        );
                        expect(
                            BN(accountBalanceAfterWithdrawUSDT).sub(
                                accountBalanceBeforeWithdrawUSDT
                            )
                        ).to.be.bignumber.equal(ZERO);

                        // Verify DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20USDT.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(
                            BN(totalDefinerBalancAfterWithdraw).sub(
                                BN(totalDefinerBalanceBeforeWithdraw)
                            )
                        );

                        // Verify Compound balance
                        const compUSDTAfter = await erc20USDT.balanceOf(cUSDT_addr);
                        expect(ZERO).to.be.bignumber.equal(BN(compUSDTAfter).sub(compUSDTBefore));

                        // Verify CToken balance
                        const compCUSDTAfter = await cTokenUSDT.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(BN(compCUSDTAfter).sub(compCUSDTBefore));
                    });
                });
            });

            context("Compound Supported 8 decimals Token", async () => {
                context("Should succeed", async () => {
                    //Partial withdrawal of tokens with 8 decimals
                    it("E3: when partial WBTC withdrawn", async () => {
                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN(1000);
                        await erc20WBTC.approve(savingAccount.address, numOfTokens);
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20WBTC.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20WBTC.balanceOf(cWBTC_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20WBTC.address, numOfTokens);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20WBTC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN(20);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20WBTC.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20WBTC.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20WBTC.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens
                            .mul(new BN(15))
                            .div(new BN(100))
                            .sub(new BN(20));
                        const newbalSavingAccount = await erc20WBTC.balanceOf(
                            savingAccount.address
                        );
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20WBTC.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );

                        // 4.3 Amount in Compound
                        const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                        const balCToken = await erc20WBTC.balanceOf(cWBTC_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(new BN(expectedTokensAtCToken))
                        ).to.be.bignumber.equal(balCToken);

                        // 4.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfTokens
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cTokenWBTC.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(10).pow(new BN(4)))
                        );
                    });

                    //Full withdrawal of tokens with 8 decimals
                    it("E4: when full WBTC withdrawn", async () => {
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
                        const compCWBTCBefore = await cTokenWBTC.balanceOf(savingAccount.address);

                        // deposit tokens
                        await savingAccount.deposit(erc20WBTC.address, depositAmount);

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20WBTC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        //Withdrawing WBTC
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
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20WBTC.address,
                            owner
                        );
                        expect(ZERO).to.be.bignumber.equal(
                            BN(totalDefinerBalancAfterWithdraw).sub(
                                BN(totalDefinerBalancBeforeWithdraw)
                            )
                        );

                        // Verify Compound balance
                        const compWBTCAfter = await erc20WBTC.balanceOf(cWBTC_addr);
                        expect(ZERO).to.be.bignumber.equal(
                            BN(compWBTCAfter).sub(BN(compWBTCBefore))
                        );

                        // Verify CToken balance
                        const compCWBTCAfter = await cTokenWBTC.balanceOf(savingAccount.address);
                        expect(ZERO).to.be.bignumber.equal(
                            BN(compCWBTCAfter).sub(BN(compCWBTCBefore))
                        );
                    });
                });
            });

            context("Compound unsupported Token", async () => {
                context("Should succeed", async () => {
                    it("G3: when partial TUSD withdrawn", async () => {
                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN(1000);
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

                        //Number of tokens to withdraw
                        const withdraws = new BN(20);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract

                        await savingAccount.withdraw(erc20TUSD.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(new BN(20));
                        const newbalSavingAccount = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20TUSD.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );
                    });

                    it("G6: when 1000 whole TUSD withdrawn", async () => {
                        const ONE_TUSD = new BN(10).pow(new BN(18));
                        const newbalSavingAccountInit = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );

                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN("10000").mul(ONE_TUSD);
                        await erc20TUSD.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20TUSD.address, numOfTokens);

                        //Number of tokens to withdraw
                        const withdraws = new BN("1000").mul(ONE_TUSD);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20TUSD.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20TUSD.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20TUSD.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20TUSD.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
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

                    it("G3: when partial MKR withdrawn", async () => {
                        // 1. Approve 1000 tokens
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

                        //Number of tokens to withdraw
                        const withdraws = new BN(20);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20MKR.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(new BN(20));
                        const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );

                        // 4.2 Validate DeFiner balance
                        const totalDefinerBalancAfterWithdraw = await accountsContract.getDepositBalanceCurrent(
                            erc20MKR.address,
                            owner
                        );
                        const totalDefinerBalancDifference = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalancAfterWithdraw));
                        expect(new BN(totalDefinerBalancDifference)).to.be.bignumber.equal(
                            withdraws
                        );
                    });

                    it("G6: when 1000 whole MKR withdrawn", async () => {
                        const ONE_MKR = new BN(10).pow(new BN(18));

                        // 1. Approve 1000 tokens
                        const numOfTokens = new BN("10000").mul(ONE_MKR);
                        await erc20MKR.approve(savingAccount.address, numOfTokens);

                        // deposit tokens
                        await savingAccount.deposit(erc20MKR.address, numOfTokens);

                        // Number of tokens to withdraw
                        const withdraws = new BN("1000").mul(ONE_MKR);

                        // 2. validate if amount to be withdrawn is less than saving account balance
                        const balSavingAccountBeforeWithdraw = await erc20MKR.balanceOf(
                            savingAccount.address
                        );
                        expect(withdraws).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                        let userBalanceBeforeWithdraw = await erc20MKR.balanceOf(owner);

                        // 3. Withdraw Token from SavingContract
                        await savingAccount.withdraw(erc20MKR.address, withdraws);

                        // 3.1 Validate user balance
                        let userBalanceAfterWithdraw = await erc20MKR.balanceOf(owner);
                        const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                            BN(userBalanceBeforeWithdraw)
                        );
                        expect(withdraws).to.be.bignumber.equal(userBalanceDiff);

                        // 4. Validate Withdraw

                        // 4.1 Validate savingAccount contract balance
                        const expectedTokenBalanceAfterWithdraw = numOfTokens.sub(
                            new BN("1000").mul(ONE_MKR)
                        );
                        const newbalSavingAccount = await erc20MKR.balanceOf(savingAccount.address);
                        console.log("newbalSavingAccount", newbalSavingAccount);

                        expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                            newbalSavingAccount
                        );
                    });

                    it("G4: when full TUSD withdrawn", async () => {
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

                        //Withdrawing TUSD
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

                        //Withdrawing MKR
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
                it("when unsupported token address is passed", async () => {
                    const withdraws = new BN(20);

                    //Try depositting unsupported Token to SavingContract
                    await expectRevert(
                        savingAccount.withdraw(dummy, withdraws),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async () => {
                    const withdraws = ZERO;

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, withdraws),
                        "Amount is zero"
                    );
                });

                it("when a user tries to withdraw who has not deposited before", async () => {
                    const withdraws = new BN(20);

                    await expectRevert(
                        savingAccount.withdraw(erc20DAI.address, withdraws),
                        "Insufficient balance."
                    );
                });

                it("when user tries to withdraw more than his balance", async () => {
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

                    const withdraws = new BN(20);
                    await expectRevert(
                        savingAccount.withdraw(ETH_ADDRESS, withdraws),
                        "Insufficient balance."
                    );
                });
            });
        });
    });
});
