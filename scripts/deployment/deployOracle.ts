import * as t from "../../types/truffle-contracts";
const oracleData = require("./maticOracle.json");
// const deployData = require("../../deployData.json");
// import JSONPath = require("JSONPath");
import { network } from "hardhat";
const ToMaticOracle: t.ToMaticOracleContract = artifacts.require("ToMaticOracle");

async function main() {
    // const pairName = "DAT/MATIC";
    // DAI/ETH
    // const tokenPriceOracle = "0xFC539A559e170f848323e19dfD66007520510085";
    // MATIC/ETH
    // const maticPriceOracle = "0x327e23A4855b6F663a28c5161541d69Af8973302";
    // const oracle = await ToMaticOracle.new(pairName, tokenPriceOracle, maticPriceOracle);
    // console.log("price:", await oracle.latestAnswer());

    // console.log(network.name);
    // const oraclesPath = "$." + network.name + ".oracles";

    const oracles = oracleData.polygon_testnet.oracles;
    // console.log(oracles);

    for (let i = 0; i < oracles.length; i++) {
        const o = oracles[i];

        const oralceContract = await ToMaticOracle.new(
            o.targetPairName,
            o.tokenPairName,
            o.tokenPriceOracle,
            o.maticPairName,
            o.maticPriceOracle
        );
        console.log("pair:", o.targetPairName, oralceContract.address);
        // console.log("rate:", (await oralceContract.latestAnswer()).toString());
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
