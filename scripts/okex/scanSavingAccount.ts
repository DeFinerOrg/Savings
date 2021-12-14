import * as t from "../../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const Accounts: t.AccountsContract = artifacts.require("Accounts");
const Bank: t.BankContract = artifacts.require("Bank");

const SAVING_ACCOUNT = "0xF3c87c005B04a07Dc014e1245f4Cff7A77b6697b";
const ACCOUNTS = "0x463D9f224F41086ead0e5cBb8c59d33a3853Eab4";
const BANK = "0x74d667CEb5aF9AFd99a9cCCbF8A9E91D9953Dd32";

const OKB = "0xdf54b6c6195ea4d948d03bfd818d365cf175cfc2"; // 18
const USDT = "0x382bb369d343125bfb2117af9c149795c6c65c50"; // 18
const BTCK = "0x54e4622dc504176b3bb432dccaf504569699a7ff"; // 18
const ETHK = "0xef71ca2ee68f45b9ad6f72fbdb33d707b872315c"; // 18
const OKT = "0x000000000000000000000000000000000000000e"; // 18
const CHE = "0x8179D97Eb6488860d816e3EcAFE694a4153F216c"; // 18
const FIN = "0x8d3573f24c0aa3819a2f5b02b2985dd82b487715"; // 18
const FIN_LP = "0x2be36b6d2153444061e66f43f151ae8d9af7f93c"; // 18

const eighteenPrecision = new BN(10).pow(new BN(18));


async function main() {
    // await scanSavingAccount();
    await depositsAndBorrows();
    // await scanBank();
}

/*async function scanBank() {
    const bank: t.BankInstance = await Bank.at(BANK);

    let fromBlock = 5185260;
    let targetBlock = await web3.eth.getBlockNumber();

    let batchSize = 2000;
    while (fromBlock < targetBlock) {
        let toBlock = fromBlock + batchSize;
        console.log(fromBlock, toBlock);

        // all events
        await bank
            .getPastEvents("UpdateIndex", { fromBlock: fromBlock, toBlock: toBlock })
            .then(function (events) {
                events.forEach((e) => {
                    if (e.returnValues.token === CHE) {
                        const tokenName = "\x1b[31mCHE";
                        const dri = e.returnValues.depositeRateIndex;
                        const bri = e.returnValues.borrowRateIndex;
                        console.log(e.blockNumber, e.event, tokenName, dri, bri);
                    } else {
                        // ignore other tokens
                    }
                });
            });
        fromBlock = fromBlock + batchSize + 1;
        const blockDiff = targetBlock - fromBlock;

        if (blockDiff < 2000) {
            batchSize = blockDiff;
        }
    }
}*/

async function depositsAndBorrows() {
    const currBlockNumber = await ethers.provider.getBlockNumber();
    console.log(currBlockNumber);

    const accounts: t.AccountsInstance = await Accounts.at(ACCOUNTS);
    const addresses: any = require("./userAddresses.json");

    console.log("addressesLength", addresses.length);
    console.log("addr:", addresses[0]);
    

    let fromBlock = 7447771;
    let targetBlock = 7447773; // 7489979
    console.log("fromBlock", fromBlock, "targetBlock", targetBlock);
    let batchSize = 1;
    let toBlock = 0;

    for (let i = 0; i < addresses.length; i++) {
        const user = addresses[i];
        const depositBalanceOKB = BN(await accounts.getDepositBalanceCurrent(OKB,user)).div(eighteenPrecision);
        // const borrow = await addresses.getBorrowBalanceCurrent(CHE, e);
        console.log(user, depositBalanceOKB.toString());
    }

    const depositBalanceOKB = BN(await accounts.getDepositBalanceCurrent(OKB,"0xb4CcaA030102713b96de6F6DEBaf9751c47BB78f")).div(eighteenPrecision);
    console.log(depositBalanceOKB.toString());

    // await Promise.all(addresses.map(async (user:string) => {
    //     // ----------- Deposits -----------
    //     const depositBalanceOKB = BN(await accounts.getDepositBalanceCurrent(OKB,user)).div(eighteenPrecision);
    //     const depositBalanceUSDT = await accounts.getDepositBalanceCurrent(USDT,user);
    //     const depositBalanceBTCK = await accounts.getDepositBalanceCurrent(BTCK,user);
    //     const depositBalanceETHK = await accounts.getDepositBalanceCurrent(ETHK,user);
    //     const depositBalanceOKT = await accounts.getDepositBalanceCurrent(OKT,user);
    //     const depositBalanceCHE = await accounts.getDepositBalanceCurrent(CHE,user);
    //     const depositBalanceFIN = await accounts.getDepositBalanceCurrent(FIN,user);
    //     const depositBalanceFIN_LP = await accounts.getDepositBalanceCurrent(FIN_LP,user);
    
    //     // ----------- Borrows -----------
    //     const borrowBalanceOKB = await accounts.getBorrowBalanceCurrent(OKB,user);
    //     const borrowBalanceUSDT = await accounts.getBorrowBalanceCurrent(USDT,user);
    //     const borrowBalanceBTCK = await accounts.getBorrowBalanceCurrent(BTCK,user);
    //     const borrowBalanceETHK = await accounts.getBorrowBalanceCurrent(ETHK,user);
    //     const borrowBalanceOKT = await accounts.getBorrowBalanceCurrent(OKT,user);
    //     const borrowBalanceCHE = await accounts.getBorrowBalanceCurrent(CHE,user);
    //     const borrowBalanceFIN = await accounts.getBorrowBalanceCurrent(FIN,user);
    //     const borrowBalanceFIN_LP = await accounts.getBorrowBalanceCurrent(FIN_LP,user);
    
    //     console.log("user", user);
    //     console.log(user,depositBalanceOKB.toString());
    //     // console.log("depositBalanceUSDT",depositBalanceUSDT.toString());
    //     // console.log("depositBalanceBTCK",depositBalanceBTCK.toString());
    //     // console.log("depositBalanceETHK",depositBalanceETHK.toString());
    //     // console.log("depositBalanceOKT",depositBalanceOKT.toString());
    //     // console.log("depositBalanceCHE",depositBalanceCHE.toString());
    //     // console.log("depositBalanceFIN",depositBalanceFIN.toString());
    //     // console.log("depositBalanceFIN_LP",depositBalanceFIN_LP.toString());
    // }));

    // while (true) {
    //     if (fromBlock + batchSize > targetBlock) {
    //         toBlock = targetBlock;
    //     } else {
    //         toBlock = fromBlock + batchSize;
    //     }
    //     console.log(fromBlock, toBlock);

    // await accounts
    //     .getPastEvents("allEvents", { fromBlock: fromBlock, toBlock: toBlock })
    //     .then(function (events) {
    //         events.forEach(async(e) => {
    //     await Promise.all(addresses.map(async (user:string) => {
    //         // ----------- Deposits -----------
    //         const depositBalanceOKB = BN(await accounts.getDepositBalanceCurrent(OKB,user)).div(eighteenPrecision);
    //         const depositBalanceUSDT = await accounts.getDepositBalanceCurrent(USDT,user);
    //         const depositBalanceBTCK = await accounts.getDepositBalanceCurrent(BTCK,user);
    //         const depositBalanceETHK = await accounts.getDepositBalanceCurrent(ETHK,user);
    //         const depositBalanceOKT = await accounts.getDepositBalanceCurrent(OKT,user);
    //         const depositBalanceCHE = await accounts.getDepositBalanceCurrent(CHE,user);
    //         const depositBalanceFIN = await accounts.getDepositBalanceCurrent(FIN,user);
    //         const depositBalanceFIN_LP = await accounts.getDepositBalanceCurrent(FIN_LP,user);

    //         // ----------- Borrows -----------
    //         const borrowBalanceOKB = await accounts.getBorrowBalanceCurrent(OKB,user);
    //         const borrowBalanceUSDT = await accounts.getBorrowBalanceCurrent(USDT,user);
    //         const borrowBalanceBTCK = await accounts.getBorrowBalanceCurrent(BTCK,user);
    //         const borrowBalanceETHK = await accounts.getBorrowBalanceCurrent(ETHK,user);
    //         const borrowBalanceOKT = await accounts.getBorrowBalanceCurrent(OKT,user);
    //         const borrowBalanceCHE = await accounts.getBorrowBalanceCurrent(CHE,user);
    //         const borrowBalanceFIN = await accounts.getBorrowBalanceCurrent(FIN,user);
    //         const borrowBalanceFIN_LP = await accounts.getBorrowBalanceCurrent(FIN_LP,user);

    //         console.log("user", user);
    //         console.log(user,depositBalanceOKB.toString());
    //         // console.log("depositBalanceUSDT",depositBalanceUSDT.toString());
    //         // console.log("depositBalanceBTCK",depositBalanceBTCK.toString());
    //         // console.log("depositBalanceETHK",depositBalanceETHK.toString());
    //         // console.log("depositBalanceOKT",depositBalanceOKT.toString());
    //         // console.log("depositBalanceCHE",depositBalanceCHE.toString());
    //         // console.log("depositBalanceFIN",depositBalanceFIN.toString());
    //         // console.log("depositBalanceFIN_LP",depositBalanceFIN_LP.toString());
    //     }));
    // });
    
    // if (fromBlock >= targetBlock) break;
    // fromBlock = toBlock + 1;
}

async function scanSavingAccount() {
    const sav: t.SavingAccountInstance = await SavingAccount.at(SAVING_ACCOUNT);
    const accounts: t.AccountsInstance = await Accounts.at(ACCOUNTS);

    let uniqueAddrs = new Set<string>();
    let repayTotal: BN = new BN(0);
    console.log("block  from    event   token   amount  amtInHumanReadable");
    //CHE added to TokenRegistry 4766916
    let fromBlock = 7440000;
    let targetBlock = 7450000; // 7489979
    console.log("fromBlock", fromBlock, "targetBlock", targetBlock);
    let batchSize = 100;
    let toBlock = 0;

    while (true) {
        if (fromBlock + batchSize > targetBlock) {
            toBlock = targetBlock;
        } else {
            toBlock = fromBlock + batchSize;
        }
        console.log(fromBlock, toBlock);

        // all events
        await sav
            .getPastEvents("allEvents", { fromBlock: fromBlock, toBlock: toBlock })
            .then(function (events) {
                events.forEach(async(e) => {
                    // if (e.returnValues.token === CHE) {
                    //     const tokenName = "CHE";
                    //     const amt = e.returnValues.amount;
                    //     const hrAmt = amt / 10 ** 18; // human redable amt
                    //     const from = e.returnValues.from;
                    //     console.log(e.blockNumber, from, e.event, tokenName, amt, hrAmt);
                    //     uniqueAddrs.add(from);
                    // } else {
                    //     // ignore other tokens
                    // }
                    
                        const user = e.returnValues.from;

                        // ----------- Deposits -----------
                        const depositBalanceOKB = BN(await accounts.getDepositBalanceCurrent(OKB,user)).div(eighteenPrecision).toString();
                        const depositBalanceUSDT = BN(await accounts.getDepositBalanceCurrent(USDT,user)).div(eighteenPrecision).toString();
                        const depositBalanceBTCK = BN(await accounts.getDepositBalanceCurrent(BTCK,user)).div(eighteenPrecision).toString();
                        const depositBalanceETHK = BN(await accounts.getDepositBalanceCurrent(ETHK,user)).div(eighteenPrecision).toString();
                        const depositBalanceOKT = BN(await accounts.getDepositBalanceCurrent(OKT,user)).div(eighteenPrecision).toString();
                        const depositBalanceCHE = BN(await accounts.getDepositBalanceCurrent(CHE,user)).div(eighteenPrecision).toString();
                        const depositBalanceFIN = BN(await accounts.getDepositBalanceCurrent(FIN,user)).div(eighteenPrecision).toString();
                        const depositBalanceFIN_LP = BN(await accounts.getDepositBalanceCurrent(FIN_LP,user)).div(eighteenPrecision).toString();

                        // ----------- Borrows -----------
                        const borrowBalanceOKB = BN(await accounts.getBorrowBalanceCurrent(OKB,user)).div(eighteenPrecision).toString();
                        const borrowBalanceUSDT = BN(await accounts.getBorrowBalanceCurrent(USDT,user)).div(eighteenPrecision).toString();
                        const borrowBalanceBTCK = BN(await accounts.getBorrowBalanceCurrent(BTCK,user)).div(eighteenPrecision).toString();
                        const borrowBalanceETHK = BN(await accounts.getBorrowBalanceCurrent(ETHK,user)).div(eighteenPrecision).toString();
                        const borrowBalanceOKT = BN(await accounts.getBorrowBalanceCurrent(OKT,user)).div(eighteenPrecision).toString();
                        const borrowBalanceCHE = BN(await accounts.getBorrowBalanceCurrent(CHE,user)).div(eighteenPrecision).toString();
                        const borrowBalanceFIN = BN(await accounts.getBorrowBalanceCurrent(FIN,user)).div(eighteenPrecision).toString();
                        const borrowBalanceFIN_LP = BN(await accounts.getBorrowBalanceCurrent(FIN_LP,user)).div(eighteenPrecision).toString();

                        // const amt = e.returnValues.amount;
                        // const hrAmt = amt / 10 ** 18; // human redable amt
                        // const depositBal = await acc.getDepositBalanceCurrent(e.returnValues.token,from);
                        console.log(
                            e.blockNumber, 
                            user, 
                            depositBalanceOKB, 
                            depositBalanceUSDT, 
                            depositBalanceBTCK, 
                            depositBalanceETHK,
                            depositBalanceOKT,
                            depositBalanceCHE,
                            depositBalanceFIN,
                            depositBalanceFIN_LP,
                            borrowBalanceOKB,
                            borrowBalanceUSDT,
                            borrowBalanceBTCK,
                            borrowBalanceETHK,
                            borrowBalanceOKT,
                            borrowBalanceCHE,
                            borrowBalanceFIN,
                            borrowBalanceFIN_LP
                        );
                        // uniqueAddrs.add(from);
                });
            });
        
        if (fromBlock >= targetBlock) break;
        fromBlock = toBlock + 1;
    }
    console.log("Unique addresses are...");
    console.log(uniqueAddrs);

    /*
    console.log("Current CHE balance for these unique addresses....");
    console.log("address    deposits    borrow");

    const arr = Array.from(uniqueAddrs.values());
    for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        const deposits = await acc.getDepositBalanceCurrent(CHE, e);
        const borrow = await acc.getBorrowBalanceCurrent(CHE, e);
        console.log(e, deposits.toString(), borrow.toString());
    }

    // Jason
    console.log("JASON...");
    const e = "0xd75036d216eb5E018057dBB31bA5e76cd561E987";
    const deposits = await acc.getDepositBalanceCurrent(CHE, e);
    const borrow = await acc.getBorrowBalanceCurrent(CHE, e);
    console.log(e, deposits.toString(), borrow.toString());
    */
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
