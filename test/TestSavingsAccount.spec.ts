import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const TokenRegistry: t.TokenRegistryContract = artifacts.require("TokenRegistry");
const CTokenRegistry: t.CTokenRegistryContract = artifacts.require("CTokenRegistry");
const ChainLinkOracle: t.ChainLinkOracleContract = artifacts.require("ChainLinkOracle");
/* const _erc20Tokens = await getERC20Tokens();
const _cTokens = await getCTokens(_erc20Tokens); */

contract("SavingAccount", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const dummy = accounts[9];

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
    });

    context("constructor", async () => {
        context("should fail", async () => {
            it("when ...<describe the context>");
        });

        context("should succeed", async () => {
            it("deployed and state variables initialized", async () => {
                expect(await savingAccount.EMERGENCY_ADDR()).to.equal(EMERGENCY_ADDRESS);
                expect(await savingAccount.ETH_ADDR()).equal(ETH_ADDRESS);
            });

            it("when all parameters are valid");
        });
    });

    context("depositToken()", async () => {
        context("should fail", async () => {
            it("when unsupported token address passed");

            it("when amount is zero");
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Get DAI contact instance
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const cTokenDAI: t.MockCTokenInstance = await MockCToken.at(addressCTokenForDAI);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // 3. Deposit Token to SavingContract
                await savingAccount.depositToken(erc20DAI.address, numOfToken);

                // 4. Validate that the tokens are deposited to SavingAccount
                // 4.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // 4.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 4.2 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(balCTokenContract);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
            });
        });

        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const numOfToken = new BN(1000);
                //await erc20DAI.approve(savingAccount.address, numOfToken);

                //Try depositting unsupported Token to SavingContract
                //await savingAccount.depositToken(dummy, numOfToken); //enclose in expect - revert of OpenZeppelin, look into example as well
                await expectRevert(
                    savingAccount.depositToken(dummy, numOfToken),
                    "Unsupported token"
                );
            });
        });

        /* context("should succeed", async () => {
            it("when ETH address is passed", async () => {
                const ethToken = new BN(10);
                //await erc20DAI.approve(savingAccount.address, numOfToken);

                //Try depositting unsupported Token to SavingContract
                await savingAccount.depositToken(ETH_ADDRESS, ethToken);
                await expectRevert(
                    savingAccount.depositToken(dummy, ethToken),
                    "Unsupported token"
                );
            });
        }); */
    });

    context("borrow()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("repay()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("withdrawToken()", async () => {
        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Get DAI contract instance
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockERC20Instance = await MockERC20.at(addressDAI);
                const cTokenDAI: t.MockCTokenInstance = await MockCToken.at(addressCTokenForDAI);

                // 2. Approve 1000 tokens
                const numOfTokens = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfTokens);

                // deposit tokens
                await savingAccount.depositToken(erc20DAI.address, numOfTokens);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(20);

                // 3. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccountBeforeWithdraw = await erc20DAI.balanceOf(
                    savingAccount.address
                );
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccountBeforeWithdraw);

                let userBalanceBeforeWithdraw = await erc20DAI.balanceOf(owner);

                // 4. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20DAI.address, withdrawTokens);

                //Validate user balance
                let userBalanceAfterWithdraw = await erc20DAI.balanceOf(owner);
                const userBalanceDiff = BN(userBalanceAfterWithdraw).sub(
                    BN(userBalanceBeforeWithdraw)
                );
                expect(withdrawTokens).to.be.bignumber.equal(userBalanceDiff);

                // 5. Validate Withdraw

                //Validate savingAccount contract balance
                const expectedTokenBalanceAfterWithdraw = numOfTokens
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(20));
                const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                /* const expectedTokensAtCToken = numOfTokens.mul(new BN(85)).div(new BN(100));
                const balCToken = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCToken).to.be.bignumber.equal(balCToken); */

                // amount present in compound
            });

            it("when partial withdrawn");

            it("when full withdrawn");
            /*
            it("when withdrawing ETH", async () => {
                const withdrawTokens = new BN(20);
                //await erc20DAI.approve(savingAccount.address, numOfToken);

                //Try depositting unsupported Token to SavingContract
                await savingAccount.withdrawToken(ETH_ADDRESS, withdrawTokens);
            });
            */

            it("when partial ETH withdrawn");

            it("when full ETH withdrawn");
        });

        context("should fail", async () => {
            it("when unsupported token address is passed", async () => {
                const withdrawTokens = new BN(20);
                //await erc20DAI.approve(savingAccount.address, numOfToken);

                //Try depositting unsupported Token to SavingContract
                //await savingAccount.withdrawToken(dummy, numOfToken);
                await expectRevert(
                    savingAccount.withdrawToken(dummy, withdrawTokens),
                    "Unsupported token"
                );
            });

            it("when tokenAddress is zero");

            it("when amount is zero");

            it("when a user tries to withdraw who has not deposited before");

            it("when user tries to withdraw more then his balance");

            it("when user tries to withdraw tokens which are used as collateral by the user");
        });
    });

    context("liquidate()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("toCompound()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("fromCompound()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });
});
