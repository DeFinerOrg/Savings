## Generate ABI:
Use the following command to generate the ABI:    

    yarn generate
    
This will create a new directory named `artifacts/contracts/` with the ABI files for the respective contracts

## Deploying the contracts:
To deploy the contracts on a testnet, you'll need to have an account on Infura.  
Please follow the steps below to deploy the contracts:

**1)** In the root of the project create a file named .secrets.json and add the following content:  
```
{
   "mnemonic": "<your wallet's seed>",
   "projectId": "<your Infura project Id>"
}
```

**2)** Deploy the contracts using the following command in your terminal:  
```
yarn delete-timelock-mock && truffle migrate --network <network_name>
```
E.x.: 
```
yarn delete-timelock-mock && truffle migrate  --network kovan
```
