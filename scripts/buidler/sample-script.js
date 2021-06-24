// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const ethers = bre.ethers;
async function main() {
    // Buidler always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await bre.run('compile');

    // We get the contract to deploy
    const chainLink = await ethers.getContractFactory("MockChainLinkAggregator");
    const ChainLink = await chainLink.deploy(18, 5172765000000000);

    await ChainLink.deployed();

    console.log("Sample contract deployed to:", ChainLink.address);
    console.log("Getting the price: ", await ChainLink.latestAnswer.call());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
