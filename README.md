## Compile the contract and run the tests:

**1)** Download the compound-protocol as a submodule & install dependencies:

**`cd Savings && git submodule init && git submodule update`**
**`cd compound-protocol && yarn install --lock-file`**
**`cd scenario && npm i`**

**2)** Install dependencies:

**`cd Savings && yarn`**

**3)** Launch buidler evm:

**`npx hardhat node`**

**4)** Run test scripts

**`yarn test ./test/**/*`**

**4)** If you want to use truffle test suite to run the test
- Replace **`await testEngine.deploySavingAccount()`** to **`await testEngine.deploySavingAccountTruffle()`** 
- Replace **`await testEngine.deploy()`** to **`await testEngine.deployTruffle()`** 
- Then run **`truffle test`**

## Passing Tests:

```javascript

 Contract: ❍ SavingAccount
    ✓ should update conversion rate successfully. (5203ms)
    etc..

  Contract: ❍ TestTokenContract
    ✓ totalAmount should add interest when rate and time are 0. (59ms)
    etc..

```
