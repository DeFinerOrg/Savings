/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

require("ts-node/register");

const HDWalletProvider = require("@truffle/hdwallet-provider");
let _mnemonic = "";
let _privateKey = "";
try {
    const fs = require("fs");
    _mnemonic = fs.readFileSync(".secret").toString().trim();
    _privateKey = fs.readFileSync(".privateKey").toString().trim();
} catch (e) {}

module.exports = {
    contracts_build_directory: "./build/contracts",
    // this is required by truffle to find any ts test files
    test_file_extension_regexp: /.*\.ts$/,

    /**
     * Networks define how you connect to your ethereum client and let you set the
     * defaults web3 uses to send transactions. If you don't specify one truffle
     * will spin up a development blockchain for you on port 9545 when you
     * run `develop` or `test`. You can ask a truffle command to use a specific
     * network from the command line, e.g
     *
     * $ truffle test --network <network-name>
     */

    networks: {
        // Useful for testing. The `development` name is special - truffle uses it by default
        // if it's defined here and no other network is specified at the command line.
        // You should run a client (like ganache-cli, geth or parity) in a separate terminal
        // tab if you use this network and you must also set the `host`, `port` and `network_id`
        // options below to some value.
        //
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
            allowUnlimitedContractSize: true,
            gas: 20000000,
        },
        coverage: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
            gas: 0xfffffffffff, // <-- Use this high gas value
            gasPrice: 1, // <-- Use this low gas price
            disableConfirmationListener: true,
            allowUnlimitedContractSize: true,
        },
        // NOTICE: OKExChain-mainnet
        mainnet: {
            provider: () =>
                new HDWalletProvider({
                    privateKeys: [_privateKey],
                    providerOrUrl: `https://exchainrpc.okex.org`,
                    pollingInterval: 1000,
                }),
            network_id: 66,
            confirmations: 0,
            timeoutBlocks: 200,
            deploymentPollingInterval: 100,
            websockets: true,
            skipDryRun: true,
            disableConfirmationListener: true,
        },

        // rinkeby: {
        //     provider: () =>
        //         new HDWalletProvider(
        //             mnemonic,
        //             "https://rinkeby.infura.io/v3/cf38c21326954ac28aa4f8c3ee33550c"
        //         ),
        //     from: "0xbe389ed367E32deecEB49B456AD2720EA0C02C3f", // default address to use for any transaction Truffle makes during migrations
        //     network_id: 4,
        //     gas: 6000000,
        //     gasPrice: 15000000000,
        // },

        // NOTICE: OKExChain-testnet
        kovan: {
            provider: () => new HDWalletProvider(_mnemonic, `https://exchaintestrpc.okex.org`),
            network_id: 65,
            confirmations: 1,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
    },

    plugins: ["solidity-coverage", "truffle-contract-size"],
    // Set default mocha options here, use special reporters etc.
    mocha: {
        reporter: "eth-gas-reporter",
        // timeout: 120000,
        enableTimeouts: false,
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: "0.5.14",
            settings: {
                // See the solidity docs for advice about optimization and evmVersion
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
                evmVersion: "petersburg", //"constantinople",
            },
        },
    },
};
