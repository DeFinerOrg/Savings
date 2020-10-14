var tokenData = require("../test-helpers/tokenData.json");
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

const ChainLinkAggregator = artifacts.require("ChainLinkAggregator");
const TokenRegistry = artifacts.require("TokenRegistry");
const GlobalConfig = artifacts.require("GlobalConfig");
const Constant = artifacts.require("Constant");

// Upgradablility contracts
const ProxyAdmin = artifacts.require("ProxyAdmin");
const SavingAccountProxy = artifacts.require("SavingAccountProxy");
const AccountsProxy = artifacts.require("AccountsProxy");
const BankProxy = artifacts.require("BankProxy");

module.exports = async function (deployer, network) {
    // Deploy Libs
    await deployer.deploy(AccountTokenLib);
    console.log("=========================Deploy AccountTokenLib============================");
    await deployer.deploy(BitmapLib);
    console.log("=========================Deploy BitmapLib============================");

    await deployer.link(BitmapLib, Accounts);
    console.log("=========================Link BitmapLib library============================");
    await deployer.link(AccountTokenLib, Accounts);
    console.log(
        "=========================Link AccountTokenLib library============================"
    );
};
