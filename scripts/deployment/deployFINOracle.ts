import * as t from "../../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
const FixedPriceOracleFinContract: t.FixedPriceOracleFinContract =
    artifacts.require("FixedPriceOracleFIN");
const FINToken: t.FinTokenContract = artifacts.require("FINToken");

const CHAINLINK_MATIC_USD = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";
const FIN_PRICE_USD_8_DECIMALS = "20000000";

async function main() {
    await deploy();

    // await deployFINToken();

    // await read();
}

async function deployFINToken() {
    const finToken = await FINToken.new();
    console.log("FINToken: ", finToken.address);
}

async function deploy() {
    const finOracle = await FixedPriceOracleFinContract.new(CHAINLINK_MATIC_USD);
    console.log("FIN Oracle[", finOracle.address, "]");
    // setting $0.2 FIN price per token
    await finOracle.setFINPriceInUSD(FIN_PRICE_USD_8_DECIMALS);
    console.log("Rate:", (await finOracle.latestAnswer()).toString());
}

async function read() {
    const finOracle = await FixedPriceOracleFinContract.at(
        "0x27B938EAB0b3097447D9c87550452da112055441"
    );
    console.log("FIN Oracle[", finOracle.address, "]");
    console.log("USD rate in contract:", (await finOracle.finPriceInUSD()).toString());
    console.log("Rate:", (await finOracle.latestAnswer()).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
