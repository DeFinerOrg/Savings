pragma solidity >= 0.5.0 < 0.6.0;

import "./external/provableAPI.sol";
import "./external/strings.sol";
import "./lib/TokenInfoLib.sol";
import "./lib/SymbolsLib.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SavingAccount is usingProvable {
	using TokenInfoLib for TokenInfoLib.TokenInfo;
	using SymbolsLib for SymbolsLib.Symbols;
	using SafeMath for uint256;

	struct Account {
		// Note, it's best practice to use functions minusAmount, addAmount, totalAmount 
		// to operate tokenInfos instead of changing it directly. 
		mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
	}
	mapping(address => Account) accounts;
	mapping(address => int256) totalDeposits;
	mapping(address => int256) totalLoans;
	mapping(address => int256) totalCollateral;

	SymbolsLib.Symbols symbols;
	address owner;

	event LogNewProvableQuery(string description);
	event LogNewPriceTicker(string price);
	int256 BASE = 10**6;

	constructor() public payable {
		owner = msg.sender;
	}

	function initialize(string memory ratesURL, string memory tokenNames, address[] memory tokenAddresses) public payable {
		require(msg.sender == owner);

		symbols.initialize(ratesURL, tokenNames, tokenAddresses);
	}

	/** 
	 * Gets the total amount of balance that give accountAddr stored in saving pool. 
	 */
	function getAccountTotalUsdValue(address accountAddr) public view returns (int256 usdValue) {
		return getAccountTotalUsdValue(accountAddr, true) + getAccountTotalUsdValue(accountAddr, false);
	}

	function getAccountTotalUsdValue(address accountAddr, bool isPositive) private view returns (int256 usdValue){
		int256 totalUsdValue = 0;
		for(uint i = 0; i < getCoinLength(); i++) {
			if (isPositive && accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp) >= 0) {
				totalUsdValue += accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp) * int256(symbols.priceFromIndex(i)) / BASE;
			}
			if (!isPositive && accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp) < 0) {
				totalUsdValue += accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(block.timestamp) * int256(symbols.priceFromIndex(i)) / BASE;
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

	/** 
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
		require(accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) < int256(amount), "To withdraw balance, please use withdrawToken instead.");
		require((int256(getAccountTotalUsdValue(msg.sender, false) * -1) + int256(amount.mul(symbols.priceFromAddress(tokenAddress))) / BASE) * 100 <= (getAccountTotalUsdValue(msg.sender, true)) * 66);
        send(msg.sender, amount, tokenAddress);
		accounts[msg.sender].tokenInfos[tokenAddress].minusAmount(amount, 0, block.timestamp);
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		require(
			accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) < 0,
			"Balance of the token must be negative. To deposit balance, please use deposit button.");
        receive(msg.sender, amount, tokenAddress);
		// APR = 5%. 1585 / 10^12 * 60 * 60 * 24* 365 = 0.05
		accounts[msg.sender].tokenInfos[tokenAddress].addAmount(amount, 1585, block.timestamp);
	}

	/** 
	 * Deposit the amount of tokenAddress to the saving pool. 
	 */
	function depositToken(address tokenAddress, uint256 amount) public payable {
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		require(
			tokenInfo.totalAmount(block.timestamp) >= 0,
			"Balance of the token must be zero or positive. To pay negative balance, please use repay button.");
        
		int256 currentBalance = tokenInfo.balance;
		// APR = 5%. 1585 / 10^12 * 60 * 60 * 24* 365 = 0.05
		tokenInfo.addAmount(amount, 1585, block.timestamp);		
		totalDeposits[tokenAddress] += tokenInfo.balance - currentBalance;

		receive(msg.sender, amount, tokenAddress);
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public payable {
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		require(tokenInfo.totalAmount(block.timestamp) >= int256(amount), "Do not have enough balance.");
		require(int256(getAccountTotalUsdValue(msg.sender, false) * -1) * 100 <= (getAccountTotalUsdValue(msg.sender, true) - int256(amount.mul(symbols.priceFromAddress(tokenAddress))) / BASE) * 66);
		
		tokenInfo.minusAmount(amount, 0, block.timestamp);
		totalDeposits[tokenAddress] -= int256(amount);

		send(msg.sender, amount, tokenAddress);		
	}

	function liquidate(address targetAddress) public payable {
		require(int256(getAccountTotalUsdValue(targetAddress, false) * -1) * 100 > getAccountTotalUsdValue(targetAddress, true) * 95,
			"The ratio of borrowed money and collateral must be larger than 95% in order to be liquidated.");

		uint coinsLen = getCoinLength();
		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			TokenInfoLib.TokenInfo storage tokenInfo = accounts[targetAddress].tokenInfos[tokenAddress];
			int256 totalAmount = tokenInfo.totalAmount(block.timestamp);
			if (totalAmount > 0) {
				send(msg.sender, uint256(totalAmount), tokenAddress);
			} else if (totalAmount < 0) {
				receive(msg.sender, uint256(-totalAmount), tokenAddress);
			}
		}
	}

	function receive(address from, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
            require(msg.value == amount, "The amount is not sent from address.");
		} else {
			IERC20 token = IERC20(tokenAddress);
			token.transferFrom(from, address(this), amount);
		}
	}

	function send(address to, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			msg.sender.transfer(amount);
		} else {
			IERC20 token = IERC20(tokenAddress);
			token.transfer(to, amount);
		}
	}

	/** 
	 * Callback function which is used to parse query the oracle. Once 
	 * parsed results from oracle, it will recursively call oracle for data. 
	 **/
	function __callback(bytes32,  string memory result) public {
		if (msg.sender != provable_cbAddress()) revert();
		emit LogNewPriceTicker(result);
		symbols.parseRates(result);
		updatePrice(30 * 60);
	}

	// Customized gas limit for querying oracle. That's because the function 
	// symbols.parseRates() is heavy and need more gas. 
	uint constant CUSTOM_GAS_LIMIT = 600000;

	/** 
	 * Update coins price every 30 mins. The contract must have enough gas fee. 
	 */
	function updatePrice(uint256 delaySeconds) public payable {
		if (provable_getPrice("URL", CUSTOM_GAS_LIMIT) > address(this).balance) {
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee!");
		} else {
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
			provable_query(delaySeconds, "URL", symbols.ratesURL, CUSTOM_GAS_LIMIT);
		}
	}

	// Make the contract payable so that the contract will have enough gass fee 
	// to query oracle. 
	function() external payable {}
} 
