const SavingAccount = artifacts.require("SavingAccount");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const SymbolsLib = artifacts.require("SymbolsLib");
const TestTokenContract = artifacts.require("TestTokenContract");

const Web3 = require('web3')

const ENV_DEVELOP = require("./../environments/env_develop")
const ENV_RINKEBY = require("./../environments/env_rinkeby")


function ethToWei(wei) {
    return Web3.utils.toWei(wei, 'ether');
}

module.exports = function (deployer, network, accounts) {
    deployer.deploy(TokenInfoLib);
    deployer.link(TokenInfoLib, SavingAccount);
    deployer.deploy(SymbolsLib);
    deployer.link(SymbolsLib, SavingAccount);
    deployer.deploy(SavingAccount, { value: ethToWei('2') });

    let env;
    if (network == "develop") {
        console.log(`Deploing test contract: TestTokenContract`);
        deployer.link(TokenInfoLib, TestTokenContract);
        deployer.deploy(TestTokenContract);

        env = ENV_DEVELOP;
    }
    else if (network == "rinkeby") {
        env = ENV_RINKEBY;
    }

    deployer.then(async function () {
        const instance = await SavingAccount.deployed();
        console.log("Initializing saving pool....");
        await instance.initialize(env.ratesURL, env.tokenNames, env.tokenAddresses, { from: accounts[0], gas: 6000000 });
        const coinCount = await instance.getCoinLength();
        console.log(`Initialization complete, number of coins: ${coinCount}`);

        if (network == "rinkeby") {
            let weiValue = ethToWei('2');
            await instance.depositToken(env.tokenAddresses[0], weiValue, { value: weiValue, from: accounts[0], gas: 6000000 });
        }

        await instance.updatePrice(0, { from: accounts[0], gas: 6000000 });
    })
};
