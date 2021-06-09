<p align='center'><img src='https://user-images.githubusercontent.com/20457952/112141620-7fac9100-8bfb-11eb-87a9-6e7c4046f92f.png' width='400' /></p>

[![CircleCI](https://circleci.com/gh/DeFinerOrg/Savings.svg?style=svg&circle-token=ab60077689671e5abc9ddbf692ff0b6f0477036b)](https://circleci.com/gh/DeFinerOrg/Savings) [![node](https://img.shields.io/badge/node-v10.23.0-green)](https://nodejs.org/en/blog/release/v10.23.0/) [![solc](https://img.shields.io/badge/solc-v0.5.16-blue)](https://www.npmjs.com/package/solc/v/0.5.16)
 
We recommend using [solc-select](https://github.com/crytic/solc-select) for switching the solc compiler version.   

## Compile the contracts and run tests:

Clone the repository and follow these steps to compile the contracts and run tests:

**1)** Pull the compound-protocol submodule:  

    git submodule init && git submodule update && 
    cd compound-protocol && yarn install --lock-file &&
    cd scenario && npm i &&
    cd ../..

**2)** Install dependencies:

    npm install

**3)** Run test scripts:

    sh runtests.sh


## Passing Tests should look like the following:

```javascript

 Contract: ❍ SavingAccount
    ✓ should update conversion rate successfully. (5203ms)
    etc..

  Contract: ❍ TestTokenContract
    ✓ totalAmount should add interest when rate and time are 0. (59ms)
    etc..

```  
For more info about the protocol, please refer to our docs here: https://app.gitbook.com/@definer/s/definer/
