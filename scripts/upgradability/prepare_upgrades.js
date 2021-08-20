// Proxy contracts to be upgraded
let savingAccountProxy;
let accountsProxy;
let bankProxy;

async function main() {
    let network = process.env.HARDHAT_NETWORK;

    if (network == "mainnet" || network == "mainnet-fork") {
        savingAccountProxy = "";
        accountsProxy = "";
        bankProxy = "";
    } else if (network == "kovan" || network == "kovan-fork") {
        savingAccountProxy = "";
        accountsProxy = "";
        bankProxy = "";
    } else if (network == "okex" || network == "okex-fork") {
        savingAccountProxy = "";
        accountsProxy = "";
        bankProxy = "";
    }

    await deployBankImpl();
    await deployAccountsImpl();
    await deploySavingAccountImpl();
}

/**
 * Deploy Accounts v1.2.0 implementation
 */
async function deployAccountsImpl() {
    const AccountTokenLib = await ethers.getContractFactory("AccountTokenLib");
    const accountTokenLib = await AccountTokenLib.deploy();
    console.log("AccountTokenLib: ", accountTokenLib.address);

    const Accounts = await ethers.getContractFactory("Accounts", {
        libraries: { AccountTokenLib: accountTokenLib.address },
    });

    const accounts_v_1_2_0_impl = await upgrades.prepareUpgrade(accountsProxy, Accounts, {
        unsafeAllow: ["external-library-linking"],
    });
    console.log("Accounts impl", accounts_v_1_2_0_impl);
    return accounts_v_1_2_0_impl;
}

/**
 * Deploy Bank v1.2.0 implementation
 */
async function deployBankImpl() {
    const Bank = await ethers.getContractFactory("Bank");

    const bank_v_1_2_0_impl = await upgrades.prepareUpgrade(bankProxy, Bank);
    console.log("Bank impl", bank_v_1_2_0_impl);
    return bank_v_1_2_0_impl;
}

/**
 * Deploy SavingAccount v1.2.0 implementation
 */
async function deploySavingAccountImpl() {
    const Utils = await ethers.getContractFactory("Utils");
    const utils = await Utils.deploy();
    console.log("Utils: ", utils.address);

    const SavingLib = await ethers.getContractFactory("SavingLib", {
        libraries: { Utils: utils.address },
    });
    const savingLib = await SavingLib.deploy();
    console.log("SavingLib: ", savingLib.address);

    const SavingAccount = await ethers.getContractFactory("SavingAccount", {
        libraries: { SavingLib: savingLib.address, Utils: utils.address },
    });

    const savingAccount_v_1_2_0_impl = await upgrades.prepareUpgrade(
        savingAccountProxy,
        SavingAccount,
        { unsafeAllow: ["external-library-linking"] }
    );
    console.log("SavingAccount impl: ", savingAccount_v_1_2_0_impl);
    const savingAccount = await SavingAccount.attach(savingAccount_v_1_2_0_impl);

    // To avoid unauthorized initialization,
    // initialize and pass dummy values to new implementation
    await savingAccount.init();
    return savingAccount_v_1_2_0_impl;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
