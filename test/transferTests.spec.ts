import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");

contract("SavingAccount.transfer", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressTUSD: any;
    let erc20DAI: t.MockERC20Instance;
    let erc20USDC: t.MockERC20Instance;
    let erc20MKR: t.MockERC20Instance;
    let erc20TUSD: t.MockERC20Instance;
    let numOfToken: any;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressMKR = tokens[4];
        addressTUSD = tokens[3];
        erc20DAI = await MockERC20.at(addressDAI);
        erc20USDC = await MockERC20.at(addressUSDC);
        erc20MKR = await MockERC20.at(addressMKR);
        erc20TUSD = await MockERC20.at(addressTUSD);
        numOfToken = new BN(1000);
    });

    context("transfer()", async () => {
        context("with Token", async () => {
            context("should fail", async () => {
                it("Not enough balance for transfer", async () => {
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1, the amount of transfer is larger than user2's balance on DAI
                });

                it("Not enough collatral for borrowed asset if transfer", async () => {
                    // 1. Transfer DAI to user1 & user2.
                    // 2. User2 borrow USDC and use it's DAI as collateral
                    // 3. Transfer DAI from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
                }); 
            });

            context("should succeed", async () => {
                it("Transfer small amount balance", async () => {
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1. The amount of transfer should NOT trigger the compound token 
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verity the new balance
                });

                it("Transfer large amount of balance", async () => {
                    // 1. Transfer DAI to user1 & user2.
                    // 2. Transfer DAI from user2 to user1. The amount of transfer should trigger the compound token 
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verify the new balance
                });
            });
        });

        context("with ETH", async () => {
            context("should fail", async () => {
                it("Not enough balance for transfer", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1, the amount of transfer is larger than user2's balance on ETH
                });

                it("Not enough collatral for borrowed asset if transfer", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. User2 borrow USDC and use it's ETH as collateral
                    // 3. Transfer ETH from user2 to user1. The amount of transfer will let the LTV of user2 be larger than BORROW_LTV
                }); 
            });

            context("should succeed", async () => {
                it("Transfer small amount balance", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1. The amount of transfer should NOT trigger the compound token 
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verity the new balance
                });

                it("Transfer large amount of balance", async () => {
                    // 1. Transfer ETH to user1 & user2.
                    // 2. Transfer ETH from user2 to user1. The amount of transfer should trigger the compound token 
                    // withdraw of user2 and compound token deposit of user1.
                    // 3. Verify the new balance
                });
            });
        });
    });
});
