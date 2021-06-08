var tokenData = require("../test-helpers/OKExChainData.json");
// var compound = require("../compound-protocol/networks/development.json");

const { BN } = require("@openzeppelin/test-helpers");

const AccountTokenLib = artifacts.require("AccountTokenLib");
const SavingLib = artifacts.require("SavingLib");
const Utils = artifacts.require("Utils");
const BitmapLib = artifacts.require("BitmapLib");
const Accounts = artifacts.require("Accounts");
const Bank = artifacts.require("Bank");

const SavingAccount = artifacts.require("SavingAccount");
const SavingAccountWithController = artifacts.require("SavingAccountWithController");
const AccountsWithController = artifacts.require("AccountsWithController");

const TokenRegistry = artifacts.require("TokenRegistry");
const GlobalConfig = artifacts.require("GlobalConfig");
const Constant = artifacts.require("Constant");

// Upgradablility contracts
const ProxyAdmin = artifacts.require("ProxyAdmin");
const SavingAccountProxy = artifacts.require("SavingAccountProxy");
const AccountsProxy = artifacts.require("AccountsProxy");
const BankProxy = artifacts.require("BankProxy");

module.exports = async function (deployer, network) {
    await deployer.deploy(Utils);
    console.log("=========================Deploy Utils============================");
    await deployer.link(Utils, SavingLib);
    console.log("=========================Link Utils library============================");
    await deployer.link(Utils, SavingAccount);
    console.log("=========================Link Utils library============================");
    await deployer.link(Utils, SavingAccountWithController);
    console.log("=========================Link Utils library============================");
    await deployer.link(Utils, AccountsWithController);
    console.log("=========================Link Utils library============================");
    await deployer.link(Utils, Accounts);
    console.log("=========================Link Utils library============================");
    await deployer.link(Utils, TokenRegistry);
    console.log("=========================Link Utils library============================");
};
