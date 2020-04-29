import * as chai from "chai";
import ChaiBN from "chai-bn";
import BN from "bn.js";

contract("SavingsAccount", async (accounts) => {
  before(async () => {
    // Things to execute before all the tests cases
  });

  beforeEach(async () => {
    // Things to execute before each test cases
  });

  context("constructor", async () => {
    context("should fail", async () => {
      it("when ...<describe the context>", async () => {
        // Write test case here
      });
    });

    context("should succeed", async () => {
      it("when all parameters are valid");
    });
  });

  context("depositToken()", async () => {
    context("should fail", async () => {
      it("when unsupported token address passed", async () => {
        // Write the test case here
      });

      it("when unsupported amount is zero", async () => {
        // Write the test case here
      });
    });

    context("should succeed", async () => {
      it("when supported token address is passed", async () => {
        // Write the test case here
      });
    });
  });

  context("borrow()", async () => {
    context("should fail", async () => {
      it("");
    });

    context("should succeed", async () => {
      it("");
    });
  });

  context("repay()", async () => {
    context("should fail", async () => {
      it("");
    });

    context("should succeed", async () => {
      it("");
    });
  });

  context("withdrawToken()", async () => {
    context("should fail", async () => {
      it("");
    });

    context("should succeed", async () => {
      it("");
    });
  });

  context("liquidate()", async () => {
    context("should fail", async () => {
      it("");
    });

    context("should succeed", async () => {
      it("");
    });
  });

  context("toCompound()", async () => {
    context("should fail", async () => {
      it("");
    });

    context("should succeed", async () => {
      it("");
    });
  });

  context("fromCompound()", async () => {
    context("should fail", async () => {
      it("");
    });

    context("should succeed", async () => {
      it("");
    });
  });
});
