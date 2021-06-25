import * as t from "../types/truffle-contracts/index";

const SavingAccountProxy: t.SavingAccountProxyContract = artifacts.require("SavingAccountProxy");
const SavingAccountWithController: any = artifacts.require("SavingAccountWithController");
const Utils: t.UtilsContract = artifacts.require("Utils");
const SavingLib = artifacts.require("SavingLib");
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");

export async function upgradeFrom_v1_1_to_v1_2(
    proxyAdminAddr: string,
    savingAccountProxyAddr: string
) {
    //Upgrade SavingAccountProxy from v1.1 to v1.2
    const utils = await Utils.new();
    await SavingLib.link(utils);
    const savingLib = await SavingLib.new();
    await SavingAccountWithController.link(savingLib);
    await SavingAccountWithController.link(utils);
    // deploy new impl
    const savingAccountV1_2 = await SavingAccountWithController.new();
    // upgrade
    const proxyAdminInst = await ProxyAdmin.at(proxyAdminAddr);
    await proxyAdminInst.upgrade(savingAccountProxyAddr, savingAccountV1_2.address);
}
