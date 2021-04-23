import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { savAccBalVerify } from "../../test-helpers/lib/lib";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");

contract("SavingAccount.deposit", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let accountsContract: t.AccountsInstance;
    let bank: t.BankInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let cETH_addr: any;
    let cDAI_addr: any;
    let cUSDC_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let cETH: t.MockCTokenInstance;

    before(function() {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async function() {
        this.timeout(0);
        savingAccount = await testEngine.deploySavingAccount();
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        bank = await testEngine.bank;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];

        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);

        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cETH = await MockCToken.at(cETH_addr);
        //console.log("addressCETH", addressCETH);
    });

    context("deposit()", async () => {
        context("Single Token", async () => {
            context("ETH", async () => {
                context("should succeed", async () => {
                    it("C5: when small amount of ETH is passed", async function() {
                        this.timeout(0);
                        const depositAmount = new BN(100);
                        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );
                        const totalDefinerBalanceBeforeDeposit = await accountsContract.getDepositBalanceCurrent(
                            ETH_ADDRESS,
                            owner
                        );
                        await savingAccount.fastForward(1000);
                        const balCTokenContractBefore = await web3.eth.getBalance(cETH_addr);
                        const balCTokensBefore = new BN(
                            await cETH.balanceOfUnderlying.call(savingAccount.address)
                        );

                        await savingAccount.deposit(ETH_ADDRESS, depositAmount, {
                            value: depositAmount
                        });

                        const ETHbalanceAfterDeposit = await web3.eth.getBalance(
                            savingAccount.address
                        );

                        await savAccBalVerify(
                            0,
                            depositAmount,
                            ETH_ADDRESS,
                            cETH,
                            balCTokensBefore,
                            new BN(ETHbalanceBeforeDeposit),
                            bank,
                            savingAccount
                        );
                    });
                });
            });
        });
    });
});
