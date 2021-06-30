async function main() {
    const OKTPerLPToken = await ethers.getContractFactory("OKTPerLPToken");
    const oktPerLPToken = await OKTPerLPToken.deploy();
    console.log("OKTPerLPToken deployed:", oktPerLPToken.address);
    const price = await oktPerLPToken.latestAnswer();
    console.log("latestAnswer()", price.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
