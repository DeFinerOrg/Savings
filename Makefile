rinkeby:
	cp -f contracts/params/SavingAccountParametersRinkeby.sol contracts/params/SavingAccountParameters.sol
	truffle compile
	mkdir -p deploy
	truffle-flattener contracts/SavingAccount.sol > deploy/SavingAccountRinkeby.sol

mainnet:
	cp -f contracts/params/SavingAccountParametersMainnet.sol contracts/params/SavingAccountParameters.sol
	truffle compile
	mkdir -p deploy
	truffle-flattener contracts/SavingAccount.sol > deploy/SavingAccountMainnet.sol
