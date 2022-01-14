import * as t from "../../types/truffle-contracts/index";

const FixedOracle: t.FixedOracleContract = artifacts.require("FixedOracle");

async function main() {
    const fixedOracle = await FixedOracle.new();
    console.log("Fixed Oracle:", fixedOracle.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
