import { should, use } from "chai";
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
    target?: string,
    token: Tokens,
    move: UserMove | SysMove,
    isSys: boolean
};

type TokenInfo = {
    name: string,
    price: BigNumber,
    decimals: number,
    isComp: boolean,
    ctoken: string,
    address: string,
    aggregator?: string
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

    public tokenInstances: Array<t.Erc20Instance> = [];
    public ctokenInstances: Array<t.MockCTokenInstance> = [];
    public aggregatorInstances: Array<t.MockChainLinkAggregatorInstance> = [];

    public decimals: Array<number> = [18, 6, 6, 18, 18, 18, 18, 18, 8, 18];
    public isComp: Array<boolean> = [true, true, true, false, false, true, true, true, true, true];
    public tokenNames: Array<string> = ["DAI", "USDC", "USDT", "TUSD", "MKR", "BAT", "ZRX", "REP", "WBTC", "ETH"];

    // [deposit, borrow, withdraw, withdrawAll, repay, transfer, liquidate, liquidateTarget]
    public userSuccMoveWeight = [1, 0, 0, 0, 0, 0, 0, 0];
    public userFailMoveWeight = [10, 10, 10, 10, 10, 10, 1, 0];

    // [IncBlockNum, ChangePrice]
    public sysMoveWeight = [7, 0];

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

    // Initialize all the necessary fieds in this class
    // Some can be async call, so can't be done in the constructor
    public initialize = async () => {
        this.tokenAddrs = await this.testEngine.erc20Tokens;
        this.ctokenAddrs = await this.testEngine.getCompoundAddresses();
        this.aggregatorAddrs = await this.testEngine.mockChainlinkAggregators;
        this.accounts = await this.testEngine.accounts;
        this.bank = await this.testEngine.bank;

        const ETHbalanceBeforeDeposit = await web3.eth.getBalance(
            this.userAddrs[0]
        );

        for (let i = 0; i < this.tokenNames.length; ++i) {
            this.aggregatorInstances.push(await MockChainLinkAggregator.at(this.aggregatorAddrs[i]));
        }

        for (const userAddr of this.userAddrs) {
            let userArr = new Array<Array<boolean>>()
            this.availableMovesMap.set(userAddr, userArr);

            let userBorrowArr = new Array<BigNumber>();
            this.userBorrowBalanceCache.set(userAddr, userBorrowArr);

            this.userStateCache.set(userAddr,
                { userBorrowETH: new BigNumber(0), userDepositETH: new BigNumber(0), userBorrowPower: new BigNumber(0), userLiquidatableStatus: false });

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

    public setSysMoveWeight = (weightArr: Array<number>) => {
        if (weightArr.length != 2) return;
        this.userFailMoveWeight = weightArr;
    }

    public setUsersAddress = (userAddrs: Array<string>) => {
        this.userAddrs = userAddrs;
    }


    public generateOneMove = async () => {
        this.updateAvailableArr();
        const succRate = this.getRandFloat();
        // console.log("succ rate: " + this.succRate + " rand: " + succRate);
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

    private executeOneMove = async (move: MoveInfo, shouldSuccess: boolean) => {
        if (!move.isSys) {
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
                case UserMove.WithdrawAll:
                    await this.withdrawAllMove(move.user, move.token, shouldSuccess);
                    break;
                case UserMove.Repay:
                    await this.repayMove(move.user, move.token, shouldSuccess);
                    break;
                case UserMove.Liquidate:
                    if (!move.target) {
                        console.log("get here liquidate move");
                        console.log(move);
                        console.log(move.target);
                        return;
                    }
                    await this.liquidateMove(move.user, move.target, move.token, shouldSuccess);
                    break;
            }
        } else {
            switch (move.move) {

                case SysMove.ChangePrice:
                    await this.changeTokenPriceMove(move.token);
                    break;
                case SysMove.IncBlockNum:
                    await this.incBlockNumMove();
                    break;
            }
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
                aggregator: this.aggregatorAddrs[tokenName],
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


    private updateAllUserState = async () => {
        for (let user of this.userAddrs) {
            await this.updateUserState(user);
        }
    }

    private updateUserState = async (user: string) => {

        const userBorrowETH = new BigNumber((await this.savingAccount.getBorrowETH(user)).toString());
        const userDepositETH = new BigNumber((await this.savingAccount.getDepositETH(user)).toString());
        const userBorrowPower = new BigNumber((await this.accounts.getBorrowPower(user)).toString());
        let userLiquidatableStatus = false;
        try {
            userLiquidatableStatus = await this.accounts.isAccountLiquidatable.call(user);

        } catch (err) {
            userLiquidatableStatus = false
        }

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

            // Whether this user has deposit/borrow in this token
            const hasDeposit = curTokenDepositBalance.gt(0);
            const hasBorrow = curTokenBorrowBalance.gt(0);

            // Update borrow status
            curUserMoves[token][UserMove.Borrow] = hasExtraBorrowPower && definerTokenState.remainingAssets.gt(0);

            // Update withdraw status
            curUserMoves[token][UserMove.Withdraw] = hasExtraBorrowPower && hasDeposit;

            // Update withdrawAll status
            // Currently I regard borrow LTV for all tokens are the same: 60%
            curUserMoves[token][UserMove.WithdrawAll] = hasExtraBorrowPower &&
                userBorrowPower.minus(userBorrowETH).gte(curTokenDepositETH.times(0.6)) &&
                curTokenDepositBalance.lte(definerTokenState.remainingAssets);

            // Update repay status
            curUserMoves[token][UserMove.Repay] = hasBorrow;

            // Update transfer status
            curUserMoves[token][UserMove.Transfer] = hasExtraBorrowPower && hasDeposit;

            // Upate liquidate status
            curUserMoves[token][UserMove.Liquidate] = !userLiquidatableStatus && hasDeposit && hasExtraBorrowPower;

            // Update liquidated status
            curUserMoves[token][UserMove.LiquidateTarget] = userLiquidatableStatus && hasBorrow;
        }

    }

    private updateAllDeFinerCache = async () => {
        for (let token in Tokens) {
            if (isNaN(Number(token))) continue;
            await this.updateDeFinerCache(Number(token));
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

    private updateAvailableArr = () => {
        this.failMovesArr = [];
        this.succMovesArr = [];
        this.updateAvailableArrUserMove();
        this.updateAvailableArrSysMove();
    }

    private updateAvailableArrSysMove = () => {
        for (let i = 0; i < this.sysMoveWeight[0]; i++) {
            this.succMovesArr.push({ user: this.userAddrs[0], token: Tokens.DAI, move: SysMove.IncBlockNum, isSys: true })
        }
        for (let i = 0; i < this.sysMoveWeight[1]; i++) {
            for (let j = 0; j < this.tokenAddrs.length; ++j) {
                // We can't change the price of ETH in current version
                if (j == Tokens.ETH) continue;
                this.succMovesArr.push({ user: this.userAddrs[0], token: j, move: SysMove.ChangePrice, isSys: true })
            }
        }
    }

    // Update the array of should success and should fail behaviors for every user.
    private updateAvailableArrUserMove = () => {

        // Save the users that's liquidatable and can be a liquidator
        // Find the pairing between these two kinds to form a valid liquidate operation
        const liquidateTargetUser: Array<Array<string>> = []
        const liquidatorUser: Array<Array<string>> = []
        // Initialize entry for each token
        for (let i = 0; i < this.tokenAddrs.length; ++i) {
            liquidateTargetUser.push([]);
            liquidatorUser.push([]);
        }

        for (let entry of this.availableMovesMap) {

            let user = entry[0];
            let stateArr = entry[1];

            for (let token in Tokens) {
                if (isNaN(Number(token))) continue;
                for (let move in UserMove) {
                    if (isNaN(Number(move))) continue;

                    const tokenIndex = Number(token);
                    const moveIndex = Number(move);

                    // For liquidation moves, we need to find a pair of valid users.
                    // The process will be a little different
                    if (moveIndex == UserMove.Liquidate || moveIndex == UserMove.LiquidateTarget) {
                        if (stateArr[tokenIndex][moveIndex] && moveIndex == UserMove.Liquidate) {
                            liquidatorUser[tokenIndex].push(user);
                        }
                        if (stateArr[tokenIndex][moveIndex] && moveIndex == UserMove.LiquidateTarget) {
                            liquidatorUser[tokenIndex].push(user);
                        }
                        continue;
                    }

                    if (stateArr[tokenIndex][moveIndex]) {
                        for (let i = 0; i < this.userSuccMoveWeight[moveIndex]; i++) {
                            this.succMovesArr.push({
                                user: user,
                                token: tokenIndex,
                                move: moveIndex,
                                isSys: false
                            });
                        }
                    }

                    for (let i = 0; i < this.userFailMoveWeight[moveIndex]; i++) {
                        this.failMovesArr.push({
                            user: user,
                            token: tokenIndex,
                            move: moveIndex,
                            isSys: false
                        });
                    }

                }
            }
        }

        // Update the should succeed cases of liquidation
        for (let i = 0; i < this.tokenAddrs.length; ++i) {
            for (let liquidator in liquidatorUser[i]) {
                for (let liquidated in liquidateTargetUser[i]) {
                    for (let token = 0; token < this.userSuccMoveWeight[UserMove.Liquidate]; token++) {
                        this.succMovesArr.push({
                            user: liquidator,
                            target: liquidated,
                            token: token,
                            move: UserMove.Liquidate,
                            isSys: false
                        });
                    }
                }
            }
        }

        // Update the Fail succeed cases of liquidation
        for (let i = 0; i < this.tokenAddrs.length; ++i) {
            for (let liquidator in this.userAddrs) {
                for (let liquidated in this.userAddrs) {
                    for (let token = 0; token < this.userFailMoveWeight[UserMove.Liquidate]; token++) {
                        this.failMovesArr.push({
                            user: liquidator,
                            target: liquidated,
                            token: token,
                            move: UserMove.Liquidate,
                            isSys: false
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
        const depositAmt = new BN(amount.toString());
        console.log("deposit amt is: ", depositAmt.toString());
        if (!depositBalanceArr) {
            console.log("get here deposit exec succ");
            return;
        }

        const balanceBefore = depositBalanceArr[token];

        const balanceFromContract = await this.savingAccount.getDepositBalance(this.tokenAddrs[token], user);
        const interestFromContract = await this.savingAccount.getDepositInterest(this.tokenAddrs[token], { from: user });
        const principalFromContract = await this.savingAccount.getDepositPrincipal(this.tokenAddrs[token], { from: user });

        if (token == Tokens.ETH) {
            const tokenInfo = await this.getTokenInfo(token);
            await this.savingAccount.deposit(this.ETH_ADDRESS, depositAmt, {
                value: depositAmt,
                from: user
            });
        } else {
            // const tokenInfo = await this.getTokenInfo(token);
            const erc20Instance = await ERC20.at(this.tokenAddrs[token]);
            if (erc20Instance) {
                await erc20Instance.transfer(user, depositAmt);
                await erc20Instance.approve(
                    this.savingAccount.address,
                    depositAmt,
                    { from: user }
                );
            }
            await this.savingAccount.deposit(
                this.tokenAddrs[token],
                depositAmt,
                { from: user }
            );
        }

        await this.updateDeFinerCache(token);
        await this.updateAllUserState();
        // await this.updateUserState(user);
        const interestFromContractAfter = await this.savingAccount.getDepositInterest(this.tokenAddrs[token], { from: user });
        const principalFromContractAfter = await this.savingAccount.getDepositPrincipal(this.tokenAddrs[token], { from: user });
        const balanceAfter = depositBalanceArr[token];

        console.log(balanceBefore.toString());
        console.log(balanceFromContract.toString());
        console.log(interestFromContract.toString());
        console.log(principalFromContract.toString());
        console.log(balanceAfter.toString());
        console.log(interestFromContractAfter.toString());
        console.log(principalFromContractAfter.toString());
        // Check whether the change of the balance match
        expect(balanceBefore.eq(balanceAfter.minus(amount))).equal(true);
    }

    // Two kinds of failing cases in deposit, generate a number to decide which behavior to take
    // 1. Amount is 0
    // 2. Token address is not valid
    private depositExecFail = async (user: string, token: Tokens, kind: number) => {
        if (kind == 0) {
            await expectRevert(
                this.savingAccount.deposit(this.tokenAddrs[token], new BN(0), { from: user }),
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

        if (!userState || !curUserDepositBalanceArr) {
            console.log("get here withdraw move succ");

            return;
        }

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
                console.log("actual mat is: " + actualAmt.toString());
                console.log("cur deposit is" + curTokenDepositBalance.toString());
                if (actualAmt.gt(curTokenDepositBalance)) {
                    console.log("User " + user + " tries to withdraw more tokens than it deposit, should fail.");
                    // console.log("Actual amt is: " + actualAmt.toString());
                    // console.log("max amt is: " + maxWithdrawAmt.toString());
                    await this.withdrawExecFail(user, token, 3, actualAmt);
                } else {
                    console.log("User " + user + " tries to withdraw more tokens than its left borrowing power, should fail.");
                    // console.log("Actual amt is: " + actualAmt.toString());
                    // console.log("max amt is: " + maxWithdrawAmt.toString());
                    await this.withdrawExecFail(user, token, 4, actualAmt);
                }
            }
        }
    }


    // Borrow the amount of token that is within the borrow power
    private withdrawExecSucc = async (user: string, token: Tokens, amount: BigNumber) => {
        const depositBalanceArr = this.userDepositBalanceCache.get(user);

        if (!depositBalanceArr) {
            console.log("get here withdraw exec succ");
            return;
        }

        const balanceBefore = depositBalanceArr[token];

        const withdrawAmt = new BN(amount.toString());
        console.log("withdraw amt is: " + withdrawAmt.toString())
        await this.savingAccount.withdraw(this.tokenAddrs[token], withdrawAmt, {
            from: user
        });

        await this.updateDeFinerCache(token);
        // await this.updateUserState(user);
        await this.updateAllUserState();

        const balanceAfter = depositBalanceArr[token];

        console.log(balanceBefore.toString());
        console.log(balanceAfter.toString());

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

        if (!userState || !curUserBorrowBalanceArr || !curUserDepositBalanceArr) {
            console.log("user " + user);
            console.log(userState);
            console.log(curUserDepositBalanceArr);
            console.log(curUserBorrowBalanceArr);
            console.log("get here borrow move");
            return;
        }

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
                await this.borrowExecFail(user, token, 2, new BigNumber(100));
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

        if (!borrowBalanceArr) {
            console.log("get here borrow exec succ");
            return;
        }

        const balanceBefore = borrowBalanceArr[token];

        const borrowAmt = new BN(amount.toString());
        console.log("borrow amt is: " + borrowAmt.toString());
        await this.savingAccount.borrow(this.tokenAddrs[token], borrowAmt, {
            from: user
        });

        await this.updateDeFinerCache(token);
        await this.updateAllUserState();
        // await this.updateUserState(user);

        const balanceAfter = borrowBalanceArr[token];

        console.log(balanceBefore.toString());
        console.log(balanceAfter.toString());

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

        if (!userState || !curUserDepositBalanceArr) {
            // console.log("get here transfer move");
            return;
        }

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
            // console.log("Maximum transfer amt is: " + maxTransAmt.toString());
            // console.log("execAmt amt is: " + execAmt.toString());

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
                    // console.log("Actual amt is: " + actualAmt.toString());
                    // console.log("max amt is: " + maxTransAmt.toString());
                    await this.transExecFail(user, targetUser, token, 2, actualAmt);
                } else {
                    console.log("User " + user + " tries to transfer more tokens to user " + targetUser + " than its left borrowing power, should fail.");
                    // console.log("Actual amt is: " + actualAmt.toString());
                    // console.log("max amt is: " + maxTransAmt.toString());
                    await this.transExecFail(user, targetUser, token, 3, actualAmt);
                }
            }
        }

    }


    // Transfer the amount of tokens from user to a target account
    private transExecSucc = async (user: string, target: string, token: Tokens, amount: BigNumber) => {

        const userDepositBalanceArr = this.userDepositBalanceCache.get(user);
        const targetDepositBalanceArr = this.userDepositBalanceCache.get(target);
        // Update one more time to ensure the data is up-to-date
        // await this.updateUserState(user);
        // await this.updateUserState(target);

        if (!userDepositBalanceArr || !targetDepositBalanceArr) {
            console.log("get here transfer exec suscc");
            return;
        }
        if (target == user) return;

        const userBalanceBefore = userDepositBalanceArr[token];
        const targetBalanceBefore = targetDepositBalanceArr[token];


        const transferAmt = new BN(amount.toString());

        console.log("transferAmt is: " + transferAmt);
        await this.savingAccount.transfer(target, this.tokenAddrs[token], transferAmt, {
            from: user
        });

        await this.updateDeFinerCache(token);
        await this.updateAllUserState();
        // await this.updateUserState(user);
        // await this.updateUserState(target);

        const userBalanceAfter = userDepositBalanceArr[token];
        const targetBalanceAfter = targetDepositBalanceArr[token];


        console.log(userBalanceBefore.toString());
        console.log(userBalanceAfter.toString());

        console.log(targetBalanceBefore.toString());
        console.log(targetBalanceAfter.toString());

        console.log(userBalanceBefore.minus(userBalanceAfter).toString());
        console.log(targetBalanceAfter.minus(targetBalanceBefore).toString());
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

        // Null check guardian
        if (!userState || !curUserDepositBalanceArr) {
            console.log("get here withdraw all move");
            return;
        }

        const userBorrowETH = userState.userBorrowETH;
        const userDepositETH = userState.userDepositETH;
        const userBorrowPower = userState.userBorrowPower;
        const definerRemainingAmt = this.definerBalanceCache[token].remainingAssets;

        const definerRemainingETH = tokenInfo.price.times(definerRemainingAmt).div(10 ** this.decimals[token]);
        const curTokenDepositAmt = curUserDepositBalanceArr[token];

        const extraBorrowPower = userBorrowPower.minus(userBorrowETH).div(0.6).integerValue();
        const curTokenDepositETH = tokenInfo.price.div(10 ** this.decimals[token]).times(curTokenDepositAmt).integerValue(BigNumber.ROUND_DOWN);
        const extraBorrowAmt = extraBorrowPower.div(tokenInfo.price).times(10 ** this.decimals[token]).integerValue(BigNumber.ROUND_DOWN);

        // Recheck if the current withdrawAll move can be successful or not
        if (curTokenDepositAmt.eq(0) || definerRemainingAmt.lt(curTokenDepositAmt)) shouldSuccess = false;

        if (shouldSuccess) {
            // console.log("Token remains before withdraw all: " + definerRemainingAmt.toString());
            // console.log("cur Token Deposit amt: " + curTokenDepositAmt.toString());
            console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, should succeed.");
            await this.withdrawAllExecSucc(user, token);

        } else {
            if (curTokenDepositAmt.eq(0)) {

                console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, but it doesn't have any deposits, should fail.");
                await this.withdrawAllExecFail(user, token, 0);
            } else if (curTokenDepositETH.minus(5).gt(extraBorrowPower)) {

                // Due to precision issue, cureTokenDepositETH will be a little bigger than extraBorrow power even if they are actually the same
                // So add five to the extra borrow power to avoid that.
                // console.log("Token remains before withdraw all: " + curTokenDepositAmt.toString());
                // console.log("extra Borrow Power amt: " + extraBorrowAmt.toString());
                // console.log("cur Token Deposit amt: " + curTokenDepositAmt.toString());
                // console.log("Extra borrow power ETH: " + extraBorrowPower.toString());
                // console.log("cur Token Deposit ETH: " + curTokenDepositETH.toString());
                // console.log("userBorrowETH :" + userBorrowETH.toString());
                // console.log("userDepositETH :" + userDepositETH.toString());
                console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, but it will not have enough collateral, should fail.");
                await this.withdrawAllExecFail(user, token, 1);

            } else if (curTokenDepositAmt.gt(definerRemainingAmt)) {
                console.log("User " + user + " tries to withdraw all " + this.tokenNames[token] + " from DeFiner, but DeFiner will not have enough tokens, should fail.");
                await this.withdrawAllExecFail(user, token, 2);
            } else {
                console.log("User " + user + " tries to withdraw all unsupported token from DeFiner, should fail.");
                await this.withdrawAllExecFail(user, token, 3);
            }
        }
    }

    private withdrawAllExecSucc = async (user: string, token: Tokens) => {
        const userDepositBalanceArr = this.userDepositBalanceCache.get(user);

        // Null guard
        if (!userDepositBalanceArr) {
            console.log("get here withdraw all exec succ");

            return;
        }

        await this.savingAccount.withdrawAll(this.tokenAddrs[token], { from: user });

        // await this.updateDeFinerCache(token);
        await this.updateAllUserState();
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
                "Insufficient collateral when withdraw."
            );
        } else if (kind == 2) {
            await expectRevert(
                this.savingAccount.withdrawAll(this.tokenAddrs[token], { from: user }),
                "Lack of liquidity when withdraw."
            );
        } else {
            await expectRevert(
                this.savingAccount.withdrawAll(user, { from: user }),
                "Unsupported token"
            );
        }
    }

    private repayMove = async (user: string, token: Tokens, shouldSuccess: boolean) => {

        const userState = this.userStateCache.get(user);
        const tokenInfo = await this.getTokenInfo(token);
        const curUserBorrowBalanceArr = this.userBorrowBalanceCache.get(user);

        // Null check guardian
        if (!curUserBorrowBalanceArr) {
            console.log("get here repay move");
            return;
        }

        const debtAmt = curUserBorrowBalanceArr[token];

        // Recheck whether the current move can be successful or not
        if (debtAmt.eq(0)) shouldSuccess = false;

        const repayAmt = this.getRandBigWithBigRange(new BigNumber(1), debtAmt.times(1.5));

        if (shouldSuccess) {
            console.log("User " + user + " has " + debtAmt.toString() + " debt in " + this.tokenNames[token] + ", and tries to repay " + repayAmt.toString() + ", should succeed");
            await this.repayExecSucc(user, token, repayAmt);
        } else {

            const rand = this.getRandInt(0, 1000);
            var num = rand % 2;

            if (debtAmt.eq(0)) {
                console.log("User " + user + " has " + debtAmt.toString() + " debt in " + this.tokenNames[token] + ", and tries to repay " + 100 + ", should fail");
                await this.repayExecFail(user, token, new BigNumber(100), 2);
            } else if (num == 0) {
                console.log("User " + user + " tries to repay 0 " + this.tokenNames[token] + " to DeFiner, should fail.");
                await this.repayExecFail(user, token, new BigNumber(0), 0);
            } else {
                console.log("User " + user + " tries to repay an unsupported token to DeFiner, should fail.");
                await this.repayExecFail(user, token, repayAmt, 1);
            }
        }

    }

    // We can repay tokens less than the debt or more than the debt
    private repayExecSucc = async (user: string, token: Tokens, amount: BigNumber) => {
        const repayAmt = new BN(amount.toString());

        const borrowBalanceArr = this.userBorrowBalanceCache.get(user);

        if (!borrowBalanceArr) {
            console.log("get here repay succ")
            return;
        }

        const borrowBalanceBefore = borrowBalanceArr[token];

        if (token == Tokens.ETH) {
            await this.savingAccount.repay(this.ETH_ADDRESS, repayAmt, {
                value: repayAmt,
                from: user
            });
        } else {
            const tokenInfo = await this.getTokenInfo(token);
            const erc20Instance = await ERC20.at(tokenInfo.address);
            if (erc20Instance) {
                await erc20Instance.transfer(user, repayAmt);
                await erc20Instance.approve(
                    this.savingAccount.address,
                    repayAmt,
                    { from: user }
                );
            }
            await this.savingAccount.repay(
                tokenInfo.address,
                repayAmt,
                { from: user }
            );
        }

        await this.updateDeFinerCache(token);
        await this.updateAllUserState();
        // await this.updateUserState(user);

        const borrowBalanceAfter = borrowBalanceArr[token];

        if (amount.gte(borrowBalanceBefore)) {
            // Repay all the debt
            expect(borrowBalanceAfter.eq(0)).equal(true);
        } else {
            // Partial repay
            expect(borrowBalanceBefore.minus(borrowBalanceAfter).eq(amount)).equal(true);
        }

    }

    // Three kinds of failing cases in repay()
    // 1. Repay 0 token
    // 2. Repay an unsupported token
    // 3. Repay with no debt in the given token
    private repayExecFail = async (user: string, token: Tokens, amount: BigNumber, kind: number) => {
        const repayAmt = new BN(amount.toString());
        if (kind == 0) {
            await expectRevert(
                this.savingAccount.repay(this.tokenAddrs[token], new BN(0), { from: user }),
                "Amount is zero"
            );
        } else if (kind == 1) {
            await expectRevert(
                this.savingAccount.repay(user, repayAmt, { from: user }),
                "Unsupported token"
            );
        } else {
            if (token != Tokens.ETH) {
                const tokenInfo = await this.getTokenInfo(token);
                const erc20Instance = await ERC20.at(tokenInfo.address);
                if (erc20Instance) {
                    await erc20Instance.transfer(user, repayAmt);
                    await erc20Instance.approve(
                        this.savingAccount.address,
                        repayAmt,
                        { from: user }
                    );
                }
                await expectRevert(
                    this.savingAccount.repay(this.tokenAddrs[token], repayAmt, { from: user }),
                    "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
                );
            } else {
                await expectRevert(
                    this.savingAccount.repay(this.tokenAddrs[token], repayAmt, { from: user, value: repayAmt }),
                    "Token BorrowPrincipal must be greater than 0. To deposit balance, please use deposit button."
                );
            }
        }
    }

    private liquidateMove = async (user: string, target: string, token: Tokens, shouldSuccess: boolean) => {
        if (shouldSuccess) {
            await this.liquidateExecSucc(user, target, token);
        } else {
            await this.liquidateExecFail(user, target, token);
        }
    }

    private liquidateExecSucc = async (user: string, target: string, token: Tokens) => {
        console.log("LiquidateExecSucc not implemented yet.")
    }

    private liquidateExecFail = async (user: string, target: string, token: Tokens) => {
        console.log("LiquidateExecFail not implemented yet.")
    }

    // Randomly increase the block number between 1000 and 10000
    private incBlockNumMove = async () => {
        const lowerBound = new BigNumber(1000);
        const upperBound = new BigNumber(10000);

        const incNum = this.getRandBigWithBigRange(lowerBound, upperBound);

        console.log("Increase " + incNum.toString() + " blocks.");
        await this.savingAccount.fastForward(100000);

        // Update the status for all users
        await this.updateAllDeFinerCache();
        await this.updateAllUserState();

    }

    // Fluctuate the price between [80%, 120%];
    private changeTokenPriceMove = async (token: Tokens) => {
        if (token == Tokens.ETH) return;

        const tokenInfo = await this.getTokenInfo(token);
        const lowerBound = new BigNumber(80);
        const upperBound = new BigNumber(120);

        const fluctuation = this.getRandBigWithBigRange(lowerBound, upperBound);

        const updatedPrice = tokenInfo.price.times(fluctuation).div(100).integerValue();
        const chainlinkAggregator = this.aggregatorInstances[token];

        console.log("Change the token " + this.tokenNames[token] + " price to " + updatedPrice.toString());
        await chainlinkAggregator.updateAnswer(new BN(updatedPrice.toString()));

        // Update the status for all users
        await this.updateDeFinerCache(token);
        await this.updateAllUserState();

    }

}