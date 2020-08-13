module.exports = {
    // client: require("ganache-cli"),
    port: 8546,
    testrpcOptions: '-p 8546 --gasLimit 0xfffffffffff --gasPrice 1 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true',
    norpc: true,
    // copyNodeModules: true,
    providerOptions: {
        "gasLimit": 0xfffffffffff,
        "callGasLimit": 0xfffffffffff,
        "allowUnlimitedContractSize": true
    },
    silent: false,
    compileCommand: 'truffle compile',
    testCommand: 'COVERAGE=TRUE truffle test --network coverage',
    skipFiles: ["mocks/MockCToken.sol", "mocks/MockChainLinkAggregator.sol", "mocks/MockERC20.sol", "mocks/MockProxyAdmin.sol", "mocks/SavingAccountWithController.sol", "external/strings.sol"]
};