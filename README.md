<p align='center'><img src='https://user-images.githubusercontent.com/20457952/112141620-7fac9100-8bfb-11eb-87a9-6e7c4046f92f.png' width='400' /></p>

[![CircleCI](https://circleci.com/gh/DeFinerOrg/Savings.svg?style=svg&circle-token=ab60077689671e5abc9ddbf692ff0b6f0477036b)](https://circleci.com/gh/DeFinerOrg/Savings) [![node](https://img.shields.io/badge/node-v10.23.0-green)](https://nodejs.org/en/blog/release/v10.23.0/) [![solc](https://img.shields.io/badge/solc-v0.5.16-blue)](https://www.npmjs.com/package/solc/v/0.5.16)
 
We recommend using [solc-select](https://github.com/crytic/solc-select) for switching the solc compiler version.   

## Compile the contracts and run tests:

Clone the repository and follow these steps to compile the contracts and run tests:

**1)** Install dependencies & set up the project:

    npm install

**2)** Run test scripts:

    yarn test
    
## Generate ABI:
Use the following command to generate the ABI:    

    yarn compile
    
This will create a new directory named `build/` with the ABI files for the respective contracts

## Deploying the contracts:
To deploy the contracts on a testnet, you'll need to have an account on Infura/Alchemy.  
Please follow the steps below to deploy the contracts:

**1)** In the root of the project create a json file named .secrets.json and add the following content:  
```
{
   "mnemonic": <your wallet's seed>,
   "projectId": <your Infura project Id>
}
```
**2)** Install HDWalletProvider:  
```
npm install @truffle/hdwallet-provider
```

**3)** Add config for the testnet in `truffle-config.js` file:  

Import dependencies and parse the `.secrets.json` file:  
```
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
const secrets = JSON.parse(fs.readFileSync(".secrets.json").toString().trim());
```
In the networks section, add a new network config(e.x. Kovan) as follows:
```
kovan: {
   networkCheckTimeout: 10000,
   provider: () => {
      return new HDWalletProvider(
        secrets.mnemonic,
        `wss://kovan.infura.io/ws/v3/${secrets.projectId}`
      );
   },
   network_id: "42",
},
```
**4)** Finally, deploy the contracts using the following command in your terminal:  
```
truffle migrate --network <network_name>
```
E.x.: 
```
truffle migrate --network kovan
```

## For more info about the protocol, please refer to our docs here: https://app.gitbook.com/@definer/s/definer/
