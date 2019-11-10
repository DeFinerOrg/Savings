const SavingAccount = artifacts.require("SavingAccount");
const waitForEvent = (_event, _from = 0, _to = 'latest') =>
  new Promise ((resolve,reject) =>
    _event({fromBlock: _from, toBlock: _to}, (e, ev) =>
      e ? reject(e) : resolve(ev)))
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'))


contract("SavingAccount", accounts => {
    beforeEach(async () => (
        { contract } = await SavingAccount.deployed(),
            { methods, events } = new web3.eth.Contract(
                contract._jsonInterface,
                contract._address
            )
    ))

    it("should update conversion rate successfully.", async () => {
        await waitForEvent(events.LogNewPriceTicker);
        let instance = await SavingAccount.deployed();
        let coinLength = await instance.getCoinLength.call();
        assert.equal(coinLength, 16);
        for (let i = 0; i < coinLength; i++) {
            let rate = await instance.getCoinToUsdRate.call(i);
            assert.isTrue(rate > 0);
        }
    });

    it("should deposit token correctly.", async () => {
        await waitForEvent(events.LogNewPriceTicker);
        let instance = await SavingAccount.deployed();

        await instance.depositToken.call("0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359", 100);

        let balance = await instance.tokenBalanceOf.call("0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359");
        assert.equal(balance, 100);
    });
});

