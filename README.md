## Compile the contract and run the tests:

**1)** Download the compound-protocol as a submodule & install dependencies:

**`cd Savings && git submodule init && git submodule update`**

**`cd compound-protocol && npm i`**

**`cd compound-protocol/scenario  && npm i`**

**2)** Install dependencies:

**`cd Savings && yarn`**

**3)** Launch buidler evm:

**`npx buidler node`**

**4)** Run test scripts

**`yarn test`**

## Passing Tests:

```javascript

 Contract: ❍ SavingAccount
    ✓ should update conversion rate successfully. (5203ms)
    etc..

  Contract: ❍ TestTokenContract
    ✓ totalAmount should add interest when rate and time are 0. (59ms)
    etc..

```
