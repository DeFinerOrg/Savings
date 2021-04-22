import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { takeSnapshot, revertToSnapShot } from "../../test-helpers/SnapshotUtils";

var chai = require("chai");
var expect = chai.expect;
let snapshotId: string;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("ERC20");

contract("depositMiningTests", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    const eighteenPrecision = new BN(10).pow(new BN(18));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;
    let addressLP: any;
    let addressFIN: any;

    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cWBTC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20LP: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let erc20FIN: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

    let TWO_DAIS: any;
    let ONE_DAI: any;
    let HALF_DAI: any;
    let ONE_FIFTH_DAI: any;
    let ONE_USDC: any;
    let ONE_FIN: any;

    before(function() {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("whitePaperModel.scen");
    });

    beforeEach(async function() {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;

        // 1. initialization.
        tokens = await testEngine.erc20Tokens;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];
        addressLP = tokens[10];
        addressFIN = tokens[11];

        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20WBTC = await ERC20.at(addressWBTC);
        erc20LP = await ERC20.at(addressLP);
        erc20FIN = await ERC20.at(addressFIN);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        ONE_DAI = eighteenPrecision;
        HALF_DAI = ONE_DAI.div(new BN(2));
        ONE_FIFTH_DAI = ONE_DAI.div(new BN(5));
        TWO_DAIS = ONE_DAI.mul(new BN(2));
        ONE_USDC = sixPrecision;
        ONE_FIN = eighteenPrecision;

        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressDAI, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressUSDC, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressTUSD, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressMKR, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressWBTC, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressLP, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(addressFIN, ONE_FIN, ONE_FIN);
        await testEngine.tokenInfoRegistry.updateMiningSpeed(ETH_ADDRESS, ONE_FIN, ONE_FIN);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);

        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    context("Mining tests", async () => {
        context("Single Token", async () => {
            context("deposit mining", async () => {
                context("Single user, single token", async () => {
                    context("With ETH", async () => {
                        context("should succeed", async () => {
                            it("when small amount of ETH is deposited", async () => {
                                //this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                const depositAmount = new BN(10000);
                                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                                    savingAccount.address
                                );
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    ETH_ADDRESS,
                                    user1
                                );
                                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                                    value: depositAmount,
                                    from: user1
                                });
                                const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                                    savingAccount.address
                                );
                                const userBalanceDiff = new BN(ETHbalanceAfterDeposit).sub(
                                    new BN(ETHbalanceBeforeDeposit)
                                );
                                const expectedTokensAtSavingAccountContract = new BN(depositAmount)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                // validate savingAccount ETH balance
                                expect(userBalanceDiff).to.be.bignumber.equal(
                                    expectedTokensAtSavingAccountContract
                                );
                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    ETH_ADDRESS,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    depositAmount
                                );
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(ETH_ADDRESS, new BN(1000), {
                                    value: new BN(1000),
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.deposit(ETH_ADDRESS, new BN(10), {
                                    value: new BN(10),
                                    from: user1
                                });
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(ETH_ADDRESS, new BN(1000), {
                                    value: new BN(1000),
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });
                            it("when large amount of ETH is deposited", async () => {
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                const depositAmount = web3.utils.toWei("1000", "ether");
                                const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                                    savingAccount.address
                                );
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    ETH_ADDRESS,
                                    user1
                                );
                                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                                    value: depositAmount,
                                    from: user1
                                });
                                const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                                    savingAccount.address
                                );
                                const userBalanceDiff = new BN(ETHbalanceAfterDeposit).sub(
                                    new BN(ETHbalanceBeforeDeposit)
                                );
                                const expectedTokensAtSavingAccountContract = new BN(depositAmount)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                // validate savingAccount ETH balance
                                expect(userBalanceDiff).to.be.bignumber.equal(
                                    expectedTokensAtSavingAccountContract
                                );
                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    ETH_ADDRESS,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    depositAmount
                                );
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(ETH_ADDRESS, new BN(1000), {
                                    value: new BN(1000),
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.deposit(ETH_ADDRESS, new BN(10), {
                                    value: new BN(10),
                                    from: user1
                                });
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(ETH_ADDRESS, new BN(1000), {
                                    value: new BN(1000),
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });
                        });
                    });

                    context("Compound Supported 18 decimal Token", async () => {
                        context("should succeed", async () => {
                            it("when small amount of DAI is deposited", async function() {
                                this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20DAI.transfer(user1, numOfToken);
                                await erc20DAI.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );
                                const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                                const balCTokensBefore = await cDAI.balanceOf(
                                    savingAccount.address
                                );
                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20DAI.address, new BN(5000), {
                                    from: user1
                                });
                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = new BN(5000)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20DAI.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );
                                const expectedTokensAtCTokenContract = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);
                                const expectedCTokensAtSavingAccount = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cDAI.balanceOf(savingAccount.address);
                                // expect(
                                //     expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                // ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));
                                expect(
                                    new BN(4249).sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                    from: user1
                                });
                                await savingAccount.fastForward(100000);
                                const block2 = await time.latestBlock();
                                console.log("block2", block2.toString());
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("101016641704110500915293")
                                );
                            });
                            it("when large amount of DAI is deposited", async function() {
                                this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                // 1. Approve 1000 tokens
                                const numOfToken = ONE_DAI.mul(new BN(10));
                                await erc20DAI.transfer(user1, numOfToken);
                                await erc20DAI.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );
                                const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                                const balCTokensBefore = await cDAI.balanceOf(
                                    savingAccount.address
                                );
                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(
                                    erc20DAI.address,
                                    ONE_DAI.mul(new BN(5)),
                                    {
                                        from: user1
                                    }
                                );
                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = ONE_DAI.mul(new BN(5))
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20DAI.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    numOfToken.div(new BN(2))
                                );
                                const expectedTokensAtCTokenContract = ONE_DAI.mul(new BN(5))
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);
                                const expectedCTokensAtSavingAccount = ONE_DAI.mul(new BN(5))
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cDAI.balanceOf(savingAccount.address);
                                // expect(
                                //     expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                // ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));
                                expect(
                                    new BN("4249999864155257862").sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                    from: user1
                                });
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("101000000678307669513994")
                                );
                            });
                        });
                    });

                    context("Compound Supported 6 decimals Token", async () => {
                        context("Should succeed", async () => {
                            it("when small amount of USDC tokens are deposited", async () => {
                                //this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20USDC.transfer(user1, numOfToken);
                                await erc20USDC.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20USDC.address,
                                    user1
                                );
                                const balCTokenContractBefore = await erc20USDC.balanceOf(
                                    cUSDC_addr
                                );
                                const balCTokensBefore = await cUSDC.balanceOf(
                                    savingAccount.address
                                );
                                // const b1 = await savingAccount.getBlockNumber({ from: user1 });
                                // console.log("Block number = ", b1.toString());
                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20USDC.address, new BN(5000), {
                                    from: user1
                                });
                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = new BN(5000)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20USDC.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20USDC.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );
                                const expectedTokensAtCTokenContract = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20USDC.balanceOf(cUSDC_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);
                                const expectedCTokensAtSavingAccount = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cUSDC.balanceOf(savingAccount.address);
                                // expect(
                                //     expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                // ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(100000)));
                                expect(
                                    new BN(4249).sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(100000)));
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20USDC.address, new BN(10), {
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.deposit(erc20USDC.address, new BN(10), {
                                    from: user1
                                });
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20USDC.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("101019924287706714484957")
                                );
                            });
                            it("when large amount of USDC tokens are deposited", async () => {
                                //this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                // 1. Approve 100 whole tokens
                                const numOfToken = sixPrecision.mul(new BN(100));
                                await erc20USDC.transfer(user1, numOfToken);
                                await erc20USDC.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20USDC.address,
                                    user1
                                );
                                const balCTokenContractBefore = await erc20USDC.balanceOf(
                                    cUSDC_addr
                                );
                                const balCTokensBefore = await cUSDC.balanceOf(
                                    savingAccount.address
                                );
                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(
                                    erc20USDC.address,
                                    ONE_USDC.mul(new BN(50)),
                                    {
                                        from: user1
                                    }
                                );
                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = ONE_USDC.mul(
                                    new BN(50)
                                )
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20USDC.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20USDC.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    ONE_USDC.mul(new BN(50))
                                );
                                const expectedTokensAtCTokenContract = ONE_USDC.mul(new BN(50))
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20USDC.balanceOf(cUSDC_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);
                                const expectedCTokensAtSavingAccount = ONE_USDC.mul(new BN(50))
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cUSDC.balanceOf(savingAccount.address);
                                expect(
                                    new BN(42499995).sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(100000)));
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20USDC.address, new BN(10), {
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20USDC.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("101000001999999600000079")
                                );
                            });
                        });
                    });

                    context("Compound Supported 8 decimals Token", async () => {
                        context("Should succeed", async () => {
                            it("when small amount of WBTC tokens are deposited", async () => {
                                //this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20WBTC.transfer(user1, numOfToken);
                                await erc20WBTC.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20WBTC.address,
                                    user1
                                );
                                const balCTokenContractBefore = await erc20WBTC.balanceOf(
                                    cWBTC_addr
                                );
                                const balCTokensBefore = await cWBTC.balanceOf(
                                    savingAccount.address
                                );
                                // const b1 = await savingAccount.getBlockNumber({ from: user1 });
                                // console.log("Block number = ", b1.toString());
                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20WBTC.address, new BN(5000), {
                                    from: user1
                                });
                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = new BN(5000)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20WBTC.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20WBTC.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );
                                const expectedTokensAtCTokenContract = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20WBTC.balanceOf(cWBTC_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);
                                const expectedCTokensAtSavingAccount = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cWBTC.balanceOf(savingAccount.address);
                                expect(
                                    expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10000)));
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20WBTC.address, new BN(10), {
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20WBTC.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });
                            it("when large amount of WBTC tokens are deposited", async () => {
                                //this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                // 1. Approve 100 whole tokens
                                const numOfToken = eightPrecision.mul(new BN(100));
                                await erc20WBTC.transfer(user1, numOfToken);
                                await erc20WBTC.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20WBTC.address,
                                    user1
                                );
                                const balCTokenContractBefore = await erc20WBTC.balanceOf(
                                    cWBTC_addr
                                );
                                const balCTokensBefore = await cWBTC.balanceOf(
                                    savingAccount.address
                                );
                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20WBTC.address, new BN(5000), {
                                    from: user1
                                });
                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = new BN(5000)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20WBTC.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20WBTC.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );
                                const expectedTokensAtCTokenContract = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20WBTC.balanceOf(cWBTC_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);
                                const expectedCTokensAtSavingAccount = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cWBTC.balanceOf(savingAccount.address);
                                expect(
                                    expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10000)));
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20WBTC.address, new BN(10), {
                                    from: user1
                                });
                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());
                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.fastForward(100000);
                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20WBTC.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });
                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });
                        });
                    });

                    context("Compound unsupported 18 decimal Token", async () => {
                        context("Should succeed", async () => {
                            it("when small amount of MKR tokens are deposited", async function() {
                                this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                const ONE_MKR = new BN(10).pow(new BN(18));

                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20MKR.transfer(user1, numOfToken);
                                await erc20MKR.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20MKR.address,
                                    user1
                                );

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20MKR.address, new BN(5000), {
                                    from: user1
                                });

                                // 3. Validate that the tokens are deposited to SavingAccount
                                // 3.1 SavingAccount contract must received tokens
                                const expectedTokensAtSavingAccountContract = new BN(5000);
                                const balSavingAccount = await erc20MKR.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );

                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20MKR.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20MKR.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens

                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20MKR.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });

                            it("when large amount of MKR tokens are deposited", async () => {
                                //this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);
                                const ONE_MKR = new BN(10).pow(new BN(18));

                                // 1. Approve 1000 tokens
                                const numOfToken = ONE_MKR.mul(new BN(100));
                                await erc20MKR.transfer(user1, numOfToken);
                                await erc20MKR.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20MKR.address,
                                    user1
                                );

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(
                                    erc20MKR.address,
                                    ONE_MKR.mul(new BN(50)),
                                    {
                                        from: user1
                                    }
                                );

                                // 3. Validate that the tokens are deposited to SavingAccount
                                // 3.1 SavingAccount contract must received tokens
                                const expectedTokensAtSavingAccountContract = ONE_MKR.mul(
                                    new BN(50)
                                );
                                const balSavingAccount = await erc20MKR.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );

                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20MKR.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    ONE_MKR.mul(new BN(50))
                                );

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20MKR.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20MKR.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });

                            it("when small amount of FIN tokens are deposited", async () => {
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);

                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20FIN.transfer(user1, numOfToken);
                                await erc20FIN.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20FIN.address,
                                    user1
                                );
                                const balSavingAccountBeforeDeposit = await erc20FIN.balanceOf(
                                    savingAccount.address
                                );

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20FIN.address, new BN(5000), {
                                    from: user1
                                });

                                // 3. Validate that the tokens are deposited to SavingAccount
                                // 3.1 SavingAccount contract must received tokens
                                const expectedTokensAtSavingAccountContract = new BN(5000);
                                const balSavingAccount = await erc20FIN.balanceOf(
                                    savingAccount.address
                                );
                                expect(
                                    BN(balSavingAccountBeforeDeposit).add(
                                        expectedTokensAtSavingAccountContract
                                    )
                                ).to.be.bignumber.equal(balSavingAccount);

                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20FIN.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20FIN.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20FIN.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("101000000000000000003989")
                                );
                            });

                            it("when large amount of FIN tokens are deposited", async () => {
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);

                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000).mul(ONE_FIN);
                                await erc20FIN.transfer(user1, numOfToken);
                                await erc20FIN.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20FIN.address,
                                    user1
                                );
                                const balSavingAccountBeforeDeposit = await erc20FIN.balanceOf(
                                    savingAccount.address
                                );

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20FIN.address, new BN(5000), {
                                    from: user1
                                });

                                // 3. Validate that the tokens are deposited to SavingAccount
                                // 3.1 SavingAccount contract must received tokens
                                const expectedTokensAtSavingAccountContract = new BN(5000);
                                const balSavingAccount = await erc20FIN.balanceOf(
                                    savingAccount.address
                                );
                                expect(
                                    BN(balSavingAccountBeforeDeposit).add(
                                        expectedTokensAtSavingAccountContract
                                    )
                                ).to.be.bignumber.equal(balSavingAccount);

                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20FIN.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20FIN.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens

                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20FIN.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("110999999999999999993989")
                                );
                            });

                            it("when small amount of LP tokens are deposited", async () => {
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);

                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20LP.transfer(user1, numOfToken);
                                await erc20LP.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20LP.address,
                                    user1
                                );
                                const balSavingAccountBeforeDeposit = await erc20LP.balanceOf(
                                    savingAccount.address
                                );

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(erc20LP.address, new BN(5000), {
                                    from: user1
                                });

                                // 3. Validate that the tokens are deposited to SavingAccount
                                // 3.1 SavingAccount contract must received tokens
                                const expectedTokensAtSavingAccountContract = new BN(5000);
                                const balSavingAccount = await erc20LP.balanceOf(
                                    savingAccount.address
                                );
                                expect(
                                    BN(balSavingAccountBeforeDeposit).add(
                                        expectedTokensAtSavingAccountContract
                                    )
                                ).to.be.bignumber.equal(balSavingAccount);

                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20LP.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20LP.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20LP.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });

                            it("when large amount of LP tokens are deposited", async () => {
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);

                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(100).mul(ONE_DAI);
                                await erc20LP.transfer(user1, numOfToken);
                                await erc20LP.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20LP.address,
                                    user1
                                );
                                const balSavingAccountBeforeDeposit = await erc20LP.balanceOf(
                                    savingAccount.address
                                );

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(
                                    erc20LP.address,
                                    new BN(50).mul(ONE_DAI),
                                    {
                                        from: user1
                                    }
                                );

                                // 3. Validate that the tokens are deposited to SavingAccount
                                // 3.1 SavingAccount contract must received tokens
                                const expectedTokensAtSavingAccountContract = new BN(50).mul(
                                    ONE_DAI
                                );
                                const balSavingAccount = await erc20LP.balanceOf(
                                    savingAccount.address
                                );
                                expect(
                                    BN(balSavingAccountBeforeDeposit).add(
                                        expectedTokensAtSavingAccountContract
                                    )
                                ).to.be.bignumber.equal(balSavingAccount);

                                // Validate the total balance on DeFiner
                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20LP.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(50).mul(ONE_DAI)
                                );

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20LP.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens
                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20LP.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());
                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("100999999999999999999999")
                                );
                            });
                        });
                    });
                });

                context("Single user, multiple tokens", async () => {
                    context("With ETH", async () => {
                        context("should succeed", async () => {
                            it("when small amount of ETH & DAI are deposited");

                            it("when small amount of ETH & MKR are deposited");

                            it("when small amount of ETH & WBTC are deposited");

                            it("when large amount of ETH & DAI are deposited");

                            it("when large amount of ETH & MKR are deposited");

                            it("when large amount of ETH & WBTC are deposited");
                        });
                    });

                    context("Compound Supported 18 decimal Token", async () => {
                        context("should succeed", async () => {
                            it("when small amount of DAI & USDC are deposited", async function() {
                                this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);

                                // 1. Approve 1000 tokens
                                const numOfToken = new BN(10000);
                                await erc20DAI.transfer(user1, numOfToken);
                                await erc20USDC.transfer(user1, numOfToken);
                                await erc20DAI.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                await erc20USDC.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDepositDAI = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );

                                const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                                const balCTokensBefore = await cDAI.balanceOf(
                                    savingAccount.address
                                );

                                // 2. Deposit Tokens to SavingContract
                                await savingAccount.deposit(erc20DAI.address, new BN(5000), {
                                    from: user1
                                });
                                await savingAccount.deposit(erc20USDC.address, new BN(5000), {
                                    from: user1
                                });

                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = new BN(5000)
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20DAI.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );

                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDepositDAI));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    new BN(5000)
                                );

                                const expectedTokensAtCTokenContract = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);

                                const expectedCTokensAtSavingAccount = new BN(5000)
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cDAI.balanceOf(savingAccount.address);
                                // expect(
                                //     expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                // ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));

                                expect(
                                    new BN(4249).sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens

                                // fastforward
                                const block = new BN(await time.latestBlock());
                                console.log("block", block.toString());

                                const balFIN1 = await erc20FIN.balanceOf(user1);
                                console.log("balFIN1", balFIN1.toString());
                                await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                    from: user1
                                });
                                await savingAccount.deposit(erc20USDC.address, new BN(10), {
                                    from: user1
                                });

                                await savingAccount.fastForward(100000);

                                const block2 = await time.latestBlock();
                                console.log("block2", block2.toString());

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());

                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("202016641704110500915292")
                                );
                            });

                            it("when large amount of DAI & USDC are deposited", async () => {
                                // this.timeout(0);
                                await erc20FIN.transfer(
                                    savingAccount.address,
                                    ONE_FIN.mul(new BN(1000000))
                                );
                                await savingAccount.fastForward(100000);

                                // 1. Approve 1000 tokens
                                const numOfToken = ONE_DAI.mul(new BN(10));
                                const numOfUSDC = sixPrecision.mul(new BN(10));
                                await erc20DAI.transfer(user1, numOfToken);
                                await erc20USDC.transfer(user1, numOfUSDC);
                                await erc20DAI.approve(savingAccount.address, numOfToken, {
                                    from: user1
                                });
                                await erc20USDC.approve(savingAccount.address, numOfUSDC, {
                                    from: user1
                                });

                                const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );

                                const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                                const balCTokensBefore = await cDAI.balanceOf(
                                    savingAccount.address
                                );

                                // const b1 = await savingAccount.getBlockNumber({ from: user1 });
                                // console.log("Block number = ", b1.toString());

                                // 2. Deposit Token to SavingContract
                                await savingAccount.deposit(
                                    erc20DAI.address,
                                    numOfToken.div(new BN(2)),
                                    {
                                        from: user1
                                    }
                                );
                                await savingAccount.deposit(
                                    erc20USDC.address,
                                    numOfUSDC.div(new BN(2)),
                                    {
                                        from: user1
                                    }
                                );

                                // 3. Validate that the tokens are deposited to SavingAccount
                                const expectedTokensAtSavingAccountContract = numOfToken
                                    .div(new BN(2))
                                    .mul(new BN(15))
                                    .div(new BN(100));
                                const balSavingAccount = await erc20DAI.balanceOf(
                                    savingAccount.address
                                );
                                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                                    balSavingAccount
                                );
                                console.log("check12");

                                const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                                    erc20DAI.address,
                                    user1
                                );
                                const totalDefinerBalanceChange = new BN(
                                    totalDefinerBalanceAfterDeposit
                                ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                                expect(totalDefinerBalanceChange).to.be.bignumber.equal(
                                    numOfToken.div(new BN(2))
                                );

                                const expectedTokensAtCTokenContract = numOfToken
                                    .div(new BN(2))
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                                expect(
                                    new BN(balCTokenContractBefore).add(
                                        new BN(expectedTokensAtCTokenContract)
                                    )
                                ).to.be.bignumber.equal(balCTokenContract);

                                const expectedCTokensAtSavingAccount = numOfToken
                                    .div(new BN(2))
                                    .mul(new BN(85))
                                    .div(new BN(100));
                                const balCTokens = await cDAI.balanceOf(savingAccount.address);
                                // expect(
                                //     expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                                // ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));

                                expect(
                                    new BN("4249999864155257862").sub(new BN(balCTokensBefore))
                                ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.fastForward(1000);
                                await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                    from: user1
                                });

                                // 4. Claim the minted tokens

                                // fastforward
                                const block = new BN(await time.latestBlock());
                                await savingAccount.deposit(erc20DAI.address, new BN(10), {
                                    from: user1
                                });

                                await savingAccount.fastForward(100000);

                                // Deposit an extra token to create a new rate check point
                                await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                    from: user1
                                });
                                await savingAccount.deposit(erc20USDC.address, new BN(1000), {
                                    from: user1
                                });

                                await savingAccount.claim({ from: user1 });

                                const balFIN = await erc20FIN.balanceOf(user1);
                                console.log("balFIN", balFIN.toString());

                                expect(new BN(balFIN)).to.be.bignumber.equal(
                                    new BN("202000000678307669513994")
                                );
                            });

                            it("when small amount of multiple different tokens are deposited");

                            it("when large amount of multiple different tokens are deposited");
                        });
                    });
                });

                context("Multiple different users, multiple tokens", async () => {});
            });
        });
    });
});
