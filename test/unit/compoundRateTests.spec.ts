import { BigNumber } from "bignumber.js";
import { MockChainLinkAggregatorInstance } from "../../types/truffle-contracts/index.d";
import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
import { CTokenErrorReporter } from "../../compound-protocol/scenario/src/ErrorReporter";
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.Erc20Contract = artifacts.require("ERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);

contract("Compound.cToken", async (accounts) => {
    const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    const addressZero: string = "0x0000000000000000000000000000000000000000";
    let testEngine: TestEngine;
    let savingAccount: t.SavingAccountWithControllerInstance;
    let tokenInfoRegistry: t.TokenRegistryInstance;
    let accountsContract: t.AccountsInstance;

    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const dummy = accounts[9];
    const eighteenPrecision = new BN(10).pow(new BN(18));
    const sixPrecision = new BN(10).pow(new BN(6));
    const eightPrecision = new BN(10).pow(new BN(8));
    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressMKR: any;
    let addressZRX: any;
    let addressTUSD: any;
    let addressUSDT: any;
    let addressWBTC: any;
    let addressCTokenForDAI: any;
    let addressCTokenForUSDC: any;
    let addressCTokenForUSDT: any;
    let addressCTokenForWBTC: any;
    let addressCTokenForZRX: any;
    let cTokenDAI: t.MockCTokenInstance;
    let cTokenUSDC: t.MockCTokenInstance;
    let cTokenUSDT: t.MockCTokenInstance;
    let cTokenWBTC: t.MockCTokenInstance;
    let cTokenZRX: t.MockCTokenInstance;;
    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;
    let erc20DAI: t.Erc20Instance;
    let erc20USDC: t.Erc20Instance;
    let erc20MKR: t.Erc20Instance;
    let erc20WBTC: t.Erc20Instance;
    let erc20TUSD: t.Erc20Instance;
    let erc20ZRX: t.Erc20Instance;
    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;
    let numOfToken: any;
    let ONE_DAI: any;
    let ONE_ETH: any;
    let ONE_USDC: any;
    // testEngine = new TestEngine();
    // testEngine.deploy("scriptFlywheel.scen");

    before(function () {
        // Things to initialize before all test
        this.timeout(0);
        testEngine = new TestEngine();
        testEngine.deploy("mockRealCompound.scen");
    });

    beforeEach(async () => {
        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = await testEngine.tokenInfoRegistry;
        accountsContract = await testEngine.accounts;
        // 1. initialization.
        tokens = await testEngine.erc20Tokens;
        mockChainlinkAggregators = await testEngine.mockChainlinkAggregators;
        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressZRX = tokens[6];
        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20MKR = await ERC20.at(addressMKR);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20ZRX = await ERC20.at(addressZRX);
        erc20WBTC = await ERC20.at(addressWBTC);
        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        addressCTokenForZRX = await testEngine.tokenInfoRegistry.getCToken(addressZRX);
        addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cTokenDAI = await MockCToken.at(addressCTokenForDAI);
        cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
        cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
        cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
        cTokenZRX = await MockCToken.at(addressCTokenForZRX);
        numOfToken = new BN(1000);
        ONE_DAI = eighteenPrecision;
        ONE_ETH = eighteenPrecision;
        ONE_USDC = sixPrecision;
    });

    context("liquidate()", async () => {
        context("Test borrow and supply rate: ", async () => {
            it("Test rate for DAI, USDC, ZRX, WBTC", async () => {
                const DAIBorrowRate = await cTokenDAI.borrowRatePerBlock();
                const USDCBorrowRate = await cTokenUSDC.borrowRatePerBlock();
                const ZRXBorrowRate = await cTokenZRX.borrowRatePerBlock();
                const WBTCBorrowRate = await cTokenWBTC.borrowRatePerBlock();

                const DAISupplyRate = await cTokenDAI.supplyRatePerBlock();
                const USDCSupplyRate = await cTokenUSDC.supplyRatePerBlock();
                const ZRXSupplyRate = await cTokenZRX.supplyRatePerBlock();
                const WBTCSupplyRate = await cTokenWBTC.supplyRatePerBlock();

                const expectedBorrowRate = new BN(11967275493);
                const expectedSupplyRate = new BN(9573820);

                expect(DAIBorrowRate).to.be.bignumber.equal(expectedBorrowRate);
                expect(USDCBorrowRate).to.be.bignumber.equal(expectedBorrowRate);
                expect(ZRXBorrowRate).to.be.bignumber.equal(expectedBorrowRate);
                expect(WBTCBorrowRate).to.be.bignumber.equal(expectedBorrowRate);

                expect(DAISupplyRate).to.be.bignumber.equal(expectedSupplyRate);
                expect(USDCSupplyRate).to.be.bignumber.equal(expectedSupplyRate);
                expect(ZRXSupplyRate).to.be.bignumber.equal(expectedSupplyRate);
                expect(WBTCSupplyRate).to.be.bignumber.equal(expectedSupplyRate);

            });
        });
    });
});
