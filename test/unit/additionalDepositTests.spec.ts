import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.deposit", async (accounts) => {
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
    let mockChainlinkAggregatorforETHAddress: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cTUSD_addr: any;
    let cMKR_addr: any;
    let cWBTC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cTUSD: t.MockCTokenInstance;
    let cMKR: t.MockCTokenInstance;
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
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_USDC: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

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
        bank = await testEngine.bank;
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
        // cTUSD_addr = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        // cMKR_addr = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        // cTUSD = await MockCToken.at(cTUSD_addr);
        // cMKR = await MockCToken.at(cMKR_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);

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
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_USDC = sixPrecision;
        // Set DAI, USDC, USDT, TUSD to the same price for convenience
        // let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
        // await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);
        // await mockChainlinkAggregatorforUSDT.updateAnswer(DAIprice);
        // await mockChainlinkAggregatorforTUSD.updateAnswer(DAIprice);
    });

    // extra tests by Yichun
    context("Additional tests for Deposit", async () => {
        context("With multiple tokens", async () => {
            context("Should suceed", async () => {
                it("Deposit DAI and USDC, both compound supported", async function () {
                    this.timeout(0);
                    /*
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 DAI and 1 USDC
                     */
                    const userDAIBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );
                    const userUSDCBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    const savingsCompoundDAIBeforeDeposit = new BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsDAIBeforeDeposit = new BN(await erc20DAI.balanceOf(savingAccount.address));


                    const savingsCompoundUSDCBeforeDeposit = new BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsUSDCBeforeDeposit = new BN(await erc20USDC.balanceOf(savingAccount.address));


                    await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(1)));
                    await erc20USDC.transfer(user1, sixPrecision.mul(new BN(1)));

                    await erc20DAI.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

                    await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(1)), {
                        from: user1
                    });

                    await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), {
                        from: user1
                    });

                    await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(1)), {
                        from: user1
                    });

                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 DAI and 1 USDC
                     * 2. CToken left in saving account should be 85% of total tokens
                     * 3. Token left in saving account should be 15% of total tokens
                     */
                    await savAccBalVerify(0,
                        eighteenPrecision.mul(new BN(1)),
                        erc20DAI.address,
                        cDAI,
                        savingsCompoundDAIBeforeDeposit,
                        savingsDAIBeforeDeposit,
                        bank,
                        savingAccount);

                    await savAccBalVerify(0,
                        sixPrecision.mul(new BN(1)),
                        erc20USDC.address,
                        cUSDC,
                        savingsCompoundUSDCBeforeDeposit,
                        savingsUSDCBeforeDeposit,
                        bank,
                        savingAccount);

                    const userDAIBalance = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    const userUSDCBalance = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    // verify 1.
                    expect(BN(userDAIBalance).sub(BN(userDAIBalanceBefore))).to.be.bignumber.equals(
                        eighteenPrecision
                    );
                    expect(
                        BN(userUSDCBalance).sub(BN(userUSDCBalanceBefore))
                    ).to.be.bignumber.equals(sixPrecision);

                });
                it("Deposit WBTC and TUSD, compound supported and unsupported", async function () {
                    this.timeout(0);
                    /*
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 WBTC and 1 TUSD
                     */
                    const userWBTCBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressWBTC,
                        user1
                    );
                    const userTUSDBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );

                    // const savingAccountCTUSDTokenBefore = await cTUSD.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                    await erc20TUSD.transfer(user1, eighteenPrecision);

                    await erc20WBTC.approve(savingAccount.address, eightPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

                    const savingsCompoundWBTCBeforeDeposit = new BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );

                    const savingsWBTCBeforeDeposit = new BN(await erc20WBTC.balanceOf(savingAccount.address));

                    await savingAccount.deposit(addressWBTC, eightPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision, {
                        from: user1
                    });
                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 WBTC and 1 TUSD
                     * 2. CToken left in saving account should be 85% of total tokens
                     * 3. Token left in saving account should be 15% of total tokens
                     */
                    const userWBTCBalance = await accountsContract.getDepositBalanceCurrent(
                        addressWBTC,
                        user1
                    );
                    const userTUSDBalance = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );

                    await savAccBalVerify(0,
                        eightPrecision.mul(new BN(1)),
                        erc20WBTC.address,
                        cWBTC,
                        savingsCompoundWBTCBeforeDeposit,
                        savingsWBTCBeforeDeposit,
                        bank,
                        savingAccount);

                    // verify 1.
                    expect(
                        BN(userWBTCBalance).sub(BN(userWBTCBalanceBefore))
                    ).to.be.bignumber.equals(eightPrecision);
                    expect(
                        BN(userTUSDBalance).sub(BN(userTUSDBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);

                });
                it("Deposit MKR and TUSD, both compound unsupported", async function () {
                    this.timeout(0);
                    /*
                     * Step 1. Assign tokens to each user and deposit them to DeFiner
                     * Account1: deposits 1 MKR and 1 TUSD
                     */
                    const userMKRBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressMKR,
                        user1
                    );
                    const userTUSDBalanceBefore = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );
                    const savingAccountMKRTokenBefore = await erc20MKR.balanceOf(
                        savingAccount.address
                    );
                    const savingAccountTUSDTokenBefore = await erc20TUSD.balanceOf(
                        savingAccount.address
                    );
                    // const savingAccountCMKRTokenBefore = await cMKR.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    // const savingAccountCTUSDTokenBefore = await cTUSD.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    await erc20MKR.transfer(user1, eighteenPrecision.mul(new BN(1)));
                    await erc20TUSD.transfer(user1, eighteenPrecision.mul(new BN(1)));

                    await erc20MKR.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

                    await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    /*
                     * To verify:
                     * 1. User 1's token balance should be 1 MKR and 1 TUSD
                     *
                     * 2. Token left in saving account should be 100% of total tokens
                     */
                    const userMKRBalance = await accountsContract.getDepositBalanceCurrent(
                        addressMKR,
                        user1
                    );
                    const userTUSDBalance = await accountsContract.getDepositBalanceCurrent(
                        addressTUSD,
                        user1
                    );
                    const savingAccountMKRToken = await erc20MKR.balanceOf(savingAccount.address);
                    const savingAccountTUSDToken = await erc20TUSD.balanceOf(savingAccount.address);

                    // verify 1.
                    expect(BN(userMKRBalance).sub(BN(userMKRBalanceBefore))).to.be.bignumber.equals(
                        eighteenPrecision
                    );
                    expect(
                        BN(userTUSDBalance).sub(BN(userTUSDBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                    // verify 2.
                    expect(
                        BN(savingAccountMKRToken).sub(BN(savingAccountMKRTokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                    expect(
                        BN(savingAccountTUSDToken).sub(BN(savingAccountTUSDTokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                });
            });
        });
    });
});
