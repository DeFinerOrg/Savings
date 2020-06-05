import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";

contract("Integration Tests", async (accounts) => {
    beforeEach(async () => {});

    beforeEach(async () => {});

    context("Deposit and Withdraw", async () => {
        it("should deposit all tokens and withdraw all tokens");

        it("should deposit all and withdraw only non-Compound tokens (MKR, TUSD)");

        it("should deposit all and withdraw Compound supported tokens");

        it("should deposit all and withdraw only token with less than 18 decimals");

        it("should deposit 1million of each token, wait for a week, withdraw all");
    });

    context("Deposit and Borrow", async () => {
        it("should deposit $1 million value and borrow 0.6 million");
    });

    context("Deposit, Borrow, Repay", async () => {
        it("");
    });

    context("Deposit, Borrow and Withdraw", async () => {
        it("should deposit DAI, borrow USDC, allow rest DAI amount to withdraw");

        it("should get deposit interests when he deposits, wait for a week and withdraw");
    });

    context("Deposit, Borrow and liquidate", async () => {
        it("");
    });

    context("Deposit, Borrow, Repay and liquidate", async () => {
        it("");
    });

    context("Deposit, Borrow, Repay, Withdraw and liquidate", async () => {
        it("");
    });
});
