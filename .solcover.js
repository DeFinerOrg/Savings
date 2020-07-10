module.exports = {
    client: require("ganache-cli"),
    skipFiles: ["mocks/MockCToken.sol", "mocks/MockChainLinkAggregator.sol", "mocks/MockERC20.sol"],
    providerOptions: {
        default_balance_ether: 10000
    }
};