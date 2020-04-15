// Copyright DeFiner Inc. 2018-2020

pragma solidity >= 0.5.0 < 0.6.0;

import "./external/provableAPI.sol";
import "./external/strings.sol";
import "./lib/SymbolsLib.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./params/SavingAccountParameters.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "./Base.sol";

contract SavingAccount is Ownable, usingProvable {
	using SymbolsLib for SymbolsLib.Symbols;
	using Base for Base.BaseVariable;
	using SafeMath for uint256;
	using SignedSafeMath for int256;

	SymbolsLib.Symbols symbols;
	Base.BaseVariable baseVariable;

	// TODO all should be in Config contract
	event LogNewProvableQuery(string description);
	event LogNewPriceTicker(string price);
	uint256 ACCURACY = 10**18;
	uint BLOCKS_PER_YEAR = 2102400;
	int BORROW_LTV = 60; //TODO check is this 60%?
	int LIQUIDATE_THREADHOLD = 85;
	int LIQUIDATION_DISCOUNT_RATIO = 95;

	uint COMMUNITY_FUND_RATIO = 10;
	uint256 MIN_RESERVE_RATIO = 10;
	uint256 MAX_RESERVE_RATIO = 20;


	constructor() public {
		SavingAccountParameters params = new SavingAccountParameters();
		Config config = new Config();
		address[] memory tokenAddresses = params.getTokenAddresses();
		address[] memory cTokenAddresses = config.getCTokenAddresses();
		//TODO This needs improvement as it could go out of gas
		symbols.initialize(params.ratesURL(), params.tokenNames(), tokenAddresses);
		baseVariable.initialize(tokenAddresses, cTokenAddresses);
		for(uint i = 0;i < tokenAddresses.length;i++) {
			if(cTokenAddresses[i] != address(0x0) && tokenAddresses[i] != 0x000000000000000000000000000000000000000E) {
				baseVariable.approveAll(tokenAddresses[i]);
			}
		}
	}

	function approveAll(address tokenAddress) public {
		baseVariable.approveAll(tokenAddress);
	}

	//Test method
	function getPrincipalAndInterestInCompound(address tokenAddress) public view returns(uint) {
		return baseVariable.getPrincipalAndInterestInCompound(tokenAddress);
	}

	//Test method
	function getCompoundRatePerBlock(address _cTokenAddress) public view returns(
		uint compoundSupplyRatePerBlock,
		uint compoundBorrowRatePerBlock
	) {
		return (Base.getCompoundSupplyRatePerBlock(_cTokenAddress), Base.getCompoundBorrowRatePerBlock(_cTokenAddress));
	}

	//Test method
	function getDefinerRateRecord(address tokenAddress, uint blockNumber) public view returns(uint, uint) {
		return (
		baseVariable.getDepositRateRecord(tokenAddress, blockNumber),
		baseVariable.getBorrowRateRecord(tokenAddress, blockNumber)
		);
	}

	//Test method
	function getNowRate(address tokenAddress) public view returns(uint, uint) {
		return baseVariable.getNowRate(tokenAddress);
	}

	//Test method
	function getCToken(address tokenAddress) public view returns(address) {
		return baseVariable.getCToken(tokenAddress);
	}

	//Update borrow rates. borrowRate = 1 + blockChangeValue * rate
	function updateDefinerRate(address tokenAddress) public {
		baseVariable.updateBorrowRate(tokenAddress);
		baseVariable.updateDepositRate(tokenAddress);
	}

	//TODO
	// 	function initialize(string memory ratesURL, string memory tokenNames, address[] memory tokenAddresses) public onlyOwner {
	// 		symbols.initialize(ratesURL, tokenNames, tokenAddresses);
	// 	}

	/** 
	 * Gets the total amount of balance that give accountAddr stored in saving pool.
	 */
	function getAccountTotalUsdValue(address accountAddr) public view returns (int256 usdValue) {
		return baseVariable.getAccountTotalUsdValue(accountAddr, symbols);
	}

	/** 
	 * Get the overall state of the saving pool
	 */
	function getMarketState() public view returns (
		address[] memory addresses,
		int256[] memory deposits,
		int256[] memory loans,
		int256[] memory collateral,
		uint256[] memory depositRatePerBlock,
		uint256[] memory borrowRatePerBlock
	)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		deposits = new int256[](coinsLen);
		loans = new int256[](coinsLen);
		collateral = new int256[](coinsLen);
		depositRatePerBlock = new uint256[](coinsLen);
		borrowRatePerBlock = new uint256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			(
				deposits[i],
				loans[i],
				collateral[i],
				depositRatePerBlock[i],
				borrowRatePerBlock[i]
			) = baseVariable.getTokenState(tokenAddress);
		}
		return (addresses, deposits, loans, collateral, depositRatePerBlock, borrowRatePerBlock);
	}

	/*
	 * Get the state of the given token
	 */
	function getTokenState(address tokenAddress) public view returns (
		int256 deposits,
		int256 loans,
		int256 collateral,
		uint256 depositRatePerBlock,
		uint256 borrowRatePerBlock
	)
	{
		return baseVariable.getTokenState(tokenAddress);
	}

	/** 
	 * Get all balances for the sender's account
	 */
	function getBalances() public view returns (
		address[] memory addresses,
		int256[] memory totalBalance,
		int256[] memory totalInterest
	)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		totalBalance = new int256[](coinsLen);
		totalInterest = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			(totalBalance[i], totalInterest[i]) = tokenBalanceOfAndInterestOf(tokenAddress);
		}

		return (addresses, totalBalance, totalInterest);
	}

	//存入compound的资金率列表
	function getCapitalCompoundRateList() public view returns(address[] memory addresses, int256[] memory balances) {
		uint coinsLen = getCoinLength();
		addresses = new address[](coinsLen);
		balances = new int256[](coinsLen);
		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			balances[i] = baseVariable.getCapitalCompoundBalance(tokenAddress);
		}
		return (addresses, balances);
	}

	function getActiveAccounts() public view returns(address[] memory) {
		return baseVariable.getActiveAccounts();
	}

	function getLiquidatableAccounts() public view returns(address[] memory) {
		address[] memory liquidatableAccounts;
		uint returnIdx;
		//TODO `activeAccounts` not getting removed from array.
		//TODO its always increasing. Call to this function needing
		//TODO more gas, however, it will not be charged in ETH.
		//TODO What could be the impact? 
		for (uint i = 0; i < baseVariable.getActiveAccounts().length; i++) {
			address targetAddress = baseVariable.getActiveAccounts()[i];
			if (
				int256(baseVariable.totalBalance(targetAccountAddr, symbols, false).mul(-1)).mul(100)
				>
				baseVariable.getAccountTotalUsdValue(targetAddress, symbols).mul(LIQUIDATE_THREADHOLD)
				&&
				int256(baseVariable.getAccountTotalUsdValue(targetAddress, symbols).mul(-1))
				.mul(LIQUIDATION_DISCOUNT_RATIO)
				<=
				baseVariable.getAccountTotalUsdValue(targetAddress, symbols).mul(100)

			) {
				liquidatableAccounts[returnIdx++] = (targetAddress);
			}
		}
		return liquidatableAccounts;
	}

	function getCoinLength() public view returns(uint256 length){
		return symbols.getCoinLength();
	}

	function tokenBalanceOfAndInterestOf(address tokenAddress) public view returns(
		int256 totalBalance,
		int256 totalInterest
	) {
		return baseVariable.tokenBalanceOfAndInterestOf(tokenAddress, msg.sender);
	}

	function getCoinAddress(uint256 coinIndex) public view returns(address) {
		return symbols.addressFromIndex(coinIndex);
	}

	function getCoinToUsdRate(uint256 coinIndex) public view returns(uint256) {
		return symbols.priceFromIndex(coinIndex);
	}

	function toCompound(address tokenAddress) public {
		if(symbols.isEth(tokenAddress)) {
			baseVariable.toCompound(tokenAddress, MAX_RESERVE_RATIO, true);
		} else {
			baseVariable.toCompound(tokenAddress, MAX_RESERVE_RATIO, false);
		}
	}

	function fromCompound(address tokenAddress) public {
		baseVariable.fromCompound(tokenAddress, MIN_RESERVE_RATIO, ACCURACY);
	}

	function borrow(address tokenAddress, uint256 amount) public {
		require(
			(
			int256(baseVariable.getAccountTotalUsdValue(msg.sender, symbols) * -1)
			.add(int256(amount.mul(symbols.priceFromAddress(tokenAddress))))
			.div(10**18)
			).mul(100)
			<=
			(baseVariable.getAccountTotalUsdValue(msg.sender, symbols)).mul(BORROW_LTV),
			"Insufficient collateral."
		);
		baseVariable.borrow(tokenAddress, amount, ACCURACY);
		send(msg.sender, amount, tokenAddress);
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		baseVariable.repay(tokenAddress, amount, ACCURACY);
		receive(msg.sender, amount, tokenAddress);
		if(baseVariable.getCapitalReserveRate(tokenAddress) > 20 * 10**16) {
			baseVariable.toCompound(tokenAddress, 20, tokenAddress == 0x000000000000000000000000000000000000000E);
		}
	}
	/** 
	 * Deposit the amount of tokenAddress to the saving pool.
	 */
	function depositToken(address tokenAddress, uint256 amount) public payable {
		baseVariable.depositToken(tokenAddress, amount, ACCURACY);
		receive(msg.sender, amount, tokenAddress);
		if(baseVariable.getCapitalReserveRate(tokenAddress) > 20 * 10**16) {//20暂用，要改
			baseVariable.toCompound(tokenAddress, 20, tokenAddress == 0x000000000000000000000000000000000000000E);
		}
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public {
		baseVariable.withdrawToken(tokenAddress, amount, ACCURACY);
		send(msg.sender, amount, tokenAddress);
	}

	function withdrawAllToken(address tokenAddress) public {
		uint amount = baseVariable.withdrawAllToken(tokenAddress, ACCURACY);
		send(msg.sender, amount, tokenAddress);
	}

	function liquidate(address targetAccountAddr, address targetTokenAddress) public payable {
		int totalBorrow = baseVariable.totalBalance(targetAccountAddr, symbols, false).mul(-1);
		int totalCollateral = baseVariable.totalBalance(targetAccountAddr, symbols, true);

		//是否满足清算下限
		require(
			totalBorrow.mul(100) > totalCollateral.mul(LIQUIDATE_THREADHOLD),
			"The ratio of borrowed money and collateral must be larger than 95% in order to be liquidated."
		);

		//是否满足清算上限
		require(
			totalBorrow.mul(100) <= totalCollateral.mul(LIQUIDATION_DISCOUNT_RATIO),
			"Collateral is not sufficient to be liquidated."
		);

		//被清算者需要清算掉的资产
		uint liquidationDebtValue = uint(
			totalBorrow.sub(totalCollateral.mul(BORROW_LTV)).div(LIQUIDATION_DISCOUNT_RATIO - BORROW_LTV)
		);
		//清算者需要付的钱
		uint paymentOfLiquidationAmount = uint(baseVariable.tokenBalanceAdd(targetTokenAddress, msg.sender));

		if(paymentOfLiquidationAmount < liquidationDebtValue) {
			liquidationDebtValue = paymentOfLiquidationAmount.mul(100).div(uint(LIQUIDATION_DISCOUNT_RATIO));
		}

		for(uint i = 0; i < getCoinLength(); i++) {
			address[] memory addr;
			uint[] memory u;
			addr[0] = targetAccountAddr;
			addr[1] = targetTokenAddress;
			addr[2] = symbols.addressFromIndex(i);
			u[0] = symbols.priceFromAddress(targetTokenAddress);
			u[1] = symbols.priceFromIndex(i);
			u[2] = liquidationDebtValue;
			(uint _liquidationDebtValue) = baseVariable.liquidate(
				addr, u
			);
			if(_liquidationDebtValue == 0){
				break;
			} else {
				liquidationDebtValue = _liquidationDebtValue;
			}
		}
	}

	function recycleCommunityFund(address tokenAddress) public {
		baseVariable.recycleCommunityFund(tokenAddress);
	}

	function setDeFinerCommunityFund(address payable _DeFinerCommunityFund) public {
		baseVariable.setDeFinerCommunityFund(_DeFinerCommunityFund);
	}

	function getDeFinerCommunityFund(address tokenAddress) public view returns(int256) {
		return baseVariable.getDeFinerCommunityFund(tokenAddress);
	}

	function receive(address from, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			require(msg.value == amount, "The amount is not sent from address.");
		} else {
			//When only tokens received, msg.value must be 0
			require(msg.value == 0, "msg.value must be 0 when receiving tokens");
			require(IERC20(tokenAddress).transferFrom(from, address(this), amount), "Token transfer failed");
		}
	}

	function send(address to, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			//TODO need to check for re-entrancy security attack
			//TODO Can this ETH be received by a contract?
			msg.sender.transfer(amount);
		} else {
			require(IERC20(tokenAddress).transfer(to, amount), "Token transfer failed");
		}
	}

	/** 
	 * Callback function which is used to parse query the oracle. Once 
	 * parsed results from oracle, it will recursively call oracle for data.
	 **/
	function __callback(bytes32,  string memory result) public {
		require(msg.sender == provable_cbAddress(), "Unauthorized address");
		emit LogNewPriceTicker(result);
		symbols.parseRates(result);
		// updatePrice(30 * 60); // Call from external
		updatePrice();
	}

	// Customized gas limit for querying oracle. That's because the function 
	// symbols.parseRates() is heavy and need more gas.
	//TODO This should not be hard-coded as Ethereum keeps changing gas
	//TODO consumption of opcodes. It should be configurable.
	uint constant CUSTOM_GAS_LIMIT = 6000000;

	/** 
	 * Update coins price every 30 mins. The contract must have enough gas fee.
	 翻译：更新硬币价格每30分钟一班。 该合同必须有足够的天然气费用。
	 */
	function updatePriceWithDelay(uint256 delaySeconds) public payable {
		//TODO address(this).balance this should be avoided for security reasons
		if (provable_getPrice("URL", CUSTOM_GAS_LIMIT) > address(this).balance) {
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee!");
		} else {
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
			provable_query(delaySeconds, "URL", symbols.ratesURL, CUSTOM_GAS_LIMIT);
		}
	}

	// Manually Update Price
	function updatePrice() public payable {
		if (provable_getPrice("URL") > address(this).balance) {
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee");
		} else {
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer..");
			provable_query("URL", symbols.ratesURL);
		}
	}

	// Make the contract payable so that the contract will have enough gass fee 
	// to query oracle. 
	function() external payable {}
}
