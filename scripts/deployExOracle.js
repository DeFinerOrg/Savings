async function main() {
    // We get the contract to deploy
    const ExOracle = await ethers.getContractFactory("ExOracle");
    const exOracleAddress = "0x319b07E94eA8288aC0c15b4A24d26577Bec05366";
    const dataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
    const exOracle = await ExOracle.deploy(exOracleAddress, dataSource, "DAI/ETH", "DAI");

    console.log("ExOracle deployed to:", exOracle.address);
    console.log("PairName:", await exOracle.pairName());
    console.log("PriceType:", await exOracle.priceType());
    console.log(await exOracle.latestAnswer());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
