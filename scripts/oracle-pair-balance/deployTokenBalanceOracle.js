async function main() {
    // OKExChain mainnet addresses
    const WOKT = "0x8f8526dbfd6e38e3d8307702ca8469bae6c56c15";
    const KST = "0xab0d1578216a545532882e420a8c61ea07b00b12";
    const CHE = "0x8179d97eb6488860d816e3ecafe694a4153f216c";

    const WOKT_KST_PAIR_CONTRACT = "0xA25dA5A44A65Ee9bd4eA61F946CBcF15512fd52e";
    const WOKT_CHE_PAIR_CONTRACT = "0x8E68C0216562BCEA5523b27ec6B9B6e1cCcBbf88";

    await deployTokenBalOracle(WOKT, KST, WOKT_KST_PAIR_CONTRACT);
    await deployTokenBalOracle(WOKT, CHE, WOKT_CHE_PAIR_CONTRACT);
}

async function deployTokenBalOracle(priceInToken, priceForToken, pairContract) {
    const TokenPairBalanceOracle = await ethers.getContractFactory("TokenPairBalanceOracle");
    const oracle = await TokenPairBalanceOracle.deploy(priceInToken, priceForToken, pairContract);
    console.log("TokenPairBalanceOracle deployed:", oracle.address);
    const price = await oracle.latestAnswer();
    console.log("latestAnswer()", price.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
