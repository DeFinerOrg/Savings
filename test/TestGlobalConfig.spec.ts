import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ChainLinkOracle: t.ChainLinkOracleContract = artifacts.require("ChainLinkOracle");

contract("GlobalConfig", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;
    let globalConfig: t.GlobalConfigInstance;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
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

        context("should succeed", async () => {});
    });
});
