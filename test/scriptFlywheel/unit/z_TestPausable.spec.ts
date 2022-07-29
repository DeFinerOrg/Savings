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

contract("InitializablePausable", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        // testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        await savingAccount.fastForward(1);
    });

    context("constructor", async () => {
        context("should fail", async () => {
            it("The non-owner calls the function that can be suspended.", async function () {
                this.timeout(0);
                await savingAccount.fastForward(1000);
                await expectRevert(
                    savingAccount.pause({ from: user1 }),
                    "PauserRole: caller does not have the Pauser role"
                );
            });
        });

        context("should succeed", async () => {
            it("The test turns on the pause function.", async function () {
                this.timeout(0);

                const depositAmount = new BN(100);
                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount,
                });

                const beforePaused = await savingAccount.paused();

                await savingAccount.pause();

                await expectRevert(savingAccount.withdrawAll(ETH_ADDRESS), "Pausable: paused");
                const afterPaused = await savingAccount.paused();

                expect(beforePaused).to.equal(false);
                expect(afterPaused).to.equal(true);
            });

            it("The test turns off the pause function.", async function () {
                this.timeout(0);
                const depositAmount = new BN(100);
                await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                    value: depositAmount,
                });

                const beforePaused = await savingAccount.paused();

                await savingAccount.pause();

                const midPaused = await savingAccount.paused();
                await expectRevert(savingAccount.withdrawAll(ETH_ADDRESS), "Pausable: paused");

                await savingAccount.unpause();

                const afterPaused = await savingAccount.paused();

                await savingAccount.withdrawAll(ETH_ADDRESS);

                expect(beforePaused).to.equal(false);
                expect(midPaused).to.equal(true);
                expect(afterPaused).to.equal(false);
            });
        });
    });
});
