import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

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
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForTUSD: any;
    let addressCTokenForMKR: any;
    let addressCTokenForWBTC: any;

    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenTUSD: t.MockCTokenInstance;
    let cTokenMKR: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;

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
        this.timeout(0)
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
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[0];
        erc20WBTC = await ERC20.at(addressWBTC);

        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        // addressCTokenForTUSD = await testEngine.tokenInfoRegistry.getCToken(addressTUSD);
        // addressCTokenForMKR = await testEngine.tokenInfoRegistry.getCToken(addressMKR);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        // cTokenTUSD = await MockCToken.at(addressCTokenForTUSD);
        // cTokenMKR = await MockCToken.at(addressCTokenForMKR);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);

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
                    this.timeout(0)
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
                    const savingAccountDAITokenBefore = await erc20DAI.balanceOf(
                        savingAccount.address
                    );
                    const savingAccountUSDCTokenBefore = await erc20USDC.balanceOf(
                        savingAccount.address
                    );

                    const savingAccountCDAITokenBefore = await cTokenDAI.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const savingAccountCUSDCTokenBefore = await cTokenUSDC.balanceOfUnderlying.call(
                        savingAccount.address
                    );

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
                    const userDAIBalance = await accountsContract.getDepositBalanceCurrent(
                        addressDAI,
                        user1
                    );

                    const userUSDCBalance = await accountsContract.getDepositBalanceCurrent(
                        addressUSDC,
                        user1
                    );

                    const savingAccountDAIToken = await erc20DAI.balanceOf(savingAccount.address);
                    const savingAccountUSDCToken = await erc20USDC.balanceOf(savingAccount.address);

                    const savingAccountCDAIToken = await cTokenDAI.balanceOfUnderlying.call(
                        savingAccount.address
                    );
                    const savingAccountCUSDCToken = await cTokenUSDC.balanceOfUnderlying.call(
                        savingAccount.address
                    );

                    // verify 1.
                    expect(
                        BN(userDAIBalance).sub(BN(userDAIBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                    expect(
                        BN(userUSDCBalance).sub(BN(userUSDCBalanceBefore))
                    ).to.be.bignumber.equals(sixPrecision);
                    // verify 2.
                    expect(
                        BN(savingAccountCDAIToken).sub(BN(savingAccountCDAITokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision.div(new BN(100)).mul(new BN(85)));
                    expect(
                        BN(savingAccountCUSDCToken).sub(BN(savingAccountCUSDCTokenBefore))
                    ).to.be.bignumber.equals(sixPrecision.div(new BN(100)).mul(new BN(85)));
                    // verify 3.
                    expect(
                        BN(savingAccountDAIToken).sub(BN(savingAccountDAITokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision.div(new BN(100)).mul(new BN(15)));
                    expect(
                        BN(savingAccountUSDCToken).sub(BN(savingAccountUSDCTokenBefore))
                    ).to.be.bignumber.equals(sixPrecision.div(new BN(100)).mul(new BN(15)));
                });
                it("Deposit WBTC and TUSD, compound supported and unsupported", async function () {
                    this.timeout(0)
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
                    const savingAccountWBTCTokenBefore = await erc20WBTC.balanceOf(
                        savingAccount.address
                    );
                    const savingAccountTUSDTokenBefore = await erc20TUSD.balanceOf(
                        savingAccount.address
                    );
                    const savingAccountCWBTCTokenBefore = await cTokenWBTC.balanceOfUnderlying.call(
                        savingAccount.address
                    );

                    // const savingAccountCTUSDTokenBefore = await cTokenTUSD.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    await erc20WBTC.transfer(user1, eightPrecision.mul(new BN(1)));
                    console.log(addressTUSD);
                    await erc20TUSD.transfer(user1, eighteenPrecision);

                    await erc20WBTC.approve(savingAccount.address, eightPrecision.mul(new BN(1)), {
                        from: user1
                    });
                    await erc20TUSD.approve(
                        savingAccount.address,
                        eighteenPrecision.mul(new BN(1)),
                        { from: user1 }
                    );

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
                    const savingAccountWBTCToken = await erc20WBTC.balanceOf(savingAccount.address);
                    const savingAccountTUSDToken = await erc20TUSD.balanceOf(savingAccount.address);
                    const savingAccountCWBTCToken = await cTokenWBTC.balanceOfUnderlying.call(
                        savingAccount.address
                    );

                    // verify 1.
                    expect(
                        BN(userWBTCBalance).sub(BN(userWBTCBalanceBefore))
                    ).to.be.bignumber.equals(eightPrecision);
                    expect(
                        BN(userTUSDBalance).sub(BN(userTUSDBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                    // verify 2.
                    expect(
                        BN(savingAccountCWBTCToken).sub(BN(savingAccountCWBTCTokenBefore))
                    ).to.be.bignumber.equals(eightPrecision.div(new BN(100)).mul(new BN(85)));

                    // verify 3.
                    expect(
                        BN(savingAccountWBTCToken).sub(BN(savingAccountWBTCTokenBefore))
                    ).to.be.bignumber.equals(eightPrecision.div(new BN(100)).mul(new BN(15)));
                    expect(
                        BN(savingAccountTUSDToken).sub(BN(savingAccountTUSDTokenBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
                });
                it("Deposit MKR and TUSD, both compound unsupported", async function () {
                    this.timeout(0)
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
                    // const savingAccountCMKRTokenBefore = await cTokenMKR.balanceOfUnderlying.call(
                    //     savingAccount.address
                    // );
                    // const savingAccountCTUSDTokenBefore = await cTokenTUSD.balanceOfUnderlying.call(
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
                    expect(
                        BN(userMKRBalance).sub(BN(userMKRBalanceBefore))
                    ).to.be.bignumber.equals(eighteenPrecision);
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
