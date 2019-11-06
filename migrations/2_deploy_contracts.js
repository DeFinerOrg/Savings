const SavingAccount = artifacts.require("SavingAccount");
const TokenLib = artifacts.require("TokenLib");

module.exports = function(deployer) {
    deployer.deploy(TokenLib);
    deployer.link(TokenLib, SavingAccount);
    deployer.deploy(SavingAccount);
};
