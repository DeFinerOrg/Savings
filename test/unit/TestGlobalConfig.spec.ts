import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ChainLinkAggregator: t.ChainLinkAggregatorContract = artifacts.require("ChainLinkAggregator");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

contract("GlobalConfig", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let globalConfig: t.GlobalConfigInstance;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        globalConfig = await testEngine.globalConfig;
    });

    context("constructor", async () => {
        context("should fail", async () => {
            it("When executing updateCommunityFundRatio, the input parameter is zero.", async () => {
                await expectRevert(
                    globalConfig.updateCommunityFundRatio(new BN(0)),
                    "Community fund is zero"
                );
            });

            it("When executing updateMinReserveRatio, the input parameter is zero.", async () => {
                await expectRevert(
                    globalConfig.updateMinReserveRatio(new BN(0)),
                    "Min Reserve Ratio is zero"
                );
            });

            it("When executing updateMinReserveRatio, the input parameter is greater than maxReserveRatio.", async () => {
                await expectRevert(
                    globalConfig.updateMinReserveRatio(new BN(21)),
                    "Min reserve greater or equal to Max reserve"
                );
            });

            it("When executing updateMaxReserveRatio, the input parameter is zero.", async () => {
                await expectRevert(
                    globalConfig.updateMaxReserveRatio(new BN(0)),
                    "Max Reserve Ratio is zero"
                );
            });

            it("When executing updateMaxReserveRatio, the input parameter is less than minReserveRatio.", async () => {
                await expectRevert(
                    globalConfig.updateMaxReserveRatio(new BN(9)),
                    "Max reserve less than or equal to Min reserve"
                );
            });

            it("When executing updateLiquidationThreshold, the input parameter is zero.", async () => {
                await expectRevert(
                    globalConfig.updateLiquidationThreshold(new BN(0)),
                    "LiquidationThreshold is zero"
                );
            });

            it("When executing updateLiquidationDiscountRatio, the input parameter is zero.", async () => {
                await expectRevert(
                    globalConfig.updateLiquidationDiscountRatio(new BN(0)),
                    "LiquidationDiscountRatio is zero"
                );
            });
        });

        context("should succeed", async () => {
            it("executing updateCommunityFundRatio", async () => {
                const beforeCommunityFundRatio = await globalConfig.communityFundRatio();
                await globalConfig.updateCommunityFundRatio(new BN(20));
                const afterCommunityFundRatio = await globalConfig.communityFundRatio();
                expect(beforeCommunityFundRatio).to.be.bignumber.equal(new BN(10));
                expect(afterCommunityFundRatio).to.be.bignumber.equal(new BN(20));
            });

            it("executing updateMinReserveRatio", async () => {
                const beforeMinReserveRatio = await globalConfig.minReserveRatio();
                await globalConfig.updateMinReserveRatio(new BN(15));
                const afterMinReserveRatio = await globalConfig.minReserveRatio();
                expect(beforeMinReserveRatio).to.be.bignumber.equal(new BN(10));
                expect(afterMinReserveRatio).to.be.bignumber.equal(new BN(15));
            });

            it("executing updateMaxReserveRatio", async () => {
                const beforeMaxReserveRatio = await globalConfig.maxReserveRatio();
                await globalConfig.updateMaxReserveRatio(new BN(25));
                const afterMaxReserveRatio = await globalConfig.maxReserveRatio();
                expect(beforeMaxReserveRatio).to.be.bignumber.equal(new BN(20));
                expect(afterMaxReserveRatio).to.be.bignumber.equal(new BN(25));
            });

            it("executing updateLiquidationThreshold", async () => {
                const beforeLiquidationThreshold = await globalConfig.liquidationThreshold();
                await globalConfig.updateLiquidationThreshold(new BN(20));
                const afterLiquidationThreshold = await globalConfig.liquidationThreshold();
                expect(beforeLiquidationThreshold).to.be.bignumber.equal(new BN(85));
                expect(afterLiquidationThreshold).to.be.bignumber.equal(new BN(20));
            });

            it("executing updateLiquidationDiscountRatio", async () => {
                const beforeLiquidationDiscountRatio = await globalConfig.liquidationDiscountRatio();
                await globalConfig.updateLiquidationDiscountRatio(new BN(20));
                const afterLiquidationDiscountRatio = await globalConfig.liquidationDiscountRatio();
                expect(beforeLiquidationDiscountRatio).to.be.bignumber.equal(new BN(95));
                expect(afterLiquidationDiscountRatio).to.be.bignumber.equal(new BN(20));
            });

            it("executing midReserveRatio", async () => {
                const beforeLiquidationDiscountRatio = await globalConfig.midReserveRatio();
                await globalConfig.updateMinReserveRatio(new BN(15));
                await globalConfig.updateMaxReserveRatio(new BN(25));
                const afterLiquidationDiscountRatio = await globalConfig.midReserveRatio();
                expect(beforeLiquidationDiscountRatio).to.be.bignumber.equal(new BN(15));
                expect(afterLiquidationDiscountRatio).to.be.bignumber.equal(new BN(20));
            });
        });
    });
});
