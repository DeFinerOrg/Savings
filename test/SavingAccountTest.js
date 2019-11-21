const SavingAccount = artifacts.require("SavingAccount");
const waitForEvent = (_event, _from = 0, _to = 'latest') =>
    new Promise((resolve, reject) =>
        _event({ fromBlock: _from, toBlock: _to }, (e, ev) =>
            e ? reject(e) : resolve(ev)))
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'))

const ENV = require("./../environments/env_develop")

function toWei(eth) {
    return Web3.utils.toWei(eth, 'ether');
}

function fromWei(wei) {
    return Web3.utils.fromWei(wei, 'ether');
}

contract("SavingAccount", accounts => {
    let account_one = accounts[0];
    let instance;
    let coinLength;

    beforeEach(async () => {
        instance = await SavingAccount.deployed();      
        const events = new web3.eth.Contract(instance.contract._jsonInterface, instance.contract._address).events;
        await waitForEvent(events.LogNewPriceTicker);
        
        coinLength = await instance.getCoinLength.call();
        assert.equal(coinLength, ENV.tokenAddresses.length);
    });

    it("should update conversion rate successfully.", async () => {
        for (let i = 0; i < coinLength; i++) {
            let rate = await instance.getCoinToUsdRate.call(i);
            assert.isTrue(rate > 0);
        }
    });

    it("should return empty market state", async () => {
        const result = await instance.getMarketState.call({ from: account_one });
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
        const tokenAddress = await instance.getCoinAddress.call(0);
        const result = await instance.getTokenState.call(tokenAddress, { from: account_one });        
        assert.equal(result.deposits, 0);
        assert.equal(result.loans, 0);
        assert.equal(result.collateral, 0);
    });

    it("should return zero balances", async () => {
        const result = await instance.getBalances.call({ from: account_one });
        assert.equal(result.addresses.length, coinLength);
        assert.equal(result.balances.length, coinLength);
        // should have all zeros
        for (let i = 0; i < coinLength; i++)
            assert.equal(result[1][i], 0);
    });

    it("should return correct balances after deposit", async () => {
        let tokenAddress = await instance.getCoinAddress(0);
        
        const eth = '1';
        const deposit = toWei(eth);
        await instance.depositToken(tokenAddress, deposit, { value: deposit, from: account_one, gas: 600000 });
        
        const balance = fromWei(await instance.tokenBalanceOf(tokenAddress, { from: account_one }));
        assert.equal(eth, balance);
    });
});

