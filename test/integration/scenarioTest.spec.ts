import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";

import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { ScenarioTestEngine } from "../../test-helpers/ScenarioTestEngine";
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

contract("Scenario testing", async (accounts) => {

    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let scenarioTestEngine: ScenarioTestEngine;

    before(async function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("whitePaperModel.scen");
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        scenarioTestEngine = new ScenarioTestEngine(accounts.slice(0, 3), testEngine, savingAccount, 1);
        await scenarioTestEngine.initialize();
    });

    context("Use scenario test engine to randomly generate behaviors", async () => {
        it("Generate 100 random moves", async function () {
            this.timeout(0)

            for (let i = 0; i < 100; ++i) {
                await scenarioTestEngine.generateOneMove();
            }
        });

        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
        // it("Generate 100 withdraw moves", async function () {
        //     this.timeout(0)
        //     // scenarioTestEngine.setUserSuccMoveWeight([0, 0, 0, 0, 0, 0, 0, 0]);
        //     for (let i = 0; i < 100; ++i) {
        //         await scenarioTestEngine.generateOneMove();
        //     }
        // });
    });

});
