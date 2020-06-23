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

contract("SavingAccount", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
    });

    context("approveAll", async () => {
        context("should fail", async () => {
            it("when unsupported token address is passed");

            it("when cToken address is zero");
        });

        context("should succeed", async () => {
            it("when all conditions are satisfied");
        });
    });

    context("updateDefinerRate", async () => {
        context("should fail", async () => {
            it("when unsupported token address is passed");
        });

        context("should succeed", async () => {
            it("when supported token address is passed");

            it("when borrowRateLMBN is zero");

            it("when borrowRateLMBN is equal to block number");

            it("when cToken address is zero");
        });
    });

    context("getTotalUsdValue", async () => {
        context("should succeed", async () => {
            it("when ETH address is passed");
        });
    });

    context("getMarketState", async () => {
        //TODO:
        context("should succeed", async () => {
            it("when all conditions are satisfied");
        });
    });

    context("getTokenState", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when all conditions are satisfied");
        });
    });

    context("getBalances", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when sender's address is valid");
        });
    });

    //TODO:
    context("isAccountLiquidatable", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when sender's address is valid");
        });
    });

    //TODO:
    context("getCoinLength", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when sender's address is valid");
        });
    });

    //TODO:
    context("recycleCommunityFund", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when sender's address is valid");
        });
    });

    //TODO:
    context("setDeFinerCommunityFund", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when sender's address is valid");
        });
    });

    //TODO:
    context("getDeFinerCommunityFund", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when sender's address is valid");
        });
    });

    context("emergencyWithdraw", async () => {
        context("should fail", async () => {});

        context("should succeed", async () => {
            it("when supported address is passed");

            it("when ETH address is passed");
        });
    });
});
