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

	event LogNewProvableQuery(string description);
	event LogNewPriceTicker(string price);
	int256 BASE = 10**6;//精度
	uint256 ACCURACY = 10**18;
//	uint256 CAPITAL_COMPOUND_Ratio = 0;	// Assume
//	uint BLOCKS_PER_YEAR = 2102400;
	int BORROW_LTV = 60; //TODO check is this 60%?
	int LIQUIDATE_THREADHOLD = 85;
	int LIQUIDATION_DISCOUNT_RATIO = 95;
//	uint COMMUNITY_FUND_RATIO = 10;
	uint Capital_Reserve_Ratio_Ceiling = 20; //准备金上限
	uint Capital_Reserve_Ratio_Lower = 10;  //准备金下限

	constructor() public {
		SavingAccountParameters params = new SavingAccountParameters();
		address[] memory tokenAddresses = params.getTokenAddresses();
		//TODO This needs improvement as it could go out of gas
		symbols.initialize(params.ratesURL(), params.tokenNames(), tokenAddresses);
		baseVariable.initialize(tokenAddresses);
	}

	//Update borrow rates. borrowRate = 1 + blockChangeValue * rate
	function updateBorrowRate(address tokenAddress, uint blockNumber) public {
		baseVariable.updateBorrowRate(tokenAddress, blockNumber, ACCURACY);
	}

	//TODO
	// 	function initialize(string memory ratesURL, string memory tokenNames, address[] memory tokenAddresses) public onlyOwner {
	// 		symbols.initialize(ratesURL, tokenNames, tokenAddresses);
	// 	}

	/** 
	 * Gets the total amount of balance that give accountAddr stored in saving pool.
	 */
	function getAccountTotalUsdValue(address accountAddr) public view returns (int256 usdValue) {
		return getAccountTotalUsdValue(accountAddr, true).add(getAccountTotalUsdValue(accountAddr, false));
	}

	function getAccountTotalUsdValue(address accountAddr, bool isPositive) private view returns (int256 usdValue){
		int256 totalUsdValue = 0;
		for(uint i = 0; i < getCoinLength(); i++) {
			totalUsdValue = totalUsdValue.add(baseVariable.getAccountTotalUsdValue(
													accountAddr,
													isPositive,
													symbols.addressFromIndex(i),
													symbols.priceFromIndex(i)
												)
											);
		}
		return totalUsdValue;
	}

	/** 
	 * Get the overall state of the saving pool
	 */
	function getMarketState() public view returns (
		address[] memory addresses,
		int256[] memory deposits,
		int256[] memory loans,
		int256[] memory collateral
	)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		deposits = new int256[](coinsLen);
		loans = new int256[](coinsLen);
		collateral = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			deposits[i] = baseVariable.getMarketState(tokenAddress)[0];
			loans[i] = baseVariable.getMarketState(tokenAddress)[1];
			collateral[i] = baseVariable.getMarketState(tokenAddress)[2];
		}
		return (addresses, deposits, loans, collateral);
	}

	/*
	 * Get the state of the given token
	 */
	function getTokenState(address tokenAddress) public view returns (int256 deposits, int256 loans, int256 collateral)
	{
		return baseVariable.getTokenState(tokenAddress);
	}

	/** 
	 * Get all balances for the sender's account
	 */
	function getBalances() public view returns (address[] memory addresses, int256[] memory balances)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		balances = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			balances[i] = tokenBalanceOf(tokenAddress);
		}

		return (addresses, balances);
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

	function getActiveAccounts() public view returns (address[] memory) {
		return baseVariable.getActiveAccounts();
	}

	function getLiquidatableAccounts() public view returns (address[] memory) {
		address[] memory liquidatableAccounts;
		uint returnIdx;
		//TODO `activeAccounts` not getting removed from array.
		//TODO its always increasing. Call to this function needing
		//TODO more gas, however, it will not be charged in ETH.
		//TODO What could be the impact? 
		for (uint i = 0; i < baseVariable.getActiveAccounts().length; i++) {
			address targetAddress = baseVariable.getActiveAccounts()[i];
			if (
				int256(getAccountTotalUsdValue(targetAddress, false).mul(-1)).mul(100)
				>
				getAccountTotalUsdValue(targetAddress, true).mul(LIQUIDATE_THREADHOLD)
				&&
				int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
				.mul(LIQUIDATION_DISCOUNT_RATIO)
				<=
				getAccountTotalUsdValue(targetAddress, true).mul(100)

			) {
				liquidatableAccounts[returnIdx++] = (targetAddress);
			}
		}
		return liquidatableAccounts;
	}

	function getCoinLength() public view returns (uint256 length){
		return symbols.getCoinLength();
	}

	function tokenBalanceOf(address tokenAddress) public view returns (int256 amount) {
		return baseVariable.tokenBalanceOf(tokenAddress);
	}

	function getCoinAddress(uint256 coinIndex) public view returns (address) {
		return symbols.addressFromIndex(coinIndex);
	}

	function getCoinToUsdRate(uint256 coinIndex) public view returns(uint256) {
		return symbols.priceFromIndex(coinIndex);
	}

	function toCompound(address tokenAddress) public {
		if(symbols.isEth(tokenAddress)) {
			baseVariable.toCompound(tokenAddress, Capital_Reserve_Ratio_Ceiling, true);
		} else {
			baseVariable.toCompound(tokenAddress, Capital_Reserve_Ratio_Ceiling, false);
		}
	}

	function fromCompound(address tokenAddress) public {
		baseVariable.fromCompound(tokenAddress, Capital_Reserve_Ratio_Lower, ACCURACY);
	}

	function borrow(address tokenAddress, uint256 amount) public payable {
		require(
			(
			int256(getAccountTotalUsdValue(msg.sender, false) * -1)
			.add(int256(amount.mul(symbols.priceFromAddress(tokenAddress))))
			.div(BASE)
			).mul(100)
			<=
			(getAccountTotalUsdValue(msg.sender, true)).mul(BORROW_LTV),
			"Insufficient collateral.");
		baseVariable.borrow(tokenAddress, amount, ACCURACY);
		send(msg.sender, amount, tokenAddress);
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		baseVariable.repay(tokenAddress, amount, ACCURACY);
		receive(msg.sender, amount, tokenAddress);
	}
	/** 
	 * Deposit the amount of tokenAddress to the saving pool.
	 */
	function depositToken(address tokenAddress, uint256 amount) public payable {
		baseVariable.depositToken(tokenAddress, amount, ACCURACY);
		receive(msg.sender, amount, tokenAddress);
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public payable {
		baseVariable.withdrawToken(tokenAddress, amount, ACCURACY);
		send(msg.sender, amount, tokenAddress);
	}

//	function liquidate(address targetAddress) public payable {
//
//		//是否满足清算比例
//		require(
//			int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
//			.mul(100)
//			>
//			getAccountTotalUsdValue(targetAddress, true).mul(LIQUIDATE_THREADHOLD),
//			"The ratio of borrowed money and collateral must be larger than 95% in order to be liquidated.");
//
//		//是否满足清算下限
//		require(
//			int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
//			.mul(LIQUIDATION_DISCOUNT_RATIO)
//			<=
//			getAccountTotalUsdValue(targetAddress, true).mul(100),
//			"Collateral is not sufficient to be liquidated."
//		);
//
//		//计算维持到之前的借款比例需要清算多少抵押资产
//		int totalBorrow = int256(getAccountTotalUsdValue(targetAddress, false).mul(-1));
//		int totalMortgage = int256(getAccountTotalUsdValue(targetAddress, true));
//
//		//最大清算资产
//		uint liquidationDebtValue = uint(LIQUIDATION_DISCOUNT_RATIO.mul(totalBorrow)
//									.sub(BORROW_LTV.div(LIQUIDATION_DISCOUNT_RATIO).mul(totalMortgage))
//									.div(LIQUIDATION_DISCOUNT_RATIO.sub(BORROW_LTV)));
//
//			uint paymentOfLiquidationAmount = uint(getAccountTotalUsdValue(msg.sender, true).mul(100-BORROW_LTV).div(100));
//			uint liquidationOfMortgageAssets;
//			if(paymentOfLiquidationAmount < liquidationDebtValue) {
//				liquidationDebtValue = paymentOfLiquidationAmount;
//			}
//			liquidationOfMortgageAssets = uint(liquidationDebtValue).div(uint(LIQUIDATION_DISCOUNT_RATIO)).mul(100);
//			paymentOfLiquidationAmount = uint(liquidationDebtValue).div(uint(LIQUIDATION_DISCOUNT_RATIO))
//										 .mul(uint(100-LIQUIDATION_DISCOUNT_RATIO));
//			uint coinsLen = getCoinLength();
//			for (uint i = 0; i < coinsLen; i++) {
//				address tokenAddress = symbols.addressFromIndex(i);
//				TokenInfoLib.TokenInfo storage tokenInfo = accounts[targetAddress].tokenInfos[tokenAddress];
//				TokenInfoLib.TokenInfo storage msgTokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];
//				if(
//					tokenInfo.getCurrentTotalAmount() >= 0
//					&& liquidationOfMortgageAssets > 0
//				) {
//					uint rate = getBlockIntervalDepositRate(tokenAddress, tokenInfo);
//					uint256 totalAmount = uint(tokenInfo.totalAmount(block.number, rate).mul(int256(symbols.priceFromIndex(i))));
//					if(liquidationOfMortgageAssets >= totalAmount) {
//						uint _totalAmount = uint(totalAmount.div(symbols.priceFromIndex(i)));
//						tokenInfo.minusAmount(_totalAmount, rate, block.number);
//						msgTokenInfo.addAmount(_totalAmount, rate, block.number);
//						totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(int(_totalAmount));
//						updateDepositRate(tokenAddress, block.number);
//						liquidationOfMortgageAssets = liquidationOfMortgageAssets.sub(totalAmount);
//					} else {
//						uint _liquidationOfMortgageAssets = uint(liquidationOfMortgageAssets.div(symbols.priceFromIndex(i)));
//						tokenInfo.minusAmount(_liquidationOfMortgageAssets, rate, block.number);
//						msgTokenInfo.addAmount(_liquidationOfMortgageAssets, rate, block.number);
//						totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(int(_liquidationOfMortgageAssets));
//						updateDepositRate(tokenAddress, block.number);
//						liquidationOfMortgageAssets = 0;
//					}
//				} else if(tokenInfo.getCurrentTotalAmount() < 0 && liquidationDebtValue > 0) {
//					uint rate = getBlockIntervalBorrowRate(tokenAddress, tokenInfo);
//					int256 totalAmount = tokenInfo.totalAmount(block.number, rate).mul(int256(symbols.priceFromIndex(i)));
//					uint256 _totalAmount = totalAmount > 0 ? uint256(totalAmount) : uint256(-totalAmount);
//					if(liquidationDebtValue >= _totalAmount) {
//						uint __totalAmount = uint(_totalAmount.div(symbols.priceFromIndex(i)));
//						tokenInfo.addAmount(__totalAmount, rate, block.number);
//						totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(int(__totalAmount));
//						updateDepositRate(tokenAddress, block.number);
//						liquidationDebtValue = liquidationDebtValue.sub(_totalAmount);
//					} else {
//						uint _liquidationDebtValue = uint(liquidationDebtValue.div(symbols.priceFromIndex(i)));
//						tokenInfo.addAmount(_liquidationDebtValue, rate, block.number);
//						totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(int(_liquidationDebtValue));
//						updateDepositRate(tokenAddress, block.number);
//						liquidationDebtValue = 0;
//					}
//				} else if(msgTokenInfo.getCurrentTotalAmount() > 0 && paymentOfLiquidationAmount > 0) {
//					uint rate = getBlockIntervalBorrowRate(tokenAddress, msgTokenInfo);
//					uint256 totalAmount = uint(msgTokenInfo.totalAmount(block.number, rate).mul(int256(symbols.priceFromIndex(i))));
//					if(paymentOfLiquidationAmount >= totalAmount) {
//						uint _totalAmount = uint(totalAmount.div(symbols.priceFromIndex(i)));
//						msgTokenInfo.minusAmount(_totalAmount, rate, block.number);
//						totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int(_totalAmount));
//						updateDepositRate(tokenAddress, block.number);
//						paymentOfLiquidationAmount = paymentOfLiquidationAmount.sub(totalAmount);
//					} else {
//						uint _paymentOfLiquidationAmount = uint(paymentOfLiquidationAmount.div(symbols.priceFromIndex(i)));
//						tokenInfo.minusAmount(_paymentOfLiquidationAmount, rate, block.number);
//						totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int(_paymentOfLiquidationAmount));
//						updateDepositRate(tokenAddress, block.number);
//						paymentOfLiquidationAmount = 0;
//					}
//				}
//			}
//	}

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

	function setDeFinerCommunityFund(address payable _DeFinerCommunityFund) public {
		baseVariable.setDeFinerCommunityFund(_DeFinerCommunityFund);
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
