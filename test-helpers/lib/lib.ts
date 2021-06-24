import * as t from "../../types/truffle-contracts/index";
import { TestEngine } from "../../test-helpers/TestEngine";
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract =
    artifacts.require("MockChainLinkAggregator");
var chai = require("chai");
var expect = chai.expect;
var tokenData = require("../../test-helpers/tokenData.json");

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.MockErc20Contract = artifacts.require("ERC20");
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");
const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";

/**
 *
 * @param actionType - 0 for deposit, 1 for withdraw, 2 for borrow, 3 for repay.
 * @param amount - The amount involved in this behavior.
 * @param tokenInstance - The erc20 token instance.
 * @param cTokenInstance - The cToken instance.
 * @param compBalanceBefore - The balance of this token in compound before this action.
 * @param resBalanceBefore - The reserve balance of this token.
 * @param bank - The bank instance of DeFiner's protocol
 * @param savingAccount - The saving account instance of DeFiner's protocol
 */
export const savAccBalVerify = async (
    actionType: number,
    amount: BN,
    tokenAddr: string,
    cTokenInstance: t.MockCTokenInstance,
    compBalanceBefore: BN,
    resBalanceBefore: BN,
    bank: t.BankInstance,
    savingAccount: t.SavingAccountWithControllerInstance
) => {
    var totalBalanceAfter = new BN(await bank.getTotalDepositStore(tokenAddr));
    var expectedResAfter;
    var expectedCompAfter;

    const compBalanceAfter = new BN(
        await cTokenInstance.balanceOfUnderlying.call(savingAccount.address)
    );
    var resBalanceAfter;

    if (tokenAddr == ETH_ADDRESS) {
        resBalanceAfter = new BN((await web3.eth.getBalance(savingAccount.address)).toString());
    } else {
        const erc20Instance = await ERC20.at(tokenAddr);
        resBalanceAfter = await erc20Instance.balanceOf(savingAccount.address);
    }

    switch (actionType) {
        case 0:
        case 3:
            if (
                resBalanceBefore.add(amount).gt(totalBalanceAfter.mul(new BN(20)).div(new BN(100)))
            ) {
                expectedResAfter = totalBalanceAfter.mul(new BN(15)).div(new BN(100));
                expectedCompAfter = compBalanceBefore
                    .add(amount)
                    .sub(expectedResAfter)
                    .add(resBalanceBefore);
            } else {
                expectedResAfter = resBalanceBefore.add(amount);
                expectedCompAfter = compBalanceBefore;
            }
            expect(expectedResAfter).to.be.bignumber.equals(resBalanceAfter);
            expect(expectedCompAfter).to.be.bignumber.equals(compBalanceAfter);
            break;
        case 1:
        case 2:
            if (compBalanceBefore.lte(amount)) {
                expect(compBalanceAfter.add(resBalanceAfter).add(amount)).to.be.bignumber.equals(
                    compBalanceBefore.add(resBalanceBefore)
                );
            } else if (
                compBalanceBefore
                    .add(resBalanceBefore)
                    .sub(amount)
                    .lte(totalBalanceAfter.mul(new BN(15)).div(new BN(100)))
            ) {
                expectedCompAfter = new BN(0);
                expectedResAfter = compBalanceBefore.add(resBalanceBefore).sub(amount);
                expect(expectedResAfter).to.be.bignumber.equals(resBalanceAfter);
                expect(expectedCompAfter).to.be.bignumber.equals(compBalanceAfter);
            } else if (
                resBalanceBefore.lte(amount.add(totalBalanceAfter.mul(new BN(10)).div(new BN(100))))
            ) {
                expectedResAfter = totalBalanceAfter.mul(new BN(15)).div(new BN(100));
                expectedCompAfter = compBalanceBefore
                    .sub(amount)
                    .sub(expectedResAfter)
                    .add(resBalanceBefore);

                expect(expectedResAfter).to.be.bignumber.equals(resBalanceAfter);
                expect(expectedCompAfter).to.be.bignumber.equals(compBalanceAfter);
            } else {
                expectedResAfter = resBalanceBefore.sub(amount);
                expectedCompAfter = compBalanceBefore;
                expect(expectedResAfter).to.be.bignumber.equals(resBalanceAfter);
                expect(expectedCompAfter).to.be.bignumber.equals(compBalanceAfter);
            }
            break;
    }
};
