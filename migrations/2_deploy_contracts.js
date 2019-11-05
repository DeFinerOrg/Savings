const SavingAccount = artifacts.require("SavingAccount");

module.exports = function(deployer) {
  deployer.deploy(SavingAccount);
};
