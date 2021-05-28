import * as t from "../../../types/truffle-contracts/index";
import { MockChainLinkAggregatorInstance } from "../../../types/truffle-contracts/index.d";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { takeSnapshot, revertToSnapShot } from "../../../test-helpers/SnapshotUtils";

let snapshotId: string;
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ChainLinkAggregator: t.ChainLinkAggregatorContract = artifacts.require("ChainLinkAggregator");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

contract("RemainingCoverage", async (accounts) => {
    const tempToken: string = "0x7B175474E89094C44Da98b954EedeAC495271d0F";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let mockChainLinkAggregator: t.MockChainLinkAggregatorInstance;
    let accountsContract: t.AccountsInstance;
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
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20contr: t.MockErc20Instance;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");

        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        globalConfig = await testEngine.globalConfig;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);

        await savingAccount.fastForward(1);
    });

    beforeEach(async () => {
        // Take snapshot of the EVM before each test
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    context("approveAll", async () => {
        context("should fail", async function () {
            this.timeout(0);
            it("when cToken address is zero", async () => {
                await savingAccount.fastForward(1000);
                await expectRevert(savingAccount.approveAll(dummy), "cToken address is zero");
            });
        });

        context("should succeed", async () => {
            it("when all conditions are satisfied", async function () {
                this.timeout(0);
                const ERC20TokenAddresses = testEngine.erc20Tokens;
                console.log("ERC20TokenAddresses", ERC20TokenAddresses);

                // Approve all ERC20 tokens
                for (let i = 0; i < ERC20TokenAddresses.length - 1; i++) {
                    if (i != 9) {
                        if (i == 3 || i == 4 || i == 10 || i == 11) {
                            await expectRevert(
                                savingAccount.approveAll(ERC20TokenAddresses[i]),
                                "cToken address is zero"
                            );
                        } else {
                            await savingAccount.approveAll(ERC20TokenAddresses[i]);
                        }
                        // Verification for approve?
                    }
                }
            });
        });
    });

    context("updateDefinerRate", async () => {
        context("should fail", async () => {
            it("when unsupported token address is passed");
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async function () {
                this.timeout(0);
                await globalConfig.updatedeFinerRate(50);
            });

            it("when borrowRateLMBN is zero");
            // cases of `depositRateIndexNow`, line 261 Base.sol

            it("when borrowRateLMBN is equal to block number");
        });
    });

    context("isAccountLiquidatable", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when borrower's collateral value drops", async function () {
                this.timeout(0);
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];

                const erc20DAI: t.MockErc20Instance = await ERC20.at(addressDAI);
                const erc20USDC: t.MockErc20Instance = await ERC20.at(addressUSDC);

                // 2. Approve 1000 tokens
                const ONE_DAI = eighteenPrecision;
                const ONE_USDC = sixPrecision;
                const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                    .mul(new BN(60))
                    .div(new BN(100))
                    .mul(ONE_DAI)
                    .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                await erc20DAI.transfer(user1, ONE_DAI);
                await erc20USDC.transfer(user2, ONE_USDC);
                await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });

                // 2. Start borrowing.
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                const usdcTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](usdcTokenIndex, true, {
                    from: user2,
                });
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

                let isAccountLiquidatableStr = await accountsContract.isAccountLiquidatable.call(
                    user2
                );
                expect(isAccountLiquidatableStr).equal(true);
            });

            it("when user has borrowed but his LTV doesn't change", async function () {
                this.timeout(0);
                const tokens = testEngine.erc20Tokens;
                const addressDAI = tokens[0];
                const addressUSDC = tokens[1];
                //const addressCTokenForDAI = await testEngine.cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: t.MockErc20Instance = await ERC20.at(addressDAI);
                const erc20USDC: t.MockErc20Instance = await ERC20.at(addressUSDC);

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
                const result = await tokenInfoRegistry.getTokenInfoFromAddress(addressUSDC);
                const usdcTokenIndex = result[0];
                await accountsContract.methods["setCollateral(uint8,bool)"](usdcTokenIndex, true, {
                    from: user2,
                });
                await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                // 3. Verify the loan amount
                const user2Balance = await erc20DAI.balanceOf(user2);

                let isAccountLiquidatableStr = await accountsContract.isAccountLiquidatable(user2);
                // should return "false"
                //expect(isAccountLiquidatableStr).equal(false);
            });
        });
    });

    context("updateDeFinerCommunityFund", async () => {
        context("should fail", async () => {
            it("when user's address is not same as definerCommunityFund", async function () {
                this.timeout(0);
                await expectRevert(
                    globalConfig.updatedeFinerCommunityFund(user1, { from: user1 }),
                    "Ownable: caller is not the owner"
                );
            });
        });
    });

    context("getTokenState", async () => {
        // Also being called by getMarketState
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when all conditions are satisfied", async () => {
                let tokenST = await savingAccount.getTokenState(addressDAI);
                console.log("marktST", tokenST);
            });
        });
    });
});
