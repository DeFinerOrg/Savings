let exOracleAddress;
let dataSource;

async function main() {
    // await loadExOracleTestnetContracts();
    await loadExOracleMainnetContracts();

    let exOracleTPT;
    // exOracleTPT = await deployOracle();
    // Set TPT price $0.02
    // await exOracleTPT.setTPTPriceInUSD(20000);

    exOracleTPT = await readOracle();

    console.log("ExOracleTPT deployed to:", exOracleTPT.address);
    console.log("PairName:", await exOracleTPT.pairName());
    console.log("PriceType:", await exOracleTPT.priceType());
    console.log("TPT price in OKT:", (await exOracleTPT.latestAnswer()).toString());
    console.log("TPT price in USD:", (await exOracleTPT.tptPriceInUSD()).toString());
}

async function loadExOracleTestnetContracts() {
    exOracleAddress = "0x319b07E94eA8288aC0c15b4A24d26577Bec05366";
    dataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
}

async function loadExOracleMainnetContracts() {
    exOracleAddress = "0x31b820da47b4ebad81f653fdf32952d1bc1bc469";
    dataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
}

async function deployOracle() {
    // We get the contract to deploy
    const ExOracleTPT = await ethers.getContractFactory("ExOracleTPT");
    const exOracleTPT = await ExOracleTPT.deploy(exOracleAddress, dataSource);
    return exOracleTPT;
}

async function readOracle() {
    // We get the contract to deploy
    const ExOracleTPT = await ethers.getContractFactory("ExOracleTPT");
    // DeFiner ExOracle Deployed 0xeAFcc445B1e635Fb278f30DE996d7e2aE3dBceBa on mainnet
    const exOracleTPT = await ExOracleTPT.attach("0xeAFcc445B1e635Fb278f30DE996d7e2aE3dBceBa");
    return exOracleTPT;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
