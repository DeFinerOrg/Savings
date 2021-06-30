async function main() {
    const OKTPerLPToken = await ethers.getContractFactory("OKTPerLPToken");
    const oktPerLPToken = await OKTPerLPToken.deploy();
    console.log("OKTPerLPToken deployed:", oktPerLPToken.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
