const SavingAccount = artifacts.require("SavingAccount");
const TokenInfoLib = artifacts.require("TokenInfoLib");
const SymbolsLib = artifacts.require("SymbolsLib");
const TestTokenContract = artifacts.require("TestTokenContract");
const TestToken = artifacts.require("TestToken");

const Web3 = require('web3')

const ENV_DEVELOP = require("./../environments/env_develop")
const ENV_RINKEBY = require("./../environments/env_rinkeby")
const ENV_MAINNET = require("./../environments/env_mainnet")
const BN = require("bn.js");

function ethToWei(wei) {
    return Web3.utils.toWei(wei, 'ether');
}

module.exports = function (deployer, network, accounts) {
    deployer.deploy(TokenInfoLib);
    deployer.link(TokenInfoLib, SavingAccount);
    deployer.deploy(SymbolsLib);
    deployer.link(SymbolsLib, SavingAccount);
    deployer.deploy(SavingAccount);

    let env;
    if (network.startsWith("develop")) {
        console.log(`Deploing test contract: TestTokenContract`);
        deployer.link(TokenInfoLib, TestTokenContract);
        deployer.deploy(TestTokenContract);
        deployer.deploy(TestToken);

        env = ENV_DEVELOP;        
    }
    else if (network.startsWith("rinkeby")) {
        env = ENV_RINKEBY;
    }

    let account = accounts[0]; // TODO 
    console.log(`Using account: ${account}`);
    deployer.then(async function () {        
        const instance = await SavingAccount.deployed();
        //const amountToSend = Web3.utils.toWei(new BN(2 * 10**16), 'wei');
        //await Web3.eth.sendTransaction({from: accounts[0], to:instance.address, value:amountToSend});

        console.log("Initializing saving pool....");

        if (network.startsWith("develop")) {
            const testToken = await TestToken.deployed();
            console.log(`Setting test token address: ${JSON.stringify(testToken.contract._address)}`)
            env.tokenAddresses[env.tokenAddresses.length - 1] = testToken.contract._address;
        }

        //await instance.initialize(env.ratesURL, env.tokenNames, env.tokenAddresses, { from: account });

        if (network.startsWith("rinkeby")) {
            console.log("Depositing ETH....");
            let amount = ethToWei('1.456');
            await instance.depositToken(env.tokenAddresses[0], amount, { value: amount, from: account });

            // console.log("Depositing FIN....");
            // amount = ethToWei('2.345');
            // await instance.depositToken(env.tokenAddresses[env.tokenAddresses.length - 1], amount, { value: amount, from: account });
        }

        console.log("Calling updatePrice....");
        await instance.updatePrice({ from: account  });
    });
};
