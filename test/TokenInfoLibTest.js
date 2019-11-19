const TestTokenContract = artifacts.require("TestTokenContract");

contract("TestTokenContract", async accounts => {
    it("totalAmount should add interest when rate and time are 0.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 50, 0, 0);

        let balance = await instance.totalAmount.call(0);

        assert.equal(balance, 150);
    });

    it("totalAmount should add interest.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 50, 10**6, 0);

        let balance = await instance.totalAmount.call(100000);

        assert.equal(balance, 160);
    });

    it("totalAmount should be negative when balance is negative.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, 10, 0, 0);

        let balance = await instance.totalAmount.call(0);

        assert.equal(balance, -90);
    });

    it("viewInterest should return -1 interest when balance is negative.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, 0, 10 ** 6, 0);

        let interest = await instance.viewInterest.call(10**4);

        assert.equal(interest, -1);
    });

    it("viewInterest should return 0 interest when balance is negative.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, 0, 10 ** 6, 0);

        let interest = await instance.viewInterest.call(10**4 - 1);

        assert.equal(interest, 0);
    });

    it("viewInterest should add existing interest.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, 100, 10 ** 6, 0);

        let interest = await instance.viewInterest.call(10**4);

        assert.equal(interest, 99);
    });

    it("viewInterest should add existing interest.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, -100, 10 ** 6, 0);

        let interest = await instance.viewInterest.call(10**4);

        assert.equal(interest, -99);
    });

    it("minusAmount should update interest successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 10, 100, 0);

        await instance.minusAmount(5, 20, 0);

        let interest = await instance.viewInterest.call(0);
        assert.equal(interest, 5);
    });

    it("minusAmount should update interest and balance successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 10, 100, 0);

        await instance.minusAmount(15, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        assert.equal(interest, 0);
        assert.equal(totalAmount, 95);
    });

    it("minusAmount should update interest and balance to 0 successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 10, 100, 0);

        await instance.minusAmount(110, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        assert.equal(interest, 0);
        assert.equal(totalAmount, 0);
    });

    it("minusAmount should update interest and balance to negative successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 10, 100, 0);

        await instance.minusAmount(120, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        let rate = await instance.getRate.call();
        assert.equal(interest, 0);
        assert.equal(totalAmount, -10);
        assert.equal(rate, 20);
    });

    it("minusAmount should update successfully when initial balance is negative.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, -10, 10**10, 0);

        await instance.minusAmount(100, 0, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        let rate = await instance.getRate.call();
        assert.equal(interest, -10);
        assert.equal(totalAmount, -210);
        assert.equal(rate, 5 * 10**9);
    });

    it("addAmount should update interest successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, -10, 100, 0);

        await instance.addAmount(5, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        assert.equal(interest, -5);
        assert.equal(totalAmount, -105);
    });

    it("addAmount should update interest and balance successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, -10, 100, 0);

        await instance.addAmount(15, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        assert.equal(interest, 0);
        assert.equal(totalAmount, -95);
    });

    it("addAmount should update interest and balance to 0 successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, -10, 100, 0);

        await instance.addAmount(110, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        assert.equal(interest, 0);
        assert.equal(totalAmount, 0);
    });

    it("addAmount should update interest and balance to positive successfully.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(-100, -10, 100, 0);

        await instance.addAmount(120, 20, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        let rate = await instance.getRate.call();
        assert.equal(interest, 0);
        assert.equal(totalAmount, 10);
        assert.equal(rate, 20);
    });

    it("addAmount should update successfully when initial balance is positive.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 10, 10**10, 0);

        await instance.addAmount(100, 0, 0);

        let interest = await instance.viewInterest.call(0);
        let totalAmount = await instance.totalAmount.call(0);
        let rate = await instance.getRate.call();
        assert.equal(interest, 10);
        assert.equal(totalAmount, 210);
        assert.equal(rate, 5 * 10**9);
    });
});
