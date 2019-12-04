const SavingAccount = artifacts.require("SavingAccount");
const TestToken = artifacts.require("TestToken");

const waitForEvent = (_event, _from = 0, _to = 'latest') =>
    new Promise((resolve, reject) =>
        _event({ fromBlock: _from, toBlock: _to }, (e, ev) =>
            e ? reject(e) : resolve(ev)))
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'))

const ENV = require("./../environments/env_develop")
const GAS_LIMIT = 600000;

function toWei(eth) {
    return Web3.utils.toWei(eth, 'ether');
}

function fromWei(wei) {
    return Web3.utils.fromWei(wei, 'ether');
}

contract("SavingAccount", accounts => {
    const etherIndex = 0;
    const etherAddress = ENV.tokenAddresses[etherIndex];
    let account_one = accounts[0]; // owner of the contract and test token
    let account_two = accounts[2];
    let contract;
    let contractAddress;
    let testToken;
    let testTokenAddress;
    let testTokenIndex;
    let coinLength;

    let BN = web3.utils.BN;

    beforeEach(async () => {
        contract = await SavingAccount.deployed();
        contractAddress = contract.contract._address

        coinLength = await contract.getCoinLength();
        assert.equal(coinLength, ENV.tokenAddresses.length);

        testToken = await TestToken.deployed();
        testTokenAddress = testToken.contract._address;
        testTokenIndex = coinLength - 1;

        const testMoneyToSpend = new BN(100000000000);
        // mint tokens
        await testToken.mint(account_one, testMoneyToSpend, { from: account_one });
        await testToken.mint(account_two, testMoneyToSpend, { from: account_one });

        // allow the contract to spend on beahlf of account_two
        await testToken.increaseAllowance(contractAddress, testMoneyToSpend, { from: account_one, gas: GAS_LIMIT });
        await testToken.increaseAllowance(contractAddress, testMoneyToSpend, { from: account_two, gas: GAS_LIMIT });
    });

    it("should update conversion rate successfully.", async () => {
        // Wait for conversion rates
        const events = new web3.eth.Contract(contract.contract._jsonInterface, contract.contract._address).events;
        await waitForEvent(events.LogNewPriceTicker);

        for (let i = 0; i < coinLength - 1; i++) {
            let rate = await contract.getCoinToUsdRate(i);
            assert.isTrue(rate > 0);
        }
        // last token is test - no conversion rates
        assert.equal(await contract.getCoinToUsdRate(coinLength - 1), 0);
    });

    it("should return empty market state", async () => {
        const result = await contract.getMarketState();
        assert.equal(result.deposits.length, coinLength);
        assert.equal(result.loans.length, coinLength);
        assert.equal(result.collateral.length, coinLength);
        // should have all zeros
        for (let i = 0; i < coinLength; i++) {
            assert.equal(result.deposits[i], 0);
            assert.equal(result.loans[i], 0);
            assert.equal(result.collateral[i], 0);
        }
    });

    it("should return empty token state", async () => {
        const result = await contract.getTokenState(etherAddress, { from: account_one });
        assert.equal(result.deposits, 0);
        assert.equal(result.loans, 0);
        assert.equal(result.collateral, 0);
    });

    it("should return zero balances", async () => {
        const result = await contract.getBalances({ from: account_one });
        assert.equal(result.addresses.length, coinLength);
        assert.equal(result.balances.length, coinLength);
        // should have all zeros
        for (let i = 0; i < coinLength; i++)
            assert.equal(result[1][i], 0);
    });

    it("should return correct tokenBalanceOf after Ether deposit", async () => {
        const initialBalance = await contract.tokenBalanceOf(etherAddress, { from: account_one });

        const deposit = new BN(12345);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const balance = await contract.tokenBalanceOf(etherAddress, { from: account_one });
        assert.equal(initialBalance.add(deposit).toString(), balance.toString());
    });

    it("should return correct tokenBalanceOf after Ether withdraw", async () => {
        const deposit = new BN(123456789);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const beforeWithdraw = await contract.tokenBalanceOf(etherAddress, { from: account_one });
        const withdrawAmount = new BN(1234);
        await contract.withdrawToken(etherAddress, withdrawAmount, { from: account_one, gas: GAS_LIMIT });
        const balance = await contract.tokenBalanceOf(etherAddress, { from: account_one });
        assert.equal(beforeWithdraw.sub(withdrawAmount).toString(), balance.toString());
    });

    it("should return correct getBalances after Ether deposit", async () => {
        const initialBalance = await contract.tokenBalanceOf(etherAddress, { from: account_one });

        const deposit = new BN(23456);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const result = await contract.getBalances({ from: account_one });
        const newBalance = result[1][etherIndex];
        assert.equal(initialBalance.add(deposit).toString(), newBalance.toString());
    });

    it("should return correct getBalances after Ether withdraw", async () => {
        const deposit = new BN(123456789);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const beforeWithdraw = await contract.tokenBalanceOf(etherAddress, { from: account_one });
        const withdrawAmount = new BN(1234);
        await contract.withdrawToken(etherAddress, withdrawAmount, { from: account_one, gas: GAS_LIMIT });
        const result = await contract.getBalances({ from: account_one });
        const newBalance = result[1][etherIndex];
        assert.equal(beforeWithdraw.sub(withdrawAmount).toString(), newBalance.toString());
    });

    it("should return correct token state after Ether deposit", async () => {
        const initialState = await contract.getTokenState(etherAddress, { from: account_one });

        const deposit = new BN(306720);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const newState = await contract.getTokenState(etherAddress, { from: account_one });
        assert.equal(initialState.deposits.add(deposit).toString(), newState.deposits.toString());
        assert.equal(initialState.collateral.add(deposit).toString(), newState.collateral.toString());
        assert.equal(initialState.loans.toString(), '0');
    });

    it("should return correct token state after Ether withdraw", async () => {
        const deposit = new BN(123456789);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const initialState = await contract.getTokenState(etherAddress, { from: account_one });
        const withdrawAmount = new BN(1234);
        await contract.withdrawToken(etherAddress, withdrawAmount, { from: account_one, gas: GAS_LIMIT });
        const newState = await contract.getTokenState(etherAddress, { from: account_one });
        assert.equal(initialState.deposits.sub(withdrawAmount).toString(), newState.deposits.toString());
        assert.equal(initialState.collateral.sub(withdrawAmount).toString(), newState.collateral.toString());
        assert.equal(initialState.loans.toString(), '0');
    });

    it("should return correct market state after Ether deposit", async () => {
        const initialState = await contract.getMarketState();

        const deposit = new BN(306720);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const newState = await contract.getMarketState();

        // because interest is added to total deposit and collateral the new state could have been increased by more than deposited
        assert.isAtLeast(newState.deposits[etherIndex].toNumber(), initialState.deposits[etherIndex].add(deposit).toNumber(), "deposits");
        assert.isAtLeast(newState.collateral[etherIndex].toNumber(), initialState.collateral[etherIndex].add(deposit).toNumber(), "collateral");
        assert.equal(initialState.loans[etherIndex].toString(), newState.loans[etherIndex].toString(), "loans");
    });

    it("should return correct market state after Ether withdraw", async () => {
        const deposit = new BN(123456789);
        await contract.depositToken(etherAddress, deposit, { value: deposit, from: account_one, gas: GAS_LIMIT });

        const initialState = await contract.getMarketState();

        const withdrawAmount = new BN(1234);
        await contract.withdrawToken(etherAddress, withdrawAmount, { from: account_one, gas: GAS_LIMIT });

        const newState = await contract.getMarketState();

        assert.equal(initialState.deposits[etherIndex].sub(withdrawAmount).toString(), newState.deposits[etherIndex].toString());
        assert.equal(initialState.collateral[etherIndex].sub(withdrawAmount).toString(), newState.collateral[etherIndex].toString());
        assert.equal(initialState.loans[etherIndex].toString(), newState.loans[etherIndex].toString());
    });

    it("should trasnfer token to contract using depositToken", async () => {
        const initialState = {
            balanceOf: await testToken.balanceOf(contractAddress),
            getTokenState: (await contract.getTokenState(testTokenAddress, { from: account_two })).deposits,
            tokenBalanceOf: await contract.tokenBalanceOf(testTokenAddress, { from: account_two }),
            getBalances: (await contract.getBalances({ from: account_two }))[1][testTokenIndex],
            getMarketState: await contract.getMarketState()
        }

        let deposit = new BN(12345);
        await contract.depositToken(testTokenAddress, deposit, { from: account_two, gas: GAS_LIMIT });

        const newState = {
            balanceOf: await testToken.balanceOf(contractAddress),
            getTokenState: (await contract.getTokenState(testTokenAddress, { from: account_two })).deposits,
            tokenBalanceOf: await contract.tokenBalanceOf(testTokenAddress, { from: account_two }),
            getBalances: (await contract.getBalances({ from: account_two }))[1][testTokenIndex],
            getMarketState: await contract.getMarketState()
        }

        assert.equal(newState.balanceOf.sub(initialState.balanceOf).toString(), deposit.toString(), "balanceOf contract");
        assert.equal(newState.getTokenState.sub(initialState.getTokenState).toString(), deposit.toString(), "getTokenState for account_two");
        assert.equal(newState.tokenBalanceOf.sub(initialState.tokenBalanceOf).toString(), deposit.toString(), "tokenBalanceOf for account_two");
        assert.equal(newState.getBalances.sub(initialState.getBalances).toString(), deposit.toString(), "getBalances for account_two");

        assert.equal(newState.getMarketState.deposits[testTokenIndex].sub(initialState.getMarketState.deposits[testTokenIndex]).toString(), deposit.toString(), "getMarketState deposits");
        assert.equal(newState.getMarketState.collateral[testTokenIndex].sub(initialState.getMarketState.collateral[testTokenIndex]).toString(), deposit.toString(), "getMarketState collateral");
        assert.equal(newState.getMarketState.loans[testTokenIndex].toString(), initialState.getMarketState.loans[testTokenIndex].toString(), "getMarketState loans");
    });
});

