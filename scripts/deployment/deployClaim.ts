import * as t from "../../types/truffle-contracts/index";

var tokenData = require("../../test-helpers/tokenData.json");

const Claim: t.ClaimContract = artifacts.require("Claim");

let FINToken: string;

async function main() {
    FINToken = tokenData.DeFiner.mainnet.tokenAddess;
    await deployClaim();
    // await buildData();
}

async function deployClaim() {
    // await validateFINToken();

    const claimContract = await Claim.new(FINToken);
    console.log("Claim contract Deployed at: ", claimContract.address);
}

// async function validateFINToken() {}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
