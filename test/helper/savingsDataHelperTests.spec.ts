import { TestEngine } from "../../test-helpers/TestEngine";
import * as t from "../../types/truffle-contracts/index";

const { BN, expectRevert} = require("@openzeppelin/test-helpers");
const chai = require("chai");
const expect = chai.expect;
const SavingsDataHelper: any = artifacts.require("SavingsDataHelper");
const Claim: any = artifacts.require("Claim");

contract("SavingsDataHelper tests", function(){
    let savingAccount: t.SavingAccountWithControllerInstance;
    let localClaim: t.ClaimInstance;
    let localSavingsDataHelper: t.SavingsDataHelperInstance;
    let testEngine: TestEngine;    

    before(async function(){
        this.timeout(0);
        testEngine = new TestEngine();
    });    

    beforeEach(async function(){
    	this.timeout(0);
    	savingAccount = await testEngine.deploySavingAccount();
        localClaim = await Claim.new();
  	    localSavingsDataHelper = await SavingsDataHelper.new(testEngine.globalConfig.address, localClaim.address);
    });

    describe("SavingsDataHelper tests", async () => {
    	describe("getSavingsHeaderInfo() test", async () => {
    	  it("should get Savings Headers info", async() => {
    	    const data = await localSavingsDataHelper.getSavingsHeaderInfo();
    	    expect(data.globalConfig).to.be.equal(testEngine.globalConfig.address);
    	    const finAddress = await savingAccount.FIN_ADDR();
    	    expect(data.finToken).to.be.equal(finAddress);
    	    expect(data.accounts).to.be.equal(testEngine.accounts.address);
    	    expect(data.tokenRegistry).to.be.equal(testEngine.tokenInfoRegistry.address);
    	    expect(data.bank).to.be.equal(testEngine.bank.address);
    	  });
    	});

    	describe("getAllTokensData() test", async () => {
    	  it("should get Saving tokens info", async() => {
    	    const data = await localSavingsDataHelper.getAllTokensData();
    	    const trTokens = await testEngine.tokenInfoRegistry.getTokens();
    	    expect(data.tokens).to.deep.include.members(trTokens, "expected list of tokens not returned");
    	    for(let idx in data.tokens){
    	        const token = data.tokens[idx];
    	    	const decimals = await testEngine.tokenInfoRegistry.getTokenDecimals(token);
    	    	expect(Number(data.decimals[idx])).to.equal(decimals.toNumber(), `decimals not correct for ${token}, expected: ${decimals}, but got: ${data.decimals[idx]}`);
    	    	const enabled = await testEngine.tokenInfoRegistry.isTokenEnabled(token);
    	    	expect(data.enabled[idx]).to.equal(enabled, `enabled not correct for ${token}, expected: ${enabled}, but got: ${data.enabled[idx]}`);
    	    	const cToken = await testEngine.tokenInfoRegistry.getCToken(token);
    	    	expect(data.cToken[idx]).to.equal(cToken, `cToken not correct for ${token}, expected: ${token}, but got: ${data.cToken[idx]}`);
    	    	const isSupportedOnCompound = await testEngine.tokenInfoRegistry.isSupportedOnCompound(token);
    	    	expect(data.isSupportedOnCompound[idx]).to.equal(isSupportedOnCompound, `isSupportedOnCompouned not correct for ${token}, expected: ${isSupportedOnCompound}, but got: ${data.isSupportedOnCompound[idx]}`);
    	    	const chainLinkOracle = await testEngine.tokenInfoRegistry.getChainLinkAggregator(token);
    	    	expect(data.chainLinkOracle[idx]).to.equal(chainLinkOracle, `chainLinkOracle not correct for ${token}, expected: ${chainLinkOracle}, but got: ${data.chainLinkOracle[idx]}`);
    	    	const borrowLTV = await testEngine.tokenInfoRegistry.getBorrowLTV(token);
    	    	expect(Number(data.borrowLTV[idx])).to.equal(borrowLTV.toNumber(), `borrowLTV not correct for ${token}, expected: ${borrowLTV}, but got: ${data.borrowLTV[idx]}`);
    	    	const price = await testEngine.tokenInfoRegistry.priceFromAddress(token);
    	    	expect(new BN(data.price[idx]).eq(price), `price not correct for ${token}, expected: ${price}, but got: ${data.price[idx]}`).to.be.true;
    	    }
    	  });
    	});

    	describe("getAllData() test", async () => {
    	  it("should get all Savings Data", async() => {
    	    const data = await localSavingsDataHelper.getAllData();
    	    expect(data.savingsHeaderInfo.globalConfig).to.be.equal(testEngine.globalConfig.address);
    	    const finAddress = await savingAccount.FIN_ADDR();
    	    expect(data.savingsHeaderInfo.finToken).to.be.equal(finAddress);
    	    expect(data.savingsHeaderInfo.accounts).to.be.equal(testEngine.accounts.address);
    	    expect(data.savingsHeaderInfo.tokenRegistry).to.be.equal(testEngine.tokenInfoRegistry.address);
    	    expect(data.savingsHeaderInfo.bank).to.be.equal(testEngine.bank.address);
    	    const trTokens = await testEngine.tokenInfoRegistry.getTokens();
    	    expect(data.savingsTokensInfo.tokens).to.deep.include.members(trTokens, "expected list of tokens not returned");
    	    for(let idx in data.savingsTokensInfo.tokens){
    	        const token = data.savingsTokensInfo.tokens[idx];
    	    	const decimals = await testEngine.tokenInfoRegistry.getTokenDecimals(token);
    	    	expect(Number(data.savingsTokensInfo.decimals[idx])).to.equal(decimals.toNumber(), `decimals not correct for ${token}, expected: ${decimals}, but got: ${data.savingsTokensInfo.decimals[idx]}`);
    	    	const enabled = await testEngine.tokenInfoRegistry.isTokenEnabled(token);
    	    	expect(data.savingsTokensInfo.enabled[idx]).to.equal(enabled, `enabled not correct for ${token}, expected: ${enabled}, but got: ${data.savingsTokensInfo.enabled[idx]}`);
    	    	const cToken = await testEngine.tokenInfoRegistry.getCToken(token);
    	    	expect(data.savingsTokensInfo.cToken[idx]).to.equal(cToken, `cToken not correct for ${token}, expected: ${token}, but got: ${data.savingsTokensInfo.cToken[idx]}`);
    	    	const isSupportedOnCompound = await testEngine.tokenInfoRegistry.isSupportedOnCompound(token);
    	    	expect(data.savingsTokensInfo.isSupportedOnCompound[idx]).to.equal(isSupportedOnCompound, `isSupportedOnCompouned not correct for ${token}, expected: ${isSupportedOnCompound}, but got: ${data.savingsTokensInfo.isSupportedOnCompound[idx]}`);
    	    	const chainLinkOracle = await testEngine.tokenInfoRegistry.getChainLinkAggregator(token);
    	    	expect(data.savingsTokensInfo.chainLinkOracle[idx]).to.equal(chainLinkOracle, `chainLinkOracle not correct for ${token}, expected: ${chainLinkOracle}, but got: ${data.savingsTokensInfo.chainLinkOracle[idx]}`);
    	    	const borrowLTV = await testEngine.tokenInfoRegistry.getBorrowLTV(token);
    	    	expect(Number(data.savingsTokensInfo.borrowLTV[idx])).to.equal(borrowLTV.toNumber(), `borrowLTV not correct for ${token}, expected: ${borrowLTV}, but got: ${data.savingsTokensInfo.borrowLTV[idx]}`);
    	    	const price = await testEngine.tokenInfoRegistry.priceFromAddress(token);
    	    	expect(new BN(data.savingsTokensInfo.price[idx]).eq(price), `price not correct for ${token}, expected: ${price}, but got: ${data.savingsTokensInfo.price[idx]}`).to.be.true;
    	    }
    	  });
    	});

    });
});
