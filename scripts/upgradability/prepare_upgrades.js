// Previously deployed libraries
let utilsPrev;
let savingLibPrev;
let accountTokenLibPrev;

// Proxy contracts to be upgraded
let savingAccountPrevProxy;
let accountsPrevProxy;
let bankPrevProxy;

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
