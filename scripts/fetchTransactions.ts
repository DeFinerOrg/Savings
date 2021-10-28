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

                    console.log(
                        tx.blockNumber,
                        tx.hash,
                        tx.from,
                        tx.to,
                        tx.gas,
                        tx.gasPrice,
                        tx.value,
                        tx.input,
                        txBlock.timestamp,
                        getTx
                    );
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
            ["address", "address", "address"],
            finalStr
        );
        result.push("Transfer", txData[0], txData[1], txData[2]);
    }

    console.log(result);
    return result;
    // console.log("strippedStr", strippedStr);
    // console.log("finalStr", finalStr);
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });
