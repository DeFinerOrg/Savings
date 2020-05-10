import {
    SavingAccountInstance,
    MockERC20Instance,
    TokenRegistryContract,
    CTokenRegistryContract,
    MockERC20Contract,
    SavingAccountContract,
    TokenRegistryInstance,
    CTokenRegistryInstance,
    ChainLinkOracleContract,
    ChainLinkOracleInstance,
    MockCTokenInstance,
    MockCTokenContract
} from "../types/truffle-contracts/index";

var chai = require("chai");
var expect = chai.expect;

const { BN } = require("@openzeppelin/test-helpers");

const SavingAccount: SavingAccountContract = artifacts.require("SavingAccount");
const MockERC20: MockERC20Contract = artifacts.require("MockERC20");
const MockCToken: MockCTokenContract = artifacts.require("MockCToken");
const TokenRegistry: TokenRegistryContract = artifacts.require("TokenRegistry");
const CTokenRegistry: CTokenRegistryContract = artifacts.require("CTokenRegistry");
const ChainLinkOracle: ChainLinkOracleContract = artifacts.require("ChainLinkOracle");

contract("SavingAccount", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let savingAccount: SavingAccountInstance;
    let tokenRegistry: TokenRegistryInstance;
    let cTokenRegistry: CTokenRegistryInstance;
    let chainLinkOracle: ChainLinkOracleInstance;

    const owner = accounts[0];
    const user1 = accounts[0];

    before(async () => {
        // Things to initialize before all test
    });

    beforeEach(async () => {
        chainLinkOracle = await ChainLinkOracle.deployed();
        tokenRegistry = await TokenRegistry.deployed();
        cTokenRegistry = await CTokenRegistry.deployed();
        // Things to execute before each test cases
        savingAccount = await SavingAccount.new(
            await tokenRegistry.getERC20Tokens(),
            await cTokenRegistry.getCTokensList(),
            chainLinkOracle.address
        );
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
                // 1. Get DAI contact instance
                const tokens = await tokenRegistry.getERC20Tokens();
                const addressDAI = tokens[0];
                const addressCTokenForDAI = await cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: MockERC20Instance = await MockERC20.at(addressDAI);
                const cTokenDAI: MockCTokenInstance = await MockCToken.at(addressCTokenForDAI);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // 3. Deposit Token to SavingContract
                await savingAccount.depositToken(erc20DAI.address, numOfToken);

                // 4. Validate that the tokens are deposited to SavingAccount
                // 4.1 SavingAccount contract must received tokens
                const expectedTokensAtSavingAccountContract = numOfToken
                    .mul(new BN(15)) //Maintiaining ratio
                    .div(new BN(100));
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokensAtSavingAccountContract).to.be.bignumber.equal(
                    balSavingAccount
                );

                // 4.2 SavingAccount variables are changed
                // TODO Need to improve the code design to verify these variables

                // 4.2 Some tokens are sent to Compound contract
                const expectedTokensAtCTokenContract = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokenContract = await erc20DAI.balanceOf(addressCTokenForDAI);
                expect(expectedTokensAtCTokenContract).to.be.bignumber.equal(balCTokenContract);

                // 4.3 cToken must be minted for SavingAccount
                const expectedCTokensAtSavingAccount = numOfToken.mul(new BN(85)).div(new BN(100));
                const balCTokens = await cTokenDAI.balanceOf(savingAccount.address);
                expect(expectedCTokensAtSavingAccount).to.be.bignumber.equal(balCTokens);
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
            it("when supported token address is passed", async () => {
                // 1. Get DAI contract instance
                const tokens = await tokenRegistry.getERC20Tokens();
                const addressDAI = tokens[0];
                const addressCTokenForDAI = await cTokenRegistry.getCToken(addressDAI);

                const erc20DAI: MockERC20Instance = await MockERC20.at(addressDAI);
                const cTokenDAI: MockCTokenInstance = await MockCToken.at(addressCTokenForDAI);

                // 2. Approve 1000 tokens
                const numOfToken = new BN(1000);
                await erc20DAI.approve(savingAccount.address, numOfToken);

                // deposit tokens
                await savingAccount.depositToken(erc20DAI.address, numOfToken);

                //Number of tokens to withdraw
                const withdrawTokens = new BN(15);
                //await erc20DAI.approve(savingAccount.address, withdrawToken);

                // 3. validate if amount to be withdrawn is less than saving account balance
                const balSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(withdrawTokens).to.be.bignumber.lessThan(balSavingAccount);

                // 4. Withdraw Token from SavingContract
                await savingAccount.withdrawToken(erc20DAI.address, withdrawTokens);

                /* let userBalance = await web3.eth.getBalance(msg.sender)
                expect(userBalance).to.be.bignumber.equal(
                    withdrawTokens
                ); */

                // 5. Validate Withdraw

                const expectedTokenBalanceAfterWithdraw = numOfToken
                    .mul(new BN(15))
                    .div(new BN(100))
                    .sub(new BN(15));
                const newbalSavingAccount = await erc20DAI.balanceOf(savingAccount.address);
                expect(expectedTokenBalanceAfterWithdraw).to.be.bignumber.equal(
                    newbalSavingAccount
                );

                // amount present in savingsAccount & compound & user as well
                // got through savingsAccount.sol
            });
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
