import * as t from "../../types/truffle-contracts/index";
const { BN } = require("@openzeppelin/test-helpers");

const TimelockController: t.TimelockControllerContract = artifacts.require("TimelockController");
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");

const ONE_MIN = new BN(60); // 60 sec
const TEN_MINS = new BN(10).mul(ONE_MIN); // 10 mins
const ONE_HOUR = new BN(60).mul(ONE_MIN); // 60 mins
const FOURTY_EIGHT_HOURS = new BN(48).mul(ONE_HOUR); // 48 hours

async function main() {
    await deployTimelockController();
    // await buildData();
}
async function deployTimelockController() {
    const proposer1 = "0xebc0522e083106b5d250592f833f5213f076a45d";
    const executor1 = "0x1d76c9f0688fce3dad2b111593477e5adc98e9e4";

    const proposer2 = "0xb9f51908D332a9A6B65B6D802C84a826fa78Bb1a";
    const executor2 = "0x7CEC1b3e1648c3F9B8fdCCDf18Ef3AbE404746D1";
    const proposers = [proposer1, proposer2];
    const executors = [executor1, executor2];

    const timelock = await TimelockController.new(FOURTY_EIGHT_HOURS, proposers, executors);
    console.log("TimelockController Deployed at: ", timelock.address);
}

// build data
async function buildData() {
    const PROXY_ADMIN = "0x3FAE1633a4E24BAc2f615Fae2F845E796b7f44F7";
    const PROXY = "0xd910903BD857Fa8FA8BDE47502fFf3199199e96C";
    const NEW_IMPLEMENTATION = "0x3FAE1633a4E24BAc2f615Fae2F845E796b7f44F7";
    const proxyAdmin = await ProxyAdmin.at(PROXY_ADMIN);
    const data = await proxyAdmin.contract.methods.upgrade(PROXY, NEW_IMPLEMENTATION).encodeABI();
    console.log(data);

    // To validate the function call and values, use the following command:
    // seth --calldata-decode <function_signature> <hex_data>
    // example:
    //  seth --calldata-decode "upgrade(address,address)" 0x99a88ec4000000000000000000000000d910903bd857fa8fa8bde47502fff3199199e96c0000000000000000000000003fae1633a4e24bac2f615fae2f845e796b7f44f7
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
