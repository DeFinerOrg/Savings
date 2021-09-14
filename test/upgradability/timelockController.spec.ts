import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

const { BN, time, expectRevert } = require("@openzeppelin/test-helpers");

var chai = require("chai");
var expect = chai.expect;

const AccountTokenLib = artifacts.require("AccountTokenLib");
const Accounts: t.AccountsContract = artifacts.require("Accounts");
const Bank: t.BankContract = artifacts.require("Bank");
const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const TimelockController: t.TimelockControllerContract = artifacts.require("TimelockController");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO = new BN(0);
const ONE_MIN = new BN(60); // 60 sec
const ONE_HOUR = new BN(60).mul(ONE_MIN); // 60 mins

contract("TimelockController for ProxyAdmin", async (accounts) => {
    let owner = accounts[0];
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;

    before(function () {
        this.timeout(0);
        testEngine = new TestEngine();
    });

    beforeEach(async function () {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
    });

    it("should have all proxy contract", async () => {
        expect(testEngine.accounts.address).to.be.not.equal(ZERO_ADDRESS);
        expect(testEngine.bank.address).to.be.not.equal(ZERO_ADDRESS);
        expect(savingAccount.address).to.be.not.equal(ZERO_ADDRESS);

        const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);
        const savingAccountImpl = await proxyAdmin.getProxyImplementation(savingAccount.address);
        const bankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);
        const accountsImpl = await proxyAdmin.getProxyImplementation(testEngine.accounts.address);

        expect(savingAccountImpl).to.be.not.equal(ZERO_ADDRESS);
        expect(bankImpl).to.be.not.equal(ZERO_ADDRESS);
        expect(accountsImpl).to.be.not.equal(ZERO_ADDRESS);

        expect(await testEngine.proxyAdmin.owner()).to.be.equal(owner);
    });

    it("should have ProxyAdmin as owner of all proxy", async () => {
        const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);

        const proxyAdminOfSavingAccount = await proxyAdmin.getProxyAdmin(savingAccount.address);
        const proxyAdminOfBank = await proxyAdmin.getProxyAdmin(testEngine.bank.address);
        const proxyAdminOfAccounts = await proxyAdmin.getProxyAdmin(testEngine.accounts.address);

        expect(proxyAdminOfSavingAccount).to.be.equal(proxyAdmin.address);
        expect(proxyAdminOfBank).to.be.equal(proxyAdmin.address);
        expect(proxyAdminOfAccounts).to.be.equal(proxyAdmin.address);
    });

    it("should deploy TimelockController and transfer ProxyAdmin ownership", async () => {
        const FOURTY_EIGHT_HOURS = new BN(48).mul(ONE_HOUR);
        const proposer = accounts[1];
        const executor = accounts[2];

        const proposers = [proposer];
        const executors = [executor];

        const timelock: t.TimelockControllerInstance = await TimelockController.new(
            FOURTY_EIGHT_HOURS,
            proposers,
            executors
        );

        expect(await timelock.getMinDelay()).to.be.bignumber.equal(FOURTY_EIGHT_HOURS);
        // owner has timelock admin role
        expect(await timelock.hasRole(await timelock.TIMELOCK_ADMIN_ROLE(), owner)).to.be.equal(
            true
        );
        expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), proposer)).to.be.equal(true);
        expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), executor)).to.be.equal(true);
    });

    describe("Advanced tests for TimelockController", async () => {
        let timelock: t.TimelockControllerInstance;
        const FOURTY_EIGHT_HOURS = new BN(48).mul(ONE_HOUR);
        const proposer = accounts[1];
        const executor = accounts[2];

        beforeEach(async () => {
            const proposers = [proposer];
            const executors = [executor];

            timelock = await TimelockController.new(FOURTY_EIGHT_HOURS, proposers, executors);

            // transfer the ProxyAdmin's ownership to TimelockController
            await testEngine.proxyAdmin.transferOwnership(timelock.address, { from: owner });

            expect(await testEngine.proxyAdmin.owner()).to.be.equal(await timelock.address);
        });

        it("should fail when delay is not over", async () => {
            const bankProxy = testEngine.bank.address;
            const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);

            const currBankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);

            // deploy new
            const newBank = await Bank.new();

            // upgrade via TimelockController
            expect(currBankImpl).to.be.not.equal(ZERO_ADDRESS);
            const data = await proxyAdmin.contract.methods
                .upgrade(bankProxy, newBank.address)
                .encodeABI();

            // schedule upgrade job
            const target = proxyAdmin.address;
            const value = new BN(0);
            const predecessor = "0x";
            const salt = "0x";
            const delay = FOURTY_EIGHT_HOURS;
            const tx = await timelock.schedule(target, value, data, predecessor, salt, delay, {
                from: proposer,
            });
            const jobID: string = tx.logs[0].args[0].toString();

            const targetTimestamp = await timelock.getTimestamp(jobID);
            expect(targetTimestamp).to.be.bignumber.not.equal(ZERO);

            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // increase 10 hours
            const TEN_HOURS = new BN(10).mul(ONE_HOUR);
            await time.increase(TEN_HOURS);

            // job is not ready to execute
            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // validate
            let newBankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);
            expect(newBankImpl).to.be.equal(currBankImpl);

            // execute job, should fail
            await expectRevert(
                timelock.execute(target, value, data, predecessor, salt, { from: executor }),
                "TimelockController: operation is not ready"
            );

            // job is not ready to execute
            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // validate, not executed
            newBankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);
            expect(newBankImpl).to.be.equal(currBankImpl);
        });

        it("should upgrade Bank after delay via TimelockController", async () => {
            const bankProxy = testEngine.bank.address;
            const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);

            const currBankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);

            // deploy new
            const newBank = await Bank.new();

            // upgrade via TimelockController
            expect(currBankImpl).to.be.not.equal(ZERO_ADDRESS);
            const data = await proxyAdmin.contract.methods
                .upgrade(bankProxy, newBank.address)
                .encodeABI();

            // schedule upgrade job
            const target = proxyAdmin.address;
            const value = new BN(0);
            const predecessor = "0x";
            const salt = "0x";
            const delay = FOURTY_EIGHT_HOURS;
            const tx = await timelock.schedule(target, value, data, predecessor, salt, delay, {
                from: proposer,
            });
            const jobID: string = tx.logs[0].args[0].toString();

            const targetTimestamp = await timelock.getTimestamp(jobID);
            expect(targetTimestamp).to.be.bignumber.not.equal(ZERO);

            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // increase 48 hours
            await time.increase(FOURTY_EIGHT_HOURS);

            // job is ready to execute
            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(true);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // validate
            let newBankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);
            expect(newBankImpl).to.be.equal(currBankImpl);

            // execute job
            await timelock.execute(target, value, data, predecessor, salt, { from: executor });

            // validate
            newBankImpl = await proxyAdmin.getProxyImplementation(testEngine.bank.address);
            expect(newBankImpl).to.be.equal(newBank.address);
        });

        it("should upgrade Accounts after delay via TimelockController", async () => {
            const accountsProxy = testEngine.accounts.address;
            const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);

            const currAccountsImpl = await proxyAdmin.getProxyImplementation(
                testEngine.accounts.address
            );

            // deploy new
            const newAccounts = await testEngine.deployOnlyAccounts();

            // upgrade via TimelockController
            expect(currAccountsImpl).to.be.not.equal(ZERO_ADDRESS);
            const data = await proxyAdmin.contract.methods
                .upgrade(accountsProxy, newAccounts.address)
                .encodeABI();

            // schedule upgrade job
            const target = proxyAdmin.address;
            const value = new BN(0);
            const predecessor = "0x";
            const salt = "0x";
            const delay = FOURTY_EIGHT_HOURS;
            const tx = await timelock.schedule(target, value, data, predecessor, salt, delay, {
                from: proposer,
            });
            const jobID: string = tx.logs[0].args[0].toString();

            const targetTimestamp = await timelock.getTimestamp(jobID);
            expect(targetTimestamp).to.be.bignumber.not.equal(ZERO);

            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // increase 48 hours
            await time.increase(FOURTY_EIGHT_HOURS);

            // job is ready to execute
            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(true);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // validate
            let newAccountsImpl = await proxyAdmin.getProxyImplementation(
                testEngine.accounts.address
            );
            expect(newAccountsImpl).to.be.equal(currAccountsImpl);

            // execute job
            await timelock.execute(target, value, data, predecessor, salt, { from: executor });

            // validate
            newAccountsImpl = await proxyAdmin.getProxyImplementation(testEngine.accounts.address);
            expect(newAccountsImpl).to.be.equal(newAccounts.address);
        });

        it("should upgrade SavingAccount after delay via TimelockController", async () => {
            const savingAccountsProxy = savingAccount.address;
            const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);

            const currSavingAccountsImpl = await proxyAdmin.getProxyImplementation(
                savingAccountsProxy
            );

            // deploy new
            const newSavingAccounts = await testEngine.deployOnlySavingAccount();

            // upgrade via TimelockController
            expect(currSavingAccountsImpl).to.be.not.equal(ZERO_ADDRESS);
            const data = await proxyAdmin.contract.methods
                .upgrade(savingAccountsProxy, newSavingAccounts.address)
                .encodeABI();

            // schedule upgrade job
            const target = proxyAdmin.address;
            const value = new BN(0);
            const predecessor = "0x";
            const salt = "0x";
            const delay = FOURTY_EIGHT_HOURS;
            const tx = await timelock.schedule(target, value, data, predecessor, salt, delay, {
                from: proposer,
            });
            const jobID: string = tx.logs[0].args[0].toString();

            const targetTimestamp = await timelock.getTimestamp(jobID);
            expect(targetTimestamp).to.be.bignumber.not.equal(ZERO);

            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // increase 48 hours
            await time.increase(FOURTY_EIGHT_HOURS);

            // job is ready to execute
            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(true);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // validate
            let newSavingAccountsImpl = await proxyAdmin.getProxyImplementation(
                savingAccountsProxy
            );
            expect(newSavingAccountsImpl).to.be.equal(currSavingAccountsImpl);

            // execute job
            await timelock.execute(target, value, data, predecessor, salt, { from: executor });

            // validate
            newSavingAccountsImpl = await proxyAdmin.getProxyImplementation(savingAccountsProxy);
            expect(newSavingAccountsImpl).to.be.equal(newSavingAccounts.address);
        });

        it("should transferOwnership of ProxyAdmin after delay via TimelockController", async () => {
            const proxyAdmin = await ProxyAdmin.at(testEngine.proxyAdmin.address);

            // TimelockController is the current owner of the ProxyAdmin
            expect(await proxyAdmin.owner()).to.be.equal(await timelock.address);

            const target = proxyAdmin.address;
            const value = new BN(0);
            const predecessor = "0x";
            const salt = "0x";
            const delay = FOURTY_EIGHT_HOURS;
            const data = await proxyAdmin.contract.methods.transferOwnership(owner).encodeABI();

            const tx = await timelock.schedule(target, value, data, predecessor, salt, delay, {
                from: proposer,
            });
            const jobID: string = tx.logs[0].args[0].toString();

            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(false);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // increase 48 hours
            await time.increase(FOURTY_EIGHT_HOURS);

            expect(await timelock.isOperationPending(jobID)).to.be.equal(true);
            expect(await timelock.isOperationReady(jobID)).to.be.equal(true);
            expect(await timelock.isOperationDone(jobID)).to.be.equal(false);

            // execute job
            await timelock.execute(target, value, data, predecessor, salt, { from: executor });

            // Owner is the new owner of the TimelockController
            expect(await proxyAdmin.owner()).to.be.equal(owner);
        });
    });
});
