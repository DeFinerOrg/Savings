let exOracleAddress;
let dataSource;

async function main() {
    await loadExOracleTestnetContracts();

    let exOracle;
    // exOracle = await deployOracle();
    exOracle = await readOracle();

    console.log("ExOracle deployed to:", exOracle.address);
    console.log("PairName:", await exOracle.pairName());
    console.log("PriceType:", await exOracle.priceType());
    console.log("DAI price in ETH:", (await exOracle.latestAnswer()).toString());
}

async function loadExOracleTestnetContracts() {
    exOracleAddress = "0x319b07E94eA8288aC0c15b4A24d26577Bec05366";
    dataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
}

async function deployOracle() {
    // We get the contract to deploy
    const ExOracle = await ethers.getContractFactory("ExOracle");
    const exOracle = await ExOracle.deploy(exOracleAddress, dataSource, "DAI/ETH", "DAI");
    return exOracle;
}

async function readOracle() {
    // We get the contract to deploy
    const ExOracle = await ethers.getContractFactory("ExOracle");
    // DeFiner ExOracle Deployed 0xb9FFe0170b7ae89C75d987263934A7D0cD64C1C5 on testnet
    const exOracle = await ExOracle.attach("0xb9FFe0170b7ae89C75d987263934A7D0cD64C1C5");
    return exOracle;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
