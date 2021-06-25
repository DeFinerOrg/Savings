import * as t from "../types/truffle-contracts/index";

import { TestEngineV1_1 } from "./TestEngineV1_1";

const SavingAccountProxy: t.SavingAccountProxyContract = artifacts.require("SavingAccountProxy");
const SavingAccountWithController: any = artifacts.require("SavingAccountWithController");
const AccountsWithController: any = artifacts.require("AccountsWithController");
const BankWithController: any = artifacts.require("BankWithController");
const Utils: t.UtilsContract = artifacts.require("Utils");
const SavingLib = artifacts.require("SavingLib");
const AccountTokenLib = artifacts.require("AccountTokenLib");
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");

export async function upgradeFrom_v1_1_to_v1_2(testEngine: TestEngineV1_1) {
    const proxyAdminInst = await ProxyAdmin.at(testEngine.proxyAdmin.address);

    // Upgrade SavingAccountProxy from v1.1 to v1.2
    // ============================================
    const utils = await Utils.new();
    await SavingLib.link(utils);
    const savingLib = await SavingLib.new();
    await SavingAccountWithController.link(savingLib);
    await SavingAccountWithController.link(utils);
    // deploy new impl
    const savingAccountV1_2 = await SavingAccountWithController.new();
    // upgrade SavingAccount
    await proxyAdminInst.upgrade(testEngine.savingAccount.address, savingAccountV1_2.address);

    // Upgrade AccountProxy from v1.1 to v1.2
    // =======================================
    const accountTokenLib = await AccountTokenLib.new();
    await AccountsWithController.link(accountTokenLib);
    const accountsV1_2 = await AccountsWithController.new();
    await proxyAdminInst.upgrade(testEngine.accounts.address, accountsV1_2.address);

    // Upgrade BankProxy from v1.1 to v1.2
    // =======================================
    const bankV1_2 = await BankWithController.new();
    await proxyAdminInst.upgrade(testEngine.bank.address, bankV1_2.address);
}
