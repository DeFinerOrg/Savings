import * as t from "../../../types/truffle-contracts/index";
import { TestEngine } from "../../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

contract("TokenRegstry", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    const addressOne: string = "0x0000000000000000000000000000000000000001";
    const sixteenPrecision = new BN(10).pow(new BN(16));
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let globalConfig: t.GlobalConfigInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    let tokens: any;
    let addressDAI: any;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        globalConfig = await testEngine.globalConfig;
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;

        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];

        await savingAccount.fastForward(10);
    });

    context("should fail", async () => {
        it("When executing updateBorrowLTV, new LTV is greater than 100", async function () {
            this.timeout(0);
            await expectRevert(
                tokenInfoRegistry.updateBorrowLTV(addressDAI, new BN(110)),
                "Borrow LTV must be less than Scale"
            );
        });

        it("When enabling a token which is already enabled", async function () {
            this.timeout(0);
            await expectRevert(tokenInfoRegistry.enableToken(addressDAI), "Token already enabled");
        });
    });

    context("should succeed", async () => {
        it("When executing updateBorrowLTV", async function () {
            this.timeout(0);
            const prevBorrowLTV = await tokenInfoRegistry.getBorrowLTV(addressDAI);
            await tokenInfoRegistry.updateBorrowLTV(addressDAI, new BN(70));
            const afterBorrowLTV = await tokenInfoRegistry.getBorrowLTV(addressDAI);
            expect(prevBorrowLTV).to.be.bignumber.equal(new BN(60));
            expect(afterBorrowLTV).to.be.bignumber.equal(new BN(70));
        });

        it("When executing updateTokenTransferFeeFlag", async function () {
            this.timeout(0);
            const prevTransferFeeFlag = await tokenInfoRegistry.isTransferFeeEnabled(addressDAI);
            await tokenInfoRegistry.updateTokenTransferFeeFlag(addressDAI, true);
            const afterTransferFeeFlag = await tokenInfoRegistry.isTransferFeeEnabled(addressDAI);
            expect(prevTransferFeeFlag).to.equal(false);
            expect(afterTransferFeeFlag).to.equal(true);
        });

        it("When executing enableToken", async function () {
            this.timeout(0);
            await tokenInfoRegistry.disableToken(addressDAI);
            const prevEnableTokenFlag = await tokenInfoRegistry.isTokenEnabled(addressDAI);
            await tokenInfoRegistry.enableToken(addressDAI);
            const afterEnableTokenFlag = await tokenInfoRegistry.isTokenEnabled(addressDAI);
            expect(prevEnableTokenFlag).to.equal(false);
            expect(afterEnableTokenFlag).to.equal(true);
        });

        it("When executing updateChainLinkAggregator", async function () {
            this.timeout(0);
            await tokenInfoRegistry.updateChainLinkAggregator(addressDAI, addressOne);
            const afterChainLinkAggregator = await tokenInfoRegistry.getChainLinkAggregator(
                addressDAI
            );
            expect(afterChainLinkAggregator).to.be.bignumber.equal(addressOne);
        });

        it("When executing updateCToken", async function () {
            this.timeout(0);
            await tokenInfoRegistry.updateCToken(addressDAI, addressOne);
            const afterCToken = await tokenInfoRegistry.getCToken(addressDAI);
            expect(afterCToken).to.be.bignumber.equal(addressOne);
        });
    });
});
