const SavingAccount = artifacts.require("SavingAccount");

contract("SavingAccount", accounts => {
    it("should return 16 coins.", () =>
        SavingAccount.deployed()
            .then(instance => instance.getCoinLength.call())
            .then(length => {
                assert.equal(
                    length,
                    16,
                    "The number of coins should be 16.");
            }));
});

