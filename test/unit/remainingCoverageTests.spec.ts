import { BaseContract, BaseInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ChainLinkOracle: t.ChainLinkOracleContract = artifacts.require("ChainLinkOracle");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

contract("RemainingCoverage", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const tempToken: string = "0x7B175474E89094C44Da98b954EedeAC495271d0F";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let mockChainLinkAggregator: t.MockChainLinkAggregatorInstance;
    let base: t.BaseInstance;
    let globalConfig: t.GlobalConfigInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let tempContractAddress: any;
    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20contr: t.ERC20Instance;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        globalConfig = await testEngine.globalConfig;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
    });

    context("approveAll", async () => {
        context("should fail", async () => {
            it("when cToken address is zero", async () => {
                await expectRevert(savingAccount.approveAll(dummy), "cToken address is zero");
            });
        });

        context("should succeed", async () => {
            it("when all conditions are satisfied", async () => {
                const ERC20TokenAddresses = testEngine.erc20Tokens;
                // Approve all ERC20 tokens
                for (let i = 0; i < ERC20TokenAddresses.length; i++) {
                    if (i != 3 && i != 4) {
                        await savingAccount.approveAll(ERC20TokenAddresses[i]);
                    }
                }
            });
        });
    });

    context("isAccountLiquidatable", async () => {
        context("should succeed", async () => {
            it("when borrower's collateral value drops", async () => {
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];

                const erc20DAI: t.ERC20Instance = await ERC20.at(addressDAI);
                const erc20USDC: t.ERC20Instance = await ERC20.at(addressUSDC);

                // 2. Approve 1000 tokens
                const ONE_DAI = eighteenPrecision;
                const ONE_USDC = sixPrecision;
                const borrowAmt = new BN(await savingAccount.getCoinToETHRate(1))
                    .mul(new BN(60))
                    .div(new BN(100))
                    .mul(ONE_DAI)
                    .div(new BN(await savingAccount.getCoinToETHRate(0)));

                await erc20DAI.transfer(user1, ONE_DAI);
                await erc20USDC.transfer(user2, ONE_USDC);
                await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });

                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });

                // 3. Verify the loan amount
                const user2Balance = await erc20DAI.balanceOf(user2);

                let mockChainlinkAggregatorforDAIAddress: string =
                    testEngine.mockChainlinkAggregators[0];
                let mockChainlinkAggregatorforUSDCAddress: string =
                    testEngine.mockChainlinkAggregators[1];

                const mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance = await MockChainLinkAggregator.at(
                    mockChainlinkAggregatorforDAIAddress
                );
                const mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance = await MockChainLinkAggregator.at(
                    mockChainlinkAggregatorforUSDCAddress
                );

                let USDCprice = await mockChainlinkAggregatorforUSDC.latestAnswer();

                // update price of USDC to 70% of it's value
                let updatedPrice = new BN(USDCprice).mul(new BN(7)).div(new BN(10));

                await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                let isAccountLiquidatableStr = await savingAccount.isAccountLiquidatable(user2);
                expect(isAccountLiquidatableStr).equal(true);
            });

            it("when user has borrowed but his LTV doesn't change", async () => {
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                //const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.ERC20Instance = await ERC20.at(addressDAI);
                const erc20USDC: t.ERC20Instance = await ERC20.at(addressUSDC);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(1000);
                const borrowAmt = new BN(600);

                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });
                // 2. Start borrowing.
                await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                // 3. Verify the loan amount
                const user2Balance = await erc20DAI.balanceOf(user2);

                let isAccountLiquidatableStr = await savingAccount.isAccountLiquidatable(user2);

                expect(isAccountLiquidatableStr).equal(false);
            });
        });
    });

    context("recycleCommunityFund", async () => {
        context("should fail", async () => {
            it("when user's address is not same as definerCommunityFund", async () => {
                await expectRevert(
                    savingAccount.recycleCommunityFund(addressDAI, { from: user1 }),
                    "Unauthorized call"
                );
            });
        });
    });

    context("updateDeFinerCommunityFund", async () => {
        context("should fail", async () => {
            it("when user's address is not same as definerCommunityFund", async () => {
                await expectRevert(
                    globalConfig.updateDeFinerCommunityFund(user1, { from: user1 }),
                    "caller is not the owner"
                );
            });
        });
    });

    //------------Not high priority as of now-----------
    /*
    context("getAccountTotalUsdValue", async () => {
        context("should succeed", async () => {
            it("when ETH address is passed");

            it("when user's address is passed, who hasn't borrowed", async () => {
                await savingAccount.getAccountTotalETHValue(user1);
            });

            it("when user's address is passed, who has borrowed before", async () => {
                const numOfDAI = eighteenPrecision.mul(new BN(1000));
                const numOfUSDC = sixPrecision.mul(new BN(1000));

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);
                await erc20DAI.approve(savingAccount.address, numOfDAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfUSDC, { from: user2 });

                //1. Deposit DAI
                await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfUSDC, { from: user2 });
                const user1BalanceBefore = await erc20USDC.balanceOf(user1);

                // 2. Borrow USDC
                await savingAccount.borrow(addressUSDC, sixPrecision.mul(new BN(100)), {
                    from: user1
                });

                // 3. Verify the loan amount
                const user1BalanceAfter = await erc20USDC.balanceOf(user1);
                expect(BN(user1BalanceAfter).sub(user1BalanceBefore)).to.be.bignumber.equal(sixPrecision.mul(new BN(100)));

                await savingAccount.getAccountTotalETHValue(user1);
            });
        });
    });
    */
    /*
    context("getMarketState", async () => {
        context("should succeed", async () => {
            it("when all conditions are satisfied", async () => {
                const numOfToken = new BN(1000);

                // Deposit tokens
                await erc20DAI.transfer(user1, numOfToken);
                await erc20USDC.transfer(user2, numOfToken);
                await erc20DAI.approve(savingAccount.address, numOfToken, { from: user1 });
                await erc20USDC.approve(savingAccount.address, numOfToken, { from: user2 });
                await savingAccount.deposit(addressDAI, numOfToken, { from: user1 });
                await savingAccount.deposit(addressUSDC, numOfToken, { from: user2 });

                let marktST = await savingAccount.getMarketState();
                console.log("marktST", marktST);
            });
        });
    });
    */
    context("getTokenStateStore", async () => {
        // Also being called by getMarketState
        context("should fail", async () => { });

        context("should succeed", async () => {
            it("when all conditions are satisfied", async () => {
                let tokenST = await savingAccount.getTokenStateStore(addressDAI);
                console.log("marktST", tokenST);
            });
        });
    });
    /*
    context("getBalances", async () => {
        context("should fail", async () => { });

        context("should succeed", async () => {
            it("when sender's address is valid", async () => {
                const numOfDAI = new BN(1000);
                const numOfUSDC = new BN(1000);

                await erc20DAI.transfer(user1, numOfDAI);
                await erc20USDC.transfer(user2, numOfUSDC);

                let balances = await savingAccount.getBalances({ from: user1 });
                console.log("balances", balances);
            });
        });
    });
    */

    context("getDeFinerCommunityFund", async () => {
        context("should succeed", async () => {
            it("when valid token address is passed", async () => {
                await savingAccount.getDeFinerCommunityFund(addressDAI);
            });
        });
    });
});
