import * as t from "../../../../types/truffle-contracts/index";
import { TestEngine } from "../../../../test-helpers/TestEngine";
import { takeSnapshot, revertToSnapShot } from "../../../../test-helpers/SnapshotUtils";

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("MockERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");

var chai = require("chai");
var expect = chai.expect;

let snapshotId: string;

const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
const ZERO = new BN(0);
const ENABLED = true;
const DISABLED = false;

let testEngine: TestEngine;
let savingAccount: t.SavingAccountWithControllerInstance;
let accountsContract: t.AccountsInstance;
let tokenInfoRegistry: t.TokenRegistryInstance;
let bank: t.BankInstance;

contract("Collateral Feature Tests", async (accounts) => {
    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];
    const dummy = accounts[9];

    let tokens: any;
    let mockChainlinkAggregators: any;
    let addressDAI: any;
    let addressUSDC: any;
    let addressUSDT: any;
    let addressTUSD: any;
    let addressMKR: any;
    let addressWBTC: any;

    let tokenIndexDAI: BN;
    let tokenIndexUSDC: BN;
    let tokenIndexUSDT: BN;
    let tokenIndexTUSD: BN;
    let tokenIndexMKR: BN;
    let tokenIndexWBTC: BN;
    let tokenIndexETH: BN;

    let mockChainlinkAggregatorforDAIAddress: any;
    let mockChainlinkAggregatorforUSDCAddress: any;
    let mockChainlinkAggregatorforUSDTAddress: any;
    let mockChainlinkAggregatorforTUSDAddress: any;
    let mockChainlinkAggregatorforMKRAddress: any;
    let mockChainlinkAggregatorforWBTCAddress: any;
    let mockChainlinkAggregatorforETHAddress: any;

    let cDAI_addr: any;
    let cUSDC_addr: any;
    let cUSDT_addr: any;
    let cWBTC_addr: any;
    let cETH_addr: any;

    let cDAI: t.MockCTokenInstance;
    let cUSDC: t.MockCTokenInstance;
    let cUSDT: t.MockCTokenInstance;
    let cWBTC: t.MockCTokenInstance;
    let cETH: t.MockCTokenInstance;

    let erc20DAI: t.MockErc20Instance;
    let erc20USDC: t.MockErc20Instance;
    let erc20MKR: t.MockErc20Instance;
    let erc20TUSD: t.MockErc20Instance;
    let erc20USDT: t.MockErc20Instance;
    let erc20WBTC: t.MockErc20Instance;

    let mockChainlinkAggregatorforDAI: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforUSDT: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforTUSD: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforWBTC: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforMKR: t.MockChainLinkAggregatorInstance;
    let mockChainlinkAggregatorforETH: t.MockChainLinkAggregatorInstance;

    before(async () => {
        testEngine = new TestEngine();

        savingAccount = await testEngine.deploySavingAccount();
        tokenInfoRegistry = testEngine.tokenInfoRegistry;
        accountsContract = testEngine.accounts;
        bank = testEngine.bank;

        // 1. initialization.
        tokens = testEngine.erc20Tokens;
        mockChainlinkAggregators = testEngine.mockChainlinkAggregators;

        addressDAI = tokens[0];
        addressUSDC = tokens[1];
        addressUSDT = tokens[2];
        addressTUSD = tokens[3];
        addressMKR = tokens[4];
        addressWBTC = tokens[8];

        mockChainlinkAggregatorforDAIAddress = mockChainlinkAggregators[0];
        mockChainlinkAggregatorforUSDCAddress = mockChainlinkAggregators[1];
        mockChainlinkAggregatorforUSDTAddress = mockChainlinkAggregators[2];
        mockChainlinkAggregatorforTUSDAddress = mockChainlinkAggregators[3];
        mockChainlinkAggregatorforMKRAddress = mockChainlinkAggregators[4];
        mockChainlinkAggregatorforWBTCAddress = mockChainlinkAggregators[8];
        mockChainlinkAggregatorforETHAddress = mockChainlinkAggregators[9];

        erc20WBTC = await ERC20.at(addressWBTC);
        erc20DAI = await ERC20.at(addressDAI);
        erc20USDC = await ERC20.at(addressUSDC);
        erc20USDT = await ERC20.at(addressUSDT);
        erc20TUSD = await ERC20.at(addressTUSD);
        erc20MKR = await ERC20.at(addressMKR);

        cWBTC_addr = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
        cDAI_addr = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
        cUSDC_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
        cUSDT_addr = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
        cETH_addr = await testEngine.tokenInfoRegistry.getCToken(ETH_ADDRESS);

        cDAI = await MockCToken.at(cDAI_addr);
        cUSDC = await MockCToken.at(cUSDC_addr);
        cUSDT = await MockCToken.at(cUSDT_addr);
        cWBTC = await MockCToken.at(cWBTC_addr);
        cETH = await MockCToken.at(cETH_addr);

        mockChainlinkAggregatorforDAI = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforDAIAddress
        );
        mockChainlinkAggregatorforUSDC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDCAddress
        );
        mockChainlinkAggregatorforUSDT = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforUSDTAddress
        );
        mockChainlinkAggregatorforTUSD = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforTUSDAddress
        );
        mockChainlinkAggregatorforMKR = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforMKRAddress
        );
        mockChainlinkAggregatorforETH = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforETHAddress
        );
        mockChainlinkAggregatorforWBTC = await MockChainLinkAggregator.at(
            mockChainlinkAggregatorforWBTCAddress
        );

        // load tokenIndex
        tokenIndexDAI = await tokenInfoRegistry.getTokenIndex(addressDAI);
        tokenIndexUSDC = await tokenInfoRegistry.getTokenIndex(addressUSDC);
        tokenIndexUSDT = await tokenInfoRegistry.getTokenIndex(addressUSDT);
        tokenIndexTUSD = await tokenInfoRegistry.getTokenIndex(addressTUSD);
        tokenIndexMKR = await tokenInfoRegistry.getTokenIndex(addressMKR);
        tokenIndexWBTC = await tokenInfoRegistry.getTokenIndex(addressWBTC);
        tokenIndexETH = await tokenInfoRegistry.getTokenIndex(ETH_ADDRESS);

        await savingAccount.fastForward(1);
    });

    beforeEach(async () => {
        // Take snapshot of the EVM before each test
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapShot(snapshotId);
    });

    describe("setCollateral()", async () => {
        describe("setCollateral() - Enable Collateral", async () => {
            it("should enable collateral for a single token", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndexUSDT, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, addressUSDT, ENABLED);
                await expectCollateralDisabledForAllExceptOne(user1, addressUSDT);
            });

            it("should enable collateral for very first token", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndexDAI, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, addressDAI, ENABLED);
                await expectCollateralDisabledForAllExceptOne(user1, addressDAI);
            });

            it("should enable collateral for very last token", async () => {
                const tokensLength = await tokenInfoRegistry.getCoinLength();
                const lastTokenIndex = tokensLength.sub(new BN(1));
                const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(lastTokenIndex);
                const tokenAddr = tokenInfo[0];
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](lastTokenIndex, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr, ENABLED);
                await expectCollateralDisabledForAllExceptOne(user1, tokenAddr);
            });

            it("should enable collateral for all tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokens = await tokenInfoRegistry.getTokens();

                for (let i = 0; i < tokens.length; i++) {
                    await accountsContract.methods["setCollateral(uint8,bool)"](i, true, {
                        from: user1,
                    });
                }

                await expectCollInitForUser(user1, true);
                for (let i = 0; i < tokens.length; i++) {
                    await expectTokenStatusForCollateralBitmap(user1, tokens[i], ENABLED);
                }
            });
        });

        describe("setCollateral() - Disable Collateral", async () => {
            it("should disable collateral for a single token", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndexUSDT, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, addressUSDT, ENABLED);
                await expectCollateralDisabledForAllExceptOne(user1, addressUSDT);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndexUSDT, false, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, addressUSDT, DISABLED);
            });

            it("should disable collateral for very first token", async () => {
                const tokenAddress = addressDAI;
                const tokenIndex = tokenIndexDAI;

                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndex, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddress, ENABLED);
                await expectCollateralDisabledForAllExceptOne(user1, tokenAddress);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndex, false, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddress, DISABLED);
            });

            it("should disable collateral for very last token", async () => {
                const tokensLength = await tokenInfoRegistry.getCoinLength();
                const lastTokenIndex = tokensLength.sub(new BN(1));
                const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(lastTokenIndex);
                const lastTokenAddr = tokenInfo[0];

                const tokenAddress = lastTokenAddr;
                const tokenIndex = lastTokenIndex;

                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndex, true, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddress, ENABLED);
                await expectCollateralDisabledForAllExceptOne(user1, tokenAddress);

                await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndex, false, {
                    from: user1,
                });

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddress, DISABLED);
            });

            it("should disable collateral for all tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokens = await tokenInfoRegistry.getTokens();

                // ENABLE
                for (let i = 0; i < tokens.length; i++) {
                    await accountsContract.methods["setCollateral(uint8,bool)"](i, true, {
                        from: user1,
                    });
                }
                await expectCollInitForUser(user1, true);
                for (let i = 0; i < tokens.length; i++) {
                    await expectTokenStatusForCollateralBitmap(user1, tokens[i], ENABLED);
                }

                // DISALBE
                for (let i = 0; i < tokens.length; i++) {
                    await accountsContract.methods["setCollateral(uint8,bool)"](i, false, {
                        from: user1,
                    });
                }
                await expectCollInitForUser(user1, true);
                for (let i = 0; i < tokens.length; i++) {
                    await expectTokenStatusForCollateralBitmap(user1, tokens[i], DISABLED);
                }
            });
        });
    });

    describe("setCollateral([],[])", async () => {
        describe("setCollateral([],[]) - basic tests", async () => {
            it("should fail when token array length is inconsistent", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await expectRevert(
                    accountsContract.methods["setCollateral(uint8[],bool[])"](
                        [tokenIndexMKR, tokenIndexTUSD],
                        [true, false, true],
                        { from: user1 }
                    ),
                    "array length does not match"
                );

                await expectCollInitForUser(user1, false);
                await expectTokenStatusForCollateralBitmap(user1, addressMKR, DISABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressTUSD, DISABLED);
            });
        });

        describe("setCollateral([],[]) - Enable Collateral on multiple tokens", async () => {
            it("should enable collateral for a single token", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokenIndex = tokenIndexETH;
                const tokenAddr = ETH_ADDRESS;
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [tokenIndex],
                    [true],
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr, ENABLED);
            });

            it("should enable collateral for all tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const indexArr = new Array<BN>();
                const statusArr = new Array<boolean>();
                const tokens = await tokenInfoRegistry.getTokens();

                for (let i = 0; i < tokens.length; i++) {
                    indexArr.push(new BN(i));
                    statusArr.push(true);
                }

                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    indexArr,
                    statusArr,
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                for (let i = 0; i < tokens.length; i++) {
                    await expectTokenStatusForCollateralBitmap(user1, tokens[i], ENABLED);
                }
            });

            it("should enable collateral for random tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokens = await tokenInfoRegistry.getTokens();

                const tokenIndex1 = tokenIndexETH;
                const tokenAddr1 = ETH_ADDRESS;

                const tokenIndex2 = tokenIndexDAI;
                const tokenAddr2 = addressDAI;

                const tokenIndex3 = tokenIndexMKR;
                const tokenAddr3 = addressMKR;

                const tokenIndexArr = [tokenIndex1, tokenIndex2, tokenIndex3];
                const tokenStatusArr = [true, true, true];
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    tokenIndexArr,
                    tokenStatusArr,
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr1, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr2, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr3, ENABLED);

                // rest all tokens disabled
                for (let i = 0; i < tokens.length; i++) {
                    const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(i);
                    const tokenAddr = tokenInfo[0];
                    if (
                        i == tokenIndex1.toNumber() ||
                        i == tokenIndex2.toNumber() ||
                        i == tokenIndex3.toNumber()
                    ) {
                        await expectTokenStatusForCollateralBitmap(user1, tokenAddr, ENABLED);
                    } else {
                        await expectTokenStatusForCollateralBitmap(user1, tokenAddr, DISABLED);
                    }
                }
            });

            it("should enable collateral for first and the last one", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokensLength = await tokenInfoRegistry.getCoinLength();
                const lastTokenIndex = tokensLength.sub(new BN(1));
                const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(lastTokenIndex);
                const lastTokenAddr = tokenInfo[0];

                const firstTokenIndex = new BN(0); // DAI
                const firstTokenAddr = addressDAI;

                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [firstTokenIndex, lastTokenIndex],
                    [true, true],
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, firstTokenAddr, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, lastTokenAddr, ENABLED);
            });
        });

        describe("setCollateral([],[]) - Disable Collateral on multiple tokens", async () => {
            it("should disable collateral for a single token", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokenIndex = tokenIndexETH;
                const tokenAddr = ETH_ADDRESS;
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [tokenIndex],
                    [true],
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr, ENABLED);

                // DISABLE
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [tokenIndex],
                    [false],
                    { from: user1 }
                );
                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr, DISABLED);
            });

            it("should disable collateral for all tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const indexArr = new Array<BN>();
                const enableStatusArr = new Array<boolean>();
                const disableStatusArr = new Array<boolean>();
                const tokens = await tokenInfoRegistry.getTokens();

                for (let i = 0; i < tokens.length; i++) {
                    indexArr.push(new BN(i));
                    enableStatusArr.push(true);
                    disableStatusArr.push(false);
                }

                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    indexArr,
                    enableStatusArr,
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                for (let i = 0; i < tokens.length; i++) {
                    await expectTokenStatusForCollateralBitmap(user1, tokens[i], ENABLED);
                }

                // DISABLE
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    indexArr,
                    disableStatusArr,
                    { from: user1 }
                );
                await expectCollInitForUser(user1, true);
                for (let i = 0; i < tokens.length; i++) {
                    await expectTokenStatusForCollateralBitmap(user1, tokens[i], DISABLED);
                }
            });

            it("should disable collateral for random tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokens = await tokenInfoRegistry.getTokens();

                const tokenIndex1 = tokenIndexETH;
                const tokenAddr1 = ETH_ADDRESS;

                const tokenIndex2 = tokenIndexDAI;
                const tokenAddr2 = addressDAI;

                const tokenIndex3 = tokenIndexMKR;
                const tokenAddr3 = addressMKR;

                const tokenIndexArr = [tokenIndex1, tokenIndex2, tokenIndex3];
                const enableTokenStatusArr = [true, true, true];
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    tokenIndexArr,
                    enableTokenStatusArr,
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr1, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr2, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr3, ENABLED);

                // rest all tokens disabled
                for (let i = 0; i < tokens.length; i++) {
                    const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(i);
                    const tokenAddr = tokenInfo[0];
                    if (
                        i == tokenIndex1.toNumber() ||
                        i == tokenIndex2.toNumber() ||
                        i == tokenIndex3.toNumber()
                    ) {
                        await expectTokenStatusForCollateralBitmap(user1, tokenAddr, ENABLED);
                    } else {
                        await expectTokenStatusForCollateralBitmap(user1, tokenAddr, DISABLED);
                    }
                }

                // DISABLE
                const disableTokenStatusArr = [false, false, false];
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    tokenIndexArr,
                    disableTokenStatusArr,
                    { from: user1 }
                );
                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr1, DISABLED);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr2, DISABLED);
                await expectTokenStatusForCollateralBitmap(user1, tokenAddr3, DISABLED);
            });

            it("should disable to collateral for first and the last one", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                const tokensLength = await tokenInfoRegistry.getCoinLength();
                const lastTokenIndex = tokensLength.sub(new BN(1));
                const tokenInfo = await tokenInfoRegistry.getTokenInfoFromIndex(lastTokenIndex);
                const lastTokenAddr = tokenInfo[0];

                const firstTokenIndex = new BN(0); // DAI
                const firstTokenAddr = addressDAI;

                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [firstTokenIndex, lastTokenIndex],
                    [true, true],
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, firstTokenAddr, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, lastTokenAddr, ENABLED);

                // DISABLE
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [firstTokenIndex, lastTokenIndex],
                    [false, false],
                    { from: user1 }
                );
                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, firstTokenAddr, DISABLED);
                await expectTokenStatusForCollateralBitmap(user1, lastTokenAddr, DISABLED);
            });
        });

        describe("setCollateral([],[]) - Enable/Disable on multiple tokens", async () => {
            it("should disable some and enable some tokens", async () => {
                await expectAllCollStatusDisabledForUser(user1);
                await expectCollInitForUser(user1, false);

                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [tokenIndexETH, tokenIndexDAI, tokenIndexMKR],
                    [true, true, true],
                    { from: user1 }
                );

                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, ETH_ADDRESS, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressDAI, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressMKR, ENABLED);

                // disable some and enable some
                await accountsContract.methods["setCollateral(uint8[],bool[])"](
                    [tokenIndexDAI, tokenIndexUSDT, tokenIndexTUSD, tokenIndexMKR],
                    [false, true, true, false],
                    { from: user1 }
                );
                await expectCollInitForUser(user1, true);
                await expectTokenStatusForCollateralBitmap(user1, ETH_ADDRESS, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressDAI, DISABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressMKR, DISABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressUSDT, ENABLED);
                await expectTokenStatusForCollateralBitmap(user1, addressTUSD, ENABLED);
            });
        });
    });

    describe("getCollateralStatus", async () => {
        it("should get his collateral status", async () => {
            await expectAllCollStatusDisabledForUser(user1);
            await expectCollInitForUser(user1, false);

            await accountsContract.methods["setCollateral(uint8[],bool[])"](
                [tokenIndexETH, tokenIndexDAI, tokenIndexMKR],
                [true, true, true],
                { from: user1 }
            );

            await expectCollInitForUser(user1, true);
            const collStatus = await accountsContract.getCollateralStatus(user1);
            const tokensArr = collStatus[0];
            const statusArr = collStatus[1];
            for (let i = 0; i < tokensArr.length; i++) {
                const tokenAddr = tokensArr[i];
                if (
                    tokenAddr == ETH_ADDRESS ||
                    tokenAddr == addressDAI ||
                    tokenAddr == addressMKR
                ) {
                    await expectTokenStatusForCollateralBitmap(user1, tokenAddr, ENABLED);
                } else {
                    await expectTokenStatusForCollateralBitmap(user1, tokenAddr, DISABLED);
                }
            }
        });

        it("should have all disabled collateral status by default", async () => {
            await expectAllCollStatusDisabledForUser(user1);
            await expectCollInitForUser(user1, false);
            await accountsContract.initCollateralFlag(user1);
            await expectAllCollStatusDisabledForUser(user1);
            await expectCollInitForUser(user1, true);

            await expectAllCollStatusDisabledForUser(user2);
            await expectCollInitForUser(user2, false);
            await accountsContract.initCollateralFlag(user2);
            await expectAllCollStatusDisabledForUser(user2);
            await expectCollInitForUser(user2, true);
        });
    });

    describe("Integration tests", async () => {
        it("every user should have thier own collateral status", async () => {
            // user1
            await expectAllCollStatusDisabledForUser(user1);
            await expectCollInitForUser(user1, false);
            await accountsContract.methods["setCollateral(uint8[],bool[])"](
                [tokenIndexETH, tokenIndexDAI, tokenIndexMKR],
                [true, true, true],
                { from: user1 }
            );
            await expectCollInitForUser(user1, true);
            await expectTokenStatusForCollateralBitmap(user1, ETH_ADDRESS, ENABLED);
            await expectTokenStatusForCollateralBitmap(user1, addressDAI, ENABLED);
            await expectTokenStatusForCollateralBitmap(user1, addressMKR, ENABLED);

            // user2
            await expectAllCollStatusDisabledForUser(user2);
            await expectCollInitForUser(user2, false);
            await accountsContract.methods["setCollateral(uint8[],bool[])"](
                [tokenIndexETH, tokenIndexDAI, tokenIndexMKR],
                [true, true, true],
                { from: user2 }
            );
            await expectCollInitForUser(user2, true);
            await expectTokenStatusForCollateralBitmap(user2, ETH_ADDRESS, ENABLED);
            await expectTokenStatusForCollateralBitmap(user2, addressDAI, ENABLED);
            await expectTokenStatusForCollateralBitmap(user2, addressMKR, ENABLED);

            // user1 disabled MKR
            await accountsContract.methods["setCollateral(uint8[],bool[])"](
                [tokenIndexMKR],
                [false],
                { from: user1 }
            );

            // user2 enabled WBTC
            await accountsContract.methods["setCollateral(uint8,bool)"](tokenIndexWBTC, true, {
                from: user2,
            });

            // validate user1
            await expectTokenStatusForCollateralBitmap(user1, ETH_ADDRESS, ENABLED);
            await expectTokenStatusForCollateralBitmap(user1, addressDAI, ENABLED);
            await expectTokenStatusForCollateralBitmap(user1, addressMKR, DISABLED);

            // validate user2
            await expectTokenStatusForCollateralBitmap(user2, ETH_ADDRESS, ENABLED);
            await expectTokenStatusForCollateralBitmap(user2, addressDAI, ENABLED);
            await expectTokenStatusForCollateralBitmap(user2, addressMKR, ENABLED);
            await expectTokenStatusForCollateralBitmap(user2, addressWBTC, ENABLED);
        });
    });
});

async function expectAllCollStatusDisabledForUser(user: string) {
    // method-1: getCollateralStatus()
    const collStatus = await accountsContract.getCollateralStatus(user);
    const tokens = collStatus[0];
    const status = collStatus[1];

    expect(tokens.length > 0, "no tokens");
    expect(tokens.length == status.length, "length mismatch");

    for (let i = 0; i < tokens.length; i++) {
        expect(status[i] == false, "status is enabled");
    }

    // method-2: direct status check
    await expectCollateralBitmap(user, ZERO);
}

async function expectCollateralBitmap(user: string, expectedVal: BN) {
    const accountData = await accountsContract.accounts(user);
    const collateralBitmap = accountData[2];
    expect(collateralBitmap).to.be.bignumber.equal(expectedVal);
}

async function expectCollInitForUser(user: string, expectedVal: boolean) {
    const accountData = await accountsContract.accounts(user);
    const isCollInit = accountData[3];
    expect(isCollInit).to.be.equal(expectedVal);
}

async function expectTokenStatusForCollateralBitmap(
    user: string,
    token: string,
    expectedVal: boolean
) {
    const tokenIndex = await tokenInfoRegistry.getTokenIndex(token);
    const collFlag = await accountsContract.isUserHasCollateral(user, tokenIndex);
    expect(collFlag).to.be.equal(expectedVal);
}

async function expectCollateralDisabledForAllExceptOne(user: string, token: string) {
    const enabledTokenIndex = await tokenInfoRegistry.getTokenIndex(token);

    const tokensCount = await tokenInfoRegistry.getCoinLength();
    for (let i = 0; i < tokensCount.toNumber(); i++) {
        const collFlag = await accountsContract.isUserHasCollateral(user, i);

        if (i == enabledTokenIndex.toNumber()) {
            // this exception index should be enabled
            expect(collFlag).to.be.equal(ENABLED);
        } else {
            // rest all should be disabled
            expect(collFlag).to.be.equal(DISABLED);
        }
    }
}
