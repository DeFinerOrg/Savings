import * as t from "../../types/truffle-contracts";
const { BN } = require("@openzeppelin/test-helpers");
const MockERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockFixedPriceOracle: t.MockFixedPriceOracleContract =
    artifacts.require("MockFixedPriceOracle");

async function main() {
    console.log("deploy tokens..");
    const ONE_MATIC = new BN(10).pow(new BN(18));

    const quick = await MockERC20.new("QUICK", "QUICK", 18, 1_000_000);
    console.log("QUICK:", quick.address);
    const quickOracle = await MockFixedPriceOracle.new(ONE_MATIC);
    console.log("QUICK oracle:", quickOracle.address);

    const sushi = await MockERC20.new("SUSHI", "SUSHI", 18, 1_000_000);
    console.log("SUSHI:", sushi.address);
    const sushiOracle = await MockFixedPriceOracle.new(ONE_MATIC);
    console.log("SUSHI oracle:", sushiOracle.address);

    const crv = await MockERC20.new("CRV", "CRV", 18, 1_000_000);
    console.log("CRV:", crv.address);
    const crvOracle = await MockFixedPriceOracle.new(ONE_MATIC);
    console.log("CRV oracle:", crvOracle.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
