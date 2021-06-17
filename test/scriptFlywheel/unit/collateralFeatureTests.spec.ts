contract("Collateral Feature Tests", async (accounts) => {
    before(async () => {});

    beforeEach(async () => {});

    describe("setCollateral()", async () => {
        it("should fail when token is not present");

        describe("Enable Collateral", async () => {
            it("should enable collateral for a single token");

            it("should enable collateral for very first token");

            it("should enable collateral for very last token");

            it("should enable collateral for all tokens");
        });

        describe("Disable Collateral", async () => {
            it("should disable collateral for a single token");

            it("should disable collateral for very first token");

            it("should disable collateral for very last token");

            it("should disable collateral for all tokens");
        });
    });

    describe("setCollateral([],[])", async () => {
        it("should fail when token is not present");

        describe("Enable Collateral on multiple tokens", async () => {
            it("should enable collateral for a single token");

            it("should enable collateral for all tokens");

            it("should enable collateral for random tokens");

            it("should enable to collateral for first and the last one");
        });

        describe("Disable Collateral on multiple tokens", async () => {
            it("should disable collateral for a single token");

            it("should disable collateral for all tokens");

            it("should disable collateral for random tokens");

            it("should disable to collateral for first and the last one");
        });

        describe("Enable/Disable on multiple tokens", async () => {
            it("should disable some and enable some tokens");
        });
    });
});
