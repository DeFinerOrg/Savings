import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");
const { ethers, upgrades } = require("hardhat");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");

contract("SavingAccount.deposit", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    // let savingAccountV2: t.SavingAccountWithControllerInstanceV2;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

    let savingAccountV1;
    let savingAccountV2: t.SavingAccountWithControllerInstance;
    let SavingAccountV1;
    let SavingAccountV2;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function () {
        this.timeout(0);

        console.log("------------------ 1 ------------------");

        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        console.log("------------------ 2 ------------------");
        tokens = await testEngine.erc20Tokens;
        bank = await testEngine.bank;

        // savingAccount = await ethers.getContractFactory("SavingAccountWithControllerInstance");
        // let sa = await upgrades.deployProxy(savingAccount, { initializer: "initialize" });
        // console.log("savingAccount", savingAccount);

        console.log("------------------ 3 ------------------");
        SavingAccountV1 = await ethers.getContractFactory("SavingAccount");
        console.log("------------------ 4 ------------------");
        SavingAccountV2 = await ethers.getContractFactory("SavingAccountV2");
        console.log("------------------ 5 ------------------");

        savingAccountV1 = await upgrades.deployProxy(SavingAccountV1, {
            initializer: "initialize",
        });
        console.log("------------------ 6 ------------------");
        savingAccountV2 = await upgrades.upgradeProxy(savingAccountV1.address, SavingAccountV2);
        console.log("------------------ 7 ------------------");
    });

    context("upgrade", async () => {
        it("verify - 1", async () => {
            console.log("------------------ 8 ------------------");
            await savingAccountV2.approveAll(ETH_ADDRESS);
            console.log("------------------ 9 ------------------");
        });
    });
});
