import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const SavingAccount: t.SavingAccountContract = artifacts.require("SavingAccount");
const ERC20: t.ERC20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ChainLinkOracle: t.ChainLinkOracleContract = artifacts.require("ChainLinkOracle");
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");

contract("SavingAccount.COMP", async (accounts) => {
    const EMERGENCY_ADDRESS: string = "0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c";
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let globalConfig: t.GlobalConfigInstance;
    let COMPTokenAddress: string;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];

    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));

    let tokens: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let erc20DAI: t.ERC20Instance;
    let erc20USDC: t.ERC20Instance;
    let erc20TUSD: t.ERC20Instance;
    let erc20MKR: t.ERC20Instance;

    before(async () => {
        // Things to initialize before all test
        testEngine = new TestEngine();
        testEngine.deploy("scriptFlywheel.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        globalConfig = await testEngine.globalConfig;
        COMPTokenAddress = await testEngine.getCOMPTokenAddress();

        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        // Use ERC20 from OZ, import this
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        // Use CERC20, import from Compound
        cDAI = await MockCToken.at(addressCTokenForDAI);
        cUSDC = await MockCToken.at(addressCTokenForUSDC);
    });

    context("constructor", async () => {
        context("should fail", async () => {
            it("When executing updateCommunityFundRatio, the input parameter is zero.", async () => {
                await expectRevert(
                    globalConfig.updateCommunityFundRatio(new BN(0)),
                    "Community fund is zero"
                );
            });
        });

        context("should succeed", async () => {
            it("Withdraw COMP token", async () => {
                //1. set deFinerCommunityFund address.
                await globalConfig.updateDeFinerCommunityFund(owner);
                //2. set COMPToken address.
                await globalConfig.updateCompoundAddress(COMPTokenAddress);
                //3. Deposit token.
                const ONE_DAI = eighteenPrecision.mul(new BN(1));
                await erc20DAI.approve(savingAccount.address, numOfToken);
                //4. After a while.

                //5. Withdraw COMP token.

                //6. Compare the results..
                const beforeCommunityFundRatio = await globalConfig.communityFundRatio();
                await globalConfig.updateCommunityFundRatio(new BN(20));
                const afterCommunityFundRatio = await globalConfig.communityFundRatio();
                expect(beforeCommunityFundRatio).to.be.bignumber.equal(new BN(10));
                expect(afterCommunityFundRatio).to.be.bignumber.equal(new BN(20));
            });
        });
    });
});