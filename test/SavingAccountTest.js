const SavingAccount = artifacts.require("SavingAccount");
const waitForEvent = (_event, _from = 0, _to = 'latest') =>
    new Promise((resolve, reject) =>
        _event({ fromBlock: _from, toBlock: _to }, (e, ev) =>
            e ? reject(e) : resolve(ev)))
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'))


contract("SavingAccount", accounts => {
    let account_one = accounts[0];
    let instance;
    let coinLength;

    beforeEach(async () => (
        { contract } = await SavingAccount.deployed(),
        { methods, events } = new web3.eth.Contract(
            contract._jsonInterface,
            contract._address
        )
    ))

    beforeEach(async () => {
        instance = await SavingAccount.deployed();
        await waitForEvent(events.LogNewPriceTicker);
        coinLength = await instance.getCoinLength.call();
        assert.equal(coinLength, 16);
    })

    it("should update conversion rate successfully.", async () => {
        for (let i = 0; i < coinLength; i++) {
            let rate = await instance.getCoinToUsdRate.call(i);
            assert.isTrue(rate > 0);
        }
    });

    it("should return empty market state", async () => {
        const result = await instance.getMarketState.call({ from: account_one });
        assert.equal(result.length, 4);
        assert.equal(result[0].length, coinLength);
        assert.equal(result[1].length, coinLength);
        assert.equal(result[2].length, coinLength);
        assert.equal(result[3].length, coinLength);
        // should have all zeros
        for (let i = 0; i < coinLength; i++) {
            assert.equal(result[1][i], 0);
            assert.equal(result[2][i], 0);
            assert.equal(result[3][i], 0);
        }
    });

    it("should return empty token state", async () => {
        const tokenAddress = await instance.getCoinAddress.call(0);
        const result = await instance.getTokenState.call(tokenAddress, { from: account_one });
        assert.equal(result.length, 4);
        assert.equal(result[1], 0);
        assert.equal(result[2], 0);
        assert.equal(result[3], 0);
    });

    it("should return zero balances", async () => {
        const tuple = await instance.getBalances.call({ from: account_one });
        assert.equal(tuple.length, 2);
        assert.equal(tuple[0].length, coinLength);
        assert.equal(tuple[1].length, coinLength);
        // should have all zeros
        for (let i = 0; i < coinLength; i++)
            assert.equal(tuple[1][i], 0);
    });

    it("should return correct balances after deposit", async () => {
        let coin_address_0 = await instance.getCoinAddress.call(0);
        let coin_address_5 = await instance.getCoinAddress.call(5);
        let balance = await web3.eth.getBalance(account_one)
        // console.log("amount: " + balance)

        // await instance.depositToken(coin_address_0, 100, { from: account_one, gas: 600000 });
        // await instance.depositToken.call("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 200, { from: account_one });

        // const tuple = await instance.getBalances.call({ from: account_one });
        // assert.equal(tuple[0].length, coinsCount);
        // assert.equal(tuple[1].length, coinsCount);
        // // should have all zeros
        // for (let i = 0; i < coinsCount; i++)
        //     assert.equal(tuple[1][i], 0);
    });
});

