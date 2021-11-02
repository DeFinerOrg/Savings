import * as t from "../types/truffle-contracts/index";
import BN from "bn.js";

const SAVING_ACCOUNT = "0xF3c87c005B04a07Dc014e1245f4Cff7A77b6697b";
const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");

const CLAIM: string = "0x4e71d92d";
const WITHDRAWALL: string = "0xfa09e630"; // address
const BORROW: string = "0x4b8a3529"; // address, uint256
const DEPOSIT: string = "0x47e7ef24"; // address, uint256
const REPAY: string = "0x22867d78"; // address, uint256
const WITHDRAW: string = "0xf3fef3a3"; // address, uint256
const LIQUIDATE: string = "0xca5ce2ec"; // address, address, address
const PAUSE: string = "0x8456cb59";
const UNPAUSE: string = "0x3f4ba83a";
const TRANSFER: string = "0xbeabacc8"; // address, adress, uint256

async function main(): Promise<void> {
    console.log("fetching transactions...");

    // contract deployed 3674866

    await getTransactionsByAccount(SAVING_ACCOUNT, new BN("3674866"), new BN("6319957"));
    // await getTxInput("0xfa09e630000000000000000000000000000000000000000000000000000000000000000e");
    // await getTxInput("0x4e71d92d");
}

async function getTransactionsByAccount(myaccount: string, fromBlock: BN, targetBlock: BN) {
    const savingAccount = await SavingAccount.at(SAVING_ACCOUNT);
    let batchSize = new BN(2000);

    while (fromBlock.lte(targetBlock)) {
        const toBlock = fromBlock.add(batchSize);
        console.log("fromBlock:", fromBlock.toString(), " toBlock:", toBlock.toString());
        await savingAccount
            .getPastEvents("allEvents", { fromBlock: fromBlock, toBlock: toBlock })
            .then((events) => {
                events.forEach(async (e) => {
                    // console.log(e.blockNumber, e.transactionHash);
                    let tx = await web3.eth.getTransaction(e.transactionHash);
                    let txBlock = await web3.eth.getBlock(tx.blockNumber);
                    let getTx = await getTxInput(tx.input);

                    if (
                        getTx[0] == "Borrow" ||
                        getTx[0] == "Deposit" ||
                        getTx[0] == "Repay" ||
                        getTx[0] == "Withdraw"
                    ) {
                        let tokenSymbol = await getTokenSymbol(getTx[1]);
                        console.log(
                            tx.blockNumber,
                            getTx[0], // Method type (deposit/withdraw/...etc)
                            tx.hash,
                            tx.from,
                            tx.to,
                            tx.gas,
                            tx.gasPrice,
                            tx.value,
                            tx.input,
                            txBlock.timestamp,
                            tokenSymbol,
                            getTx[2] // Amount
                        );
                    } else if (getTx[0] == "WithdrawAll") {
                        let tokenSymbol = await getTokenSymbol(getTx[1]);
                        console.log(
                            tx.blockNumber,
                            getTx[0], // Method type (deposit/withdraw/...etc)
                            tx.hash,
                            tx.from,
                            tx.to,
                            tx.gas,
                            tx.gasPrice,
                            tx.value,
                            tx.input,
                            txBlock.timestamp,
                            tokenSymbol
                        );
                    } else if (getTx[0] == "Liquidate") {
                        let borrowedToken = await getTokenSymbol(getTx[2]);
                        let collateralToken = await getTokenSymbol(getTx[3]);
                        console.log(
                            tx.blockNumber,
                            getTx[0], // Method type (deposit/withdraw/...etc)
                            tx.hash,
                            tx.from,
                            tx.to,
                            tx.gas,
                            tx.gasPrice,
                            tx.value,
                            tx.input,
                            txBlock.timestamp,
                            borrowedToken,
                            collateralToken
                        );
                    } else if (getTx[0] == "Transfer") {
                        let tokenSymbol = await getTokenSymbol(getTx[2]);
                        console.log(
                            tx.blockNumber,
                            getTx[0], // Method type (deposit/withdraw/...etc)
                            tx.hash,
                            tx.from,
                            tx.to,
                            tx.gas,
                            tx.gasPrice,
                            tx.value,
                            tx.input,
                            txBlock.timestamp,
                            tokenSymbol,
                            getTx[3] // Amount
                        );
                    } else if (
                        getTx[0] == "Claim" ||
                        getTx[0] == "Pause" ||
                        getTx[0] == "Unpause"
                    ) {
                        console.log(
                            tx.blockNumber,
                            getTx[0], // Method type (deposit/withdraw/...etc)
                            tx.hash,
                            tx.from,
                            tx.to,
                            tx.gas,
                            tx.gasPrice,
                            tx.value,
                            tx.input,
                            txBlock.timestamp
                        );
                    }
                });
            });
        fromBlock = fromBlock.add(batchSize).add(new BN(1));
        const blockDiff = targetBlock.sub(fromBlock);

        if (blockDiff.lte(batchSize)) {
            batchSize = blockDiff;
        }
    }
}

async function getTxInput(txInput: string) {
    var result: string[] = [];
    let txType: string = txInput.substring(0, 10);
    let strippedStr: string = txInput.substring(10);
    let finalStr: string = "0x" + strippedStr;

    if (txType == CLAIM) {
        result.push("Claim");
    } else if (txType == PAUSE) {
        result.push("Pause");
    } else if (txType == UNPAUSE) {
        result.push("Unpause");
    } else if (txType == WITHDRAWALL) {
        let txData = await web3.eth.abi.decodeParameters(["address"], finalStr);
        result.push("WithdrawAll", txData[0]);
    } else if (txType == BORROW) {
        let txData = await web3.eth.abi.decodeParameters(["address", "uint256"], finalStr);
        result.push("Borrow", txData[0], txData[1]);
    } else if (txType == DEPOSIT) {
        let txData = await web3.eth.abi.decodeParameters(["address", "uint256"], finalStr);
        result.push("Deposit", txData[0], txData[1]);
    } else if (txType == REPAY) {
        let txData = await web3.eth.abi.decodeParameters(["address", "uint256"], finalStr);
        result.push("Repay", txData[0], txData[1]);
    } else if (txType == WITHDRAW) {
        let txData = await web3.eth.abi.decodeParameters(["address", "uint256"], finalStr);
        result.push("Withdraw", txData[0], txData[1]);
    } else if (txType == LIQUIDATE) {
        let txData = await web3.eth.abi.decodeParameters(
            ["address", "address", "address"],
            finalStr
        );
        result.push("Liquidate", txData[0], txData[1], txData[2]);
    } else if (txType == TRANSFER) {
        let txData = await web3.eth.abi.decodeParameters(
            ["address", "address", "uint256"],
            finalStr
        );
        result.push("Transfer", txData[0], txData[1], txData[2]);
    }

    return result;
}

async function getTokenSymbol(tokenAddr: string) {
    if (tokenAddr == "0xdF54B6c6195EA4d948D03bfD818D365cf175cFC2") {
        return "OKB";
    } else if (tokenAddr == "0x382bB369d343125BfB2117af9c149795C6C65C50") {
        return "USDT";
    } else if (tokenAddr == "0x54e4622DC504176b3BB432dCCAf504569699a7fF") {
        return "BTCK";
    } else if (tokenAddr == "0xEF71CA2EE68F45B9Ad6F72fbdb33d707b872315C") {
        return "ETHK";
    } else if (tokenAddr == "0x8D3573f24c0aa3819A2f5b02b2985dD82B487715") {
        return "FIN";
    } else if (tokenAddr == "0x8179D97Eb6488860d816e3EcAFE694a4153F216c") {
        return "CHE";
    } else if (tokenAddr == "0x000000000000000000000000000000000000000E") {
        return "OKT";
    } else if (tokenAddr == "0x2bE36b6D2153444061E66F43f151aE8d9af7F93C") {
        return "FIN-LP";
    }
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });
