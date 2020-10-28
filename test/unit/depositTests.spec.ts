import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("ERC20");

contract("SavingAccount.deposit", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

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
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        //console.log("addressCETH", addressCETH);
    });

    context("deposit()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("should succeed", async () => {
                    it("C5: when small amount of ETH is passed", async () => {
                        const depositAmount = new BN(100);
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
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
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(
                                new BN(expectedTokensAtCTokenContract)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            new BN(balCTokens).div(new BN(10))
                        );
                    });

                    it("C6: when 1000 whole ETH are deposited", async () => {
                        const depositAmount = web3.utils.toWei("1000", "ether");
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });
                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        console.log("ETHbalanceAfterDeposit", ETHbalanceAfterDeposit.toString());

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
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(
                                new BN(expectedTokensAtCTokenContract)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = depositAmount
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            new BN(balCTokens).div(new BN(10))
                        );
                    });

                    it("when 100 whole ETH are deposited then some small ETH is deposited so that Compound is not triggered", async () => {
                        const depositAmount = web3.utils.toWei("100", "ether");
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = await cETH.balanceOf(savingAccount.address);

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });
                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        console.log("ETHbalanceAfterDeposit", ETHbalanceAfterDeposit.toString());

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
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = new BN(depositAmount)
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(expectedTokensAtCTokenContract).add(
                                new BN(balCTokenContractBefore)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = new BN(depositAmount)
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            new BN(balCTokens).div(new BN(10))
                        );

                        // Deposit some ETH again
                        const depositAmount2 = new BN(1000);

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount2, {
                            value: depositAmount2
                        });

                        const ETHbalanceAfterDepositAgain = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Verify second deposit
                        const expectedTokensAtSavingAccountContract2 = new BN(
                            expectedTokensAtSavingAccountContract
                        ).add(depositAmount2);

                        expect(new BN(ETHbalanceAfterDepositAgain)).to.be.bignumber.equal(
                            expectedTokensAtSavingAccountContract2
                        );

                        // Verify that deposit doesn't affect Compound balance
                        const balCTokenContract2 = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(expectedTokensAtCTokenContract).add(
                                new BN(balCTokenContractBefore)
                            )
                        ).to.be.bignumber.equal(balCTokenContract2);

                        const balCTokens2 = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            new BN(balCTokens2).div(new BN(10))
                        );
                    });

                    it("when 100 whole ETH are deposited then some ETH is deposited so that Compound is triggered", async () => {
                        const depositAmount = web3.utils.toWei("100", "ether");
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = await cETH.balanceOf(savingAccount.address);

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });
                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        console.log("ETHbalanceAfterDeposit", ETHbalanceAfterDeposit.toString());

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
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(depositAmount);

                        // Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = new BN(depositAmount)
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(expectedTokensAtCTokenContract).add(
                                new BN(balCTokenContractBefore)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = new BN(depositAmount)
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            new BN(balCTokens).div(new BN(10))
                        );

                        // Deposit some ETH again
                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        const ETHbalanceAfterDepositAgain = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        // Verify second deposit
                        const expectedTokensAtSavingAccountContract2 = new BN(
                            expectedTokensAtSavingAccountContract
                        ).mul(new BN(2));

                        expect(new BN(ETHbalanceAfterDepositAgain)).to.be.bignumber.equal(
                            expectedTokensAtSavingAccountContract2
                        );

                        // Verify that deposit affects Compound balance
                        const expectedTokensAtCTokenContract2 = new BN(depositAmount)
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract2 = await web3.eth.getBalance(cETH_addr);
                        expect(
                            new BN(expectedTokensAtCTokenContract)
                                .add(new BN(balCTokenContractBefore))
                                .add(new BN(expectedTokensAtCTokenContract2))
                        ).to.be.bignumber.equal(balCTokenContract2);

                        const expectedCTokensAtSavingAccount2 = new BN(depositAmount)
                            .mul(new BN(85))
                            .div(new BN(100))
                            .mul(new BN(2));
                        const balCTokens2 = await cETH.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount2).to.be.bignumber.equal(
                            new BN(balCTokens2).div(new BN(10))
                        );
                    });
                });
            });

            context("Compound Supported 18 decimals Token", async () => {
                context("Should suceed", async () => {
                    //single token, small amount
                    it("D5: when small amount of DAI is deposited", async () => {
                        // 1. Approve 1000 tokens
                        const numOfToken = new BN(1000);
                        await erc20DAI.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                        const balCTokensBefore = await cDAI.balanceOf(savingAccount.address);

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20DAI.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken
                            .mul(new BN(15))
                            .div(new BN(100));
                        const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                        // 3.2 SavingAccount variables are changed

                        // 3.3 Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(
                                new BN(expectedTokensAtCTokenContract)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // 3.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        // get exchange rate and then verify
                        const balCTokens = await cDAI.balanceOf(savingAccount.address);
                        expect(
                            expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                        ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));
                    });

                    //single token, large amount
                    it("D6: when 1000 whole DAI are deposited", async () => {
                        const ONE_DAI = new BN(10).pow(new BN(18));

                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("1000").mul(ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20DAI.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken
                            .mul(new BN(15))
                            .div(new BN(100));
                        const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                        // 3.2 SavingAccount variables are changed

                        // 3.3 Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20DAI.balanceOf(cDAI_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(
                                new BN(expectedTokensAtCTokenContract)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // 3.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cDAI.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            new BN(balCTokens).div(new BN(10))
                        );
                    });
                });
            });

            context("Compound Supported 6 decimals Token", async () => {
                context("Should succeed", async () => {
                    it("F5: when small amount of USDC tokens are deposited", async () => {
                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("100");
                        await erc20USDC.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20USDC.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken
                            .mul(new BN(15))
                            .div(new BN(100));
                        const balSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                        // 3.2 SavingAccount variables are changed

                        // 3.3 Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20USDC.balanceOf(cUSDC_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(
                                new BN(expectedTokensAtCTokenContract)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // 3.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cUSDC.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(100000))
                        );
                    });

                    it("F6: when 1000 whole USDC tokens are deposited", async () => {
                        const ONE_USDC = new BN(10).pow(new BN(6));

                        // 1. Approve 1000 tokens
                        const numOfToken = new BN("1000").mul(ONE_USDC);
                        await erc20USDC.approve(savingAccount.address, numOfToken);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );

                        const balCTokenContractBefore = await erc20USDC.balanceOf(cUSDC_addr);

                        // 2. Deposit Token to SavingContract
                        await savingAccount.deposit(erc20USDC.address, numOfToken);

                        // 3. Validate that the tokens are deposited to SavingAccount
                        // 3.1 SavingAccount contract must received tokens
                        const expectedTokensAtSavingAccountContract = numOfToken
                            .mul(new BN(15))
                            .div(new BN(100));
                        const balSavingAccount = await erc20USDC.balanceOf(savingAccount.address);
                        expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                            balSavingAccount
                        );

                        // Validate the total balance on DeFiner
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20USDC.address,
                            owner
                        );
                        const totalDefinerBalanceChange = new BN(
                            totalDefinerBalanceAfterDeposit
                        ).sub(new BN(totalDefinerBalanceBeforeDeposit));
                        expect(totalDefinerBalanceChange).to.be.bignumber.equal(numOfToken);

                        // 3.2 SavingAccount variables are changed

                        // 3.3 Some tokens are sent to Compound contract
                        const expectedTokensAtCTokenContract = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokenContract = await erc20USDC.balanceOf(cUSDC_addr);
                        expect(
                            new BN(balCTokenContractBefore).add(
                                new BN(expectedTokensAtCTokenContract)
                            )
                        ).to.be.bignumber.equal(balCTokenContract);

                        // 3.4 cToken must be minted for SavingAccount
                        const expectedCTokensAtSavingAccount = numOfToken
                            .mul(new BN(85))
                            .div(new BN(100));
                        const balCTokens = await cUSDC.balanceOf(savingAccount.address);
                        expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(
                            balCTokens.div(new BN(100000))
                        );
                    });
                });
            });

            context("Compound unsupported Token", async () => {
                context("Should succeed", async () => {
                    // When Compound unsupported tokens are passed
                    it("G5: when TUSD address is passed", async () => {
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

                    it("G4: when 1000 whole TUSD tokens are deposited", async () => {
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

                    it("G5: when MKR address is passed", async () => {
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

                    it("G4: when 1000 whole MKR tokens are deposited", async () => {
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
                it("when unsupported token address is passed", async () => {
                    const numOfToken = new BN(1000);
                    await expectRevert(
                        savingAccount.deposit(dummy, numOfToken),
                        "Unsupported token"
                    );
                });

                it("when amount is zero", async () => {
                    const deposits = new BN(0);

                    await expectRevert(
                        savingAccount.deposit(erc20DAI.address, deposits),
                        "Amount is zero"
                    );
                });
            });
        });
    });
});
