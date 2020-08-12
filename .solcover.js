// module.exports = {
//     client: require("ganache-cli"),
//     skipFiles: ["mocks/MockCToken.sol", "mocks/MockChainLinkAggregator.sol", "mocks/MockERC20.sol"],
//     providerOptions: {
//         default_balance_ether: 10000,
//         allowUnlimitedContractSize
//     }
// };
module.exports = {
    // client: require("ganache-cli"),
    port: 8545,
    testrpcOptions: '-p 8545 --gasLimit 0xfffffffffff --gasPrice 1 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true',
    norpc: true,
    // copyNodeModules: true,
    providerOptions: {
        "gasLimit": 0xfffffffffff,
        "callGasLimit": 0xfffffffffff,
        "allowUnlimitedContractSize": true
    },
    silent: false,
    compileCommand: 'yarn prepare',
    testCommand: 'COVERAGE=TRUE truffle test --network coverage',
    // client: require("ganache-core"),

    skipFiles: ["mocks/MockCToken.sol", "mocks/MockChainLinkAggregator.sol", "mocks/MockERC20.sol", "mocks/MockProxyAdmin.sol", "mocks/SavingAccountWithController.sol", "external/strings.sol"]
};