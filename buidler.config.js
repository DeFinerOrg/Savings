usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("buidler-typechain");
require("ts-node/register");
usePlugin("@nomiclabs/buidler-ethers");

// require("tsconfig-paths/register");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("balance", "Prints an account's balance")
    .addParam("account", "The account's address")
    .setAction(async taskArgs => {
        const account = web3.utils.toChecksumAddress(taskArgs.account);
        const balance = await web3.eth.getBalance(account);

        console.log(web3.utils.fromWei(balance, "ether"), "ETH");
    });

task("accounts", "Prints the list of accounts", async () => {
    const accounts = await ethers.getSigners();

    for (const account of accounts) {
        console.log(await account.getAddress());
    }
});
// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
    defaultNetwork: "buidlerevm",
    networks: {
        development: {
            url: "http://127.0.0.1:8545",
            allowUnlimitedContractSize: true,
            gas: 20000000,
            blockGasLimit: 0x1fffffffffffff,

        },
        buidlerevm: {
            allowUnlimitedContractSize: true,
            gas: 20000000,
            blockGasLimit: 0x1fffffffffffff,
            loggingEnabled: true,
        }
    },

    // This is a sample solc configuration that specifies which version of solc to use
    solc: {
        version: "0.5.14",
        optimizer: {
            enabled: true,
            runs: 200
        }
    },

    typechain: {
        outDir: "./types",
        target: "truffle-v5"
    }
};
