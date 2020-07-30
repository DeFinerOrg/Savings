import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("SavingAccount.liquidate", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForWBTC: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20MKR: t.ERC20Instance;
    let erc20TUSD: t.ERC20Instance;
    let erc20USDT: t.ERC20Instance;

    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_ETH: any;
    let ONE_USDC: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
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
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20USDT = await ERC20.at(addressUSDT);

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
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_ETH = eighteenPrecision;
        ONE_USDC = sixPrecision;
        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);
        await mockChainlinkAggregatorforUSDT.updateAnswer(DAIprice);
        await mockChainlinkAggregatorforTUSD.updateAnswer(DAIprice);
    });


    context("liquidate()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("Should succeed", async () => {
                    it("C3: When user tries to liquidate partially", async () => {
                        const borrowAmt = new BN(await savingAccount.getCoinToETHRate(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_ETH)
                            .div(new BN(await savingAccount.getCoinToETHRate(9)));
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI);
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(ETH_ADDRESS, ONE_ETH.div(new BN(1000)), {
                            from: user2,
                            value: ONE_ETH.div(new BN(1000))
                        });
                        await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                            value: ONE_ETH
                        });
                        // 2. Start borrowing.
                        await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                        // 3. Change the price.
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        // update price of DAI to 70% of it's value
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(65))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        // 4. Start liquidation.
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, ETH_ADDRESS, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.equal(true);
                        expect(liquidateAfter).to.equal(true);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("C4: When user tries to liquidate fully", async () => {
                        // 2. Approve 1000 tokens
                        const borrowAmt = new BN(await savingAccount.getCoinToETHRate(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_ETH)
                            .div(new BN(await savingAccount.getCoinToETHRate(9)));
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI.mul(new BN(100)));
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.mul(new BN(100)));
                        await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                            from: user2,
                            value: ONE_ETH
                        });
                        // 2. Start borrowing.
                        await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                        // 3. Change the price.
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        // update price of DAI to 70% of it's value
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(7))
                            .div(new BN(10));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        // 4. Start liquidation.
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, ETH_ADDRESS, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.equal(true);
                        expect(liquidateAfter).to.equal(false);
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });

                context("Should fail", async () => {
                    it("C12: When collateral is not sufficient to be liquidated", async () => {
                        const borrowAmt = new BN(await savingAccount.getCoinToETHRate(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_ETH)
                            .div(new BN(await savingAccount.getCoinToETHRate(9)));
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                            from: user2,
                            value: ONE_ETH
                        });
                        // 2. Start borrowing.
                        await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });
                        // 3. Change the price.
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();

                        let updatedPrice = new BN(1);
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);

                        await expectRevert(
                            savingAccount.liquidate(user1, ETH_ADDRESS),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                    });
                    it("C13: When the ratio of borrowed money and collateral is less than 85%", async () => {
                        const borrowAmt = new BN(await savingAccount.getCoinToETHRate(0))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_ETH)
                            .div(new BN(await savingAccount.getCoinToETHRate(9)));
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(ETH_ADDRESS, ONE_ETH, {
                            from: user2,
                            value: ONE_ETH
                        });
                        // 2. Start borrowing.
                        await savingAccount.borrow(ETH_ADDRESS, borrowAmt, { from: user1 });

                        await expectRevert(
                            savingAccount.liquidate(user1, addressDAI),
                            "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                        );
                    });
                });
            });
            context("Compound Supported 18 decimals Token", async () => {
                context("Should suceed", async () => {
                    it("D3: When user tries to liquidate partially", async () => {
                        await mockChainlinkAggregatorforUSDC.updateAnswer(new BN(5309685000000000));
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        const borrowAmt = new BN(await savingAccount.getCoinToETHRate(1))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_DAI)
                            .div(new BN(await savingAccount.getCoinToETHRate(0)));
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI);
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                        await savingAccount.deposit(addressDAI, ONE_DAI.div(new BN(100)));
                        // 2. Start borrowing.
                        /* const borrowingPower2 = await savingAccount.getTotalDepositsNow({ from: user2 });
                        const borrowingPower1 = await savingAccount.getTotalDepositsNow({ from: user1 });
                        const balances2 = await savingAccount.getBalances({ from: user2 }); */

                        await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                        // 3. Change the price.
                        let USDCprice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                        // update price of DAI to 70% of it's value
                        let updatedPrice = BN(USDCprice)
                            .mul(new BN(7))
                            .div(new BN(10));

                        await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);
                        // 4. Start liquidation.
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user2);

                        await savingAccount.liquidate(user2, addressDAI);
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user2);
                        expect(liquidateBefore).to.equal(true);
                        expect(liquidateAfter).to.equal(true);
                        await mockChainlinkAggregatorforUSDC.updateAnswer(USDCprice);

                    });

                    it("D4: When user tries to liquidate fully", async () => {
                        await mockChainlinkAggregatorforUSDC.updateAnswer(new BN(5309685000000000));
                        // 2. Approve 1000 tokens
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await erc20DAI.approve(savingAccount.address, ONE_DAI);
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                        await savingAccount.deposit(addressDAI, ONE_DAI);
                        const borrowAmt = new BN(await savingAccount.getCoinToETHRate(1))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .mul(ONE_DAI)
                            .div(new BN(await savingAccount.getCoinToETHRate(0)));
                        const accountUSDC = await erc20USDC.balanceOf(savingAccount.address);
                        console.log(accountUSDC.toString());
                        // 2. Start borrowing.
                        await savingAccount.borrow(addressDAI, borrowAmt, { from: user2 });
                        // 3. Change the price.
                        let DAIprice = await mockChainlinkAggregatorforUSDC.latestAnswer();
                        // update price of DAI to 70% of it's value
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(7))
                            .div(new BN(10));

                        await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                        // 4. Start liquidation.
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user2);
                        await savingAccount.liquidate(user2, addressDAI);
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user2);
                        expect(liquidateBefore).to.equal(true);
                        expect(liquidateAfter).to.equal(false);
                        await mockChainlinkAggregatorforUSDC.updateAnswer(DAIprice);

                    });

                    it("D7: With 18 decimals token, liquidate partially the first time then liquidate fully", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 0.01 DAI
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.div(new BN(100)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 1.2 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(120)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDT
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 liquidatable
                         * Account2: Tries to liquidate user1, can only partially liquidate due to the limited amount
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBeforeFirst = await savingAccount.isAccountLiquidatable(
                            user1
                        );
                        await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                        const liquidatableAfterFirst = await savingAccount.isAccountLiquidatable(user1);
                        /*
                         * Step 4. Account 2 deposits more tokens to DeFiner, tries to liquidate again.
                         * Account2: Can fully liquidate user1 this time.
                         * To verify:
                         * 1. Liquidatable after first liquidataion, but unliquidatable after the second time.
                         */
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user2
                        });
                        await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                        const liquidatableAfterSecond = await savingAccount.isAccountLiquidatable(
                            user1
                        );
                        // verify 1.
                        expect(liquidatableBeforeFirst).to.be.true;
                        expect(liquidatableAfterFirst).to.be.true;
                        expect(liquidatableAfterSecond).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("D8: Account is unliquidatable, and becomes liquidatable after LTV changing", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 USDT
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user2, sixPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 20%, acccount2 tries to liquidate using USDT
                         * Account1: Collateral worth roughly 1.6 USD, 1.2/1.6 = 0.75 < 0.85
                         *           It is not liquidatable before the LTV rate changes
                         *           It is not liquidatable after the LTV rate changes to 0.7.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(80))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const rateChangeBefore = await savingAccount.isAccountLiquidatable(user1);
                        testEngine.globalConfig.updateLiquidationThreshold(70);
                        const rateChangeAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(rateChangeBefore).to.be.false;
                        expect(rateChangeAfter).to.be.true;
                        await savingAccount.liquidate(user1, addressUSDT, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
                context("Should fail", async () => {
                    it("D9: When unsupported token address is passed", async () => {
                        //Try depositting unsupported Token to SavingContract
                        await expectRevert(savingAccount.liquidate(owner, dummy), "Unsupported token");
                    });

                    it("D10: When tokenAddress is zero", async () => {
                        //Try depositting zero address
                        await expectRevert(
                            savingAccount.liquidate(owner, addressZero),
                            "Unsupported token"
                        );
                    });

                    it("D11: When collateral is not sufficient to be liquidated", async () => {
                        // 2. Approve 1000 tokens
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                        // 2. Start borrowing.
                        const limitAmount = ONE_USDC.mul(await savingAccount.getCoinToETHRate(1))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .div(await savingAccount.getCoinToETHRate(0));
                        await savingAccount.borrow(addressDAI, limitAmount, { from: user2 });
                        // 3. Change the price.
                        let updatedPrice = new BN(1);
                        await mockChainlinkAggregatorforUSDC.updateAnswer(updatedPrice);

                        await expectRevert(
                            savingAccount.liquidate(user2, addressDAI),
                            "Collateral is not sufficient to be liquidated."
                        );
                    });

                    it("D12: when the ratio of borrowed money and collateral is less than 85%", async () => {
                        await erc20DAI.transfer(user1, ONE_DAI);
                        await erc20USDC.transfer(user2, ONE_USDC);
                        await erc20DAI.approve(savingAccount.address, ONE_DAI, { from: user1 });
                        await erc20USDC.approve(savingAccount.address, ONE_USDC, { from: user2 });
                        await savingAccount.deposit(addressDAI, ONE_DAI, { from: user1 });
                        await savingAccount.deposit(addressUSDC, ONE_USDC, { from: user2 });
                        // 2. Start borrowing.
                        await savingAccount.borrow(addressDAI, new BN(10), { from: user2 });

                        await expectRevert(
                            savingAccount.liquidate(user2, addressDAI),
                            "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                        );
                    });
                    it("D14: Account is liquidatable, and becomes unliquidatable after LTV changing", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 USDT
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user2, sixPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDT
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It is liquidatable before the LTV rate changes
                         *           It is not liquidatable after the LTV rate changes to 0.9.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const rateChangeBefore = await savingAccount.isAccountLiquidatable(user1);
                        testEngine.globalConfig.updateLiquidationThreshold(90);
                        const rateChangeAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(rateChangeBefore).to.be.true;
                        expect(rateChangeAfter).to.be.false;
                        await expectRevert(
                            savingAccount.liquidate(user1, addressUSDT, { from: user2 }),
                            // FIXME: warning info in saving account shouldn't be hardcoded.
                            "The ratio of borrowed money and collateral must be larger than 85% in order to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });

                });
            });
            context("Compound Supported 6 decimals Token", async () => {
                context("Should succeed", async () => {
                    it("F3: Partial liqiuidate", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 0.05 USDC
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDC.transfer(user2, sixPrecision.div(new BN(20)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.div(new BN(20)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.div(new BN(20)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 1.2 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(120)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Tries to liquidate DAI using USDC, can only liquidate partially since
                         *           the token amount is limited.
                         * To verify:
                         * 1. user1 is liquidatable all the way
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressUSDC, { from: user2 });

                        const liquidatableAfter = await savingAccount.isAccountLiquidatable(user1);

                        // verify 1.
                        expect(liquidatableBefore).to.be.true;
                        expect(liquidatableAfter).to.be.true;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("F4: Fully liqiuidate", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 USDC
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDC.transfer(user2, sixPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 1.2 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(120)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Tries to liquidate DAI using USDC, can fully liquidate.
                         * To verify:
                         * 1. user1 changes from liquidatable to unliquidatable
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressUSDC, { from: user2 });

                        const liquidatableAfter = await savingAccount.isAccountLiquidatable(user1);
                        // verify 1.
                        expect(liquidatableBefore).to.be.true;
                        expect(liquidatableAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });

                    it("F5: Low amount value, partially", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits a small amount of USDC
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDC.transfer(user2, new BN(10));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDC.approve(savingAccount.address, new BN(10), { from: user2 });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDC, new BN(10), { from: user2 });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 1.2 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(120)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Tries to liquidate user1, only has a small amount of token so partially liquidate
                         * To verify:
                         * 1. user1 changes from liquidatable to unliquidatable
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressUSDC, { from: user2 });

                        const liquidatableAfter = await savingAccount.isAccountLiquidatable(user1);
                        // verify 1.
                        expect(liquidatableBefore).to.be.true;
                        expect(liquidatableAfter).to.be.true;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("F6: Large amount, full liqiuidate", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 20000 DAI
                         * Account2: deposits 10000 USDC
                         * Account3: deposits 20000 USDC and 20000 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(20000)));
                        await erc20USDC.transfer(user2, sixPrecision.mul(new BN(10000)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20000)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20000)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20000)),
                            { from: user1 }
                        );
                        await erc20USDC.approve(
                            savingAccount.address,
                            sixPrecision.mul(new BN(10000)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(
                            savingAccount.address,
                            sixPrecision.mul(new BN(20000)),
                            { from: user3 }
                        );
                        await erc20USDT.approve(
                            savingAccount.address,
                            sixPrecision.mul(new BN(20000)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(20000)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(10000)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20000)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20000)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 12000 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision
                                .mul(new BN(120))
                                .div(new BN(100))
                                .mul(new BN(10000)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.4 * 10000 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Tries to liquidate DAI using USDC, can fully liquidate.
                         * To verify:
                         * 1. user1 changes from liquidatable to unliquidatable
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressUSDC, { from: user2 });

                        const liquidatableAfter = await savingAccount.isAccountLiquidatable(user1);
                        // verify 1.
                        expect(liquidatableBefore).to.be.true;
                        expect(liquidatableAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("F7: With 6 decimals USDC, liquidate partially the first time then liquidate fully", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits small amount of USDC
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDC.transfer(user2, sixPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.div(new BN(100)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 1.2 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(120)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDT
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 liquidatable
                         * Account2: Tries to liquidate user1, can only partially liquidate due to the limited amount
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBeforeFirst = await savingAccount.isAccountLiquidatable(
                            user1
                        );
                        await savingAccount.liquidate(user1, addressUSDC, { from: user2 });
                        const liquidatableAfterFirst = await savingAccount.isAccountLiquidatable(user1);
                        /*
                         * Step 4. Account 2 deposits more tokens to DeFiner, tries to liquidate again.
                         * Account2: Can fully liquidate user1 this time.
                         * To verify:
                         * 1. Liquidatable after first liquidataion, but unliquidatable after the second time.
                         */
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(5)), {
                            from: user2
                        });
                        await savingAccount.liquidate(user1, addressUSDC, { from: user2 });
                        const liquidatableAfterSecond = await savingAccount.isAccountLiquidatable(
                            user1
                        );
                        // verify 1.
                        expect(liquidatableBeforeFirst).to.be.true;
                        expect(liquidatableAfterFirst).to.be.true;
                        expect(liquidatableAfterSecond).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
            });
            context("Compound Unsupported 18 decimals Token", async () => {
                context("Should succeed", async () => {
                    it("G7: With 18 decimals, liquidate partially the first time then liquidate fully", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 0.01 TUSD
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.div(new BN(100)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 1.2 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(120)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 liquidatable
                         * Account2: Tries to liquidate user1, can only partially liquidate due to the limited amount
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidatableBeforeFirst = await savingAccount.isAccountLiquidatable(
                            user1
                        );
                        await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                        const liquidatableAfterFirst = await savingAccount.isAccountLiquidatable(user1);
                        /*
                         * Step 4. Account 2 deposits more tokens to DeFiner, tries to liquidate again.
                         * Account2: Can fully liquidate user1 this time.
                         * To verify:
                         * 1. Liquidatable after first liquidataion, but unliquidatable after the second time.
                         */
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user2
                        });
                        await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                        const liquidatableAfterSecond = await savingAccount.isAccountLiquidatable(
                            user1
                        );
                        // verify 1.
                        expect(liquidatableBeforeFirst).to.be.true;
                        expect(liquidatableAfterFirst).to.be.true;
                        expect(liquidatableAfterSecond).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
            });

        });
        context("Multiple Tokens", async () => {
            context("Compound and Compound", async () => {
                context("Should Suceed", async () => {
                    it("H4: Borrow multiple compound supported tokens, liquidate with compound supported token.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 USDT
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user2, sixPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDT
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressUSDT, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("H4: Borrow multiple compound supported tokens, liquidate with compound unsupported token.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 TUSD
                         * Account3: deposits 20 USDC and 20 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("H6: Liquidate a huge amount of multiple kinds of compound supported tokens.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 20000 DAI
                         * Account2: deposits 100000 DAI
                         * Account3: deposits 200000 TUSD and 200000 USDC
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(20000)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(100000)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(200000)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(200000)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20000)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(100000)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(200000)),
                            { from: user3 }
                        );
                        await erc20USDC.approve(
                            savingAccount.address,
                            sixPrecision.mul(new BN(200000)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(20000)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(100000)), {
                            from: user2
                        });
                        await savingAccount.deposit(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(200000)),
                            { from: user3 }
                        );
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(200000)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 6000 TUSD and 6000 USDC
                         */
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision
                                .mul(new BN(60))
                                .div(new BN(100))
                                .mul(new BN(10000)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision
                                .mul(new BN(60))
                                .div(new BN(100))
                                .mul(new BN(10000)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("H6: Liquidate a huge amount of multiple kinds of compound unsupported tokens.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 20000 DAI
                         * Account2: deposits 100000 TUSD
                         * Account3: deposits 200000 TUSD and 200000 USDC
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(20000)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(100000)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(200000)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(200000)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20000)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(100000)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(200000)),
                            { from: user3 }
                        );
                        await erc20USDC.approve(
                            savingAccount.address,
                            sixPrecision.mul(new BN(200000)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(20000)), {
                            from: user1
                        });
                        await savingAccount.deposit(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(100000)),
                            { from: user2 }
                        );
                        await savingAccount.deposit(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(200000)),
                            { from: user3 }
                        );
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(200000)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 6000 TUSD and 6000 USDC
                         */
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision
                                .mul(new BN(60))
                                .div(new BN(100))
                                .mul(new BN(10000)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision
                                .mul(new BN(60))
                                .div(new BN(100))
                                .mul(new BN(10000)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1,4 * 10000 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
                context("Should fail", async () => {
                    it("H11: Borrow multiple compound supported tokens, liquidate with compound supported token, and there is not engough collteral.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 USDT
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user2, sixPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 40%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.2
                         *           It can be liquidated but the collateral is not enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressUSDC, { from: user2 }),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("H11: Borrow multiple compound supported tokens, liquidate with compound unsupported token, and there is not engough collteral.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 TUSD
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 40%, acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.6 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.2
                         *           It can be liquidated but the collateral is not enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("H13: Borrow multiple compound supported tokens, liquidate with compound unsupported token, and the liqudiator don't have enough tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 TUSD
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         * Account2: borrows 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user2 }
                        );
                        /*
                         * Step 3. DAI and TUSD price drops 30%, acccount2 tries to liquidate using TUSD.
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                         *           It can be liquidated and the collateral is enough.
                         * Account2: No funds left actually.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedDAIPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedDAIPrice);
                        let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                        let updatedTUSDPrice = BN(TUSDprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforTUSD.updateAnswer(updatedTUSDPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                            "No extra funds are used for liquidation."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                        await mockChainlinkAggregatorforTUSD.updateAnswer(TUSDprice);

                    });
                    it("H13: Borrow multiple compound supported tokens, liquidate with compound supported token, and the liqudiator don't have enough tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 DAI
                         * Account3: deposits 2 USDC and 2 USDT
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user3, sixPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 USDT and 0.6 USDC
                         * Account2: borrows 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDT,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user2 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Account 2 becomes liquidatable too, so it can't liquidate account 1.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                            "No extra funds are used for liquidation."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
            });
            context("Compund and non-Compound", async () => {
                context("Should succeed", async () => {
                    it("I4: Borrow multiple compound supported and unsupported tokens, liquidate with compound supported tokens.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 DAI
                         * Account3: deposits 20 TUSD and 20 USDC
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20)),
                            { from: user3 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 TUSD and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("I4: Borrow multiple compound supported and unsupported tokens, liquidate with compound unsupported tokens.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 TUSD
                         * Account3: deposits 20 TUSD and 20 USDC
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20)),
                            { from: user3 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 TUSD and 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
                context("Should fail", async () => {
                    it("I11: Borrow multiple compound supported and unsupported tokens, liquidate with compound supported tokens, and there is not engough collteral.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 USDT
                         * Account3: deposits 2 USDC and 2 TUSD
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDT.transfer(user2, sixPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDT.approve(savingAccount.address, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDT, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDC and 0.6 TUSD
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 20%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.2
                         *           It can be liquidated but the collateral is not enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressUSDT, { from: user2 }),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("I11: Borrow multiple compound supported and unsupported tokens, liquidate with compound unsupported tokens, and there is not engough collteral.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 TUSD
                         * Account3: deposits 2 USDC and 2 TUSD
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows 0.6 USDC and 0.6 TUSD
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 20%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.6
                         *           It can be liquidated but the collateral is not enough.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("I13: Borrow multiple compound supported and unsupported tokens, liquidate with compound supported tokens, and the liqudiator don't have enough tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 DAI
                         * Account3: deposits 2 USDC and 2 TUSD
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 USDC and 0.6 TUSD
                         * Account2: borrows 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user2 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Account 2 becomes liquidatable too, so it can't liquidate account 1.
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                            "No extra funds are used for liquidation."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("I13: Borrow multiple compound supported and unsupported tokens, liquidate with compound unsupported tokens, and the liqudiator don't have enough tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 TUSD
                         * Account3: deposits 2 USDC and 2 TUSD
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20USDC.transfer(user3, sixPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 USDC and 0.6 TUSD
                         * Account2: borrows 0.6 USDC
                         */
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(
                            addressUSDC,
                            sixPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user2 }
                        );
                        /*
                         * Step 3. DAI price drops 40%, TUSD price drops 20% acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.2 USD, the borrowed asset worth 0.6 + 0.6 * 0.8 = 1.08
                         *           1.08 / 1.2 = 0.9 > 0.85, liquidatable. 1.2 * 0.95 = 1.14 > 1.08, collateral enough
                         * Account2: Collateral worth 0.8 USD, borrowed asset worth 0.8 USD.
                         *           0.6 / 0.8 = 0.75 > 0.6, no funds left
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let updatedDAIPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedDAIPrice);
                        let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                        let updatedTUSDPrice = BN(TUSDprice)
                            .mul(new BN(80))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforTUSD.updateAnswer(updatedTUSDPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                            "No extra funds are used for liquidation."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                        await mockChainlinkAggregatorforTUSD.updateAnswer(TUSDprice);


                    });
                })
            });
            context("Non-compound and Non-Compund", async () => {
                context("Should suceed", async () => {
                    it("J4: Borrow multiple compound unsupported tokens, liquidate with compound supported tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 DAI
                         * Account3: deposits 20 TUSD and 20 MKR
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                        await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20)),
                            { from: user3 }
                        );
                        await erc20MKR.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                        let MKRAmount = eighteenPrecision
                            .mul(BN(DAIprice))
                            .div(BN(MKRprice))
                            .mul(new BN(60))
                            .div(new BN(100));
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressDAI, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("J4: Borrow multiple compound unsupported tokens, liqudiate with compound unsupported tokens.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 10 TUSD
                         * Account3: deposits 20 TUSD and 20 MKR
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(10)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(20)));
                        await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(20)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(10)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20)),
                            { from: user3 }
                        );
                        await erc20MKR.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(20)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(10)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(20)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                        let MKRAmount = eighteenPrecision
                            .mul(BN(DAIprice))
                            .div(BN(MKRprice))
                            .mul(new BN(60))
                            .div(new BN(100));
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using USDC
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4* 0.95 = 1.33 > 1.2
                         *           It can be liquidated and the collateral is enough.
                         */
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        const liquidateBefore = await savingAccount.isAccountLiquidatable(user1);
                        await savingAccount.liquidate(user1, addressTUSD, { from: user2 });
                        const liquidateAfter = await savingAccount.isAccountLiquidatable(user1);
                        expect(liquidateBefore).to.be.true;
                        expect(liquidateAfter).to.be.false;
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                });
                context("Should fail", async () => {
                    it("J11: Borrow multiple compound unsupported tokens, liquidate with compound supported tokens, and there is not engough collteral.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 USDC
                         * Account3: deposits 2 MKR and 2 TUSD
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20USDC.transfer(user2, sixPrecision.mul(new BN(1)));
                        await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20USDC.approve(savingAccount.address, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await erc20MKR.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressUSDC, sixPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows MKR that is the same value of 0.6 DAI and 0.6 TUSD
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                        let MKRAmount = eighteenPrecision
                            .mul(BN(DAIprice))
                            .mul(new BN(60))
                            .div(new BN(100))
                            .div(BN(MKRprice));
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 40%, acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.6 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.6
                         *           It can be liquidated but the collateral is not enough.
                         */
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("J11: Borrow multiple compound unsupported tokens, liqudiate with compound unsupported tokens, and there is not engough collteral.", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 TUSD
                         * Account3: deposits 2 MKR and 2 TUSD
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20MKR.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 borrows from DeFiner
                         * Account1: borrows MKR that is the same value of 0.6 DAI and 0.6 TUSD
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                        let MKRAmount = eighteenPrecision
                            .mul(BN(DAIprice))
                            .div(BN(MKRprice))
                            .mul(new BN(60))
                            .div(new BN(100));
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        /*
                         * Step 3. DAI price drops 40%, acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.2 USD, 1.2/1.2 = 1 > 0.85 and 1.2 * 0.95 < 1.6
                         *           It can be liquidated but the collateral is not enough.
                         */
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                            "Collateral is not sufficient to be liquidated."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("J13: Borrow multiple compound unsupported tokens, liquidate with compound supported tokens, and the liqudiator don't have enough tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 DAI
                         * Account3: deposits 2 TUSD and 2 MKR
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20DAI.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));
                        await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );
                        await erc20MKR.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                         * Account2: borrows 0.6 TUSD
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                        let MKRAmount = eighteenPrecision
                            .mul(BN(DAIprice))
                            .div(BN(MKRprice))
                            .mul(new BN(60))
                            .div(new BN(100));
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user2 }
                        );
                        /*
                         * Step 3. DAI price drops 30%, acccount2 tries to liquidate using DAI
                         * Account1: Collateral worth roughly 1.4 USD, 1.2/1.4 = 0.857 > 0.85 and 1.4 * 0.95 = 1.33 > 1.2.
                         *           It can be liquidated and the collateral is enough.
                         * Account2: Account 2 becomes liquidatable too, so it can't liquidate account 1.
                         */
                        let updatedPrice = BN(DAIprice)
                            .mul(new BN(70))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressDAI, { from: user2 }),
                            "No extra funds are used for liquidation."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);

                    });
                    it("J13L Borrow multiple compound unsupported tokens, liqudiate with compound unsupported tokens, and the liqudiator don't have enough tokens", async () => {
                        /*
                         * Step 1. Assign tokens to each user and deposit them to DeFiner
                         * Account1: deposits 2 DAI
                         * Account2: deposits 1 TUSD
                         * Account3: deposits 2 TUSD and 2 MKR
                         */
                        await erc20DAI.transfer(user1, eighteenPrecision.mul(new BN(2)));
                        await erc20TUSD.transfer(user2, eighteenPrecision.mul(new BN(1)));
                        await erc20TUSD.transfer(user3, eighteenPrecision.mul(new BN(2)));
                        await erc20MKR.transfer(user3, eighteenPrecision.mul(new BN(2)));

                        await erc20DAI.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user1 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(1)),
                            { from: user2 }
                        );
                        await erc20TUSD.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );
                        await erc20MKR.approve(
                            savingAccount.address,
                            eighteenPrecision.mul(new BN(2)),
                            { from: user3 }
                        );

                        await savingAccount.deposit(addressDAI, eighteenPrecision.mul(new BN(2)), {
                            from: user1
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(1)), {
                            from: user2
                        });
                        await savingAccount.deposit(addressTUSD, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        await savingAccount.deposit(addressMKR, eighteenPrecision.mul(new BN(2)), {
                            from: user3
                        });
                        /*
                         * Step 2. User1 and User 2 borrows from DeFiner
                         * Account1: borrows 0.6 TUSD and MKR that is the same value as 0.6 DAI
                         * Account2: borrows MKR that is the same value as 0.6 DAI
                         */
                        let DAIprice = await mockChainlinkAggregatorforDAI.latestAnswer();
                        let MKRprice = await mockChainlinkAggregatorforMKR.latestAnswer();
                        let MKRAmount = eighteenPrecision
                            .mul(BN(DAIprice))
                            .div(BN(MKRprice))
                            .mul(new BN(60))
                            .div(new BN(100));
                        await savingAccount.borrow(
                            addressTUSD,
                            eighteenPrecision.mul(new BN(60)).div(new BN(100)),
                            { from: user1 }
                        );
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user1 });
                        await savingAccount.borrow(addressMKR, MKRAmount, { from: user2 });
                        /*
                         * Step 3. DAI price drops 40%, TUSD price drops 20% acccount2 tries to liquidate using TUSD
                         * Account1: Collateral worth roughly 1.2 USD, the borrowed asset worth 0.6 + 0.6 * 0.8 = 1.08
                         *           1.08 / 1.2 = 0.9 > 0.85, liquidatable. 1.2 * 0.95 = 1.14 > 1.08, collateral enough
                         * Account2: Collateral worth 0.8 USD, borrowed asset worth 0.8 USD.
                         *           0.6 / 0.8 = 0.75 > 0.6, no funds left
                         */
                        let updatedDAIPrice = BN(DAIprice)
                            .mul(new BN(60))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforDAI.updateAnswer(updatedDAIPrice);
                        let TUSDprice = await mockChainlinkAggregatorforTUSD.latestAnswer();
                        let updatedTUSDPrice = BN(TUSDprice)
                            .mul(new BN(80))
                            .div(new BN(100));
                        await mockChainlinkAggregatorforTUSD.updateAnswer(updatedTUSDPrice);
                        await expectRevert(
                            savingAccount.liquidate(user1, addressTUSD, { from: user2 }),
                            "No extra funds are used for liquidation."
                        );
                        await mockChainlinkAggregatorforDAI.updateAnswer(DAIprice);
                        await mockChainlinkAggregatorforTUSD.updateAnswer(TUSDprice);

                    });
                });
            });
        });
    });
});
