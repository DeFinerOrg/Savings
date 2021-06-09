<p align='center'><img src='https://user-images.githubusercontent.com/20457952/112141620-7fac9100-8bfb-11eb-87a9-6e7c4046f92f.png' width='400' /></p>

[![CircleCI](https://circleci.com/gh/DeFinerOrg/Savings.svg?style=svg&circle-token=ab60077689671e5abc9ddbf692ff0b6f0477036b)](https://circleci.com/gh/DeFinerOrg/Savings) [![node](https://img.shields.io/badge/node-v10.23.0-green)](https://nodejs.org/en/blog/release/v10.23.0/) [![solc](https://img.shields.io/badge/solc-v0.5.16-blue)](https://www.npmjs.com/package/solc/v/0.5.16)
 
We recommend using [solc-select](https://github.com/crytic/solc-select) for switching the solc compiler version.   

## Compile the contracts and run tests:

Clone the repository and follow these steps to compile the contracts and run tests:

**1)** Pull the compound-protocol submodule:  

    git submodule init && git submodule update && 
    cd compound-protocol && yarn install --lock-file &&
    cd scenario && npm i &&
    cd ../.. && npm i

**2)** Install dependencies:

**`cd Savings && yarn`**

**3)** Launch hardhat evm in a new terminal window:

**`npx hardhat node`**

**4)** Run test scripts:

**`yarn test test/**/*.ts`**

To run a specefic test file:  
**`yarn test test/path/to/test_file_name`**  

**Example:**  
**`yarn test test/unit/depositTests.spec.ts`**

**4)** If you want to use truffle test suite to run the tests: 
- Replace **`await testEngine.deploySavingAccount()`** to **`await testEngine.deploySavingAccountTruffle()`** 
- Replace **`await testEngine.deploy()`** to **`await testEngine.deployTruffle()`** 
- Then run **`truffle test`**

## Passing Tests should look like the following:

```javascript

 Contract: ❍ SavingAccount
    ✓ should update conversion rate successfully. (5203ms)
    etc..

  Contract: ❍ TestTokenContract
    ✓ totalAmount should add interest when rate and time are 0. (59ms)
    etc..

```
