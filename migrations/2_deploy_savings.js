const SymbolsLib = artifacts.require("SymbolsLib");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const Base = artifacts.require("Base");

const SavingAccount = artifacts.require("SavingAccount");

module.exports = function(deployer) {
  deployer.deploy(SymbolsLib);
  deployer.deploy(TokenInfoLib);
  deployer.link(TokenInfoLib, Base);
  deployer.link(SymbolsLib, Base);
  deployer.deploy(Base);

  deployer.link(SymbolsLib, SavingAccount);
  deployer.link(Base, SavingAccount);

  deployer.deploy(SavingAccount);
};
