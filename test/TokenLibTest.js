const TestTokenContract = artifacts.require("TestTokenContract");

contract("TestTokenContract", async accounts => {
    it("should get total amount correctly.", async () => {
        let instance = await TestTokenContract.deployed();
        await instance.setTokenInfo(100, 0, 50, 0);
        let balance = await instance.totalAmount.call();
        assert.equal(balance, 150);
    });
});
