## Generate ABI:
Use the following command to generate the ABI:    

    yarn compile
    
This will create a new directory named `build/` with the ABI files for the respective contracts

## Deploying the contracts:
To deploy the contracts on a testnet, you'll need to have an account on Infura/Alchemy.  
Please follow the steps below to deploy the contracts:

**1)** In the root of the project create a file named .secret and add the following content:  
```
{
   "mnemonic": <your wallet's seed>,
   "projectId": <your Infura project Id>
}
```

**2)** Deploy the contracts using the following command in your terminal:  
```
truffle migrate --network <network_name>
```
E.x.: 
```
truffle migrate --network kovan
```
