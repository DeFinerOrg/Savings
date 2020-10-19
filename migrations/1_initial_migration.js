const Migrations = artifacts.require("Migrations");

module.exports = async function(deployer) {

    process.env.NETWORK = deployer.network;
    deployer.deploy(Migrations);
};
