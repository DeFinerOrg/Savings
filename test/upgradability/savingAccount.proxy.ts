import * as t from "../../types/truffle-contracts/index";
// import { Utils } from "../../types/truffle-contracts/index";

var chai = require("chai");

const { ethers, upgrades } = require("hardhat");

contract("SavingAccount() proxy", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const ADDRESS1: string = "0x0000000000000000000000000000000000000001";

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

        // ==================
        // SavingAccount V1
        // ==================
        console.log("------------------ 0 ------------------");
        await ethers.getContractFactory("Utils");
        console.log("------------------ 1 ------------------");
        const Utils = await ethers.getContractFactory("Utils");
        console.log("============ 2 ==============");

        // console.log("Utils", Utils.address);
        const utils = await Utils.deploy();
        console.log("utils", utils.address);

        const SavingLib = await ethers.getContractFactory("SavingLib", {
            libraries: {
                Utils: utils.address,
            },
        });
        const savingLib = await SavingLib.deploy();
        console.log("savingLib", savingLib.address);

        const SavingAccountV1 = await ethers.getContractFactory("SavingAccount", {
            libraries: { SavingLib: savingLib.address, Utils: utils.address },
        });

        // ==================
        // SavingAccount V2
        // ==================
        console.log("------------------ 0 ------------------");
        await ethers.getContractFactory("UtilsV2");
        console.log("------------------ 1 ------------------");
        const UtilsV2 = await ethers.getContractFactory("UtilsV2");
        console.log("============ 2 ==============");

        // console.log("Utils", Utils.address);
        const utilsV2 = await Utils.deploy();
        console.log("utilsV2", utilsV2.address);
        console.log("============ 3 ==============");

        const SavingLibV2 = await ethers.getContractFactory("SavingLibV2", {
            libraries: {
                UtilsV2: utilsV2.address,
            },
        });
        console.log("============ 4 ==============");
        const savingLibV2 = await SavingLibV2.deploy();
        console.log("savingLibV2", savingLibV2.address);
        const SavingAccountV2 = await ethers.getContractFactory("SavingAccountV2", {
            libraries: { SavingLibV2: savingLibV2.address, UtilsV2: utilsV2.address },
        });

        // ======================
        // SavingAccount V1 Proxy
        // ======================
        const savingAccountProxy = await upgrades.deployProxy(
            SavingAccountV1,
            [[], [], ETH_ADDRESS],
            { initializer: "initialize", unsafeAllow: ["external-library-linking"] }
        );

        const SAV2 = await upgrades.upgradeProxy(savingAccountProxy.address, SavingAccountV2, {
            unsafeAllow: ["external-library-linking"],
        });

        // 1. initialization.
        // SavingAccountV1 = await ethers.getContractFactory("SavingAccount");
        // console.log("------------------ 4 ------------------");
        // SavingAccountV2 = await ethers.getContractFactory("SavingAccountV2");
        // console.log("------------------ 5 ------------------");

        // // savingAccountV1 = await upgrades.deployProxy(SavingAccountV1, {
        // //     initializer: "initialize",
        // // });
        // console.log("------------------ 6 ------------------");
        // // savingAccountV2 = await upgrades.upgradeProxy(savingAccountV1.address, SavingAccountV2);
        // console.log("------------------ 7 ------------------");
    });

    context("upgrade", async () => {
        it("verify SavingAccount upgrade", async () => {
            console.log("------------------ 8 ------------------");
            // await SAV2.approveAll(ADDRESS1);
            console.log("------------------ 9 ------------------");
        });
    });
});
