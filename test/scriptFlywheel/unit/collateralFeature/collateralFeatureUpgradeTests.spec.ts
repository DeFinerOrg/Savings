contract("Collateral Feature Upgrade Tests", async (accounts) => {
    it("should default to disable all for new user");

    describe("when an existing user", async () => {
        describe("calls a functions", async () => {
            it("should initialize collateral status when existing user borrow");

            it("should initialize collateral status when existing user withdraw");

            it("should initialize collateral status when existing user deposit");

            it("should initialize collateral status when existing user repay");

            it("should initialize collateral status when existing user calls setCollateral");
        });

        describe("calls init collateral", async () => {
            it("user can init collateral status for his own account");

            it("no change should be done upon second time call to init collateral");
        });

        describe("has deposits", async () => {
            describe("should enable collateral for all his deposit tokens");
        });

        describe("has borrows", async () => {
            it("should enable collateral for all his deposit tokens");
        });
    });
});
