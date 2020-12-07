import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

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
    const eighteenPrecision = new BN(10).pow(new BN(18));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressFIN: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20FIN: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressFIN = tokens[9];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        erc20FIN = await ERC20.at(addressFIN);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
    });

    context("Mining tests", async () => {
        context("Single Token", async () => {
            context("deposit mining", async () => {
                context("Compound Supported 18 decimal Token", async () => {
                    context("should succeed", async () => {
                        it("when small amount of DAI is deposited", async function () {
                            this.timeout(0);
                            // 1. Approve 1000 tokens
                            const numOfToken = new BN(10000);
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });

                            const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                user1
                            );

                            const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                            const balCTokensBefore = await cDAI.balanceOf(savingAccount.address);

                            // const b1 = await savingAccount.getBlockNumber({ from: user1 });
                            // console.log("Block number = ", b1.toString());

                            // 2. Deposit Token to SavingContract
                            await savingAccount.deposit(erc20DAI.address, new BN(5000), {
                                from: user1,
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
                            expect(totalDefinerBalanceChange).to.be.bignumber.equal(new BN(5000));

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
                            expect(
                                expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                            ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));

                            // 4. Claim the minted tokens

                            // fastforward
                            const block = new BN(await time.latestBlock());
                            console.log("block", block.toString());

                            await savingAccount.fastForward(100000);
                            //await time.advanceBlockTo(block.add(new BN(10000)));

                            const block2 = await time.latestBlock();
                            console.log("block2", block2.toString());

                            // Deposit an extra token to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                from: user1,
                            });
                            await savingAccount.claim({ from: user1 });

                            const balFIN = await erc20FIN.balanceOf(user1);
                            console.log("balFIN", balFIN.toString());
                        });

                        it("when large amount of DAI is deposited", async function () {
                            this.timeout(0);
                            // 1. Approve 1000 tokens
                            const numOfToken = eighteenPrecision.mul(new BN(10));
                            await erc20DAI.transfer(user1, numOfToken);
                            await erc20DAI.approve(savingAccount.address, numOfToken, {
                                from: user1,
                            });

                            const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                                erc20DAI.address,
                                user1
                            );

                            const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);
                            const balCTokensBefore = await cDAI.balanceOf(savingAccount.address);

                            // const b1 = await savingAccount.getBlockNumber({ from: user1 });
                            // console.log("Block number = ", b1.toString());

                            // 2. Deposit Token to SavingContract
                            await savingAccount.deposit(
                                erc20DAI.address,
                                numOfToken.div(new BN(2)),
                                {
                                    from: user1,
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
                            expect(
                                expectedCTokensAtSavingAccount.sub(new BN(balCTokensBefore))
                            ).to.be.bignumber.equal(new BN(balCTokens).div(new BN(10)));

                            // 4. Claim the minted tokens

                            // fastforward
                            const block = new BN(await time.latestBlock());
                            console.log("block", block.toString());

                            //await savingAccount.fastForward(100000);
                            await time.advanceBlockTo(block.add(new BN(10000)));

                            const block2 = await time.latestBlock();
                            console.log("block2", block2.toString());

                            // Deposit an extra token to create a new rate check point
                            await savingAccount.deposit(erc20DAI.address, new BN(1000), {
                                from: user1,
                            });
                            await savingAccount.claim({ from: user1 });

                            const balFIN = await erc20FIN.balanceOf(user1);
                            console.log("balFIN", balFIN.toString());
                        });
                    });
                });

                context("Compound Supported 6 decimals Token", async () => {
                    context("Should succeed", async () => {
                        it("when small amount of USDC tokens are deposited");

                        it("when large amount of USDC tokens are deposited");
                    });
                });

                context("Compound Supported 8 decimals Token", async () => {
                    context("Should succeed", async () => {
                        it("when small amount of WBTC tokens are deposited");

                        it("when large amount of WBTC tokens are deposited");
                    });
                });
            });

            context("borrow mining", async () => {
                context("should succeed", async () => {});
            });
        });
    });
});
