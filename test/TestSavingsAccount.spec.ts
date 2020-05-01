import { SavingAccountInstance, MockERC20Instance } from "../types/truffle-contracts/index";

var chai = require("chai");
var expect = chai.expect;

const { BN } = require("@openzeppelin/test-helpers");

const SavingAccount = artifacts.require("SavingAccount");
const MockERC20 = artifacts.require("MockERC20");

contract("SavingAccount", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let savingAccount: SavingAccountInstance;

    const owner = accounts[0];
    const user1 = accounts[0];

    before(async () => {
        // Things to initialize before all test
    });

    beforeEach(async () => {
        // Things to execute before each test cases
        savingAccount = await SavingAccount.new();
        // console.log("SavingAccount: ", savingAccount.address);
    });

    context("constructor", async () => {
        context("should fail", async () => {
            it("when ...<describe the context>");
        });

        context("should succeed", async () => {
            it("deployed and state variables initialized", async () => {
                expect(await savingAccount.EMERGENCY_ADDR()).to.equal(EMERGENCY_ADDRESS);
                expect(await savingAccount.ETH_ADDR()).equal(ETH_ADDRESS);
            });

            it("when all parameters are valid");
        });
    });

    context("depositToken()", async () => {
        context("should fail", async () => {
            it("when unsupported token address passed");

            it("when amount is zero");
        });

        context("should succeed", async () => {
            it("when supported token address is passed", async () => {
                // 1. Deploy a MockERC20 token
                // Tokens are minted for the `owner`
                let mockERC20: MockERC20Instance = await MockERC20.new(
                    "MTK",
                    "MockToken",
                    18,
                    1000
                );

                // 2. Approve tokens to SavingAccount contract
                const numOfToken = 1000;
                await mockERC20.approve(savingAccount.address, numOfToken);

                // 3. Deposit Token to SavingContract
                await savingAccount.depositToken(mockERC20.address, 1000);

                // 4. Validate that the tokens are deposited to SavingAccount
                // 4.1 SavingAccount contract must received tokens
                const balSavingAccount = await mockERC20.balanceOf(savingAccount.address);
                expect(balSavingAccount).to.be.bignumber.equal(new BN(1000));

                // 4.2 SavingAccount variables are changed

                // TODO Compound
                // 4.2 Some tokens are sent to Compound contract
                // 4.3 cToken is minted
            });
        });
    });

    context("borrow()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("repay()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("withdrawToken()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("liquidate()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("toCompound()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });

    context("fromCompound()", async () => {
        context("should fail", async () => {
            it("");
        });

        context("should succeed", async () => {
            it("");
        });
    });
});
