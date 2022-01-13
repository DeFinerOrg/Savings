import * as t from "../../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
const oracleData = require("./maticOracle.json");
const ToMaticOracle: t.ToMaticOracleContract = artifacts.require("ToMaticOracle");


async function main() {
    // const pairName = "DAT/MATIC";
    // DAI/ETH
    // const tokenPriceOracle = "0xFC539A559e170f848323e19dfD66007520510085";
    // MATIC/ETH
    // const maticPriceOracle = "0x327e23A4855b6F663a28c5161541d69Af8973302";
    // const oracle = await ToMaticOracle.new(pairName, tokenPriceOracle, maticPriceOracle);    
    // console.log("price:", await oracle.latestAnswer());

    for (let i = 0; i < oracleData.oracles.length; i++) {
        const o = oracleData.oracles[i];
        const oralceContract = await ToMaticOracle.new(
            o.targetPairName,
            o.tokenPairName,
            o.tokenPriceOracle,
            o.maticPairName,
            o.maticPriceOracle
        );
        console.log("pair:", o.targetPairName, oralceContract.address);
        console.log("rate:", (await oralceContract.latestAnswer()).toString());
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
