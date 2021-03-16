import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.overLeveraged", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const eightPrecision = new BN(10).pow(new BN(8));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cETH_addr: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforWBTCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforWBTC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_ETH: any;
    let ONE_USDC: any;
    let ONE_MKR: any;
    let ONE_TUSD: any;
    let ONE_WBTC: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function() {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function() {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        bank = await testEngine.bank;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        addressUSDT = tokens[2];
        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20WBTC = await ERC20.at(addressWBTC);

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforMKRAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );

        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);
        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        cETH = await MockCToken.at(cETH_addr);
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_ETH = eighteenPrecision;
        ONE_USDC = sixPrecision;
        ONE_MKR = eighteenPrecision;
        ONE_TUSD = eighteenPrecision;
        ONE_WBTC = eightPrecision;

        await savingAccount.fastForward(1000);
    });

    context("over leveraged", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("OverLeveragedTest1: user deposits DAI, borrows ETH and tries to withdraw without repaying", async function() {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savAccBalVerify(
                        0,
                        ONE_DAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH
                    });
                    await savAccBalVerify(
                        0,
                        ONE_ETH,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));

                    // 2. Start borrowing.
                    const savingAccountCETHTokenAfterDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenAfterDeposit = new BN(
                        (await web3.eth.getBalance(savingAccount.address)).toString()
                    );

                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                    await savAccBalVerify(
                        2,
                        borrowAmt,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenAfterDeposit,
                        savingAccountETHTokenAfterDeposit,
                        bank,
                        savingAccount
                    );

                    // 3. Change the price.
                    let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    console.log("DAIprice", DAIprice.toString());

                    // update price of DAI to 65% of it's value
                    let updatedPrice = BN(DAIprice)
                        .mul(new BN(65))
                        .div(new BN(100));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                    // 4. withdraw
                    const userBorrowVal = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    let UB = new BN(userBorrowVal).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(95));
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    await expectRevert(
                        savingAccount.withdrawAll(addressDAI, { from: user1 }),
                        "Insufficient collateral when withdraw."
                    );

                    await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                });

                it("OverLeveragedTest2: user deposits USDC, borrows DAI and withdraws without reaying", async function() {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(2)));

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });

                    await savAccBalVerify(
                        0,
                        ONE_DAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });

                    await savAccBalVerify(
                        0,
                        ONE_USDC,
                        addressUSDC,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(2)));

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_DAI)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);

                    // 2. Start borrowing.
                    const savingAccountCDAITokenBeforeBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    await savAccBalVerify(
                        2,
                        borrowAmt,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeBorrow,
                        savingAccountDAITokenBeforeBorrow,
                        bank,
                        savingAccount
                    );

                    // 3. Change the price.
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    // update price of DAI to 70% of it's value
                    let updatedPrice = BN(originPrice)
                        .mul(new BN(7))
                        .div(new BN(10));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                    // 4. wihdraw
                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    await expectRevert(
                        savingAccount.withdrawAll(addressUSDC, { from: user2 }),
                        "Insufficient collateral when withdraw."
                    );

                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });

                it("OverLeveragedTest3: user deposits USDC, borrows DAI, deposits DAI, borrows DAI and withdraws without repaying", async function() {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI.mul(new BN(100)));
                    await erc20USDC.transfer(user2, ONE_USDC.mul(new BN(100)));
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)), {
                        from: user1
                    });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(100)), {
                        from: user2
                    });
                    await erc20DAI.approve(
                        savingAccount.address,
                        ONE_DAI.mul(new BN(100)).mul(new BN(2))
                    );

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)), {
                        from: user1
                    });

                    await savAccBalVerify(
                        0,
                        ONE_DAI.mul(new BN(100)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(100)), {
                        from: user2
                    });

                    await savAccBalVerify(
                        0,
                        ONE_USDC.mul(new BN(100)),
                        addressUSDC,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savingAccount.deposit(
                        addressDAI,
                        ONE_DAI.mul(new BN(100)).mul(new BN(2))
                    );

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .mul(eighteenPrecision)
                        .div(new BN(100))
                        .mul(ONE_USDC.mul(new BN(100)))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .div(sixPrecision);

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);

                    // 2. borrow and deposit
                    const savingAccountCDAITokenBeforeBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    let user2bal = await erc20DAI.balanceOf(user2);

                    await savAccBalVerify(
                        2,
                        borrowAmt,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeBorrow,
                        savingAccountDAITokenBeforeBorrow,
                        bank,
                        savingAccount
                    );

                    await erc20DAI.approve(savingAccount.address, borrowAmt, {
                        from: user2
                    });
                    await savingAccount.deposit(addressDAI, borrowAmt, { from: user2 });

                    // 3 fastforward and borrow again
                    await savingAccount.fastForward(1000);
                    // await savingAccount.deposit(addressDAI, new BN(10));

                    const savingAccountCDAITokenAfterFirstBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterFirstBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .mul(new BN(59))
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));
                    await savingAccount.borrow(addressDAI, borrowAmt2, { from: user2 });

                    await savAccBalVerify(
                        2,
                        borrowAmt2,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterFirstBorrow,
                        savingAccountDAITokenAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    let updatedPrice = BN(originPrice)
                        .mul(new BN(52))
                        .div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressUSDC, { from: user2 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });

                it("OverLeveragedTest4: user deposits DAI, borrows ETH, deposits ETH, borrows USDC and withdraws without repaying", async function() {
                    this.timeout(0);

                    // 1. Approve tokens
                    await erc20DAI.transfer(user1, ONE_DAI);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)));

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                    await savAccBalVerify(
                        0,
                        ONE_DAI,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savAccBalVerify(
                        0,
                        ONE_USDC,
                        addressUSDC,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)));

                    const savingAccountCETHTokenBeforeDeposit = BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountETHTokenBeforeDeposit = new BN(
                        await web3.eth.getBalance(savingAccount.address)
                    );
                    await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                        from: user2,
                        value: ONE_ETH
                    });
                    await savAccBalVerify(
                        0,
                        ONE_ETH,
                        ETH_ADDRESS,
                        cETH,
                        savingAccountCETHTokenBeforeDeposit,
                        savingAccountETHTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(0))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_ETH)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(9)));

                    // 2. Borrow and deposit
                    await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });

                    const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                        savingAccount.address
                    );
                    const balCTokensBefore = new BN(
                        await cETH.balanceOfUnderlying.call(savingAccount.address)
                    );
                    await savingAccount.deposit(ETH_ADDRESS, borrowAmt, {
                        from: user1,
                        value: borrowAmt
                    });

                    await savAccBalVerify(
                        0,
                        borrowAmt,
                        ETH_ADDRESS,
                        cETH,
                        balCTokensBefore,
                        new BN(ETHbalanceBeforeDeposit),
                        bank,
                        savingAccount
                    );

                    // 3. fastforward and borrow
                    await savingAccount.fastForward(1000);
                    await savingAccount.deposit(ETH_ADDRESS, new BN(10), {
                        from: owner,
                        value: new BN(10)
                    });

                    const savingAccountCUSDCTokenAfterFirstBorrow = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenAfterFirstBorrow = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(9)))
                        .mul(sixPrecision)
                        .mul(new BN(59))
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(1)))
                        .div(eighteenPrecision);
                    await savingAccount.borrow(addressUSDC, borrowAmt2, { from: user1 });

                    await savAccBalVerify(
                        2,
                        borrowAmt2,
                        addressUSDC,
                        cUSDC,
                        savingAccountCUSDCTokenAfterFirstBorrow,
                        savingAccountUSDCTokenAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(originPrice)
                        .mul(new BN(50))
                        .div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    const userBorrowVal2 = await accountsContract.getBorrowETH(user1);
                    const getDeposits2 = await accountsContract.getDepositETH(user1);
                    let UB = new BN(userBorrowVal2).mul(new BN(100));
                    let UD = new BN(getDeposits2).mul(new BN(85));
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressDAI, { from: user1 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                });

                it("OverLeveragedTest5: user deposits MKR, borrows DAI, deposits DAI, borrows TUSD and withdraws without repaying", async function() {
                    this.timeout(0);

                    // 1. Approve tokens
                    await erc20DAI.transfer(user1, ONE_DAI.mul(new BN(1000)));
                    await erc20MKR.transfer(user2, ONE_MKR);
                    await erc20TUSD.transfer(user3, ONE_TUSD.mul(new BN(1000)));
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(1000)), {
                        from: user1
                    });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user2 });
                    await erc20MKR.approve(savingAccount.address, ONE_MKR, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD, { from: user2 });
                    await erc20TUSD.approve(savingAccount.address, ONE_TUSD.mul(new BN(1000)), {
                        from: user3
                    });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)));

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(1000)), {
                        from: user1
                    });
                    await savAccBalVerify(
                        0,
                        ONE_DAI.mul(new BN(1000)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savingAccount.deposit(addressMKR, ONE_MKR, { from: user2 });
                    await savingAccount.deposit(addressTUSD, ONE_TUSD.mul(new BN(1000)), {
                        from: user3
                    });

                    const savingAccountCDAITokenBeforeDeposit2 = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit2 = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)));
                    await savAccBalVerify(
                        0,
                        ONE_DAI.mul(new BN(100)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit2,
                        savingAccountDAITokenBeforeDeposit2,
                        bank,
                        savingAccount
                    );

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(4))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_MKR)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));

                    // 2. Borrow and deposit
                    const savingAccountCDAITokenAfterFirstBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterFirstBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    await savAccBalVerify(
                        2,
                        borrowAmt,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterFirstBorrow,
                        savingAccountDAITokenAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    const userBorrowVal1 = await accountsContract.getBorrowETH(user2);
                    const getDeposits1 = await accountsContract.getDepositETH(user2);
                    let UB1 = new BN(userBorrowVal1).mul(new BN(100));
                    let UD1 = new BN(getDeposits1).mul(new BN(85));
                    console.log("UD1", UD1.toString());
                    console.log("UB1", UB1.toString());

                    await erc20DAI.approve(savingAccount.address, borrowAmt, { from: user2 });
                    await savingAccount.deposit(addressDAI, borrowAmt, { from: user2 });

                    // 3. fastforward and borrow
                    await savingAccount.fastForward(1000);
                    await savingAccount.deposit(ETH_ADDRESS, new BN(10), {
                        from: owner,
                        value: new BN(10)
                    });

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .mul(new BN(59))
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(3)));
                    // console.log("borrowAmt", borrowAmt.toString());
                    // console.log("borrowAmt2", borrowAmt2.toString());
                    await savingAccount.borrow(addressTUSD, borrowAmt2, {
                        from: user2
                    });

                    // 4. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforMKR.latestAnswer();
                    let updatedPrice = BN(originPrice)
                        .mul(new BN(10))
                        .div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforMKR.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );
                    const userBorrowVal2 = await accountsContract.getBorrowETH(user2);
                    const getDeposits2 = await accountsContract.getDepositETH(user2);
                    let UB = new BN(userBorrowVal2).mul(new BN(100));
                    let UD = new BN(getDeposits2).mul(new BN(85));
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());
                    // expect(isUserLiquidatable).to.equal(true);

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressMKR, { from: user2 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforMKR.updateAnswer(originPrice);
                });

                it("OverLeveragedTest6: user deposits WBTC, borrows DAI, deposits DAI, borrows USDC and withdraws without repaying", async function() {
                    this.timeout(0);

                    // 1. Approve tokens
                    await erc20WBTC.transfer(user1, ONE_WBTC);
                    await erc20USDC.transfer(user2, ONE_USDC);
                    await erc20WBTC.approve(savingAccount.address, ONE_WBTC, { from: user1 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100000)), {
                        from: user1
                    });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100000)));

                    const savingAccountCWBTCTokenBeforeDeposit = BN(
                        await cWBTC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountWBTCTokenBeforeDeposit = BN(
                        await erc20WBTC.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressWBTC, ONE_WBTC, { from: user1 });
                    await savAccBalVerify(
                        0,
                        ONE_WBTC,
                        addressWBTC,
                        cWBTC,
                        savingAccountCWBTCTokenBeforeDeposit,
                        savingAccountWBTCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );
                    await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                    await savAccBalVerify(
                        0,
                        ONE_USDC,
                        addressUSDC,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100000)));

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(8))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_WBTC)
                        .mul(eighteenPrecision)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .div(eightPrecision);

                    console.log("borrowAmt", borrowAmt.toString());
                    let SA = new BN(await erc20DAI.balanceOf(savingAccount.address));
                    console.log("SA", SA.toString());

                    // 2. Borrow and deposit
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user1 });
                    await savingAccount.deposit(addressDAI, borrowAmt, { from: user1 });

                    // 3. fastforward and borrow
                    await savingAccount.fastForward(1000);
                    await savingAccount.deposit(ETH_ADDRESS, new BN(10), {
                        from: owner,
                        value: new BN(10)
                    });

                    const savingAccountCDAITokenAfterFirstBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenAfterFirstBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .mul(new BN(59))
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)));
                    await savingAccount.borrow(addressDAI, borrowAmt2, { from: user1 });
                    console.log("borrowAmt", borrowAmt.toString());
                    console.log("borrowAmt2", borrowAmt2.toString());

                    await savAccBalVerify(
                        2,
                        borrowAmt2,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenAfterFirstBorrow,
                        savingAccountDAITokenAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforDAI.latestAnswer();
                    let updatedPrice = BN(originPrice)
                        .mul(new BN(80))
                        .div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user1
                    );
                    const userBorrowVal = await accountsContract.getBorrowETH(user1);
                    const getDeposits = await accountsContract.getDepositETH(user1);
                    let UB = new BN(userBorrowVal).mul(new BN(100));
                    let UD = new BN(getDeposits).mul(new BN(85));
                    console.log("UD", UD.toString());
                    console.log("UB", UB.toString());

                    // expect(isUserLiquidatable).to.equal(true);

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressWBTC, { from: user1 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforDAI.updateAnswer(originPrice);
                });

                it("OverLeveragedTest7: user deposits USDC, borrows DAI, deposits DAI, borrows USDT, deposits USDT, borrows DAI and withdraws without repaying", async function() {
                    this.timeout(0);
                    // 1. Approve 1000 tokens
                    await erc20DAI.transfer(user1, ONE_DAI.mul(new BN(100)));
                    await erc20USDT.transfer(user1, sixPrecision.mul(new BN(100)));
                    await erc20USDC.transfer(user2, ONE_USDC.mul(new BN(100)));
                    await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)), {
                        from: user1
                    });
                    await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(100)), {
                        from: user1
                    });
                    await erc20USDC.approve(savingAccount.address, ONE_USDC.mul(new BN(100)), {
                        from: user2
                    });
                    await erc20DAI.approve(
                        savingAccount.address,
                        ONE_DAI.mul(new BN(100)).mul(new BN(2))
                    );

                    const savingAccountCDAITokenBeforeDeposit = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeDeposit = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)), {
                        from: user1
                    });
                    await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(100)), {
                        from: user1
                    });

                    await savAccBalVerify(
                        0,
                        ONE_DAI.mul(new BN(100)),
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeDeposit,
                        savingAccountDAITokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    const savingAccountCUSDCTokenBeforeDeposit = BN(
                        await cUSDC.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDCTokenBeforeDeposit = BN(
                        await erc20USDC.balanceOf(savingAccount.address)
                    );

                    await savingAccount.deposit(addressUSDC, ONE_USDC.mul(new BN(100)), {
                        from: user2
                    });

                    await savAccBalVerify(
                        0,
                        ONE_USDC.mul(new BN(100)),
                        addressUSDC,
                        cUSDC,
                        savingAccountCUSDCTokenBeforeDeposit,
                        savingAccountUSDCTokenBeforeDeposit,
                        bank,
                        savingAccount
                    );

                    await savingAccount.deposit(
                        addressDAI,
                        ONE_DAI.mul(new BN(100)).mul(new BN(2))
                    );

                    const borrowAmt = new BN(await tokenInfoRegistry.priceFromIndex(1))
                        .mul(new BN(60))
                        .div(new BN(100))
                        .mul(ONE_USDC.mul(new BN(100)))
                        .mul(eighteenPrecision)
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .div(sixPrecision);

                    const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);

                    // 2. borrow and deposit
                    const savingAccountCDAITokenBeforeBorrow = BN(
                        await cDAI.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountDAITokenBeforeBorrow = BN(
                        await erc20DAI.balanceOf(savingAccount.address)
                    );
                    await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                    let user2bal = await erc20DAI.balanceOf(user2);

                    await savAccBalVerify(
                        2,
                        borrowAmt,
                        addressDAI,
                        cDAI,
                        savingAccountCDAITokenBeforeBorrow,
                        savingAccountDAITokenBeforeBorrow,
                        bank,
                        savingAccount
                    );

                    await erc20DAI.approve(savingAccount.address, borrowAmt, {
                        from: user2
                    });
                    await savingAccount.deposit(addressDAI, borrowAmt, { from: user2 });

                    // 3 fastforward and borrow again
                    await savingAccount.fastForward(1000);
                    // await savingAccount.deposit(addressDAI, new BN(10));

                    const savingAccountCUSDTTokenAfterFirstBorrow = BN(
                        await cUSDT.balanceOfUnderlying.call(savingAccount.address)
                    );
                    const savingAccountUSDTTokenAfterFirstBorrow = BN(
                        await erc20USDT.balanceOf(savingAccount.address)
                    );

                    const borrowAmt2 = BN(borrowAmt)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .mul(new BN(50))
                        .mul(sixPrecision)
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(2)))
                        .div(eighteenPrecision);
                    await savingAccount.borrow(addressUSDT, borrowAmt2, { from: user2 });

                    console.log("borrowAmt", borrowAmt.toString());
                    console.log("borrowAmt2", borrowAmt2.toString());

                    await savAccBalVerify(
                        2,
                        borrowAmt2,
                        addressUSDT,
                        cUSDT,
                        savingAccountCUSDTTokenAfterFirstBorrow,
                        savingAccountUSDTTokenAfterFirstBorrow,
                        bank,
                        savingAccount
                    );

                    // 4. Deposit USDT and borrow DAI
                    await erc20USDT.approve(savingAccount.address, borrowAmt2, {
                        from: user2
                    });
                    await savingAccount.deposit(addressUSDT, borrowAmt2, { from: user2 });

                    const borrowAmt3 = BN(borrowAmt2)
                        .mul(new BN(await tokenInfoRegistry.priceFromIndex(2)))
                        .mul(new BN(50))
                        .mul(eighteenPrecision)
                        .div(new BN(100))
                        .div(new BN(await tokenInfoRegistry.priceFromIndex(0)))
                        .div(sixPrecision);
                    await savingAccount.borrow(addressDAI, borrowAmt3, { from: user2 });

                    console.log("borrowAmt3", borrowAmt3.toString());

                    // 5. price of initial collateral drops
                    let originPrice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                    let updatedPrice = BN(originPrice)
                        .mul(new BN(33))
                        .div(new BN(100));

                    // let originPriceDAI = await mockChainlinkAggregatorforDAI.latestAnswer();
                    // let updatedPriceDAI = BN(originPriceDAI).mul(new BN(70)).div(new BN(100));

                    await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                    // await mockChainlinkAggregatorforDAI.updateAnswer(updatedPriceDAI);

                    const isUserLiquidatable = await accountsContract.isAccountLiquidatable.call(
                        user2
                    );
                    expect(isUserLiquidatable).to.equal(true);

                    // 5. withdraw without repaying
                    await expectRevert(
                        savingAccount.withdrawAll(addressUSDC, { from: user2 }),
                        "Insufficient collateral when withdraw."
                    );
                    await mockChainlinkAggregatorforUSDC.updateAnswer(originPrice);
                });
            });
        });
    });
});
