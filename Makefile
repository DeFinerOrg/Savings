all :
	cp -f contracts/params/SavingAccountParametersMainnet.sol contracts/params/SavingAccountParameters.sol
	cp -f contracts/config/ConfigMainnet.sol contracts/params/Config.sol
	truffle compile
	mkdir -p deploy
	truffle-flattener contracts/SavingAccount.sol > deploy/SavingAccountMainnet.sol
	rm -f contracts/params/SavingAccountParameters.sol
