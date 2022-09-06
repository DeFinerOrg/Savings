//This task is for deploying SavingsDataHelper.
task("deploy-savings-data-helper", "Deploy Savings Data Helper smart contract")
    .addParam("globalConfig", "The global config smart contract address")
    .addParam("claim", "The claim smart contract address")
    .setAction(async (taskArgs, hre) => {
    	await hre.run("compile");
    	const savingsDataHelper = await hre.ethers.getContractFactory("SavingsDataHelper");
    	const savingsDataHelperContract = await savingsDataHelper.deploy(taskArgs.globalConfig, taskArgs.claim);
    	await savingsDataHelperContract.deployed();
    	console.log("savingsDataHelperContract contract Deployed at: ", savingsDataHelperContract.address);
    });

