var tokenData = require("../test-helpers/OKExChainData.json");
const hre = require("hardhat");
const { BN } = require("@openzeppelin/test-helpers/src/setup");

const ONE_OKT = new BN(10).pow(new BN(18));
const USD_ORACLE_DECIMAL = new BN(10).pow(new BN(6));

const OKT_ADDRESS = "0x000000000000000000000000000000000000000E";

// TESTNET addresses
const TESTNET_ExOracleAddress = "0x319b07E94eA8288aC0c15b4A24d26577Bec05366";
const TESTNET_DataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
const TESTNET_TokenRegistry = "0xd6A0Cd3B50De132284aE3331E6bEa4d94e2B2ecf";
const TESTNET_Utils = "0xbc8dbC10EBe06629f781AA742f67f417A7604C7a";
const TESTNET_FINToken = tokenData.DeFiner.testnet.tokenAddress;

// MAINNET addresses
const MAINNET_ExOracleAddress = "0x319b07E94eA8288aC0c15b4A24d26577Bec05366";
const MAINNET_DataSource = "0x41f9950D778425D7B47619e0ad92117E1933918F";
const MAINNET_TokenRegistry = "0xd6A0Cd3B50De132284aE3331E6bEa4d94e2B2ecf";
const MAINNET_Utils = "0xbc8dbC10EBe06629f781AA742f67f417A7604C7a";
const MAINNET_FINToken = tokenData.DeFiner.mainnet.tokenAddress;

async function main() {
    const network = hre.network.name;
    console.log("Network:", network);
    console.log("Reading", network, "prices...");

    let exOracleAddr;
    let dataSourceAddr;
    let tokenRegistryAddr;
    let utilsAddr;
    let finTokenAddr;

    if (network == "testnet") {
        exOracleAddr = TESTNET_ExOracleAddress;
        dataSourceAddr = TESTNET_DataSource;
        tokenRegistryAddr = TESTNET_TokenRegistry;
        utilsAddr = TESTNET_Utils;
        finTokenAddr = TESTNET_FINToken;
    } else {
        exOracleAddr = MAINNET_ExOracleAddress;
        dataSourceAddr = MAINNET_DataSource;
        tokenRegistryAddr = MAINNET_TokenRegistry;
        utilsAddr = MAINNET_Utils;
        finTokenAddr = MAINNET_FINToken;
    }

    const TokenRegistry = await hre.ethers.getContractFactory("TokenRegistry", {
        libraries: { Utils: utilsAddr },
    });
    const tokenReg = await TokenRegistry.attach(tokenRegistryAddr);

    const exOracle = await hre.ethers.getContractAt(
        "contracts/oracle/ExOracle.sol:IExOraclePriceData",
        exOracleAddr
    );
    const result = await exOracle.getOffchain("OKT", dataSourceAddr);
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

    // OKT
    const oktPriceInOKT = await tokenReg.priceFromAddress(OKT_ADDRESS);
    const ethPriceInUSD = new BN(oktPriceInOKT.toString())
        .mul(oktPriceBN)
        .div(ONE_OKT)
        .div(USD_ORACLE_DECIMAL);
    console.log("OKT ", oktPriceInOKT.toString(), "OKT", " = $", ethPriceInUSD.toString());

    // FIN
    const finPriceInOKT = await tokenReg.priceFromAddress(finTokenAddr);
    const finPriceInUSD = new BN(finPriceInOKT.toString())
        .mul(oktPriceBN)
        .div(ONE_OKT)
        .div(USD_ORACLE_DECIMAL);
    console.log("FIN ", finPriceInOKT.toString(), "OKT", " = $", finPriceInUSD.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
