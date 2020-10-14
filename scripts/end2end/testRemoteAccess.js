const Web3 = require("web3");
const web3 = new Web3.providers.HttpProvider("http://24.22.133.15:8545");
web3.eth.getAccounts(console.log);
