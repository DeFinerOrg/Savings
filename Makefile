all :
	cp -f contracts/config/ConfigMainnet.sol contracts/params/Config.sol
	truffle compile
	mkdir -p deploy
	truffle-flattener contracts/SavingAccount.sol > deploy/SavingAccountMainnet.sol

