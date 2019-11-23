const SavingAccount = artifacts.require("SavingAccount");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const SymbolsLib = artifacts.require("SymbolsLib");
const TestTokenContract = artifacts.require("TestTokenContract");

const Web3 = require('web3')

const ENV_DEVELOP = require("./../environments/env_develop")
const ENV_RINKEBY = require("./../environments/env_rinkeby")
const ENV_MAINNET = require("./../environments/env_mainnet")

function ethToWei(wei) {
    return Web3.utils.toWei(wei, 'ether');
}

module.exports = function (deployer, network, accounts) {
    deployer.deploy(TokenInfoLib);
    deployer.link(TokenInfoLib, SavingAccount);
    deployer.deploy(SymbolsLib);
    deployer.link(SymbolsLib, SavingAccount);
    deployer.deploy(SavingAccount, { value: 2 * 10**16 });

    let env;
    if (network.startsWith("develop")) {
        console.log(`Deploing test contract: TestTokenContract`);
        deployer.link(TokenInfoLib, TestTokenContract);
        deployer.deploy(TestTokenContract);

        env = ENV_DEVELOP;
    }
    else if (network.startsWith("rinkeby")) {
        env = ENV_RINKEBY;
    }

    let account = accounts[0] // TODO
    deployer.then(async function () {
        const instance = await SavingAccount.deployed();
        console.log("Initializing saving pool....");
        await instance.initialize(env.ratesURL, env.tokenNames, env.tokenAddresses, { from: account, gas: 6000000 });

        // if (network.startsWith("rinkeby")) {
        //     let weiValue = ethToWei('2');
        //     await instance.depositToken(env.tokenAddresses[0], weiValue, { value: weiValue, from: account, gas: 6000000 });
        // }

        await instance.updatePrice(0, { from: account, gas: 6000000 });
    })
};
