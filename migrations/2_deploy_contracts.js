const SavingAccount = artifacts.require("SavingAccount");
const TokenLib = artifacts.require("TokenLib");
const TestTokenContract = artifacts.require("TestTokenContract");

module.exports = function(deployer) {
    deployer.deploy(TokenLib);
    deployer.link(TokenLib, SavingAccount);
    deployer.deploy(SavingAccount, {value: 2 * 10**16});

    deployer.link(TokenLib, TestTokenContract);
    deployer.deploy(TestTokenContract);
};
