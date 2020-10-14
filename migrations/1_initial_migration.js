const Migrations = artifacts.require("Migrations");
var shell = require("shelljs");

module.exports = function (deployer) {
    process.env.NETWORK = deployer.network;
    deployer.deploy(Migrations);
};
