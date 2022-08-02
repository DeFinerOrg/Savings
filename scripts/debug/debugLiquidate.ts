import * as t from "../../types/truffle-contracts/index";

const hre = require("hardhat");
const ethers = hre.ethers;

const BORROWER = "0x6652Eb7FD864D2Fc9319dE06b7536f1194860816";
const LIQUIDATOR = "0xfca782E34D89c66f6c0471173d295A8cbAc15cC5";

const ACCOUNTS = "0xc2fFfaBc279f2cc2BF0AbE939DB97339aD29bb31";
const SAVING_ACCOUNT = "0x7C6e294E6555cD70D02D53735C6860AD03A6b34F";
const BANK = "0x00F4D0a426C996BfECDD8A68f620B4c222a45C0a";
const PROXY_ADMIN = "0x8EF9773CBd2939aC8ACaf10BefC3E6eB612645DD";

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const FIN = "0x576c990a8a3e7217122e9973b2230a3be9678e94";
const MATIC = "0x000000000000000000000000000000000000000E";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const CRV = "0x172370d5Cd63279eFa6d502DAB29171933a610AF";

const PROXY_ADMIN_OWNER = "0x3c218f56Ca1284103D15df2620469fd58e0db00b";

const SavingAccount: any = artifacts.require("SavingAccount");
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const AccountTokenLib: any = artifacts.require("AccountTokenLib");
const Accounts: any = artifacts.require("Accounts");
const Bank: t.BankContract = artifacts.require("Bank");
const Utils: any = artifacts.require("Utils");
const SavingLib: any = artifacts.require("SavingLib");

async function main() {
    // setTimeout(0);
    console.log("Debug ...");

    await upgradeSavingAccountContract();
    // await upgradeAccountsContract();

    const sa = await SavingAccount.at(SAVING_ACCOUNT);
    const acc = await Accounts.at(ACCOUNTS);
    const bank = await Bank.at(BANK);

    /*
    const currentBlock = await web3.eth.getBlockNumber();
    const lastBlock = await acc.getLastDepositBlock(LIQUIDATOR, FIN);
    console.log("last deposit block:", lastBlock.toString());

    const currFINRate = await bank.depositFINRateIndex(FIN, currentBlock);
    const lastFINRate = await bank.depositFINRateIndex(FIN, lastBlock);

    console.log("current depositFINRateIndex:", currFINRate.toString());
    console.log("last depositFINRateIndex:", lastFINRate.toString());

    const bal = await acc.getDepositBalanceCurrent(FIN, LIQUIDATOR);
    console.log(bal.toString());
    */
    /*
    console.log("LIQUIDATOR...");
    const borrowETHLiq = await acc.getBorrowETH(LIQUIDATOR);
    console.log("borrowETHLiquidator:", borrowETHLiq.toString());

    const borrowPowerLiq = await acc.getBorrowPower(LIQUIDATOR);
    console.log("borrowPowerLiquidator:", borrowPowerLiq.toString());
*/
    console.log("BORROWER...");
    const isAccountLiquidatable = await acc.isAccountLiquidatable.call(BORROWER);
    console.log("isAccountLiquidatable(): ", isAccountLiquidatable);

    /*
    const depositETH = await acc.getDepositETH(BORROWER);
    console.log("depositETH:", depositETH.toString());

    const collateralETH = await acc.getCollateralETH(BORROWER);
    console.log("collateralETH:", collateralETH.toString());

    const borrowETH = await acc.getBorrowETH(BORROWER);
    console.log("borrowETH:", borrowETH.toString());

    console.log("user deposited assets...");

    console.log("user borrowed assets...");

    const result = await acc.accounts(BORROWER);
    console.log(result);
*/
    const borrowedToken = FIN;
    const collateralToken = USDT;

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [LIQUIDATOR],
    });
    let signer = await ethers.getSigner(LIQUIDATOR);
    const liquidateData = await sa.contract.methods
        .liquidate(BORROWER, borrowedToken, collateralToken)
        .encodeABI();

    let depositBalOfLiq = await acc.getDepositBalanceCurrent(borrowedToken, LIQUIDATOR);
    console.log("depositBalOfLiq:", depositBalOfLiq.toString());
    depositBalOfLiq = await acc.getDepositBalanceCurrent(collateralToken, LIQUIDATOR);
    console.log("depositBalOfLiq:", depositBalOfLiq.toString());

    let borrowBalOfBorr = await acc.getBorrowBalanceCurrent(borrowedToken, BORROWER);
    console.log("borrowBalOfBorr:", borrowBalOfBorr.toString());

    // liquidate
    await signer.sendTransaction({ to: SAVING_ACCOUNT, data: liquidateData });

    depositBalOfLiq = await acc.getDepositBalanceCurrent(borrowedToken, LIQUIDATOR);
    console.log("depositBalOfLiq:", depositBalOfLiq.toString());
    depositBalOfLiq = await acc.getDepositBalanceCurrent(collateralToken, LIQUIDATOR);
    console.log("depositBalOfLiq:", depositBalOfLiq.toString());

    borrowBalOfBorr = await acc.getBorrowBalanceCurrent(borrowedToken, BORROWER);
    console.log("borrowBalOfBorr:", borrowBalOfBorr.toString());
}

async function upgradeAccountsContract() {
    console.log("Upgrading Accounts contract...");
    const proxyAdmin = await ProxyAdmin.at(PROXY_ADMIN);

    // deploy new Accounts
    const atl = await AccountTokenLib.new();
    await Accounts.link(atl);
    const accounts = await Accounts.new();
    console.log("new Accounts:", accounts.address);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [PROXY_ADMIN_OWNER],
    });
    let signer = await ethers.getSigner(PROXY_ADMIN_OWNER);
    const upgradeData = await proxyAdmin.contract.methods
        .upgrade(ACCOUNTS, accounts.address)
        .encodeABI();
    await signer.sendTransaction({ to: PROXY_ADMIN, data: upgradeData });

    console.log("Upgrade done.");
}

async function upgradeSavingAccountContract() {
    console.log("Upgrading SavingAccounts contract...");

    const proxyAdmin = await ProxyAdmin.at(PROXY_ADMIN);

    // deploy libs
    const utils = await Utils.new();
    await SavingLib.link(utils);
    const savingLib = await SavingLib.new();

    await SavingAccount.link(utils);
    await SavingAccount.link(savingLib);
    const savingAcc = await SavingAccount.new();
    console.log("new SavingAccount:", savingAcc.address);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [PROXY_ADMIN_OWNER],
    });
    let signer = await ethers.getSigner(PROXY_ADMIN_OWNER);
    const upgradeData = await proxyAdmin.contract.methods
        .upgrade(SAVING_ACCOUNT, savingAcc.address)
        .encodeABI();
    await signer.sendTransaction({ to: PROXY_ADMIN, data: upgradeData });

    console.log("Upgrade done.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
