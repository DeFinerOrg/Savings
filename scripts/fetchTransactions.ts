import * as t from "../types/truffle-contracts/index";
import BN from "bn.js";

const SAVING_ACCOUNT = "0xF3c87c005B04a07Dc014e1245f4Cff7A77b6697b";
const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");

async function main(): Promise<void> {
    console.log("fetching transactions...");

    // contract deployed 3674866

    await getTransactionsByAccount(SAVING_ACCOUNT, new BN("3674866"), new BN("6319957"));
    //   await getTransactionsByAccount(SAVING_ACCOUNT, new BN("6272850"), new BN("6272901"));
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

                    console.log(
                        tx.blockNumber,
                        tx.hash,
                        tx.from,
                        tx.to,
                        tx.gas,
                        tx.gasPrice,
                        tx.value,
                        tx.input,
                        txBlock.timestamp
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
main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });
