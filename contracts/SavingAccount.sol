// Copyright DeFiner Inc. 2018-2020

pragma solidity >= 0.5.0 < 0.6.0;

import "./external/provableAPI.sol";
import "./external/strings.sol";
import "./lib/TokenInfoLib.sol";
import "./lib/SymbolsLib.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./params/SavingAccountParameters.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";


contract SavingAccount is Ownable, usingProvable {
	using TokenInfoLib for TokenInfoLib.TokenInfo;
	using SymbolsLib for SymbolsLib.Symbols;
	using SafeMath for uint256;
	using SignedSafeMath for int256;

	struct Account {
		// Note, it's best practice to use functions minusAmount, addAmount, totalAmount 
		// to operate tokenInfos instead of changing it directly. 
		mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
		bool active;
	}
	mapping(address => Account) accounts;
	mapping(address => int256) totalDeposits;
	mapping(address => int256) totalLoans;
	mapping(address => int256) totalCollateral;

	address[] activeAccounts;

	SymbolsLib.Symbols symbols;

	event LogNewProvableQuery(string description);
	event LogNewPriceTicker(string price);
	int256 BASE = 10**6;
	uint256 SUPPLY_APR_PER_SECOND = 1585;	// SUPPLY APR = 5%. 1585 / 10^12 * 60 * 60 * 24 * 365 = 0.05
	uint256 BORROW_APR_PER_SECOND = 2219;	// BORROW APR = 7%. 1585 / 10^12 * 60 * 60 * 24 * 365 = 0.07
	int BORROW_LTV = 66; //TODO check is this 60%?
	int LIQUIDATE_THREADHOLD = 85;

	constructor() public {
		SavingAccountParameters params = new SavingAccountParameters();
		address[] memory tokenAddresses = params.getTokenAddresses();
		//TODO This needs improvement as it could go out of gas
		symbols.initialize(params.ratesURL(), params.tokenNames(), tokenAddresses);
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
			if (isPositive && accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp) >= 0) {
				totalUsdValue = totalUsdValue.add(
					accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp)
					.mul(int256(symbols.priceFromIndex(i)))
					.div(BASE)
				);
			}
			if (!isPositive && accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp) < 0) {
				totalUsdValue = totalUsdValue.add(
					accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp)
					.mul(int256(symbols.priceFromIndex(i)))
					.div(BASE)
				);
			}
		}
		return totalUsdValue;
	}

	/** 
	 * Get the overall state of the saving pool
	 */
	function getMarketState() public view returns (address[] memory addresses,
		int256[] memory deposits,
		int256[] memory loans,
		int256[] memory collateral)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		deposits = new int256[](coinsLen);
		loans = new int256[](coinsLen);
		collateral = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			deposits[i] = totalDeposits[tokenAddress];
			loans[i] = totalLoans[tokenAddress];
			collateral[i] = totalCollateral[tokenAddress];
		}

		return (addresses, deposits, loans, collateral);
	}

	/*
	 * Get the state of the given token
	 */
	function getTokenState(address tokenAddress) public view returns (int256 deposits, int256 loans, int256 collateral)
	{
		return (totalDeposits[tokenAddress], totalLoans[tokenAddress], totalCollateral[tokenAddress]);
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

	function getActiveAccounts() public view returns (address[] memory) {
		return activeAccounts;
	}

	function getLiquidatableAccounts() public view returns (address[] memory) {
		address[] memory liquidatableAccounts;
		uint returnIdx;
		//TODO `activeAccounts` not getting removed from array.
		//TODO its always increasing. Call to this function needing
		//TODO more gas, however, it will not be charged in ETH.
		//TODO What could be the impact? 
		for (uint i = 0; i < activeAccounts.length; i++) {
			address targetAddress = activeAccounts[i];
			if (
				int256(getAccountTotalUsdValue(targetAddress, false).mul(-1)).mul(100)
				>
				getAccountTotalUsdValue(targetAddress, true).mul(LIQUIDATE_THREADHOLD)
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
		return accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp);
	}

	function getCoinAddress(uint256 coinIndex) public view returns (address) {
		return symbols.addressFromIndex(coinIndex);
	}

	function getCoinToUsdRate(uint256 coinIndex) public view returns(uint256) {
		return symbols.priceFromIndex(coinIndex);
	}

	function borrow(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].active, "Account not active, please deposit first.");
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		require(tokenInfo.totalAmount(block.timestamp) < int256(amount), "Borrow amount less than available balance, please use withdraw instead.");
		require(
			(
				int256(getAccountTotalUsdValue(msg.sender, false) * -1)
				.add(int256(amount.mul(symbols.priceFromAddress(tokenAddress))))
				.div(BASE)
			).mul(100)
			<=
			(getAccountTotalUsdValue(msg.sender, true)).mul(BORROW_LTV),
			 "Insufficient collateral.");

		tokenInfo.minusAmount(amount, BORROW_APR_PER_SECOND, block.timestamp);
		totalLoans[tokenAddress] = totalLoans[tokenAddress].add(int256(amount));
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int256(amount));

        send(msg.sender, amount, tokenAddress);
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].active, "Account not active, please deposit first.");
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		int256 amountOwedWithInterest = tokenInfo.totalAmount(block.timestamp);
		require(amountOwedWithInterest <= 0, "Balance of the token must be negative. To deposit balance, please use deposit button.");

		int256 amountBorrowed = tokenInfo.getCurrentTotalAmount().mul(-1); // get the actual amount that was borrowed (abs)
		int256 amountToRepay = int256(amount);
		tokenInfo.addAmount(amount, 0, block.timestamp);

		// check if paying interest
		if (amountToRepay > amountBorrowed) {
			// add interest (if any) to total deposit
			totalDeposits[tokenAddress] = totalDeposits[tokenAddress].add(amountToRepay.sub(amountBorrowed));
			// loan are reduced by amount payed
			totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(amountBorrowed);
		}
		else {
			// loan are reduced by amount payed
			totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(amountToRepay);
		}

		// collateral increased by amount payed  
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(amountToRepay);

        receive(msg.sender, amount, tokenAddress);
	}

	/** 
	 * Deposit the amount of tokenAddress to the saving pool. 
	 */
	function depositToken(address tokenAddress, uint256 amount) public payable {
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];
		if (!accounts[msg.sender].active) {
			accounts[msg.sender].active = true;
			activeAccounts.push(msg.sender);
		}

		int256 currentBalance = tokenInfo.getCurrentTotalAmount();

		require(currentBalance >= 0,
			"Balance of the token must be zero or positive. To pay negative balance, please use repay button.");

		// deposited amount is new balance after addAmount minus previous balance
		int256 depositedAmount = tokenInfo.addAmount(amount, SUPPLY_APR_PER_SECOND, block.timestamp) - currentBalance;
		totalDeposits[tokenAddress] = totalDeposits[tokenAddress].add(depositedAmount);
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(depositedAmount);

		receive(msg.sender, amount, tokenAddress);
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].active, "Account not active, please deposit first.");
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		require(tokenInfo.totalAmount(block.timestamp) >= int256(amount), "Insufficient balance.");
// 		require(int256(getAccountTotalUsdValue(msg.sender, false) * -1) * 100 <= (getAccountTotalUsdValue(msg.sender, true) - int256(amount.mul(symbols.priceFromAddress(tokenAddress))) / BASE) * BORROW_LTV);

		tokenInfo.minusAmount(amount, 0, block.timestamp);
		totalDeposits[tokenAddress] = totalDeposits[tokenAddress].sub(int256(amount));
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int256(amount));

		send(msg.sender, amount, tokenAddress);		
	}

	function liquidate(address targetAddress) public payable {
		require(
			int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
			.mul(100)
			>
			getAccountTotalUsdValue(targetAddress, true).mul(LIQUIDATE_THREADHOLD),
			"The ratio of borrowed money and collateral must be larger than 95% in order to be liquidated.");

		uint coinsLen = getCoinLength();
		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			TokenInfoLib.TokenInfo storage tokenInfo = accounts[targetAddress].tokenInfos[tokenAddress];
			int256 totalAmount = tokenInfo.totalAmount(block.timestamp);
			if (totalAmount > 0) {
				send(msg.sender, uint256(totalAmount), tokenAddress);
			} else if (totalAmount < 0) {
				//TODO uint256(-totalAmount) this will underflow - Critical Security Issue
				//TODO what is the reason for doing this???
				receive(msg.sender, uint256(-totalAmount), tokenAddress);
			}
		}
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
