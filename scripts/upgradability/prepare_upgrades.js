async function main() {
    const DUMMY = "0x0000000000000000000000000000000000000010";
    // =========================
    // Deploy SavingAccount V1.1
    // =========================
    const UtilsV1_1 = await ethers.getContractFactory("UtilsV1_1");
    const utilsV1_1 = await UtilsV1_1.deploy();
    console.log("-------------------- utilsV1_1 ---------------------", utilsV1_1.address);

    const SavingLibV1_1 = await ethers.getContractFactory("SavingLibV1_1", {
        libraries: {
            UtilsV1_1: utilsV1_1.address,
        },
    });
    const savingLibV1_1 = await SavingLibV1_1.deploy();
    console.log(
        "---------------------- savingLibV1_1 -----------------------",
        savingLibV1_1.address
    );

    const SavingAccountV1_1 = await ethers.getContractFactory("SavingAccountV1_1", {
        libraries: { SavingLibV1_1: savingLibV1_1.address, UtilsV1_1: utilsV1_1.address },
    });
    const savingAccountV1_1Proxy = await upgrades.deployProxy(SavingAccountV1_1, [[], [], DUMMY], {
        initializer: "initialize",
        unsafeAllow: ["external-library-linking"],
    });
    console.log(
        "-------------------- SavingAccountV1_1 ---------------------",
        savingAccountV1_1Proxy.address
    );

    // ==========================
    // Upgrade SavingAccount V1.1
    // ==========================
    const Utils = await ethers.getContractFactory("Utils");
    const utils = await Utils.deploy();

    const SavingLib = await ethers.getContractFactory("SavingLib", {
        libraries: {
            Utils: utils.address,
        },
    });
    const savingLib = await SavingLib.deploy();

    const SavingAccount = await ethers.getContractFactory("SavingAccount", {
        libraries: { SavingLib: savingLib.address, Utils: utils.address },
    });

    const savingAccountLatestAddress = await upgrades.prepareUpgrade(
        savingAccountV1_1Proxy.address,
        SavingAccount,
        {
            unsafeAllow: ["external-library-linking"],
        }
    );
    const savingAccount = await SavingAccount.attach(savingAccountLatestAddress);
    console.log("savingAccountLatestAddress", savingAccountLatestAddress);

    // initialize FIN & COMP addresses after upgrade
    await savingAccount.initFINnCOMPAddresses();
    let FINAddr = await savingAccount.FIN_ADDR();
    let COMPAddr = await savingAccount.COMP_ADDR();
    console.log("FINAddr", FINAddr);
    console.log("COMPAddr", COMPAddr);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
