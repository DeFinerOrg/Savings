import * as t from "../../types/truffle-contracts/index";
// import { Utils } from "../../types/truffle-contracts/index";

var chai = require("chai");

const { ethers, upgrades } = require("hardhat");

contract("SavingAccount() proxy", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const ADDRESS_0x01: string = "0x0000000000000000000000000000000000000001";

    // let Utils: any;
    // let savingAccountV1: t.SavingAccountWithControllerInstance;
    // let savingAccountV2: t.SavingAccountWithControllerV2Instance;
    // let SavingAccountV1: t.SavingAccountWithControllerInstance;
    // let SavingAccountV2: t.SavingAccountWithControllerV2Instance;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
    });

    describe("Upgradability proxy tests from V1 to V2", async () => {
        it("SavingAccount V1 to latest", async () => {
            // ==================
            // SavingAccount V1
            // ==================
            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("UtilsV1");
            console.log("------------------ 1 ------------------");
            const UtilsV1 = await ethers.getContractFactory("UtilsV1");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const utilsV1 = await UtilsV1.deploy();
            console.log("utilsV1", utilsV1.address);

            const SavingLibV1 = await ethers.getContractFactory("SavingLibV1", {
                libraries: {
                    UtilsV1: utilsV1.address,
                },
            });
            const savingLibV1 = await SavingLibV1.deploy();
            console.log("savingLibV1", savingLibV1.address);

            const SavingAccountV1 = await ethers.getContractFactory("SavingAccountV1", {
                libraries: { SavingLibV1: savingLibV1.address, UtilsV1: utilsV1.address },
            });

            // ====================
            // SavingAccount latest
            // ====================
            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("Utils");
            console.log("------------------ 1 ------------------");
            const Utils = await ethers.getContractFactory("Utils");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const utils = await Utils.deploy();
            console.log("utils", utils.address);
            console.log("============ 3 ==============");

            const SavingLib = await ethers.getContractFactory("SavingLib", {
                libraries: {
                    Utils: utils.address,
                },
            });
            console.log("============ 4 ==============");
            const savingLib = await SavingLib.deploy();
            console.log("savingLib", savingLib.address);
            const SavingAccount = await ethers.getContractFactory("SavingAccount", {
                libraries: { SavingLib: savingLib.address, Utils: utils.address },
            });

            // ======================
            // SavingAccount V1 Proxy
            // ======================
            const savingAccountProxy = await upgrades.deployProxy(
                SavingAccountV1,
                [[], [], ETH_ADDRESS],
                { initializer: "initialize", unsafeAllow: ["external-library-linking"] }
            );

            // ==========================
            // SavingAccount latest Proxy
            // ==========================
            const SAV = await upgrades.upgradeProxy(savingAccountProxy.address, SavingAccount, {
                unsafeAllow: ["external-library-linking"],
            });
        });

        it("Accounts from V1 to latest", async () => {
            // ==================
            // Accounts V1
            // ==================
            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("AccountTokenLibV1");
            console.log("------------------ 1 ------------------");
            const AccountTokenLibV1 = await ethers.getContractFactory("AccountTokenLibV1");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const accountTokenLibV1 = await AccountTokenLibV1.deploy();
            console.log("accountTokenLibV1", accountTokenLibV1.address);

            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("UtilsV1");
            console.log("------------------ 1 ------------------");
            const UtilsV1 = await ethers.getContractFactory("UtilsV1");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const utilsV1 = await UtilsV1.deploy();
            console.log("utilsV1", utilsV1.address);

            const AccountsV1 = await ethers.getContractFactory("AccountsV1", {
                libraries: {
                    AccountTokenLibV1: accountTokenLibV1.address,
                    UtilsV1: utilsV1.address,
                },
            });

            // ==================
            // Accounts latest
            // ==================
            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("AccountTokenLib");
            console.log("------------------ 1 ------------------");
            const AccountTokenLib = await ethers.getContractFactory("AccountTokenLib");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const accountTokenLib = await AccountTokenLibV1.deploy();
            console.log("accountTokenLib", accountTokenLib.address);
            console.log("============ 3 ==============");

            const Accounts = await ethers.getContractFactory("Accounts", {
                libraries: { AccountTokenLib: accountTokenLib.address },
            });

            // ======================
            // Accounts V1 Proxy
            // ======================
            const accountsProxy = await upgrades.deployProxy(AccountsV1, [ETH_ADDRESS], {
                initializer: "initialize",
                unsafeAllow: ["external-library-linking"],
            });

            // ======================
            // Accounts latest Proxy
            // ======================
            const upgradeAccounts = await upgrades.upgradeProxy(accountsProxy.address, Accounts, {
                unsafeAllow: ["external-library-linking"],
            });
        });
        it("Bank from V1 to latest", async () => {
            // ==================
            // Bank V1
            // ==================
            const BankV1 = await ethers.getContractFactory("BankV1");
            console.log("Bank deploed", BankV1.address);

            // ==================
            // Bank latest
            // ==================
            const Bank = await ethers.getContractFactory("Bank");
            console.log("Bank deploed", Bank.address);

            // ======================
            // Bank V1 Proxy
            // ======================
            const bankProxy = await upgrades.deployProxy(BankV1, [ETH_ADDRESS], {
                initializer: "initialize",
            });

            // ======================
            // Bank latest Proxy
            // ======================
            const upgradeAccounts = await upgrades.upgradeProxy(bankProxy.address, Bank);
        });
    });

    describe("upgradeability tests from V2 to latest", async () => {
        it("SavingAccount from V1.1 to latest", async () => {
            // ==================
            // SavingAccount V1.1
            // ==================
            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("UtilsV1_1");
            console.log("------------------ 1 ------------------");
            const UtilsV1_1 = await ethers.getContractFactory("UtilsV1_1");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const utilsV1_1 = await UtilsV1_1.deploy();
            console.log("utilsV1_1", utilsV1_1.address);

            const SavingLibV1_1 = await ethers.getContractFactory("SavingLibV1_1", {
                libraries: {
                    UtilsV1_1: utilsV1_1.address,
                },
            });
            const savingLibV1_1 = await SavingLibV1_1.deploy();
            console.log("savingLibV1", savingLibV1_1.address);

            const SavingAccountV1_1 = await ethers.getContractFactory("SavingAccountV1_1", {
                libraries: { SavingLibV1_1: savingLibV1_1.address, UtilsV1_1: utilsV1_1.address },
            });

            // ====================
            // SavingAccount latest
            // ====================
            console.log("------------------ 0 ------------------");
            await ethers.getContractFactory("Utils");
            console.log("------------------ 1 ------------------");
            const Utils = await ethers.getContractFactory("Utils");
            console.log("============ 2 ==============");

            // console.log("Utils", Utils.address);
            const utils = await Utils.deploy();
            console.log("utils", utils.address);
            console.log("============ 3 ==============");

            const SavingLib = await ethers.getContractFactory("SavingLib", {
                libraries: {
                    Utils: utils.address,
                },
            });
            console.log("============ 4 ==============");
            const savingLib = await SavingLib.deploy();
            console.log("savingLib", savingLib.address);
            const SavingAccount = await ethers.getContractFactory("SavingAccount", {
                libraries: { SavingLib: savingLib.address, Utils: utils.address },
            });

            // ========================
            // SavingAccount V1_1 Proxy
            // ========================
            const savingAccountProxy = await upgrades.deployProxy(
                SavingAccountV1_1,
                [[], [], ETH_ADDRESS],
                { initializer: "initialize", unsafeAllow: ["external-library-linking"] }
            );

            // ==========================
            // SavingAccount latest Proxy
            // ==========================
            const SAV = await upgrades.upgradeProxy(savingAccountProxy.address, SavingAccount, {
                unsafeAllow: ["external-library-linking"],
            });
        });
        it("Accounts from V1.1 to latest");
        it("Bank from V1.1 to latest");
    });
});
