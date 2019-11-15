
## _Run the tests:_

**1)** Enter this directory & install dependencies:

__`❍ cd saving-pool-contract && npm i`__

**2)** Launch the Truffle development console:

__`❍ npx truffle develop`__

**3)** Open a _new_ console in the same directory & spool up the ethereum-bridge:

__`❍ npx ethereum-bridge -a 9 -H 127.0.0.1 -p 9545 --dev`__

**4)** Once the bridge is ready & listening, go back to the first console with Truffle running & set the tests going!

__`❍ truffle(develop)> test`__

&nbsp;

## Passing Tests:

```javascript

 Contract: ❍ SavingAccount
    ✓ should update conversion rate successfully. (5203ms)

  Contract: ❍ TestTokenContract
    ✓ totalAmount should add interest when rate and time are 0. (59ms)
    ✓ totalAmount should add interest. (55ms)
    ✓ totalAmount should be negative when balance is negative. (47ms)
    ✓ viewInterest should return -1 interest when balance is negative. (60ms)
    ✓ viewInterest should return 0 interest when balance is negative. (45ms)
    ✓ viewInterest should add existing interest. (53ms)
    ✓ viewInterest should add existing interest. (59ms)
    ✓ minusAmount should update interest successfully. (74ms)
    ✓ minusAmount should update interest and balance successfully. (93ms)
    ✓ minusAmount should update interest and balance to 0 successfully. (93ms)
    ✓ minusAmount should update interest and balance to negative successfully. (99ms)
    ✓ minusAmount should update successfully when initial balance is negative. (107ms)
    ✓ addAmount should update interest successfully. (93ms)
    ✓ addAmount should update interest and balance successfully. (121ms)
    ✓ addAmount should update interest and balance to 0 successfully. (103ms)
    ✓ addAmount should update interest and balance to positive successfully. (126ms)
    ✓ addAmount should update successfully when initial balance is positive. (105ms)

```

&nbsp;
