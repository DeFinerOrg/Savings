const Web3 = require('web3');
var web3 = new Web3('ws://52.147.196.54:8545/');

const getAccounts = async () => {
    await web3.eth.getAccounts(console.log);
}


(async () => {
    await getAccounts();
    process.exit(0);
})();
