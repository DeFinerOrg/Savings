usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("buidler-typechain");
require("ts-node/register");
//require("tsconfig-paths/register");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
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
    defaultNetwork: "localhost",
    networks: {
        buidlerevm: {
            allowUnlimitedContractSize: true
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
