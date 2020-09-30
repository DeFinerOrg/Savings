import { use } from "chai";
import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "./TestEngine";
import { BigNumber } from "bignumber.js";
import { PrimaryExpression } from "solidity-parser-antlr";

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.Erc20Contract = artifacts.require("ERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

enum UserMove {
    Deposit,
    Borrow,
    Withdraw,
    WithdrawAll,
    Repay,
    Transfer,
    Liquidate,
    LiquidateTarget
};

enum SysMove {
    IncBlockNum,
    ChangePrice
};

enum Tokens {
    DAI,
    USDC,
    USDT,
    TUSD,
    MKR,
    BAT,
    ZRX,
    REP,
    WBTC,
    ETH
}

type UserState = { userBorrowETH: BigNumber, userDepositETH: BigNumber, userBorrowPower: BigNumber, userLiquidatableStatus: boolean };
type MoveInfo = { user: string, token: Tokens, move: UserMove };
type TokenInfo = { name: string, price: BigNumber, decimals: number, isComp: boolean, ctoken: string, address: string, aggregator?: t.MockChainLinkAggregatorInstance };

export class ScenarioTestEngine {
    public testEngine: TestEngine;
    public userAddrs: Array<string> = [];
    public savingAccount: t.SavingAccountWithControllerInstance;
    public accounts!: t.AccountsInstance;
    public bank: t.BankInstance;
    public succRate: number;

    public tokenAddrs: Array<string> = [];
    public ctokenAddrs: Array<string> = [];
    public aggregatorAddrs: Array<string> = [];

    // public tokenInstances: Array<t.Erc20Instance> = [];
    // public ctokenInstances: Array<t.MockCTokenInstance> = [];
    public aggregatorInstances: Array<t.MockChainLinkAggregatorInstance> = [];

    public decimals: Array<number> = [18, 6, 6, 18, 18, 18, 18, 18, 8, 18];
    public isComp: Array<boolean> = [true, true, true, false, false, true, true, true, true, true];
    public tokenNames: Array<string> = ["DAI", "USDC", "USDT", "TUSD", "MKR", "BAT", "ZRX", "REP", "WBTC", "ETH"];
    public userSuccMoveWeight = [1, 0, 20, 0, 0, 0, 0, 0];
    public userFailMoveWeight = [1, 0, 20, 0, 0, 0, 0, 0];

    public ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
    public ZERO_ADDRESS: string = "0x0000000000000000000000000000000000000000";

    private eighteenPrecision = new BN(10).pow(new BN(18));
    private sixPrecision = new BN(10).pow(new BN(6));
    private eightPrecision = new BN(10).pow(new BN(8));

    // User => Tokens => Behaviors => boolean
    public availableMovesMap: Map<string, Array<Array<boolean>>> = new Map<string, Array<Array<boolean>>>();
    public userStateCache: Map<string, UserState> = new Map<string, UserState>();
    public userBorrowBalanceCache: Map<string, Array<BigNumber>> = new Map<string, Array<BigNumber>>();
    public userDepositBalanceCache: Map<string, Array<BigNumber>> = new Map<string, Array<BigNumber>>();

    // All the current behav that will successs
    public succMovesArr: MoveInfo[] = [];
    public failMovesArr: MoveInfo[] = [];

    // SuccRate: the rate of successful behavior
    constructor(users: Array<string>, testEngine: TestEngine, savingAccount: t.SavingAccountWithControllerInstance, succRate: number) {
        this.userAddrs = users;
        this.testEngine = testEngine;
        this.savingAccount = savingAccount;
        this.succRate = succRate;
        this.bank = testEngine.bank;
    }

    public initialize = async () => {
        this.tokenAddrs = await this.testEngine.erc20Tokens;
        this.ctokenAddrs = await this.testEngine.cTokens;
        this.aggregatorAddrs = await this.testEngine.mockChainlinkAggregators;
        this.accounts = await this.testEngine.accounts;
        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
            this.userAddrs[0]
        );
        for (const aggregatorAddr of this.aggregatorAddrs) {
            this.aggregatorInstances.push(await MockChainLinkAggregator.at(aggregatorAddr));
        }

        for (const userAddr of this.userAddrs) {
            let userArr = new Array<Array<boolean>>()
            this.availableMovesMap.set(userAddr, userArr);

            let userBorrowArr = new Array<BigNumber>();
            this.userBorrowBalanceCache.set(userAddr, userBorrowArr);

            let userDepositArr = new Array<BigNumber>();
            this.userDepositBalanceCache.set(userAddr, userDepositArr);

            for (let token in Tokens) {
                if (isNaN(Number(token))) continue;

                let tokenArr = new Array<boolean>();
                userArr.push(tokenArr);

                userBorrowArr.push(new BigNumber(0));
                userDepositArr.push(new BigNumber(0));

                for (let move in UserMove) {
                    if (isNaN(Number(move))) continue;
                    if (Number(move) == UserMove.Deposit) {
                        tokenArr.push(true);
                    } else {
                        tokenArr.push(false);
                    }
                }
            }
        }
    }

    public setSuccRate(succRate: number) {
        this.succRate = succRate;
    }

    public setUserSuccMoveWeight = (weightArr: Array<number>) => {
        if (weightArr.length != 8) return;
        this.userSuccMoveWeight = weightArr;
    }

    public setUserFailMoveWeight = (weightArr: Array<number>) => {
        if (weightArr.length != 8) return;
        this.userFailMoveWeight = weightArr;
    }

    public generateOneMove = async () => {
        this.updateAvailableArr();

        const succRate = this.getRandFloat();

        if (succRate < this.succRate) {
            const index = this.getRandInt(0, this.succMovesArr.length);
            const curMove = this.succMovesArr[index];
            await this.executeOneMove(curMove, true);
        } else {
            const index = this.getRandInt(0, this.failMovesArr.length);
            const curMove = this.failMovesArr[index];
            await this.executeOneMove(curMove, false);
        }

    }

    private executeOneMove = async (move: { user: string, token: Tokens, move: UserMove }, shouldSuccess: boolean) => {
        switch (move.move) {
            case UserMove.Deposit:
                await this.depositMove(move.user, move.token, shouldSuccess);
                break;
            case UserMove.Borrow:
                await this.borrowMove(move.user, move.token, shouldSuccess);
                break;
            case UserMove.Withdraw:
                await this.withdrawMove(move.user, move.token, shouldSuccess);
                break;
        }
    }

    // Get all the information related to a token
    public getTokenInfo = async (tokenName: Tokens):
        Promise<TokenInfo> => {
        if (tokenName == Tokens.ETH) {
            return {
                name: this.tokenNames[tokenName],
                price: new BigNumber(this.eighteenPrecision.toString()),
                decimals: this.decimals[tokenName],
                isComp: this.isComp[tokenName],
                ctoken: this.ctokenAddrs[tokenName],
                address: this.ETH_ADDRESS
            }
        } else {
            const curAggregator = this.aggregatorInstances[tokenName];
            const curPrice = await curAggregator.latestAnswer();
            return {
                name: this.tokenNames[tokenName],
                price: new BigNumber(curPrice.toString()),
                decimals: this.decimals[tokenName],
                isComp: this.isComp[tokenName],
                ctoken: this.ctokenAddrs[tokenName],
                aggregator: curAggregator,
                address: this.tokenAddrs[tokenName]
            }
        }
    }


    // Generate an integer belongs to [min, max)
    private getRandInt = (min: number, max: number) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    // Genrate a float number belongs to [0, 1)
    private getRandFloat = () => {
        return Math.random();
    }

    // Generate a bignumber belongs to [min * 10 ^ decimals, max * 10 ^ decimals)
    // Precision can be up to 20 decimals
    private getRandBig = (min: number, max: number, decimals: number) => {
        const res = BigNumber.random(20).times(new BigNumber(max - min)).plus(new BigNumber(min)).times(10 ** decimals).integerValue();
        return res;
    }

    // Generate a big number belongs to [0, max).
    // Precision can be up to 18 decimals
    private getRandBigWithBig = (max: BigNumber) => {
        const res = BigNumber.random(18).times(max).integerValue();
        return res;
    }

    private updateAllUsersAvailable = async () => {
        for (let user of this.userAddrs) {
            await this.updateUserState(user);
        }
    }

    private updateUserState = async (user: string) => {

        const userBorrowETH = new BigNumber((await this.savingAccount.getBorrowETH(user)).toString());
        const userDepositETH = new BigNumber((await this.savingAccount.getDepositETH(user)).toString());
        const userBorrowPower = new BigNumber((await this.accounts.getBorrowPower(user)).toString());
        const userLiquidatableStatus = await this.accounts.isAccountLiquidatable.call(user);

        this.userStateCache.set(user,
            { userBorrowETH: userBorrowETH, userDepositETH: userDepositETH, userBorrowPower: userBorrowPower, userLiquidatableStatus: userLiquidatableStatus }
        );

        await this.updateUserAvailable(user);
    }

    // Update availableMovesMap after user
    private updateUserAvailable = async (user: string) => {

        const userState = this.userStateCache.get(user);
        const userBorrowArr = this.userBorrowBalanceCache.get(user);
        const userDepositArr = this.userDepositBalanceCache.get(user);

        if (!userState || !userBorrowArr || !userDepositArr) return;

        const userBorrowETH = userState.userBorrowETH;
        const userDepositETH = userState.userDepositETH;
        const userBorrowPower = userState.userBorrowPower;
        const userLiquidatableStatus = userState.userLiquidatableStatus;

        // Have extra borrow power to borrow other tokens
        const hasExtraBorrowPower = userBorrowPower.gt(userBorrowETH);
        const curUserMoves = this.availableMovesMap.get(user);

        if (!curUserMoves) return;

        for (let token in Tokens) {
            if (isNaN(Number(token))) continue;

            const tokenIndex = Number(token)
            const curTokenDepositBalance = new BigNumber((await this.savingAccount.getDepositBalance(this.tokenAddrs[tokenIndex], user)).toString());
            const curTokenBorrowBalance = new BigNumber((await this.savingAccount.getBorrowBalance(this.tokenAddrs[tokenIndex], user)).toString());
            const tokenInfo = await this.getTokenInfo(tokenIndex);

            // Update borrow/deposit balance cache
            userDepositArr[tokenIndex] = curTokenDepositBalance;
            userBorrowArr[tokenIndex] = curTokenBorrowBalance;

            const curTokenDepositETH = tokenInfo.price.times(curTokenDepositBalance).div(10 ** this.decimals[tokenIndex]);
            const curTokenBorrowETH = tokenInfo.price.times(curTokenBorrowBalance).div(10 ** this.decimals[tokenIndex]);

            // Update borrow status
            curUserMoves[token][UserMove.Borrow] = hasExtraBorrowPower;

            // Update withdraw status
            curUserMoves[token][UserMove.Withdraw] = hasExtraBorrowPower && curTokenDepositBalance.gt(0);
            // Update withdrawAll status
            // Currently I regard borrow LTV for all tokens are the same: 60%
            curUserMoves[token][UserMove.WithdrawAll] = hasExtraBorrowPower && (userBorrowPower.minus(userBorrowETH).gte(curTokenDepositETH));

            // Update repay status
            curUserMoves[token][UserMove.Repay] = curTokenBorrowBalance.gt(0);

            // Update transfer status
            curUserMoves[token][UserMove.Transfer] = hasExtraBorrowPower && curTokenDepositBalance.gt(0);

            // Upate liquidate status
            curUserMoves[token][UserMove.Liquidate] = userLiquidatableStatus;

            // Update liquidated status
            curUserMoves[token][UserMove.Liquidate] = !userLiquidatableStatus && curTokenDepositBalance.gt(0) && hasExtraBorrowPower;
        }

    }

    // Update the array of should success and should fail behaviors for every user.
    private updateAvailableArr = () => {
        this.failMovesArr = []
        this.succMovesArr = [];
        for (let entry of this.availableMovesMap) {

            let user = entry[0];
            let stateArr = entry[1];

            for (let token in Tokens) {
                if (isNaN(Number(token))) continue;
                for (let move in UserMove) {
                    if (isNaN(Number(move))) continue;
                    const index = Number(move);
                    if (stateArr[token][index]) {
                        for (let i = 0; i < this.userSuccMoveWeight[index]; i++) {
                            this.succMovesArr.push({
                                user: user,
                                token: Number(token),
                                move: index
                            });
                        }
                    }

                    for (let i = 0; i < this.userFailMoveWeight[index]; i++) {
                        this.failMovesArr.push({
                            user: user,
                            token: Number(token),
                            move: index
                        });
                    }

                }
            }
        }
        // Maybe need to shuffle at the end
    }

    // Deposit will success if the token address is correct.
    // Deposit will fail if the user doesn't have enough tokens or the token address doesn't
    // hold a valid ERC20 token.
    private depositMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {
        const amount = new BN(this.getRandBig(0, 100, this.decimals[token]).toString());

        // If rand < succRate, current behavior should success
        if (shouldSuccess) {
            console.log("User " + user + " tries to deposit " + amount + " " + this.tokenNames[token] + " to DeFiner, should successs.");
            await this.depositExecSucc(user, token, amount);
        } else {
            const rand = this.getRandInt(0, 100);
            const kind = rand % 2;
            if (kind == 0) {
                console.log("User " + user + " tries to deposit " + 0 + " " + this.tokenNames[token] + " to DeFiner, should fail.");
            } else {
                console.log("User " + user + " tries to deposit an invalid token to DeFiner, should fail.");
            }
            await this.depositExecFail(user, token, kind);
        }

    }

    // Deposit [0, 100) whole tokens into DeFiner
    private depositExecSucc = async (user: string, token: Tokens, amount: any) => {
        if (token == Tokens.ETH) {
            const tokenInfo = await this.getTokenInfo(token);
            const depositAmt = new BN(amount);
            await this.savingAccount.deposit(this.ETH_ADDRESS, depositAmt, {
                value: depositAmt,
                from: user
            });
        } else {
            const tokenInfo = await this.getTokenInfo(token);
            const depositAmt = new BN(amount);
            const erc20Instance = await ERC20.at(tokenInfo.address);
            if (erc20Instance) {
                await erc20Instance.transfer(user, depositAmt);
                await erc20Instance.approve(
                    this.savingAccount.address,
                    depositAmt,
                    { from: user }
                );
            }
            await this.savingAccount.deposit(
                tokenInfo.address,
                depositAmt,
                { from: user }
            );
        }
        await this.updateUserState(user);
    }

    // Two kinds of failing cases in deposit, generate a number to decide which behavior to take
    // 1. Amount is 0
    // 2. Token address is not valid
    private depositExecFail = async (user: string, token: Tokens, kind: number) => {
        const tokenInfo = await this.getTokenInfo(token);
        if (kind == 0) {
            await expectRevert(
                this.savingAccount.deposit(tokenInfo.address, new BN(0), { from: user }),
                "Amount is zero"
            );
        } else {
            await expectRevert(
                this.savingAccount.deposit(user, new BN(100), { from: user }),
                "Unsupported token"
            );
        }
    }

    // Withdraw will success if the token address is correct and the withdraw amount is less than
    // the user's deposit.
    private withdrawMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {

        const userState = this.userStateCache.get(user);
        const tokenInfo = await this.getTokenInfo(token);
        const curUserDepositBalanceArr = this.userDepositBalanceCache.get(user);

        if (!userState || !curUserDepositBalanceArr) return;

        const userBorrowETH = userState.userBorrowETH;
        const userDepositETH = userState.userDepositETH;
        const userBorrowPower = userState.userBorrowPower;

        const curTokenDepositBalance = curUserDepositBalanceArr[token];
        const extraBorrowPower = userBorrowPower.minus(userBorrowETH).times(100).div(60);
        const curTokenDepositETH = tokenInfo.price.times(curTokenDepositBalance).div(10 ** this.decimals[token]);
        const maxWithdrawETH = extraBorrowPower.gt(curTokenDepositETH) ? curTokenDepositETH : extraBorrowPower;


        const maxWithdrawAmt = maxWithdrawETH.times(10 ** this.decimals[token]).div(tokenInfo.price).integerValue();

        if (shouldSuccess) {

            const execAmt = this.getRandBigWithBig(maxWithdrawAmt);

            console.log("User " + user + " tries to withdraw " + execAmt.toString() + " " + this.tokenNames[token] + " from DeFiner, should successs.");

            await this.withdrawExecSucc(user, token, execAmt);

        } else {
            const rand = this.getRandInt(0, 100);
            var kind = rand % 3;
            if (maxWithdrawAmt.eq(0)) {
                kind = 0;
            }
            if (kind == 0) {
                console.log("User " + user + " tries to withdraw " + 0 + " " + this.tokenNames[token] + " from DeFiner, should fail.");
            } else if (kind == 1) {
                console.log("User " + user + " tries to withdraw an invalid token from DeFiner, should fail.");
            } else {
                console.log("User " + user + " tries to withdraw more tokens then it can from DeFiner, should fail.");
            }
            await this.withdrawExecFail(user, token, kind, maxWithdrawAmt);
        }
    }


    // Borrow the amount of token that is within the borrow power
    private withdrawExecSucc = async (user: string, token: Tokens, amount: any) => {
        const withdrawAmt = new BN(amount.toString());
        await this.savingAccount.withdraw(this.tokenAddrs[token], withdrawAmt, {
            from: user
        });
        await this.updateUserState(user);
    }

    // Three kinds of failing cases
    // 1. Withdraw from an unsupported token
    // 2. Withdraw 0 token
    // 3. Withdraw more tokens than the account deposits
    private withdrawExecFail = async (user: string, token: Tokens, kind: number, amount: BigNumber) => {

        if (kind == 0) {
            await expectRevert(
                this.savingAccount.withdraw(this.tokenAddrs[token], new BN(0), { from: user }),
                "Amount is zero"
            );
        } else if (kind == 2) {
            await expectRevert(
                this.savingAccount.withdraw(user, new BN(100), { from: user }),
                "Unsupported token"
            );
        } else {
            const actualAmt = new BN(amount.toString()).mul(new BN(2));
            await expectRevert(
                this.savingAccount.withdraw(user, actualAmt, { from: user }),
                "Insufficient collateral when withdraw."
            );
        }
    }

    private borrowMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {
        const userState = this.userStateCache.get(user);
        const tokenInfo = await this.getTokenInfo(token);
        const curUserDepositBalanceArr = this.userDepositBalanceCache.get(user);
        const curUserBorrowBalanceArr = this.userBorrowBalanceCache.get(user);
    }

    // Borrow the amount of token that is within the borrow power
    private borrowExecSucc = async (user: string, token: Tokens, amount: any) => {

    }

    private borrowExecFail = async (user: string, token: Tokens, kind: number) => {

    }


}