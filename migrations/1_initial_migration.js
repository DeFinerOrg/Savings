const Migrations = artifacts.require("Migrations");
var shell = require("shelljs");

module.exports = function (deployer) {
	console.log("get here");
    process.env.NETWORK = deployer.network;
    deployer.deploy(Migrations);
};
