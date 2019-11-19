const SavingAccount = artifacts.require("SavingAccount");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const SymbolsLib = artifacts.require("SymbolsLib");
const TestTokenContract = artifacts.require("TestTokenContract");

module.exports = function(deployer) {
    deployer.deploy(TokenInfoLib);
    deployer.link(TokenInfoLib, SavingAccount);
    deployer.deploy(SymbolsLib);
    deployer.link(SymbolsLib, SavingAccount);
    deployer.deploy(SavingAccount, {value: 2 * 10**16});

    deployer.link(TokenInfoLib, TestTokenContract);
    deployer.deploy(TestTokenContract);
};
