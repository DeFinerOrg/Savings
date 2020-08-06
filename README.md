## Compile the contract and run the tests:

**1)** Download the compound-protocol as a submodule & install dependencies:

**`cd Savings && git submodule init && git submodule update`**

**`cd compound-protocol && npm i`**

**2)** Install dependencies:

**`cd Savings && yarn`**

**3)** Launch ganache-cli:

**`ganache-cli --gasLimit 20000000 --gasPrice 20000 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true`**

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
