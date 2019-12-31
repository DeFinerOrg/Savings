
## Generate deployable smart contract
make rinkeby
make mainnet

## _Run the tests:_

**1)** Enter this directory & install dependencies:

__`cd saving-pool-contract && npm i`__

**2)** Launch the Truffle development console:

__`npx truffle develop`__

**3)** Open a _new_ console in the same directory & spool up the ethereum-bridge:

__`npx ethereum-bridge -a 9 -H 127.0.0.1 -p 9545 --dev`__

**4)** Once the bridge is ready & listening, go back to the first console with Truffle running & set the tests going!

__`truffle(develop)> test`__



## Passing Tests:

```javascript

 Contract: ❍ SavingAccount
    ✓ should update conversion rate successfully. (5203ms)
    etc..

  Contract: ❍ TestTokenContract
    ✓ totalAmount should add interest when rate and time are 0. (59ms)
    etc..

```

