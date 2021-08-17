// Previously deployed libraries
let utilsPrev;
let savingLibPrev;
let accountTokenLibPrev;

// Proxy contracts to be upgraded
let savingAccountPrevProxy;
let accountsPrevProxy;
let bankPrevProxy;

const DUMMY = "0x0000000000000000000000000000000000000010";

async function main() {
    let network = process.env.HARDHAT_NETWORK;

    if (network == "mainnet" || network == "mainnet-fork") {
        this.utils = "";
        this.savingLibPrev = "";
        this.accountTokenLibPrev = "";
        this.savingAccountPrevProxy = "";
        this.accountsPrevProxy = "";
        this.bankPrevProxy = "";
    } else if (network == "kovan" || network == "kovan-fork") {
        this.utils = "";
        this.savingLibPrev = "";
        this.accountTokenLibPrev = "";
        this.savingAccountPrevProxy = "";
        this.accountsPrevProxy = "";
        this.bankPrevProxy = "";
    } else if (network == "okex" || network == "okex-fork") {
        this.utils = "";
        this.savingLibPrev = "";
        this.accountTokenLibPrev = "";
        this.savingAccountPrevProxy = "";
        this.accountsPrevProxy = "";
        this.bankPrevProxy = "";
    }
    // =========================
    // Deploy SavingAccount V1.1
    // =========================
    /* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    Note:  The deployment part of this script is for local testing purposes only.
    It should be removed when upgrading on testnet/mainnet
    Use the address of the current deployments of UtilsV1._1, SavingLibV1_1, savingAccountV1_1Proxy instead
    */
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
    // SavingAccountV1_1 proxy
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

    // upgrade proxy
    const savingAccountLatestAddress = await upgrades.prepareUpgrade(
        savingAccountV1_1Proxy.address,
        SavingAccount,
        {
            unsafeAllow: ["external-library-linking"],
        }
    );
    console.log("savingAccountLatestAddress", savingAccountLatestAddress);
    const savingAccount = await SavingAccount.attach(savingAccountLatestAddress);

    // initialize FIN & COMP addresses after upgrade
    await savingAccount.initFINnCOMPAddresses();
    let FINAddr = await savingAccount.FIN_ADDR();
    let COMPAddr = await savingAccount.COMP_ADDR();
    console.log("FINAddr", FINAddr);
    console.log("COMPAddr", COMPAddr);

    // ====================
    // Deploy Accounts V1.1
    // ====================
    /* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    Note:  The deployment part of this script is for local testing purposes only.
    It should be removed when upgrading on testnet/mainnet
    Use the address of the current deployments of AccountTokenLibV1_1, accountsV1_1Proxy instead
    */
    const AccountTokenLibV1_1 = await ethers.getContractFactory("AccountTokenLibV1_1");
    const accountTokenLibV1_1 = await AccountTokenLibV1_1.deploy();

    const AccountsV1_1 = await ethers.getContractFactory("AccountsV1_1", {
        libraries: {
            AccountTokenLibV1_1: accountTokenLibV1_1.address,
        },
    });
    // Accounts v1.1 proxy
    const accountsV1_1Proxy = await upgrades.deployProxy(AccountsV1_1, [DUMMY], {
        initializer: "initialize",
        unsafeAllow: ["external-library-linking"],
    });

    // =====================
    // Upgrade Accounts V1.1
    // =====================
    const AccountTokenLib = await ethers.getContractFactory("AccountTokenLib");
    const accountTokenLib = await AccountTokenLib.deploy();

    const Accounts = await ethers.getContractFactory("Accounts", {
        libraries: { AccountTokenLib: accountTokenLib.address },
    });

    // upgrade proxy
    const AccountsLatestAddress = await upgrades.prepareUpgrade(
        accountsV1_1Proxy.address,
        Accounts,
        {
            unsafeAllow: ["external-library-linking"],
        }
    );
    console.log("AccountsLatestAddress", AccountsLatestAddress);

    // ====================
    // Deploy Bank V1.1
    // ====================
    /* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    Note:  The deployment part of this script is for local testing purposes only.
    It should be removed when upgrading on testnet/mainnet
    Use the address of the current deployments of BankV1_1, bankProxy instead
    */
    const BankV1_1 = await ethers.getContractFactory("BankV1_1");

    // Bank v1.1 proxy
    const bankProxy = await upgrades.deployProxy(BankV1_1, [DUMMY], {
        initializer: "initialize",
    });

    // =====================
    // Upgrade Bank V1.1
    // =====================
    const Bank = await ethers.getContractFactory("Bank");

    // upgrade proxy
    const BankLatestAddress = await upgrades.prepareUpgrade(bankProxy.address, Bank);
    console.log("BankLatestAddress", BankLatestAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
