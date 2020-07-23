// import * as t from "../../types/truffle-contracts/index";
// import { TestEngine } from "../../test-helpers/TestEngine";

// var chai = require("chai");
// var expect = chai.expect;
// var tokenData = require("../../test-helpers/tokenData.json");

// const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

// const MockERC20: t.MockERC20Contract = artifacts.require("MockERC20");
// const MockCToken: t.MockCTokenContract = artifacts.require("MockCToken");

// contract("Integration Tests", async (accounts) => {
//     const ETH_ADDRESS: string = "0x000000000000000000000000000000000000000E";
//     let testEngine: TestEngine;
//     let savingAccount: t.SavingAccountWithControllerInstance;

//     const owner = accounts[0];
//     const user1 = accounts[1];
//     const user2 = accounts[2];
//     const user3 = accounts[3];
//     const dummy = accounts[9];
//     const eighteenPrecision = new BN(10).pow(new BN(18));
//     const sixPrecision = new BN(10).pow(new BN(6));

//     let tokens: any;
//     let addressDAI: any;
//     let addressUSDC: any;
//     let addressUSDT: any;
//     let addressTUSD: any;
//     let addressMKR: any;
//     let addressBAT: any;
//     let addressZRX: any;
//     let addressREP: any;
//     let addressWBTC: any;
//     let addressCTokenForDAI: any;
//     let addressCTokenForUSDC: any;
//     let addressCTokenForUSDT: any;
//     let addressCTokenForWBTC: any;
//     let addressCTokenForZRX: any;
//     let cTokenDAI: t.MockCTokenInstance;
//     let cTokenUSDC: t.MockCTokenInstance;
//     let cTokenUSDT: t.MockCTokenInstance;
//     let cTokenWBTC: t.MockCTokenInstance;
//     let cTokenZRX: t.MockCTokenInstance;
//     let erc20DAI: t.MockERC20Instance;
//     let erc20USDC: t.MockERC20Instance;
//     let erc20USDT: t.MockERC20Instance;
//     let erc20TUSD: t.MockERC20Instance;
//     let erc20MKR: t.MockERC20Instance;
//     let erc20BAT: t.MockERC20Instance;
//     let erc20ZRX: t.MockERC20Instance;
//     let erc20REP: t.MockERC20Instance;
//     let erc20WBTC: t.MockERC20Instance;
//     let ZERO: any;
//     let ONE_WEEK: any;
//     let ONE_MONTH: any;
//     let tempContractAddress: any;
//     let cTokenTemp: any;
//     let addressCTokenTemp: any;
//     let erc20contr: t.MockERC20Instance;


//     context("Compound Model Validation", async () => {
//         context("Uses WhitePaper Model", async () => {
//             before(async () => {
//                 // Things to initialize before all test
//                 testEngine = new TestEngine();
//                 testEngine.deploy("whitePaperModel.scen");
//             });

//             beforeEach(async () => {
//                 savingAccount = await testEngine.deploySavingAccount();
//                 // 1. initialization.
//                 tokens = await testEngine.erc20Tokens;
//                 console.log(tokens[0]);
//                 addressDAI = tokens[0];
//                 addressUSDC = tokens[1];
//                 addressUSDT = tokens[2];
//                 addressTUSD = tokens[3];
//                 addressMKR = tokens[4];
//                 addressBAT = tokens[5];
//                 addressZRX = tokens[6];
//                 addressREP = tokens[7];
//                 addressWBTC = tokens[8];
//                 erc20DAI = await MockERC20.at(addressDAI);
//                 erc20USDC = await MockERC20.at(addressUSDC);
//                 erc20USDT = await MockERC20.at(addressUSDT);
//                 erc20TUSD = await MockERC20.at(addressTUSD);
//                 erc20MKR = await MockERC20.at(addressMKR);
//                 erc20BAT = await MockERC20.at(addressBAT);
//                 erc20ZRX = await MockERC20.at(addressZRX);
//                 erc20REP = await MockERC20.at(addressREP);
//                 erc20WBTC = await MockERC20.at(addressWBTC);
//                 ZERO = new BN(0);
//                 ONE_WEEK = new BN(7).mul(new BN(24).mul(new BN(3600)));
//                 ONE_MONTH = new BN(30).mul(new BN(24).mul(new BN(3600)));
//                 addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
//                 addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
//                 addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
//                 addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
//                 addressCTokenForZRX = await testEngine.tokenInfoRegistry.getCToken(addressZRX);
//                 cTokenDAI = await MockCToken.at(addressCTokenForDAI);
//                 cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
//                 cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
//                 cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
//                 cTokenZRX = await MockCToken.at(addressCTokenForZRX);
//             });
//             it("Deposit DAI and checkout the output rate", async () => {
//                 console.log("-------------------------Initial Value---------------------------");
//                 // 1. Check the compound rate before deposit
//                 const borrowRateBeforeDeposit = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateBeforeDeposit = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateBeforeDeposit.toString())
//                 console.log("Deposit rate ", depositRateBeforeDeposit.toString())
//                 // expect(borrowRateBeforeDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 // expect(depositRateBeforeDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 const balCTokenContract = await cTokenZRX.balanceOfUnderlying.call(savingAccount.address);
//                 const balTokenZRX = await erc20ZRX.balanceOf(savingAccount.address);
//                 console.log("balCTokenContract = ", balCTokenContract.toString());
//                 console.log("balTokenZRX = ", balTokenZRX.toString());
//                 // expect(balCTokenContract).to.be.bignumber.equal(new BN(1));
//                 // expect(balCTokenContract).to.be.bignumber.equal(new BN(50e30));

//                 // 2. User 1 deposits 1 ZRX
//                 const numOfZRX = eighteenPrecision;
//                 await erc20ZRX.transfer(user1, numOfZRX.mul(new BN(4)));
//                 await erc20ZRX.approve(savingAccount.address, numOfZRX.mul(new BN(4)), { from: user1 });
//                 await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });
//                 await erc20DAI.transfer(user2, numOfZRX.mul(new BN(4)));
//                 await erc20DAI.approve(savingAccount.address, numOfZRX.mul(new BN(4)), { from: user2 });
//                 await savingAccount.deposit(addressDAI, numOfZRX.mul(new BN(4)), { from: user2 });
//                 // await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
//                 console.log("---------------------------After Deposit---------------------------");

//                 const balCTokenContract1 = await cTokenZRX.balanceOfUnderlying.call(savingAccount.address);
//                 const balTokenZRX1 = await erc20ZRX.balanceOf(savingAccount.address);
//                 console.log("balCTokenContract = ", balCTokenContract1.toString());
//                 console.log("balTokenZRX = ", balTokenZRX1.toString());
//                 // 3. Advance 175,200 blocks, which roughly equals one month
//                 const b1 = await savingAccount.getBlockNumber({ from: user1 });
//                 console.log("Block number = ", b1.toString());
//                 const borrowRateAfterDeposit = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateAfterDeposit = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateAfterDeposit.toString());
//                 console.log("Deposit rate ", depositRateAfterDeposit.toString());
//                 await savingAccount.fastForward(100000000);
//                 console.log("------------------------100000000 blocks later------------------------");
//                 const b2 = await savingAccount.getBlockNumber({ from: user1 });
//                 console.log("Block number = ", b2.toString());

//                 // await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });

//                 const balCTokenContract2 = await cTokenZRX.balanceOfUnderlying.call(savingAccount.address);
//                 const balTokenZRX2 = await erc20ZRX.balanceOf(savingAccount.address);
//                 console.log("balCTokenContract = ", balCTokenContract2.toString());
//                 console.log("balTokenZRX = ", balTokenZRX2.toString());

//                 // 4. Check the compound rate after deposit
//                 const borrowRateAfterFastForward = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateAfterFastForward = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateAfterFastForward.toString());
//                 console.log("Deposit rate ", depositRateAfterFastForward.toString());
//                 // expect(borrowRateAfterDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 // expect(depositRateAfterDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 console.log("--------------------------After Borrow--------------------------");
//                 await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
//                 const borrowRateAfterBorrow = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateAfterBorrow = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateAfterBorrow.toString());
//                 console.log("Deposit rate ", depositRateAfterBorrow.toString());

//             });
//         });

//         context("Uses Fixed Rate Model", async () => {
//             before(async () => {
//                 // Things to initialize before all test
//                 testEngine = new TestEngine();
//                 testEngine.deploy("fixedRateModel.scen");
//             });

//             beforeEach(async () => {
//                 savingAccount = await testEngine.deploySavingAccount();
//                 // 1. initialization.
//                 tokens = await testEngine.erc20Tokens;
//                 console.log(tokens[0]);
//                 addressDAI = tokens[0];
//                 addressUSDC = tokens[1];
//                 addressUSDT = tokens[2];
//                 addressTUSD = tokens[3];
//                 addressMKR = tokens[4];
//                 addressBAT = tokens[5];
//                 addressZRX = tokens[6];
//                 addressREP = tokens[7];
//                 addressWBTC = tokens[8];
//                 erc20DAI = await MockERC20.at(addressDAI);
//                 erc20USDC = await MockERC20.at(addressUSDC);
//                 erc20USDT = await MockERC20.at(addressUSDT);
//                 erc20TUSD = await MockERC20.at(addressTUSD);
//                 erc20MKR = await MockERC20.at(addressMKR);
//                 erc20BAT = await MockERC20.at(addressBAT);
//                 erc20ZRX = await MockERC20.at(addressZRX);
//                 erc20REP = await MockERC20.at(addressREP);
//                 erc20WBTC = await MockERC20.at(addressWBTC);
//                 ZERO = new BN(0);
//                 ONE_WEEK = new BN(7).mul(new BN(24).mul(new BN(3600)));
//                 ONE_MONTH = new BN(30).mul(new BN(24).mul(new BN(3600)));
//                 addressCTokenForDAI = await testEngine.tokenInfoRegistry.getCToken(addressDAI);
//                 addressCTokenForUSDC = await testEngine.tokenInfoRegistry.getCToken(addressUSDC);
//                 addressCTokenForUSDT = await testEngine.tokenInfoRegistry.getCToken(addressUSDT);
//                 addressCTokenForWBTC = await testEngine.tokenInfoRegistry.getCToken(addressWBTC);
//                 addressCTokenForZRX = await testEngine.tokenInfoRegistry.getCToken(addressZRX);
//                 cTokenDAI = await MockCToken.at(addressCTokenForDAI);
//                 cTokenUSDC = await MockCToken.at(addressCTokenForUSDC);
//                 cTokenUSDT = await MockCToken.at(addressCTokenForUSDT);
//                 cTokenWBTC = await MockCToken.at(addressCTokenForWBTC);
//                 cTokenZRX = await MockCToken.at(addressCTokenForZRX);
//             });
//             it("Deposit DAI and checkout the output rate", async () => {
//                 console.log("-------------------------Initial Value---------------------------");
//                 // 1. Check the compound rate before deposit
//                 const borrowRateBeforeDeposit = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateBeforeDeposit = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateBeforeDeposit.toString())
//                 console.log("Deposit rate ", depositRateBeforeDeposit.toString())
//                 // expect(borrowRateBeforeDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 // expect(depositRateBeforeDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 const balCTokenContract = await cTokenZRX.balanceOfUnderlying.call(savingAccount.address);
//                 const balTokenZRX = await erc20ZRX.balanceOf(savingAccount.address);
//                 console.log("balCTokenContract = ", balCTokenContract.toString());
//                 console.log("balTokenZRX = ", balTokenZRX.toString());
//                 // expect(balCTokenContract).to.be.bignumber.equal(new BN(1));
//                 // expect(balCTokenContract).to.be.bignumber.equal(new BN(50e30));

//                 // 2. User 1 deposits 1 ZRX
//                 const numOfZRX = eighteenPrecision;
//                 await erc20ZRX.transfer(user1, numOfZRX.mul(new BN(4)));
//                 await erc20ZRX.approve(savingAccount.address, numOfZRX.mul(new BN(4)), { from: user1 });
//                 await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });
//                 await erc20DAI.transfer(user2, numOfZRX.mul(new BN(4)));
//                 await erc20DAI.approve(savingAccount.address, numOfZRX.mul(new BN(4)), { from: user2 });
//                 await savingAccount.deposit(addressDAI, numOfZRX.mul(new BN(4)), { from: user2 });
//                 // await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
//                 console.log("---------------------------After Deposit---------------------------");

//                 const balCTokenContract1 = await cTokenZRX.balanceOfUnderlying.call(savingAccount.address);
//                 const balTokenZRX1 = await erc20ZRX.balanceOf(savingAccount.address);
//                 console.log("balCTokenContract = ", balCTokenContract1.toString());
//                 console.log("balTokenZRX = ", balTokenZRX1.toString());
//                 // 3. Advance 175,200 blocks, which roughly equals one month
//                 const b1 = await savingAccount.getBlockNumber({ from: user1 });
//                 console.log("Block number = ", b1.toString());
//                 const borrowRateAfterDeposit = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateAfterDeposit = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateAfterDeposit.toString());
//                 console.log("Deposit rate ", depositRateAfterDeposit.toString());
//                 await savingAccount.fastForward(100000000);
//                 console.log("------------------------100000000 blocks later------------------------");
//                 const b2 = await savingAccount.getBlockNumber({ from: user1 });
//                 console.log("Block number = ", b2.toString());

//                 // await savingAccount.deposit(addressZRX, numOfZRX, { from: user1 });

//                 const balCTokenContract2 = await cTokenZRX.balanceOfUnderlying.call(savingAccount.address);
//                 const balTokenZRX2 = await erc20ZRX.balanceOf(savingAccount.address);
//                 console.log("balCTokenContract = ", balCTokenContract2.toString());
//                 console.log("balTokenZRX = ", balTokenZRX2.toString());

//                 // 4. Check the compound rate after deposit
//                 const borrowRateAfterFastForward = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateAfterFastForward = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateAfterFastForward.toString());
//                 console.log("Deposit rate ", depositRateAfterFastForward.toString());
//                 // expect(borrowRateAfterDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 // expect(depositRateAfterDeposit).to.be.bignumber.equal(new BN(5000000000000));
//                 console.log("--------------------------After Borrow--------------------------");
//                 await savingAccount.borrow(addressZRX, numOfZRX.div(new BN(2)), { from: user2 });
//                 const borrowRateAfterBorrow = await savingAccount.getCompoundBorrowRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 const depositRateAfterBorrow = await savingAccount.getCompoundSupplyRatePerBlock(addressCTokenForZRX, { from: user1 });
//                 console.log("Borrow rate ", borrowRateAfterBorrow.toString());
//                 console.log("Deposit rate ", depositRateAfterBorrow.toString());

//             });
//         });
//     });

//     context("Deposit and Withdraw", async () => {
//         context("should succeed", async () => {
//             it("should deposit DAI and check the rate after 1 month", async () => {
//                 /*
//                 // 1. User 1 deposits 1 DAI
//                 const numOfDAI = eighteenPrecision;
//                 await erc20DAI.transfer(user1, numOfDAI.mul(new BN(2)));
//                 await erc20DAI.approve(savingAccount.address, numOfDAI.mul(new BN(2)), { from: user1 });
//                 await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });

//                 // Increase block time to 1 month
//                 await time.increase(ONE_MONTH);
//                 await savingAccount.deposit(addressDAI, numOfDAI, { from: user1 });
//                 const balance =  await savingAccount.tokenBalance(addressDAI, { from: user1 });
//                 console.log("User's balance after 1 month", balance[0]);
//                 expect(balance[0]).to.be.bignumber.equal(new BN(11));
//                 */
//                 /*
//                 // Start borrowing
//                 const userBalanceBeforeBorrow = await erc20USDC.balanceOf(userNumber);
//                 await savingAccount.borrow(addressUSDC, borrowAmount, {
//                     from: userNumber
//                 });

//                 //TODO:
//                 let userTotalBalanceAfterBorrow = await savingAccount.tokenBalance(
//                     addressUSDC,
//                     { from: userNumber }
//                 );
//                 console.log("userTotalBalanceAfterBorrow", userTotalBalanceAfterBorrow[1]); // -1000, -2000, -3000

//                 const userBalanceAfterBorrow = await erc20USDC.balanceOf(userNumber);
//                 const userBalanceDiff = new BN(userBalanceAfterBorrow).sub(
//                     new BN(userBalanceBeforeBorrow)
//                 );

//                 // new BN(userTotalBalanceAfterBorrow[0]) is negative but amount is same as borrowAmount
//                 const userTotalBalanceDiff = new BN(userTotalBalanceAfterBorrow[1]).sub(
//                     new BN(userTotalBalanceBeforeBorrow[0])
//                 );
//                 // Verify if borrow was successful
//                 expect(borrowAmount).to.be.bignumber.equal(userTotalBalanceDiff);
//                 expect(userBalanceDiff).to.be.bignumber.equal(borrowAmount);
//                 */
//             });
//         });
//     });
// });
