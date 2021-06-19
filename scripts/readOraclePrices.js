var tokenData = require("../test-helpers/OKExChainData.json");
const hre = require("hardhat");
const { BN } = require("@openzeppelin/test-helpers/src/setup");

const ONE_OKT = new BN(10).pow(new BN(18));
const USD_ORACLE_DECIMAL = new BN(10).pow(new BN(6));

const ETH_ADDRESS = "0x000000000000000000000000000000000000000E";

// TESTNET addresses
const TESTNET_ExOracleAddress = "0x319b07E94eA8288aC0c15b4A24d26577Bec05366";
const TESTNET_DataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
const TESTNET_TokenRegistry = "0x276a49520e3e062d26E63d50AD9bFBfE827E22BB";
const TESTNET_Utils = "0x9721238e27DE6e7FC527675887F49812c6363cba";

async function main() {
    console.log("Reading testnet prices...");
    const TokenRegistry = await hre.ethers.getContractFactory("TokenRegistry", {
        libraries: { Utils: TESTNET_Utils },
    });
    const tokenReg = await TokenRegistry.attach(TESTNET_TokenRegistry);

    const exOracle = await hre.ethers.getContractAt(
        "contracts/oracle/ExOracle.sol:IExOraclePriceData",
        TESTNET_ExOracleAddress
    );
    const result = await exOracle.getOffchain("OKT", TESTNET_DataSource);
    const oktPrice = result[0];
    const oktPriceBN = new BN(oktPrice.toString());
    console.log("OKT Price: $", oktPriceBN.div(USD_ORACLE_DECIMAL).toString());

    const tokens = tokenData.tokens;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const price = await tokenReg.priceFromAddress(token.kovan.tokenAddress);
        const priceInUSD = new BN(price.toString())
            .mul(oktPriceBN)
            .div(ONE_OKT)
            .div(USD_ORACLE_DECIMAL);
        console.log(token.symbol, " ", price.toString(), "OKT", " = $", priceInUSD.toString());
    }

    const price = await tokenReg.priceFromAddress(ETH_ADDRESS);
    const priceInUSD = new BN(price.toString())
        .mul(oktPriceBN)
        .div(ONE_OKT)
        .div(USD_ORACLE_DECIMAL);
    console.log("OKT ", price.toString(), "OKT", " = $", priceInUSD.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
