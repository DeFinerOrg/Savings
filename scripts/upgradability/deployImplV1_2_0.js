const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * DEPLOY v1.2.0 implementation contracts
 */
async function main() {
    await deployAccountsImpl();
    await deployBankImpl();
    await deploySavingAccountImpl();
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

    const savingAccount = await SavingAccount.deploy();
    await savingAccount.initialize([], [], ZERO_ADDRESS);
    console.log("SavingAccount impl: ", savingAccount.address);

    console.log(await savingAccount.FIN_ADDR());
    console.log(await savingAccount.COMP_ADDR());

    return savingAccount.address;
}

/**
 * Deploy Bank v1.2.0 implementation
 */
async function deployBankImpl() {
    const Bank = await ethers.getContractFactory("Bank");
    const bank = await Bank.deploy();
    await bank.initialize(ZERO_ADDRESS);

    console.log("Bank impl: ", bank.address);
    return bank.address;
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

    const account = await Accounts.deploy();
    await account.initialize(ZERO_ADDRESS);

    console.log("Accounts impl: ", account.address);
    return account.address;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
