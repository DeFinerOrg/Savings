// module.exports = {
//     // client: require("ganache-cli"),
//     port: 8546,
//     testrpcOptions: '-p 8546 --gasLimit 0xfffffffffff --gasPrice 1 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true',
//     norpc: true,
//     // copyNodeModules: true,
//     providerOptions: {
//         "gasLimit": 0xfffffffffff,
//         "callGasLimit": 0xfffffffffff,
//         "allowUnlimitedContractSize": true
//     },
//     silent: false,
//     compileCommand: 'truffle compile',
//     testCommand: 'COVERAGE=TRUE truffle test --network coverage',
//     skipFiles: ["mocks/MockCToken.sol", "mocks/MockChainLinkAggregator.sol", "mocks/MockERC20.sol", "mocks/MockProxyAdmin.sol", "mocks/SavingAccountWithController.sol", "external/strings.sol"]
// };
module.exports = {
    // skipFiles: ["test/whitePaperModel/", "test/sciptFlywheel/"],

    providerOptions: {
        db_path: "./snapshots/scriptFlywheel",
        gasLimit: 0xfffffffffff,
        gasPrice: 0x01,
        allowUnlimitedContractSize: true,
        mnemonic: "begin vessel olive rocket pink distance admit foam lizard type fault enjoy",
        // accounts: [
        //     {
        //         secretKey: "0x53ee5383726e70cda802a65cf29d7f306bddf1b3e02560371827256a72a57e19",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0xba7f7ee34af0310a94792067b70cb269a7c1c76330100f73fc911fb255c3c6af",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0x0d2e862068c34e0662d767442726732ae00b7a26c2fb9ef46e19e507ca98e711",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0x1b31ad31fc2c4c5b4e6ff59c1889ecf061e33884b701d8e1bd7034a11abb6f2c",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0x792a961e443a297c8d81fb407681ab2ca465deb9c4be5b4298ec7c8856e1237e",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0x844bfed38635743b2ece848da57fe400b51a8c6532f4e3980fc0b9004766bc5b",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0xfbed65e2f7c94864105116df6ef4657cad0ba35acb1e9a7328153fb03d6e4c0c",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0xe8564a71d874e09c58e5da0fb469b70cf16fca5560a7b8be537a4cf774709e95",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0x3f2a4750abe980b3800bd66a11e97597fa2d530da6011a38b9c9c65756de549f",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        //     {
        //         secretKey: "0x28acb2472555887c6e31b4d8b004ec9a7be58485ca69e3c0cf2e92727deb3335",
        //         balance: 0x4ee2d6d415b85acef8100000000,
        //     },
        // ],
    },
};
