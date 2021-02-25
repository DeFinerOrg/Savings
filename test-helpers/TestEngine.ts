import { SavingAccountWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { BankWithControllerInstance } from "./../types/truffle-contracts/index.d";
import { AccountsWithControllerInstance } from "./../types/truffle-contracts/index.d";
import * as t from "../types/truffle-contracts/index";

const { BN } = require("@openzeppelin/test-helpers");
const MockCToken = artifacts.require("MockCToken");
const MockERC20 = artifacts.require("MockERC20");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const SavingAccount: any = artifacts.require("SavingAccount");
const SavingAccountWithController: any = artifacts.require("SavingAccountWithController");
const Bank: any = artifacts.require("BankWithController");
const Accounts: any = artifacts.require("AccountsWithController");
const ChainLinkAggregator = artifacts.require("ChainLinkAggregator");
const TokenRegistry: any = artifacts.require("TokenRegistry");
const AccountTokenLib = artifacts.require("AccountTokenLib");
const BitmapLib = artifacts.require("BitmapLib");
const Utils: any = artifacts.require("Utils");
const SavingLib = artifacts.require("SavingLib");
const Unitroller = artifacts.require("Unitroller")
const SimplePriceOracle = artifacts.require("SimplePriceOracle")
const FixedPriceOracle = artifacts.require("FixedPriceOracle")
const PriceOracleProxy = artifacts.require("PriceOracleProxy")
const ComptrollerScenarioG2 = artifacts.require("ComptrollerScenarioG2")
const ComptrollerScenario = artifacts.require("ComptrollerScenario")

const FaucetTokenHarness = artifacts.require("FaucetToken")
const FixedInterestRateModel = artifacts.require("InterestRateModelHarness")
const CEtherScenarioContract = artifacts.require("CEtherScenario")
const CErc20Delegate = artifacts.require("CErc20Delegate")
const CErc20DelegatorScenario = artifacts.require("CErc20DelegatorScenario")
const GlobalConfig: t.GlobalConfigContract = artifacts.require("GlobalConfig");
const Constant: t.ConstantContract = artifacts.require("Constant");
const InterestRateModel = artifacts.require("InterestRateModel")
const WhitePaperInterestRateModel = artifacts.require("WhitePaperInterestRateModel")
// Contracts for Upgradability
const ProxyAdmin: t.ProxyAdminContract = artifacts.require("ProxyAdmin");
const SavingAccountProxy: t.SavingAccountProxyContract = artifacts.require("SavingAccountProxy");
const AccountsProxy: t.AccountsProxyContract = artifacts.require("AccountsProxy");
const BankProxy: t.BankProxyContract = artifacts.require("BankProxy");
var tokenData = require("../test-helpers/tokenData.json");

// var compoundTokens: any = require("../compound-protocol/networks/development.json");
var compoundTokens: any;
const addressZero: string = "0x0000000000000000000000000000000000000000";
const ETH_ADDR: string = "0x000000000000000000000000000000000000000E";

export class TestEngine {
    public erc20Tokens: Array<string> = new Array();
    public cTokens: Array<string> = new Array();
    public mockChainlinkAggregators: Array<string> = new Array();
    public tokenInfoRegistry!: t.TokenRegistryInstance;
    public globalConfig!: t.GlobalConfigInstance;
    public constant!: t.ConstantInstance;
    public bank!: t.BankInstance;
    public accounts!: t.AccountsInstance;
    public comptroller!: t.ComptrollerHarnessInstance
    public COMPTokenAddress!: string

    public async deployCompound(address: string[]) {

        let unitroller = await Unitroller.new()
        const priceOracle = await FixedPriceOracle.new(new BN(10).pow(new BN(18)))

        const comptrollerScenG2 = await ComptrollerScenarioG2.new()
        await unitroller._setPendingImplementation(comptrollerScenG2.address)
        await comptrollerScenG2._become(unitroller.address)
        const comptroller = await ComptrollerScenario.at(unitroller.address)

        const USDC = await FaucetTokenHarness.new(0, "USD Coin", 6, "USDC")
        const USDT = await FaucetTokenHarness.new(0, "Tether", 6, "USDT")
        const WBTC = await FaucetTokenHarness.new(0, "WBTC", 8, "WBTC")
        const FIN = await FaucetTokenHarness.new(0, "FIN", 18, "FIN")
        const LPToken = await FaucetTokenHarness.new(0, "LPToken", 18, "LPToken")
        const DAI = await FaucetTokenHarness.new(0, "DAI", 18, "DAI")
        const ZRX = await FaucetTokenHarness.new(0, "ZRX", 18, "ZRX")
        const BAT = await FaucetTokenHarness.new(0, "BAT", 18, "BAT")
        const TUSD = await FaucetTokenHarness.new(0, "TUSD", 18, "TUSD")
        const MKR = await FaucetTokenHarness.new(0, "MKR", 18, "MKR")
        const REP = await FaucetTokenHarness.new(0, "REP", 18, "REP")
        const COMP = await FaucetTokenHarness.new(0, "COMP", 18, "COMP")

        await comptroller._setPriceOracle(priceOracle.address)
        await comptroller._setMaxAssets(20)
        await comptroller._setCloseFactor(new BN(5).mul(new BN(10).pow(new BN(17))))
        await comptroller._setLiquidationIncentive(new BN(11).mul(new BN(10).pow(new BN(17))))

        const fixedInterestRateModel = await FixedInterestRateModel.new(new BN(5).mul(new BN(10).pow(new BN(12))))
        const whitePaperInterestRateModel = await WhitePaperInterestRateModel.new(
            new BN(5).mul(new BN(10).pow(new BN(13))),
            new BN(2).mul(new BN(10).pow(new BN(17))))
        let interestRateModelAddress = fixedInterestRateModel.address
        const interestRateModel = await InterestRateModel.at(interestRateModelAddress)
        const cETH = await CEtherScenarioContract.new(
            "cETH",
            "cETH",
            8,
            address[0],
            comptroller.address,
            interestRateModel.address,
            new BN(10).pow(new BN(17)),
        )

        const cDAI = await this.deployCToken(
            "DAI",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            DAI
        )
        const cZRX = await this.deployCToken(
            "ZRX",
            new BN(10).pow(new BN(12)),
            address[0],
            comptroller,
            ZRX
        )
        const cBAT = await this.deployCToken(
            "BAT",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            BAT
        )
        const cTUSD = await this.deployCToken(
            "TUSD",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            TUSD
        )
        const cMKR = await this.deployCToken(
            "MKR",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            MKR
        )
        const cREP = await this.deployCToken(
            "REP",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            REP
        )
        const cUSDC = await this.deployCToken(
            "USDC",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            USDC
        )
        const cUSDT = await this.deployCToken(
            "USDT",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            USDT
        )
        const cWBTC = await this.deployCToken(
            "WBTC",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            WBTC
        )

        await this.supportMarket(comptroller, cZRX)
        await this.supportMarket(comptroller, cBAT)
        await this.supportMarket(comptroller, cDAI)
        await this.supportMarket(comptroller, cZRX)
        await this.supportMarket(comptroller, cUSDC)
        await this.supportMarket(comptroller, cUSDT)
        await this.supportMarket(comptroller, cTUSD)
        await this.supportMarket(comptroller, cMKR)
        await this.supportMarket(comptroller, cREP)
        await this.supportMarket(comptroller, cWBTC)
        await this.supportMarket(comptroller, cETH)

        const comptrollerScen = await ComptrollerScenario.new()
        await unitroller._setPendingImplementation(comptrollerScen.address)

        await this.allocateToken(BAT, cBAT, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(ZRX, cZRX, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(DAI, cDAI, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(USDC, cUSDC, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(USDT, cUSDT, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(TUSD, cTUSD, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(MKR, cMKR, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(REP, cREP, address[0], new BN(10).pow(new BN(32)))
        await this.allocateToken(WBTC, cWBTC, address[0], new BN(10).pow(new BN(32)))

        await FIN.allocateTo(address[0], new BN(10).pow(new BN(25)))
        await LPToken.allocateTo(address[0], new BN(10).pow(new BN(22)))

        await comptrollerScen._become(
            unitroller.address,
            new BN(10).pow(new BN(18)),
            [cZRX.address, cBAT.address, cDAI.address, cUSDC.address],
            []
        )

        await this.prepareUser(BAT, cBAT, address[4], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[4] })

        await this.prepareUser(BAT, cBAT, address[5], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[5] })

        await this.prepareUser(BAT, cBAT, address[6], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[6] })

        await this.prepareUser(BAT, cBAT, address[7], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[7] })

        await COMP.allocateTo(address[0], new BN(5).mul(new BN(10).pow(new BN(24))))
        await COMP.approve(comptroller.address, new BN(5).mul(new BN(10).pow(new BN(24))))

        await comptroller.setCompAddress(COMP.address)
        await comptroller.refreshCompSpeeds()

        this.erc20Tokens.push(DAI.address)
        this.erc20Tokens.push(USDC.address)
        this.erc20Tokens.push(USDT.address)
        this.erc20Tokens.push(TUSD.address)
        this.erc20Tokens.push(MKR.address)
        this.erc20Tokens.push(BAT.address)
        this.erc20Tokens.push(ZRX.address)
        this.erc20Tokens.push(REP.address)
        this.erc20Tokens.push(WBTC.address)
        this.erc20Tokens.push(ETH_ADDR)
        this.erc20Tokens.push(LPToken.address)
        this.erc20Tokens.push(FIN.address)

        this.cTokens.push(cDAI.address)
        this.cTokens.push(cUSDC.address)
        this.cTokens.push(cUSDT.address)
        this.cTokens.push(addressZero)
        this.cTokens.push(addressZero)
        this.cTokens.push(cBAT.address)
        this.cTokens.push(cZRX.address)
        this.cTokens.push(cREP.address)
        this.cTokens.push(cWBTC.address)
        this.cTokens.push(cETH.address)
        this.cTokens.push(addressZero)
        this.cTokens.push(addressZero)
        await comptroller.fastForward(300000)

        this.comptroller = comptroller
        this.COMPTokenAddress = COMP.address;
    }

    public async deployCompoundWhitePaper(address: string[]) {

        let unitroller = await Unitroller.new()
        const priceOracle = await FixedPriceOracle.new(new BN(10).pow(new BN(18)))

        const comptrollerScenG2 = await ComptrollerScenarioG2.new()
        await unitroller._setPendingImplementation(comptrollerScenG2.address)
        await comptrollerScenG2._become(unitroller.address)
        const comptroller = await ComptrollerScenario.at(unitroller.address)

        const USDC = await FaucetTokenHarness.new(0, "USD Coin", 6, "USDC")
        const USDT = await FaucetTokenHarness.new(0, "Tether", 6, "USDT")
        const WBTC = await FaucetTokenHarness.new(0, "WBTC", 8, "WBTC")
        const FIN = await FaucetTokenHarness.new(0, "FIN", 18, "FIN")
        const LPToken = await FaucetTokenHarness.new(0, "LPToken", 18, "LPToken")
        const DAI = await FaucetTokenHarness.new(0, "DAI", 18, "DAI")
        const ZRX = await FaucetTokenHarness.new(0, "ZRX", 18, "ZRX")
        const BAT = await FaucetTokenHarness.new(0, "BAT", 18, "BAT")
        const TUSD = await FaucetTokenHarness.new(0, "TUSD", 18, "TUSD")
        const MKR = await FaucetTokenHarness.new(0, "MKR", 18, "MKR")
        const REP = await FaucetTokenHarness.new(0, "REP", 18, "REP")
        const COMP = await FaucetTokenHarness.new(0, "COMP", 18, "COMP")

        await comptroller._setPriceOracle(priceOracle.address)
        await comptroller._setMaxAssets(20)
        await comptroller._setCloseFactor(new BN(5).mul(new BN(10).pow(new BN(17))))
        await comptroller._setLiquidationIncentive(new BN(11).mul(new BN(10).pow(new BN(17))))

        const fixedInterestRateModel = await FixedInterestRateModel.new(new BN(5).mul(new BN(10).pow(new BN(12))))
        const whitePaperInterestRateModel = await WhitePaperInterestRateModel.new(
            new BN(5).mul(new BN(10).pow(new BN(13))),
            new BN(2).mul(new BN(10).pow(new BN(17))))

        let interestRateModelAddress = whitePaperInterestRateModel.address
        const interestRateModel = await InterestRateModel.at(interestRateModelAddress)

        const cETH = await CEtherScenarioContract.new(
            "cETH",
            "cETH",
            8,
            address[0],
            comptroller.address,
            interestRateModel.address,
            new BN(10).pow(new BN(17)),
        )

        const cDAI = await this.deployCToken(
            "DAI",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            DAI
        )
        const cZRX = await this.deployCToken(
            "ZRX",
            new BN(10).pow(new BN(13)),
            address[0],
            comptroller,
            ZRX
        )
        const cBAT = await this.deployCToken(
            "BAT",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            BAT
        )
        const cTUSD = await this.deployCToken(
            "TUSD",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            TUSD
        )
        const cMKR = await this.deployCToken(
            "MKR",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            MKR
        )
        const cREP = await this.deployCToken(
            "REP",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            REP
        )
        const cUSDC = await this.deployCToken(
            "USDC",
            new BN(10).pow(new BN(13)),
            address[0],
            comptroller,
            USDC
        )
        const cUSDT = await this.deployCToken(
            "USDT",
            new BN(10).pow(new BN(13)),
            address[0],
            comptroller,
            USDT
        )
        const cWBTC = await this.deployCToken(
            "WBTC",
            new BN(10).pow(new BN(17)),
            address[0],
            comptroller,
            WBTC
        )

        await this.supportMarket(comptroller, cZRX)
        await this.supportMarket(comptroller, cBAT)
        await this.supportMarket(comptroller, cDAI)
        await this.supportMarket(comptroller, cZRX)
        await this.supportMarket(comptroller, cUSDC)
        await this.supportMarket(comptroller, cUSDT)
        await this.supportMarket(comptroller, cTUSD)
        await this.supportMarket(comptroller, cMKR)
        await this.supportMarket(comptroller, cREP)
        await this.supportMarket(comptroller, cWBTC)
        await this.supportMarket(comptroller, cETH)

        const comptrollerScen = await ComptrollerScenario.new()
        await unitroller._setPendingImplementation(comptrollerScen.address)

        await this.allocateToken(BAT, cBAT, address[0], new BN(10).pow(new BN(22)))
        await this.allocateToken(ZRX, cZRX, address[0], new BN(10).pow(new BN(22)))
        await this.allocateToken(DAI, cDAI, address[0], new BN(10).pow(new BN(22)))
        await this.allocateToken(USDC, cUSDC, address[0], new BN(10).pow(new BN(10)))
        await this.allocateToken(USDT, cUSDT, address[0], new BN(10).pow(new BN(10)))
        await this.allocateToken(TUSD, cTUSD, address[0], new BN(10).pow(new BN(22)))
        await this.allocateToken(MKR, cMKR, address[0], new BN(10).pow(new BN(22)))
        await this.allocateToken(REP, cREP, address[0], new BN(10).pow(new BN(22)))
        await this.allocateToken(WBTC, cWBTC, address[0], new BN(10).pow(new BN(12)))

        await FIN.allocateTo(address[0], new BN(10).pow(new BN(25)))
        await LPToken.allocateTo(address[0], new BN(10).pow(new BN(22)))


        await this.prepareUser(BAT, cBAT, address[4], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[4] })
        await cUSDC.borrow(new BN(2).mul(new BN(10).pow(new BN(6))), { from: address[4] })
        await cDAI.borrow(new BN(10).pow(new BN(18)), { from: address[4] })

        await this.prepareUser(BAT, cBAT, address[5], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[5] })
        await cUSDC.borrow(new BN(2).mul(new BN(10).pow(new BN(6))), { from: address[5] })
        await cDAI.borrow(new BN(10).pow(new BN(18)), { from: address[5] })

        await this.prepareUser(BAT, cBAT, address[6], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[6] })
        await cUSDC.borrow(new BN(2).mul(new BN(10).pow(new BN(6))), { from: address[6] })
        await cDAI.borrow(new BN(10).pow(new BN(18)), { from: address[6] })

        await this.prepareUser(BAT, cBAT, address[7], comptroller, new BN(6).mul(new BN(10).pow(new BN(18))))
        await cZRX.borrow(new BN(10).pow(new BN(18)), { from: address[7] })
        await cUSDC.borrow(new BN(2).mul(new BN(10).pow(new BN(6))), { from: address[7] })
        await cDAI.borrow(new BN(10).pow(new BN(18)), { from: address[7] })

        await comptrollerScen._become(
            unitroller.address,
            new BN(10).pow(new BN(18)),
            [cZRX.address, cBAT.address, cDAI.address, cUSDC.address],
            []
        )

        await COMP.allocateTo(address[0], new BN(5).mul(new BN(10).pow(new BN(24))))
        await COMP.approve(comptroller.address, new BN(5).mul(new BN(10).pow(new BN(24))))
        await comptroller.setCompAddress(COMP.address)
        await comptroller.refreshCompSpeeds()

        this.erc20Tokens.push(DAI.address)
        this.erc20Tokens.push(USDC.address)
        this.erc20Tokens.push(USDT.address)
        this.erc20Tokens.push(TUSD.address)
        this.erc20Tokens.push(MKR.address)
        this.erc20Tokens.push(BAT.address)
        this.erc20Tokens.push(ZRX.address)
        this.erc20Tokens.push(REP.address)
        this.erc20Tokens.push(WBTC.address)
        this.erc20Tokens.push(ETH_ADDR)
        this.erc20Tokens.push(LPToken.address)
        this.erc20Tokens.push(FIN.address)

        this.cTokens.push(cDAI.address)
        this.cTokens.push(cUSDC.address)
        this.cTokens.push(cUSDT.address)
        this.cTokens.push(addressZero)
        this.cTokens.push(addressZero)
        this.cTokens.push(cBAT.address)
        this.cTokens.push(cZRX.address)
        this.cTokens.push(cREP.address)
        this.cTokens.push(cWBTC.address)
        this.cTokens.push(cETH.address)
        this.cTokens.push(addressZero)
        this.cTokens.push(addressZero)

        await comptroller.fastForward(300000)
        this.comptroller = comptroller

        this.COMPTokenAddress = COMP.address;


    }


    public async prepareUser(erc20Token: t.FaucetTokenInstance,
        cToken: t.CErc20DelegatorScenarioInstance,
        user: string,
        comptroller: t.ComptrollerScenarioInstance,
        amount: BN) {
        await erc20Token.allocateTo(user, amount.toString(), { from: user })
        await erc20Token.approve(cToken.address, amount.toString(), { from: user })
        await cToken.mint(amount.toString(), { from: user })
        await comptroller.enterMarkets([cToken.address], { from: user })
    }

    public async allocateToken(erc20Token: t.FaucetTokenInstance,
        cToken: t.CErc20DelegatorScenarioInstance,
        user: string,
        amount: BN = new BN(10).pow(new BN(22))) {
        const cAmount = amount.div(new BN(2))
        await erc20Token.allocateTo(user, amount.toString())
        await erc20Token.approve(cToken.address, amount.toString())
        await cToken.mint(cAmount.toString())
    }

    public async supportMarket(comptroller: t.ComptrollerScenarioInstance, cToken: t.CErc20DelegatorScenarioInstance) {

        await comptroller._supportMarket(cToken.address)
        await comptroller._setCollateralFactor(
            cToken.address,
            new BN(5).mul(new BN(10).pow(new BN(17)))
        )
    }

    public async deployCToken(name: string,
        initialExchangeRate: BN,
        owner: string,
        comp: t.ComptrollerScenarioInstance,
        erc20: t.FaucetTokenInstance) {
        const whitePaperInterestRateModel = await WhitePaperInterestRateModel.new(
            new BN(5).mul(new BN(10).pow(new BN(13))),
            new BN(2).mul(new BN(10).pow(new BN(17))))
        let interestRateModelAddress = whitePaperInterestRateModel.address
        const interestRateModel = await InterestRateModel.at(interestRateModelAddress)
        const cName = "c" + name
        const dele = await CErc20Delegate.new()
        const cToken = await CErc20DelegatorScenario.new(
            erc20.address,
            comp.address,
            interestRateModel.address,
            initialExchangeRate,
            cName,
            cName,
            8,
            owner,
            dele.address,
            "0x0"
        )

        return cToken

    }


    public getERC20AddressesFromCompound(): Array<string> {
        return this.erc20Tokens
    }

    public getCompoundAddresses(): Array<string> {
        return this.cTokens
    }

    public async deployMockChainLinkAggregators(): Promise<Array<string>> {
        const network = process.env.NETWORK;
        if (this.mockChainlinkAggregators.length != 0) return this.mockChainlinkAggregators;
        await Promise.all(
            tokenData.tokens.map(async (token: any) => {
                let addr;
                if (network == "development" || "coverage" || !network) {
                    addr = (
                        await MockChainLinkAggregator.new(
                            token.decimals,
                            new BN(token.latestAnswer)
                        )
                    ).address;
                } else if (network == "ropsten") {
                    addr = token.ropsten.aggregatorAddress;
                } else if (network == "mainnet" || network == "mainnet-fork") {
                    addr = token.mainnet.aggregatorAddress;
                }
                this.mockChainlinkAggregators.push(addr);
            })
        );
        let ETHaddr = (
            await MockChainLinkAggregator.new(
                tokenData.ETH.decimals,
                new BN(tokenData.ETH.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(ETHaddr);

        let LPaddr = (
            await MockChainLinkAggregator.new(
                tokenData.LPToken.decimals,
                new BN(tokenData.LPToken.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(LPaddr);

        let DeFiner = (
            await MockChainLinkAggregator.new(
                tokenData.DeFiner.decimals,
                new BN(tokenData.DeFiner.latestAnswer)
            )
        ).address;
        this.mockChainlinkAggregators.push(DeFiner);

        return this.mockChainlinkAggregators;
    }

    public async deploySavingAccount(): Promise<t.SavingAccountWithControllerInstance> {
        this.erc20Tokens = await this.getERC20AddressesFromCompound();

        const cTokens: Array<string> = await this.getCompoundAddresses();
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.globalConfig = await GlobalConfig.new();
        this.constant = await Constant.new();
        this.bank = await Bank.new();

        await this.bank.initialize(this.globalConfig.address);

        const accountTokenLib = await AccountTokenLib.new();
        const bitMapLib = await BitmapLib.new();
        const utils = await Utils.new();
        Utils.setAsDeployed(utils);

        try {
            await SavingLib.link(utils);
        } catch (err) {
            // Do nothing
        }

        const savingLib = await SavingLib.new();

        AccountTokenLib.setAsDeployed(accountTokenLib);
        BitmapLib.setAsDeployed(bitMapLib);
        SavingLib.setAsDeployed(savingLib);

        try {
            await SavingAccount.link(utils);
            await SavingAccount.link(savingLib);
            await SavingAccountWithController.link(utils);
            await SavingAccountWithController.link(savingLib);
            await Accounts.link(utils);
            await Accounts.link(accountTokenLib);
            await TokenRegistry.link(utils);
        } catch (error) { }

        this.accounts = await Accounts.new();
        Accounts.setAsDeployed(this.accounts);
        await this.accounts.initialize(this.globalConfig.address);

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        const chainLinkOracle: t.ChainLinkAggregatorInstance = await ChainLinkAggregator
            .new
            // this.tokenInfoRegistry.address
            ();
        await chainLinkOracle.initialize(this.globalConfig.address);

        await this.tokenInfoRegistry.initialize(this.globalConfig.address);

        // Deploy Upgradability contracts
        const proxyAdmin = await ProxyAdmin.new();
        // ProxyAdmin.setAsDeployed(proxyAdmin);

        const savingAccountProxy = await SavingAccountProxy.new();
        const accountsProxy = await AccountsProxy.new();
        const bankProxy = await BankProxy.new();

        // Global Config initialize
        await this.globalConfig.initialize(
            bankProxy.address,
            savingAccountProxy.address,
            this.tokenInfoRegistry.address,
            accountsProxy.address,
            this.constant.address,
            chainLinkOracle.address
        );

        const savingAccount: t.SavingAccountWithControllerInstance = await SavingAccountWithController.new();
        SavingAccountWithController.setAsDeployed(savingAccount);

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                this.comptroller.address
            )
            .encodeABI();

        const accounts_initialize_data = this.accounts.contract.methods
            .initialize(this.globalConfig.address, this.comptroller.address)
            .encodeABI();

        const bank_initialize_data = this.bank.contract.methods
            .initialize(this.globalConfig.address, this.comptroller.address)
            .encodeABI();

        await savingAccountProxy.initialize(
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.initialize(
            this.accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.initialize(this.bank.address, proxyAdmin.address, bank_initialize_data);
        const proxy = SavingAccountWithController.at(savingAccountProxy.address);
        this.accounts = Accounts.at(accountsProxy.address);
        this.bank = Bank.at(bankProxy.address);

        return proxy;
    }

    private async initializeTokenInfoRegistry(
        cTokens: Array<string>,
        aggregators: Array<string>
    ): Promise<void> {
        await Promise.all(
            tokenData.tokens.map(async (token: any, i: number) => {
                const tokenAddr = this.erc20Tokens[i];
                const decimals = token.decimals;
                const isTransferFeeEnabled = token.isFeeEnabled;
                const isSupportedOnCompound = true;
                const cToken = cTokens[i];
                const chainLinkOracle = aggregators[i];
                await this.tokenInfoRegistry.addToken(
                    tokenAddr,
                    decimals,
                    isTransferFeeEnabled,
                    isSupportedOnCompound,
                    cToken,
                    chainLinkOracle
                );
            })
        );

        await this.tokenInfoRegistry.addToken(
            ETH_ADDR,
            18,
            false,
            true,
            cTokens[9],
            aggregators[9]
        );

        await this.tokenInfoRegistry.addToken(
            this.erc20Tokens[10],
            18,
            false,
            false,
            cTokens[10],
            aggregators[10]
        );

        await this.tokenInfoRegistry.addToken(
            this.erc20Tokens[11],
            18,
            false,
            false,
            cTokens[11],
            aggregators[11]
        );
    }

    public async getCOMPTokenAddress(): Promise<string> {
        return this.COMPTokenAddress;
    }

    // This acts the same as deploySavingAccount, but this one can be used in truffle test suite.

    public async deploySavingAccountTruffle(): Promise<t.SavingAccountWithControllerInstance> {
        this.erc20Tokens = await this.getERC20AddressesFromCompound();
        const cTokens: Array<string> = await this.getCompoundAddresses();
        const aggregators: Array<string> = await this.deployMockChainLinkAggregators();

        this.globalConfig = await GlobalConfig.new();
        this.constant = await Constant.new();
        this.bank = await Bank.new();
        await this.bank.initialize(this.globalConfig.address);

        this.accounts = await Accounts.new();
        await this.accounts.initialize(this.globalConfig.address);

        this.tokenInfoRegistry = await TokenRegistry.new();
        await this.initializeTokenInfoRegistry(cTokens, aggregators);

        const chainLinkOracle: t.ChainLinkAggregatorInstance = await ChainLinkAggregator
            .new
            // this.tokenInfoRegistry.address
            ();

        await chainLinkOracle.initialize(this.globalConfig.address);

        await this.tokenInfoRegistry.initialize(this.globalConfig.address);

        // Deploy Upgradability contracts
        const proxyAdmin = await ProxyAdmin.new();
        const savingAccountProxy = await SavingAccountProxy.new();
        const accountsProxy = await AccountsProxy.new();
        const bankProxy = await BankProxy.new();

        // Global Config initialize
        await this.globalConfig.initialize(
            bankProxy.address,
            savingAccountProxy.address,
            this.tokenInfoRegistry.address,
            accountsProxy.address,
            this.constant.address,
            chainLinkOracle.address
        );

        const savingAccount: t.SavingAccountWithControllerInstance = await SavingAccountWithController.new();

        const initialize_data = savingAccount.contract.methods
            .initialize(
                this.erc20Tokens,
                cTokens,
                this.globalConfig.address,
                this.comptroller.address
            )
            .encodeABI();

        const bank_initialize_data = this.bank.contract.methods
            .initialize(this.globalConfig.address, this.comptroller.address)
            .encodeABI();

        const accounts_initialize_data = this.accounts.contract.methods
            .initialize(this.globalConfig.address, this.comptroller.address)
            .encodeABI();

        await savingAccountProxy.initialize(
            savingAccount.address,
            proxyAdmin.address,
            initialize_data
        );

        await accountsProxy.initialize(
            this.accounts.address,
            proxyAdmin.address,
            accounts_initialize_data
        );

        await bankProxy.initialize(this.bank.address, proxyAdmin.address, bank_initialize_data);

        const proxy = SavingAccountWithController.at(savingAccountProxy.address);
        this.accounts = Accounts.at(accountsProxy.address);
        this.bank = Bank.at(bankProxy.address);

        return proxy;
    }
}
