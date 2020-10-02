import { use } from "chai";
import * as t from "../types/truffle-contracts/index";
import { TestEngine } from "./TestEngine";
import { BigNumber } from "bignumber.js";

const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const ERC20: t.Erc20Contract = artifacts.require("ERC20");
const MockChainLinkAggregator: t.MockChainLinkAggregatorContract = artifacts.require(
    "MockChainLinkAggregator"
);
const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

// Set this to prevent toString() of BigNumber gives scientific representation of a number
BigNumber.config({ EXPONENTIAL_AT: 50 });

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

// TODO
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

type UserState = {
    userBorrowETH: BigNumber,
    userDepositETH: BigNumber,
    userBorrowPower: BigNumber,
    userLiquidatableStatus: boolean
};

type MoveInfo = {
    user: string,
    token: Tokens,
    move: UserMove
};

type TokenInfo = {
    name: string,
    price: BigNumber,
    decimals: number,
    isComp: boolean,
    ctoken: string,
    address: string,
    aggregator?: t.MockChainLinkAggregatorInstance
};

type DeFinerBalanceInfo = {
    deposits: BigNumber,
    loans: BigNumber,
    reserveBalance: BigNumber,
    remainingAssets: BigNumber
};

export class ScenarioTestEngine {
    public testEngine: TestEngine;
    public userAddrs: Array<string> = [];
    public savingAccount: t.SavingAccountWithControllerInstance;
    public accounts!: t.AccountsInstance;
    public bank!: t.BankInstance;
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
    // [deposit, borrow, withdraw, withdrawAll, repay, transfer, liquidate, liquidateTarget]
    public userSuccMoveWeight = [1, 10, 10, 0, 0, 20, 0, 0];
    public userFailMoveWeight = [1, 10, 10, 0, 0, 20, 0, 0];

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
    public definerBalanceCache: Array<DeFinerBalanceInfo> = new Array<DeFinerBalanceInfo>();

    // All the current behav that will successs
    public succMovesArr: MoveInfo[] = [];
    public failMovesArr: MoveInfo[] = [];

    // SuccRate: the rate of successful behavior
    constructor(users: Array<string>, testEngine: TestEngine, savingAccount: t.SavingAccountWithControllerInstance, succRate: number) {
        this.userAddrs = users;
        this.testEngine = testEngine;
        this.savingAccount = savingAccount;
        this.succRate = succRate;
    }

    public initialize = async () => {
        this.tokenAddrs = await this.testEngine.erc20Tokens;
        this.ctokenAddrs = await this.testEngine.cTokens;
        this.aggregatorAddrs = await this.testEngine.mockChainlinkAggregators;
        this.accounts = await this.testEngine.accounts;
        this.bank = await this.testEngine.bank;

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
        for (let token in Tokens) {
            if (isNaN(Number(token))) continue;
            this.definerBalanceCache.push({
                deposits: new BigNumber(0),
                loans: new BigNumber(0),
                reserveBalance: new BigNumber(0),
                remainingAssets: new BigNumber(0)
            });
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

    public setUsersAddress = (userAddrs: Array<string>) => {
        this.userAddrs = userAddrs;
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
            case UserMove.Transfer:
                await this.transferMove(move.user, move.token, shouldSuccess);
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
        const res = BigNumber.random(20).times(new BigNumber(max - min)).plus(new BigNumber(min)).times(10 ** decimals).integerValue(BigNumber.ROUND_DOWN);
        return res;
    }

    // Generate a big number belongs to [0, max).
    // Precision can be up to 18 decimals
    private getRandBigWithBig = (max: BigNumber) => {
        const res = BigNumber.random(18).times(max).integerValue(BigNumber.ROUND_DOWN);
        return res;
    }

    private getRandBigWithBigRange = (min: BigNumber, max: BigNumber) => {
        const res = BigNumber.random(18).times(max.minus(min)).plus(min).integerValue(BigNumber.ROUND_DOWN);
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
            const definerTokenState = this.definerBalanceCache[tokenIndex];

            // Update borrow/deposit balance cache
            userDepositArr[tokenIndex] = curTokenDepositBalance;
            userBorrowArr[tokenIndex] = curTokenBorrowBalance;

            const curTokenDepositETH = tokenInfo.price.times(curTokenDepositBalance).div(10 ** this.decimals[tokenIndex]);
            const curTokenBorrowETH = tokenInfo.price.times(curTokenBorrowBalance).div(10 ** this.decimals[tokenIndex]);

            // Update borrow status
            curUserMoves[token][UserMove.Borrow] = hasExtraBorrowPower && definerTokenState.remainingAssets.gt(0);

            // Update withdraw status
            curUserMoves[token][UserMove.Withdraw] = hasExtraBorrowPower && curTokenDepositBalance.gt(0);

            // Update withdrawAll status
            // Currently I regard borrow LTV for all tokens are the same: 60%
            curUserMoves[token][UserMove.WithdrawAll] = hasExtraBorrowPower &&
                (userBorrowPower.minus(userBorrowETH).gte(curTokenDepositETH)) &&
                curTokenDepositBalance.lte(definerTokenState.remainingAssets);

            // Update repay status
            curUserMoves[token][UserMove.Repay] = curTokenBorrowBalance.gt(0);

            // Update transfer status
            curUserMoves[token][UserMove.Transfer] = hasExtraBorrowPower && curTokenDepositBalance.gt(0);

            // Upate liquidate status
            curUserMoves[token][UserMove.Liquidate] = userLiquidatableStatus;

            // Update liquidated status
            curUserMoves[token][UserMove.LiquidateTarget] = !userLiquidatableStatus && curTokenDepositBalance.gt(0) && hasExtraBorrowPower;
        }

    }

    // Update the token balance in DeFiner's account
    private updateDeFinerCache = async (token: Tokens) => {
        const tokenState = await this.bank.getTokenState(this.tokenAddrs[token]);

        this.definerBalanceCache[token] = {
            deposits: new BigNumber(tokenState[0].toString()),
            loans: new BigNumber(tokenState[1].toString()),
            reserveBalance: new BigNumber(tokenState[2].toString()),
            remainingAssets: new BigNumber(tokenState[3].toString())
        };
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
            console.log("User " + user + " tries to deposit " + amount + " " + this.tokenNames[token] + " to DeFiner, should succeed.");
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
        const depositBalanceArr = this.userDepositBalanceCache.get(user);

        if (!depositBalanceArr) return;

        const balanceBefore = depositBalanceArr[token];

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

        await this.updateDeFinerCache(token);
        await this.updateUserState(user);

        const balanceAfter = depositBalanceArr[token];

        // Check whether the change of the balance match
        expect(balanceBefore.eq(balanceAfter.minus(amount))).equal(true);
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
        const definerRemaining = this.definerBalanceCache[token].remainingAssets;

        const definerRemainingETH = tokenInfo.price.times(definerRemaining).div(10 ** this.decimals[token]);
        const curTokenDepositBalance = curUserDepositBalanceArr[token];
        const extraBorrowPower = userBorrowPower.minus(userBorrowETH).times(100).div(60);
        const curTokenDepositETH = tokenInfo.price.times(curTokenDepositBalance).div(10 ** this.decimals[token]);

        // Theoretical -> Maximum tokens that can be borrowed with the remaining borrowing power
        const theoMaxWithdrawETH = extraBorrowPower.gt(curTokenDepositETH) ? curTokenDepositETH : extraBorrowPower;
        const theoMaxWithdrawAmt = theoMaxWithdrawETH.times(10 ** this.decimals[token]).div(tokenInfo.price).integerValue(BigNumber.ROUND_DOWN);

        // Max -> Max(therertical, definerRemaining)
        const maxWithdrawETH = definerRemainingETH.gt(theoMaxWithdrawETH) ? theoMaxWithdrawETH : definerRemainingETH;
        const maxWithdrawAmt = maxWithdrawETH.times(10 ** this.decimals[token]).div(tokenInfo.price).integerValue(BigNumber.ROUND_DOWN);

        // If the maxWithdrawAmount is not enough to compose one token, just set this behavior to should fail
        if (maxWithdrawAmt.eq(0)) shouldSuccess = false;

        if (shouldSuccess) {

            const execAmt = this.getRandBigWithBigRange(new BigNumber(1), maxWithdrawAmt);
            console.log("User " + user + " tries to withdraw " + execAmt.toString() + " " + this.tokenNames[token] + " from DeFiner, should succeed.");
            console.log("Maximum withdraw amt is: " + maxWithdrawAmt.toString());
            console.log("execAmt amt is: " + execAmt.toString());

            await this.withdrawExecSucc(user, token, execAmt);

        } else {
            const rand = this.getRandInt(0, 1000);
            var num = rand % 3;

            if (maxWithdrawAmt.eq(0)) {
                console.log("User " + user + " tries to withdraw " + 0 + " " + this.tokenNames[token] + " from DeFiner, should fail.");
                await this.withdrawExecFail(user, token, 0, new BigNumber(0));
            } else if (theoMaxWithdrawAmt.gt(maxWithdrawAmt)) {
                console.log("User " + user + " tries to withdraw more tokens DeFiner's pool currently have, should fail.");
                await this.withdrawExecFail(user, token, 2, theoMaxWithdrawAmt);
            } else if (num == 0) {
                console.log("User " + user + " tries to withdraw an invalid token from DeFiner, should fail.");
                await this.withdrawExecFail(user, token, 1, maxWithdrawAmt);
            } else {

                // Generate a number that belongs to [theoMaxWithdrawAmt + 1, curTokenDepositBalance * 2)
                // If the number belongs to [theoMaxWithdrawAmt + 1, curTokenDepositBalance), it will gives insufficient collateral error
                // If the number belongs to [curTokenDepositBalance, curTokenDepositBalance * 2), it will gives insufficient balance error
                const actualAmt = this.getRandBigWithBigRange(theoMaxWithdrawAmt.plus(1), curTokenDepositBalance.times(2));

                if (actualAmt.gt(curTokenDepositBalance)) {
                    console.log("User " + user + " tries to withdraw more tokens than it deposit, should fail.");
                    console.log("Actual amt is: " + actualAmt.toString());
                    console.log("max amt is: " + maxWithdrawAmt.toString());
                    await this.withdrawExecFail(user, token, 3, actualAmt);
                } else {
                    console.log("User " + user + " tries to withdraw more tokens than its left borrowing power, should fail.");
                    console.log("Actual amt is: " + actualAmt.toString());
                    console.log("max amt is: " + maxWithdrawAmt.toString());
                    await this.withdrawExecFail(user, token, 4, actualAmt);
                }
            }
        }
    }


    // Borrow the amount of token that is within the borrow power
    private withdrawExecSucc = async (user: string, token: Tokens, amount: any) => {
        const depositBalanceArr = this.userDepositBalanceCache.get(user);

        if (!depositBalanceArr) return;

        const balanceBefore = depositBalanceArr[token];

        const withdrawAmt = new BN(amount.toString());

        await this.savingAccount.withdraw(this.tokenAddrs[token], withdrawAmt, {
            from: user
        });

        await this.updateDeFinerCache(token);
        await this.updateUserState(user);

        const balanceAfter = depositBalanceArr[token];

        // Check whether the change of the balance match
        expect(balanceBefore.eq(balanceAfter.plus(amount))).equal(true);
    }

    // Five kinds of failing cases in withdraw()
    // 1. Withdraw 0 token from DeFiner
    // 2. Withdraw from an unsupported token
    // 3. Withdraw more tokens than definer's pool has
    // 4. Withdraw more token than the user has
    // 5. After withdraw there will not be enough collateral
    private withdrawExecFail = async (user: string, token: Tokens, kind: number, amount: BigNumber) => {

        if (kind == 0) {
            await expectRevert(
                this.savingAccount.withdraw(this.tokenAddrs[token], new BN(0), { from: user }),
                "Amount is zero"
            );
        } else if (kind == 1) {
            await expectRevert(
                this.savingAccount.withdraw(user, new BN(100), { from: user }),
                "Unsupported token"
            );
        } else if (kind == 2) {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.withdraw(this.tokenAddrs[token], actualAmt, { from: user }),
                "Lack of liquidity when withdraw."
            );
        } else if (kind == 3) {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.withdraw(this.tokenAddrs[token], actualAmt, { from: user }),
                "Insufficient balance."
            );
        } else {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.withdraw(this.tokenAddrs[token], actualAmt, { from: user }),
                "Insufficient collateral when withdraw."
            );
        }
    }


    private borrowMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {

        const userState = this.userStateCache.get(user);
        const tokenInfo = await this.getTokenInfo(token);
        const curUserDepositBalanceArr = this.userDepositBalanceCache.get(user);
        const curUserBorrowBalanceArr = this.userBorrowBalanceCache.get(user);

        if (!userState || !curUserBorrowBalanceArr || !curUserDepositBalanceArr) return;

        const userBorrowETH = userState.userBorrowETH;
        const userDepositETH = userState.userDepositETH;
        const userBorrowPower = userState.userBorrowPower;
        const definerRemaining = this.definerBalanceCache[token].remainingAssets;

        const userBorrowPowerLeftETH = userBorrowPower.minus(userBorrowETH);
        const userBorrowPowerLeftToken = userBorrowPowerLeftETH.times(10 ** this.decimals[token]).div(tokenInfo.price).integerValue(BigNumber.ROUND_DOWN);
        const maxBorrowAmt = userBorrowPowerLeftToken.gt(definerRemaining) ? definerRemaining : userBorrowPowerLeftToken;

        // If there is no enough collateral to borrow even one target token
        // This should not be success.
        if (maxBorrowAmt.eq(0)) shouldSuccess = false;

        if (shouldSuccess) {
            const actualAmt = this.getRandBigWithBigRange(new BigNumber(1), maxBorrowAmt);
            console.log("User " + user + " tries to borrow " + actualAmt.toString() + " " + this.tokenNames[token] + " from DeFiner, should succeed.");
            await this.borrowExecSucc(user, token, actualAmt);
        } else {

            const rand = this.getRandInt(0, 100);
            var kind = rand % 3;

            if (userDepositETH.eq(0)) {
                console.log("User " + user + " tries to borrow from DeFiner but doesn't have any deposits, should fail.");
                await this.borrowExecFail(user, token, 2, maxBorrowAmt);
            } else if (definerRemaining.lt(userBorrowPowerLeftToken)) {
                console.log("User " + user + " borrow more " + this.tokenNames[token] + " tokens DeFiner's pool currently have, should fail.");
                // console.log("User power left ETH: " + userBorrowPowerLeftToken.times(tokenInfo.price).div(10 ** this.decimals[token]).toString());
                // console.log("User power left computed: " + userBorrowPowerLeftETH);
                // console.log("User amount: " + userBorrowPowerLeftToken);
                await this.borrowExecFail(user, token, 3, userBorrowPowerLeftToken);
            } else if (kind == 0 || definerRemaining.eq(0)) {
                console.log("User " + user + " tries to borrow " + 0 + " " + this.tokenNames[token] + " from DeFiner, should fail.");
                await this.borrowExecFail(user, token, 0, new BigNumber(0));
            } else if (kind == 1) {
                console.log("User " + user + " tries to borrow an unsupported token" + " from DeFiner, should fail.");
                await this.borrowExecFail(user, token, 1, maxBorrowAmt);
            } else {
                console.log("User " + user + " borrow more " + this.tokenNames[token] + " tokens than its borrowing power, should fail.");
                await this.borrowExecFail(user, token, 4, definerRemaining);
            }
        }

    }

    // Borrow the amount of token that is within the borrow power
    private borrowExecSucc = async (user: string, token: Tokens, amount: BigNumber) => {
        const borrowBalanceArr = this.userBorrowBalanceCache.get(user);

        if (!borrowBalanceArr) return;

        const balanceBefore = borrowBalanceArr[token];

        const borrowAmt = new BN(amount.toString());
        await this.savingAccount.borrow(this.tokenAddrs[token], borrowAmt, {
            from: user
        });

        await this.updateDeFinerCache(token);
        await this.updateUserState(user);

        const balanceAfter = borrowBalanceArr[token];

        // Check whether the change of borrow balance matches or not
        expect(balanceBefore.plus(amount).eq(balanceAfter)).equal(true);

    }


    // Five kinds of failing cases in borrow()
    // 1. Borrow 0 token
    // 2. Borrow an unsupported token from DeFiner
    // 3. Borrow some tokens but don't have any deposit
    // 4. Borrow more tokens than the pool has
    // 5. Borrow more tokens than its borrowing power
    private borrowExecFail = async (user: string, token: Tokens, kind: number, amount: BigNumber) => {
        if (kind == 0) {
            await expectRevert(
                this.savingAccount.borrow(this.tokenAddrs[token], new BN(0), { from: user }),
                "Borrow zero amount of token is not allowed."
            );
        } else if (kind == 1) {
            await expectRevert(
                this.savingAccount.borrow(user, new BN(100), { from: user }),
                "Unsupported token"
            );
        } else if (kind == 2) {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.borrow(this.tokenAddrs[token], actualAmt, { from: user }),
                "The user doesn't have any deposits."
            );
        } else if (kind == 3) {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.borrow(this.tokenAddrs[token], actualAmt, { from: user }),
                "Lack of liquidity when borrow."
            );
        } else {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.borrow(this.tokenAddrs[token], actualAmt, { from: user }),
                "Insufficient collateral when borrow."
            );
        }
    }

    // The conditions in transfer() should be similar to withdraw()
    // If a user can withdraw x tokens, it can also transfer x tokens to other accounts
    // We should generate a random user.
    private transferMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {

        // Generate a random user to transfer tokens to
        const targetUserIndex = this.getRandInt(0, this.userAddrs.length);
        const targetUser = this.userAddrs[targetUserIndex];

        const userState = this.userStateCache.get(user);
        const tokenInfo = await this.getTokenInfo(token);
        const curUserDepositBalanceArr = this.userDepositBalanceCache.get(user);

        if (!userState || !curUserDepositBalanceArr) return;

        const userBorrowETH = userState.userBorrowETH;
        const userDepositETH = userState.userDepositETH;
        const userBorrowPower = userState.userBorrowPower;
        const definerRemaining = this.definerBalanceCache[token].remainingAssets;

        const curTokenDepositBalance = curUserDepositBalanceArr[token];
        const extraBorrowPower = userBorrowPower.minus(userBorrowETH).times(100).div(60);
        const curTokenDepositETH = tokenInfo.price.times(curTokenDepositBalance).div(10 ** this.decimals[token]);

        // Theoretical -> Maximum tokens that can be borrowed with the remaining borrowing power
        const theoMaxTransETH = extraBorrowPower.gt(curTokenDepositETH) ? curTokenDepositETH : extraBorrowPower;
        const theoMaxTransAmt = theoMaxTransETH.times(10 ** this.decimals[token]).div(tokenInfo.price).integerValue(BigNumber.ROUND_DOWN);

        // Max -> Max(therertical, definerRemaining)
        const maxTransETH = theoMaxTransETH;
        const maxTransAmt = maxTransETH.times(10 ** this.decimals[token]).div(tokenInfo.price).integerValue(BigNumber.ROUND_DOWN);

        // If the maxWithdrawAmount is not enough to compose one token, just set this behavior to should fail
        if (maxTransAmt.eq(0)) shouldSuccess = false;

        if (shouldSuccess) {

            const execAmt = this.getRandBigWithBigRange(new BigNumber(1), maxTransAmt);
            console.log("User " + user + " tries to transfer " + execAmt.toString() + " " + this.tokenNames[token] + " to user " + targetUser + ", should succeed.");
            console.log("Maximum transfer amt is: " + maxTransAmt.toString());
            console.log("execAmt amt is: " + execAmt.toString());

            await this.transExecSucc(user, targetUser, token, execAmt);

        } else {
            const rand = this.getRandInt(0, 1000);
            var num = rand % 3;

            if (maxTransAmt.eq(0)) {
                console.log("User " + user + " tries to transfer " + 0 + " " + this.tokenNames[token] + " to user " + targetUser + ", should fail.");
                await this.transExecFail(user, targetUser, token, 0, new BigNumber(0));
            } else if (num == 0) {
                console.log("User " + user + " tries to transfer an invalid token to user " + targetUser + ", should fail.");
                await this.transExecFail(user, targetUser, token, 1, maxTransAmt);
            } else {

                // Generate a number that belongs to [theoMaxWithdrawAmt + 1, curTokenDepositBalance * 2)
                // If the number belongs to [theoMaxWithdrawAmt + 1, curTokenDepositBalance), it will gives insufficient collateral error
                // If the number belongs to [curTokenDepositBalance, curTokenDepositBalance * 2), it will gives insufficient balance error
                const actualAmt = this.getRandBigWithBigRange(theoMaxTransAmt.plus(1), curTokenDepositBalance.times(2));

                if (actualAmt.gt(curTokenDepositBalance)) {
                    console.log("User " + user + " tries to transfer more tokens to user " + targetUser + " than it deposit, should fail.");
                    console.log("Actual amt is: " + actualAmt.toString());
                    console.log("max amt is: " + maxTransAmt.toString());
                    await this.transExecFail(user, targetUser, token, 2, actualAmt);
                } else {
                    console.log("User " + user + " tries to transfer more tokens to user " + targetUser + " than its left borrowing power, should fail.");
                    console.log("Actual amt is: " + actualAmt.toString());
                    console.log("max amt is: " + maxTransAmt.toString());
                    await this.transExecFail(user, targetUser, token, 3, actualAmt);
                }
            }
        }

    }


    // Transfer the amount of tokens from user to a target account
    private transExecSucc = async (user: string, target: string, token: Tokens, amount: any) => {

        const userDepositBalanceArr = this.userDepositBalanceCache.get(user);
        const targetDepositBalanceArr = this.userDepositBalanceCache.get(target);

        if (!userDepositBalanceArr || !targetDepositBalanceArr) return;

        const userBalanceBefore = userDepositBalanceArr[token];
        const targetBalanceBefore = targetDepositBalanceArr[token];

        const transferAmt = new BN(amount.toString());

        await this.savingAccount.transfer(target, this.tokenAddrs[token], transferAmt, {
            from: user
        });

        await this.updateDeFinerCache(token);
        await this.updateUserState(user);
        await this.updateUserState(target);

        const userBalanceAfter = userDepositBalanceArr[token];
        const targetBalanceAfter = targetDepositBalanceArr[token];

        expect(userBalanceBefore.minus(userBalanceAfter).eq(targetBalanceAfter.minus(targetBalanceBefore))).equal(true);
    }

    // Four kinds of failing cases in transfer()
    // 1. Transfer 0 token to a user
    // 2. Transfer an unsupported token
    // 3. Transfer more tokens to a target than the user has
    // 4. After transfer there will not be enough collateral
    private transExecFail = async (user: string, target: string, token: Tokens, kind: number, amount: BigNumber) => {

        if (kind == 0) {
            await expectRevert(
                this.savingAccount.transfer(target, this.tokenAddrs[token], new BN(0), { from: user }),
                "Amount is zero"
            );
        } else if (kind == 1) {
            await expectRevert(
                this.savingAccount.transfer(target, user, new BN(100), { from: user }),
                "Unsupported token"
            );
        } else if (kind == 2) {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.transfer(target, this.tokenAddrs[token], actualAmt, { from: user }),
                "Insufficient balance."
            );
        } else {
            const actualAmt = new BN(amount.toString());
            await expectRevert(
                this.savingAccount.transfer(target, this.tokenAddrs[token], actualAmt, { from: user }),
                "Insufficient collateral when withdraw."
            );
        }

    }

    private withdrawAllMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {
        const userState = this.userStateCache.get(user);
        const tokenInfo = await this.getTokenInfo(token);
        const curUserDepositBalanceArr = this.userDepositBalanceCache.get(user);

        if (!userState || !curUserDepositBalanceArr) return;

        const userBorrowETH = userState.userBorrowETH;
        const userDepositETH = userState.userDepositETH;
        const userBorrowPower = userState.userBorrowPower;
        const definerRemainingAmt = this.definerBalanceCache[token].remainingAssets;

        const definerRemainingETH = tokenInfo.price.times(definerRemainingAmt).div(10 ** this.decimals[token]);
        const curTokenDepositBalance = curUserDepositBalanceArr[token];
        const extraBorrowPower = userBorrowPower.minus(userBorrowETH).times(100).div(60);
        const curTokenDepositETH = tokenInfo.price.times(curTokenDepositBalance).div(10 ** this.decimals[token]);

        if (shouldSuccess) {
            console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, should succeed.");
            await this.withdrawAllExecSucc(user, token);
        } else {
            if (curTokenDepositBalance.eq(0)) {
                console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, but it doesn't have any deposits, should fail.");
                await this.withdrawAllExecFail(user, token, 0);
            } else if (curTokenDepositETH.gt(extraBorrowPower)) {
                console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, but it will not have enough collateral, should fail.");
                await this.withdrawAllExecFail(user, token, 1);
            } else {
                console.log("User " + user + " tries to withdraw all unsupported token from DeFiner, but it will not have enough collateral, should fail.");
                await this.withdrawAllExecFail(user, token, 2);
            }
        }
    }

    private withdrawAllExecSucc = async (user: string, token: Tokens) => {
        const userDepositBalanceArr = this.userDepositBalanceCache.get(user);

        // Null guardian
        if (!userDepositBalanceArr) return;

        this.savingAccount.withdrawAll(this.tokenAddrs[token], { from: user });

        await this.updateDeFinerCache(token);
        await this.updateUserState(user);

        const userBalanceAfter = userDepositBalanceArr[token];

        expect(userBalanceAfter.eq(0)).equal(true);

    }

    // Three kind of should fail in withdrawAll
    // 1. Withdraw all when there is no deposit
    // 2. After withdraw, there will not be enough collateral
    // 3. Withdraw an unsupported token
    private withdrawAllExecFail = async (user: string, token: Tokens, kind: number) => {
        if (kind == 0) {
            await expectRevert(
                this.savingAccount.withdrawAll(this.tokenAddrs[token], { from: user }),
                "Token depositPrincipal must be greater than 0"
            );
        } else if (kind == 1) {
            await expectRevert(
                this.savingAccount.withdrawAll(this.tokenAddrs[token], { from: user }),
                "Token depositPrincipal must be greater than 0"
            );
        }
    }
}