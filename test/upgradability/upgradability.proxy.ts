import * as t from "../../types/truffle-contracts/index";

var chai = require("chai");

const { ethers, upgrades } = require("hardhat");

contract("SavingAccount() proxy", async (accounts) => {
    const DUMMY: string = "0x0000000000000000000000000000000000000010";

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
    });

    describe("Upgradability proxy tests from V1 to latest", async () => {
        it("SavingAccount V1 to latest", async () => {
            // ==================
            // SavingAccount V1
            // ==================
            const UtilsV1 = await ethers.getContractFactory("UtilsV1");

            // console.log("Utils", Utils.address);
            const utilsV1 = await UtilsV1.deploy();

            const SavingLibV1 = await ethers.getContractFactory("SavingLibV1", {
                libraries: {
                    UtilsV1: utilsV1.address,
                },
            });
            const savingLibV1 = await SavingLibV1.deploy();

            const SavingAccountV1 = await ethers.getContractFactory("SavingAccountV1", {
                libraries: { SavingLibV1: savingLibV1.address, UtilsV1: utilsV1.address },
            });

            // ====================
            // SavingAccount latest
            // ====================
            const Utils = await ethers.getContractFactory("Utils");
            const utils = await Utils.deploy();

            const SavingLib = await ethers.getContractFactory("SavingLib", {
                libraries: {
                    Utils: utils.address,
                },
            });
            const savingLib = await SavingLib.deploy();

            const SavingAccount = await ethers.getContractFactory("SavingAccount", {
                libraries: { SavingLib: savingLib.address, Utils: utils.address },
            });

            // ======================
            // SavingAccount V1 Proxy
            // ======================
            const savingAccountProxy = await upgrades.deployProxy(
                SavingAccountV1,
                [[], [], DUMMY],
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
            const AccountTokenLibV1 = await ethers.getContractFactory("AccountTokenLibV1");
            const accountTokenLibV1 = await AccountTokenLibV1.deploy();

            const UtilsV1 = await ethers.getContractFactory("UtilsV1");
            const utilsV1 = await UtilsV1.deploy();

            const AccountsV1 = await ethers.getContractFactory("AccountsV1", {
                libraries: {
                    AccountTokenLibV1: accountTokenLibV1.address,
                    UtilsV1: utilsV1.address,
                },
            });

            // ==================
            // Accounts latest
            // ==================
            const AccountTokenLib = await ethers.getContractFactory("AccountTokenLib");
            const accountTokenLib = await AccountTokenLib.deploy();

            const Accounts = await ethers.getContractFactory("Accounts", {
                libraries: { AccountTokenLib: accountTokenLib.address },
            });

            // ======================
            // Accounts V1 Proxy
            // ======================
            const accountsProxy = await upgrades.deployProxy(AccountsV1, [DUMMY], {
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

            // ==================
            // Bank latest
            // ==================
            const Bank = await ethers.getContractFactory("Bank");

            // ======================
            // Bank V1 Proxy
            // ======================
            const bankProxy = await upgrades.deployProxy(BankV1, [DUMMY], {
                initializer: "initialize",
            });

            // ======================
            // Bank latest Proxy
            // ======================
            const upgradeBank = await upgrades.upgradeProxy(bankProxy.address, Bank);
        });
    });

    describe("upgradeability tests from V1.1 to latest", async () => {
        it("SavingAccount from V1.1 to latest", async () => {
            // ==================
            // SavingAccount V1.1
            // ==================
            const UtilsV1_1 = await ethers.getContractFactory("UtilsV1_1");
            const utilsV1_1 = await UtilsV1_1.deploy();

            const SavingLibV1_1 = await ethers.getContractFactory("SavingLibV1_1", {
                libraries: {
                    UtilsV1_1: utilsV1_1.address,
                },
            });
            const savingLibV1_1 = await SavingLibV1_1.deploy();

            const SavingAccountV1_1 = await ethers.getContractFactory("SavingAccountV1_1", {
                libraries: { SavingLibV1_1: savingLibV1_1.address, UtilsV1_1: utilsV1_1.address },
            });

            // ====================
            // SavingAccount latest
            // ====================
            const Utils = await ethers.getContractFactory("Utils");
            const utils = await Utils.deploy();

            const SavingLib = await ethers.getContractFactory("SavingLib", {
                libraries: {
                    Utils: utils.address,
                },
            });
            const savingLib = await SavingLib.deploy();

            const SavingAccount = await ethers.getContractFactory("SavingAccount", {
                libraries: { SavingLib: savingLib.address, Utils: utils.address },
            });

            // ========================
            // SavingAccount V1.1 Proxy
            // ========================
            const savingAccountProxy = await upgrades.deployProxy(
                SavingAccountV1_1,
                [[], [], DUMMY],
                { initializer: "initialize", unsafeAllow: ["external-library-linking"] }
            );

            // ==========================
            // SavingAccount latest Proxy
            // ==========================
            const SAV = await upgrades.upgradeProxy(savingAccountProxy.address, SavingAccount, {
                unsafeAllow: ["external-library-linking"],
            });
        });

        it("Accounts from V1.1 to latest", async () => {
            // ==================
            // Accounts V1.1
            // ==================
            const AccountTokenLibV1_1 = await ethers.getContractFactory("AccountTokenLibV1_1");
            const accountTokenLibV1_1 = await AccountTokenLibV1_1.deploy();

            const AccountsV1_1 = await ethers.getContractFactory("AccountsV1_1", {
                libraries: {
                    AccountTokenLibV1_1: accountTokenLibV1_1.address,
                },
            });

            // ==================
            // Accounts latest
            // ==================
            const AccountTokenLib = await ethers.getContractFactory("AccountTokenLib");
            const accountTokenLib = await AccountTokenLib.deploy();

            const Accounts = await ethers.getContractFactory("Accounts", {
                libraries: { AccountTokenLib: accountTokenLib.address },
            });

            // ======================
            // Accounts V1.1 Proxy
            // ======================
            const accountsProxy = await upgrades.deployProxy(AccountsV1_1, [DUMMY], {
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

        it("Bank from V1.1 to latest", async () => {
            // ==================
            // Bank V1.1
            // ==================
            const BankV1_1 = await ethers.getContractFactory("BankV1_1");

            // ==================
            // Bank latest
            // ==================
            const Bank = await ethers.getContractFactory("Bank");

            // ======================
            // Bank V1.1 Proxy
            // ======================
            const bankProxy = await upgrades.deployProxy(BankV1_1, [DUMMY], {
                initializer: "initialize",
            });

            // ======================
            // Bank latest Proxy
            // ======================
            const upgradeBank = await upgrades.upgradeProxy(bankProxy.address, Bank);
        });
    });

    describe("Upgradability proxy tests from V1 to v1.1", async () => {
        it("SavingAccount V1 to V1.1", async () => {
            // ==================
            // SavingAccount V1
            // ==================
            const UtilsV1 = await ethers.getContractFactory("UtilsV1");
            const utilsV1 = await UtilsV1.deploy();

            const SavingLibV1 = await ethers.getContractFactory("SavingLibV1", {
                libraries: {
                    UtilsV1: utilsV1.address,
                },
            });
            const savingLibV1 = await SavingLibV1.deploy();

            const SavingAccountV1 = await ethers.getContractFactory("SavingAccountV1", {
                libraries: { SavingLibV1: savingLibV1.address, UtilsV1: utilsV1.address },
            });

            // ====================
            // SavingAccount V1.1
            // ====================
            const UtilsV1_1 = await ethers.getContractFactory("UtilsV1_1");
            const utilsV1_1 = await UtilsV1_1.deploy();

            const SavingLibV1_1 = await ethers.getContractFactory("SavingLibV1_1", {
                libraries: {
                    UtilsV1_1: utilsV1_1.address,
                },
            });
            const savingLibV1_1 = await SavingLibV1_1.deploy();

            const SavingAccountV1_1 = await ethers.getContractFactory("SavingAccountV1_1", {
                libraries: { SavingLibV1_1: savingLibV1_1.address, UtilsV1_1: utilsV1_1.address },
            });

            // ======================
            // SavingAccount V1 Proxy
            // ======================
            const savingAccountProxy = await upgrades.deployProxy(
                SavingAccountV1,
                [[], [], DUMMY],
                { initializer: "initialize", unsafeAllow: ["external-library-linking"] }
            );

            // ==========================
            // SavingAccount V1.1 Proxy
            // ==========================
            const SAV = await upgrades.upgradeProxy(savingAccountProxy.address, SavingAccountV1_1, {
                unsafeAllow: ["external-library-linking"],
            });
        });

        it("Accounts from V1 to V1.1", async () => {
            // ==================
            // Accounts V1
            // ==================
            const AccountTokenLibV1 = await ethers.getContractFactory("AccountTokenLibV1");
            const accountTokenLibV1 = await AccountTokenLibV1.deploy();

            const UtilsV1 = await ethers.getContractFactory("UtilsV1");
            const utilsV1 = await UtilsV1.deploy();

            const AccountsV1 = await ethers.getContractFactory("AccountsV1", {
                libraries: {
                    AccountTokenLibV1: accountTokenLibV1.address,
                    UtilsV1: utilsV1.address,
                },
            });

            // ==================
            // Accounts V1.1
            // ==================
            const AccountTokenLibV1_1 = await ethers.getContractFactory("AccountTokenLibV1_1");
            const accountTokenLibV1_1 = await AccountTokenLibV1_1.deploy();

            const AccountsV1_1 = await ethers.getContractFactory("AccountsV1_1", {
                libraries: { AccountTokenLibV1_1: accountTokenLibV1_1.address },
            });

            // ======================
            // Accounts V1 Proxy
            // ======================
            const accountsProxy = await upgrades.deployProxy(AccountsV1, [DUMMY], {
                initializer: "initialize",
                unsafeAllow: ["external-library-linking"],
            });

            // ======================
            // Accounts V1.1 Proxy
            // ======================
            const upgradeAccounts = await upgrades.upgradeProxy(
                accountsProxy.address,
                AccountsV1_1,
                {
                    unsafeAllow: ["external-library-linking"],
                }
            );
        });

        it("Bank from V1 to V1.1", async () => {
            // ==================
            // Bank V1
            // ==================
            const BankV1 = await ethers.getContractFactory("BankV1");

            // ==================
            // Bank V1.1
            // ==================
            const BankV1_1 = await ethers.getContractFactory("BankV1_1");

            // ======================
            // Bank V1 Proxy
            // ======================
            const bankProxy = await upgrades.deployProxy(BankV1, [DUMMY], {
                initializer: "initialize",
            });

            // ======================
            // Bank V1.1 Proxy
            // ======================
            const upgradeBank = await upgrades.upgradeProxy(bankProxy.address, BankV1_1);
        });
    });
});
