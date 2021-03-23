import { TokenRegistryContract } from "../../types/truffle-contracts";
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
    let TWO_DAI: any;
    let ONE_USDC: any;
    let ZERO: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function() {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("whitepapermodel.scen");
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
        TWO_DAI = eighteenPrecision.mul(new BN(2));
        ONE_USDC = sixPrecision;
        ZERO = new BN(0);
    });

    context("community fund()", async () => {
        context("Single Token", async () => {
            context("eighten decimal token", async () => {
                context("should succeed", async () => {
                    it("when full DAI tokens withdrawn", async function() {
                        this.timeout(0);
                        await savingAccount.fastForward(10000);
                        const depositAmount = ONE_DAI;
                        await erc20DAI.transfer(user1, TWO_DAI);
                        let user1BalanceInit = new BN(await erc20DAI.balanceOf(user1));

                        const balSavingAccountUserBefore = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokensBefore = new BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await erc20DAI.approve(savingAccount.address, TWO_DAI, { from: user1 });
                        let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(user1);
                        console.log(
                            "userBalanceBeforeWithdrawDAI",
                            userBalanceBeforeWithdrawDAI.toString()
                        );

                        let accountBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(
                            savingAccount.address
                        );
                        const balCTokenContractBefore = await erc20DAI.balanceOf(cDAI_addr);

                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            user1
                        );
                        console.log(
                            "totalDefinerBalanceBeforeDeposit",
                            totalDefinerBalanceBeforeDeposit.toString()
                        );

                        const compCDAIBefore = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );

                        const compDAIBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await erc20DAI.approve(savingAccount.address, TWO_DAI, {
                            from: user1
                        });
                        await savingAccount.deposit(erc20DAI.address, depositAmount, {
                            from: user1
                        });
                        console.log("check2");

                        // Validate the total balance on DeFiner after deposit
                        const totalDefinerBalanceAfterDeposit = await accountsContract.getDepositBalanceCurrent(
                            erc20DAI.address,
                            user1
                        );
                        const savingAccountCDAITokenAfterDeposit = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountDAITokenAfterDeposit = BN(
                            await erc20DAI.balanceOf(savingAccount.address)
                        );

                        // await savAccBalVerify(
                        //     0,
                        //     depositAmount,
                        //     erc20DAI.address,
                        //     cDAI,
                        //     balCTokensBefore,
                        //     BN(balSavingAccountUserBefore),
                        //     bank,
                        //     savingAccount
                        // );

                        await savingAccount.fastForward(10000);
                        await savingAccount.deposit(erc20DAI.address, new BN(10), {
                            from: user1
                        });
                        await savingAccount.fastForward(10000);
                        await savingAccount.deposit(erc20DAI.address, new BN(10), {
                            from: user1
                        });

                        // Withdrawing DAI
                        const user1DepositPrincipalBefore = await savingAccount.getDepositPrincipal(
                            addressDAI,
                            { from: user1 }
                        );
                        const user1DepositInterestBefore = await savingAccount.getDepositInterest(
                            addressDAI,
                            { from: user1 }
                        );
                        const userBal = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            user1
                        );
                        console.log("userBal", userBal.toString());
                        console.log(
                            "user1DepositPrincipalBefore",
                            user1DepositPrincipalBefore.toString()
                        );
                        console.log(
                            "user1DepositInterestBefore",
                            user1DepositInterestBefore.toString()
                        );

                        await savingAccount.withdrawAll(erc20DAI.address, {
                            from: user1
                        });

                        const user1DepositPrincipal = await savingAccount.getDepositPrincipal(
                            addressDAI,
                            { from: user1 }
                        );
                        const user1DepositInterest = await savingAccount.getDepositInterest(
                            addressDAI,
                            { from: user1 }
                        );
                        console.log("user1DepositPrincipal", user1DepositPrincipal.toString());
                        console.log("user1DepositInterest", user1DepositInterest.toString());

                        let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(user1);
                        let cDAIAfterWithdraw = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );
                        console.log(
                            "userBalanceAfterWithdrawDAI",
                            userBalanceAfterWithdrawDAI.toString()
                        );

                        // owner's alance
                        const totalDefinerBalanceOwner = await accountsContract.getDepositBalanceCurrent(
                            addressDAI,
                            owner,
                            {
                                from: user1
                            }
                        ); // 135809999 = 10% of user's interest
                        console.log(
                            "totalDefinerBalanceOwner",
                            totalDefinerBalanceOwner.toString()
                        );

                        // Verify user balance
                        let finalInterestWithdrawnUser = new BN(user1DepositInterestBefore)
                            .mul(new BN(90))
                            .div(new BN(100));
                        expect(
                            user1BalanceInit.add(finalInterestWithdrawnUser)
                        ).to.be.bignumber.equal(userBalanceAfterWithdrawDAI);

                        // await savAccBalVerify(
                        //     1,
                        //     depositAmount,
                        //     erc20DAI.address,
                        //     cDAI,
                        //     savingAccountCDAITokenAfterDeposit,
                        //     savingAccountDAITokenAfterDeposit,
                        //     bank,
                        //     savingAccount
                        // );
                    });

                    it("D4: when full tokens withdrawn after some blocks", async function() {
                        this.timeout(0);
                        const depositAmount = ONE_DAI;
                        await erc20DAI.transfer(user1, TWO_DAI);
                        await erc20DAI.approve(savingAccount.address, TWO_DAI, {
                            from: user1
                        });
                        let user1BalanceInit = new BN(await erc20DAI.balanceOf(user1));
                        let userBalanceBeforeWithdrawDAI = await erc20DAI.balanceOf(user1);
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
                            user1
                        );
                        const compCDAIBefore = await cDAI.balanceOfUnderlying.call(
                            savingAccount.address
                        );

                        const compDAIBefore = await erc20DAI.balanceOf(cDAI_addr);

                        // deposit tokens
                        await savingAccount.deposit(erc20DAI.address, depositAmount, {
                            from: user1
                        });

                        const savingAccountCDAITokenAfterDeposit = BN(
                            await cDAI.balanceOfUnderlying.call(savingAccount.address)
                        );
                        const savingAccountDAITokenAfterDeposit = BN(
                            await erc20DAI.balanceOf(savingAccount.address)
                        );

                        // await savAccBalVerify(
                        //     0,
                        //     depositAmount,
                        //     erc20DAI.address,
                        //     cDAI,
                        //     balCTokensBefore,
                        //     BN(balSavingAccountUserBefore),
                        //     bank,
                        //     savingAccount
                        // );

                        await savingAccount.fastForward(10000);
                        // deposit for rate checkpoint
                        await savingAccount.deposit(erc20DAI.address, new BN(10), {
                            from: user1
                        });

                        // Withdrawing DAI
                        const user1DepositInterestBefore = await savingAccount.getDepositInterest(
                            addressDAI,
                            { from: user1 }
                        );
                        await savingAccount.withdrawAll(erc20DAI.address, {
                            from: user1
                        });
                        let userBalanceAfterWithdrawDAI = await erc20DAI.balanceOf(user1);

                        // Verify user balance
                        let finalInterestWithdrawnUser = new BN(user1DepositInterestBefore)
                            .mul(new BN(90))
                            .div(new BN(100));

                        expect(
                            user1BalanceInit.add(finalInterestWithdrawnUser)
                        ).to.be.bignumber.equal(userBalanceAfterWithdrawDAI);

                        // await savAccBalVerify(
                        //     1,
                        //     depositAmount,
                        //     erc20DAI.address,
                        //     cDAI,
                        //     savingAccountCDAITokenAfterDeposit,
                        //     savingAccountDAITokenAfterDeposit,
                        //     bank,
                        //     savingAccount
                        // );
                    });
                });
            });
        });
    });
});
