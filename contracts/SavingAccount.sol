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

	event LogNewProvableQuery(string description);
	event LogNewPriceTicker(string price);
	int256 BASE = 10**6;

	constructor() public payable {
		symbols.init();
		updatePrice(0);
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
		require(
			accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) >= 0,
			"Balance of the token must be zero or positive. To pay negative balance, please use repay button.");
        receive(msg.sender, amount, tokenAddress);
		// APR = 5%. 1585 / 10^12 * 60 * 60 * 24* 365 = 0.05
		accounts[msg.sender].tokenInfos[tokenAddress].addAmount(amount, 1585, block.timestamp);
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) >= int256(amount), "Do not have enough balance.");
		require(int256(getAccountTotalUsdValue(msg.sender, false) * -1) * 100 <= (getAccountTotalUsdValue(msg.sender, true) - int256(amount.mul(symbols.priceFromAddress(tokenAddress))) / BASE) * 66);
		send(msg.sender, amount, tokenAddress);
		accounts[msg.sender].tokenInfos[tokenAddress].minusAmount(amount, 0, block.timestamp);
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
	 * Parse result from oracle, e.g. an example is [8110.44, 0.2189, 445.05, 1]. 
	 * The function will remove the '[' and ']' and split the string by ','. 
	 */
	function parseResult(string memory result) private {
		strings.slice memory delim = strings.toSlice(",");
		strings.slice memory startChar = strings.toSlice("[");
		strings.slice memory endChar = strings.toSlice("]");
		strings.slice memory substring = strings.until(strings.beyond(strings.toSlice(result), startChar), endChar);
		uint count = strings.count(substring, delim) + 1;
		for(uint i = 0; i < count; i++) {
			strings.slice memory token;
			strings.split(substring, delim, token);
			symbols.setPrice(i, stringToUint(strings.toString(token)));
		}
	}

	function stringToUint(string memory numString) private pure returns(uint256 number) {
		bytes memory numBytes = bytes(numString);
		bool isFloat = false;
		uint times = 6;
		number = 0;
		for(uint256 i = 0; i < numBytes.length; i ++) {
			if (numBytes[i] >= '0' && numBytes[i] <= '9' && times > 0) {
				number *= 10;
				number = number + uint8(numBytes[i]) - 48;
				if (isFloat) {
					times --;
				}
			} else if (numBytes[i] == '.') {
				isFloat = true;
				continue;
			}
		}
		while (times > 0) {
			number *= 10;
			times --;
		}
	}

	/** 
	 * Callback function which is used to parse query the oracle. Once 
	 * parsed results from oracle, it will recursively call oracle for data. 
	 **/
	function __callback(bytes32,  string memory result) public {
		if (msg.sender != provable_cbAddress()) revert();
		emit LogNewPriceTicker(result);
		parseResult(result);
		updatePrice(30 * 60);
	}

	// Customized gas limit for querying oracle. That's because the function 
	// parseResult() is heavy and need more gas. 
	uint constant CUSTOM_GAS_LIMIT = 600000;

	/** 
	 * Update coins price every 30 mins. The contract must have enough gas fee. 
	 */
	function updatePrice(uint256 delaySeconds) public payable {
		if (provable_getPrice("URL", CUSTOM_GAS_LIMIT) > address(this).balance) {
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee!");
		} else {
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
			provable_query(delaySeconds, "URL", "json(https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC&tsyms=USD).[ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC].USD", CUSTOM_GAS_LIMIT);
		}
	}

	// Make the contract payable so that the contract will have enough gass fee 
	// to query oracle. 
	function() external payable {}
} 
