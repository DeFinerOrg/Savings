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

module.exports = async function(deployer, network) {
    const globalConfig = await deployer.deploy(GlobalConfig);
    console.log("=========================Deploy GlobalConfig============================");
    const constant = await deployer.deploy(Constant);
    console.log("=========================Deploy Constant============================");
};
