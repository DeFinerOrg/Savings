import * as t from "../../types/truffle-contracts/index";
// import { Utils } from "../../types/truffle-contracts/index";

var chai = require("chai");

const { ethers, upgrades } = require("hardhat");

// const SavingLib = artifacts.require("SavingLibV2");
// const Utils = artifacts.require("Utils");

contract("SavingAccount()", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";

    // let Utils: any;
    let savingAccountV1: t.SavingAccountWithControllerInstance;
    let savingAccountV2: t.SavingAccountWithControllerV2Instance;
    let SavingAccountV1: t.SavingAccountWithControllerInstance;
    let SavingAccountV2: t.SavingAccountWithControllerV2Instance;

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
    });

    beforeEach(async function () {
        this.timeout(0);

        console.log("------------------ 1 ------------------");
        const Utils = await ethers.getContractFactory("Utils");
        console.log("============ 2 ==============");

        // console.log("Utils", Utils.address);
        const utils = Utils.deploy();
        console.log("utils", utils.address);

        const SavingLib = await ethers.getContractFactory("SavingLib");
        console.log("savingLib", SavingLib.address);
        const savingLib = SavingLib.deploy();
        console.log("savingLib", savingLib.address);

        // 1. initialization.
        // SavingAccountV1 = await ethers.getContractFactory("SavingAccount");
        console.log("------------------ 4 ------------------");
        SavingAccountV2 = await ethers.getContractFactory("SavingAccountV2");
        console.log("------------------ 5 ------------------");

        // savingAccountV1 = await upgrades.deployProxy(SavingAccountV1, {
        //     initializer: "initialize",
        // });
        console.log("------------------ 6 ------------------");
        // savingAccountV2 = await upgrades.upgradeProxy(savingAccountV1.address, SavingAccountV2);
        console.log("------------------ 7 ------------------");
    });

    context("upgrade", async () => {
        it("verify - 1", async () => {
            console.log("------------------ 8 ------------------");
            await savingAccountV2.approveAll(ETH_ADDRESS);
            console.log("------------------ 9 ------------------");
        });
    });
});
