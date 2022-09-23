import * as t from "../../types/truffle-contracts/index";

const claim: any = artifacts.require("Claim");

async function main() {
    await deployClaim();
    // await buildData();
}

async function deployClaim() {
    const claimContract = await claim.new();
    console.log("Claim contract Deployed at: ", claimContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
