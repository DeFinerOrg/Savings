## Pre-requisites
Use the following versions of these dependencies:  
 - Node: v10.23.0
 - solc: 0.5.16  
 
 We recommend [solc-select](https://github.com/crytic/solc-select) for switching the solc compiler version.   

## Compile the contracts and run the tests:

Clone the repository and follow these steps to compile the contracts and run the tests:

**1)** Pull the compound-protocol submodule & install dependencies:  

- **`cd Savings && git submodule init && git submodule update`**  
- **`cd compound-protocol && sudo npm i`**  
- **`cd scenario && npm i`**

**2)** Install dependencies:

**`cd Savings && yarn`**

**3)** Launch hardhat evm in a new terminal window:

**`npx hardhat node`**

**4)** Run test scripts:

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
