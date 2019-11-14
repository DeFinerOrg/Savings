pragma solidity >= 0.5.0 < 0.6.0;

import "./external/provableAPI.sol";
import "./external/strings.sol";
import "./lib/TokenLib.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SavingAccount is usingProvable {
	using TokenLib for TokenLib.TokenInfo;
	using SafeMath for uint256;

	struct Account { 
		// Note, it's best practice to use functions minusAmount, addAmount, totalAmount 
		// to operate tokenInfos instead of changing it directly. 
		mapping(address => TokenLib.TokenInfo) tokenInfos;
	} 
	mapping(address => Account) accounts; 
	string[] public coins = ["ETH","DAI","USDC","USDT","TUSD","PAX","GUSD","BNB","MKR","BAT","OMG","GNT","ZRX","REP","CRO","WBTC"]; 
	mapping(string => uint256) public symbolToPrices; 
	mapping(address => string) addressToSymbol; 
	mapping(string => address) symbolToAddress; 

	event LogNewProvableQuery(string description); 
	event LogNewPriceTicker(string price);
	int256 BASE = 10**6;

	constructor() public payable {
		addressToSymbol[0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359] = 'DAI'; 
		addressToSymbol[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = 'USDC'; 
		addressToSymbol[0xdAC17F958D2ee523a2206206994597C13D831ec7] = 'USDT'; 
		addressToSymbol[0x0000000000085d4780B73119b644AE5ecd22b376] = 'TUSD'; 
		addressToSymbol[0x8E870D67F660D95d5be530380D0eC0bd388289E1] = 'PAX'; 
		addressToSymbol[0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd] = 'GUSD'; 
		addressToSymbol[0xB8c77482e45F1F44dE1745F52C74426C631bDD52] = 'BNB'; 
		addressToSymbol[0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2] = 'MKR'; 
		addressToSymbol[0x0D8775F648430679A709E98d2b0Cb6250d2887EF] = 'BAT'; 
		addressToSymbol[0xd26114cd6EE289AccF82350c8d8487fedB8A0C07] = 'OMG'; 
		addressToSymbol[0xa74476443119A942dE498590Fe1f2454d7D4aC0d] = 'GNT'; 
		addressToSymbol[0xE41d2489571d322189246DaFA5ebDe1F4699F498] = 'ZRX'; 
		addressToSymbol[0x1985365e9f78359a9B6AD760e32412f4a445E862] = 'REP'; 
		addressToSymbol[0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b] = 'CRO'; 
		addressToSymbol[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = 'WBTC'; 

		symbolToAddress['DAI']  = 0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359; 
		symbolToAddress['USDC'] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; 
		symbolToAddress['USDT'] = 0xdAC17F958D2ee523a2206206994597C13D831ec7; 
		symbolToAddress['TUSD'] = 0x0000000000085d4780B73119b644AE5ecd22b376; 
		symbolToAddress['PAX']  = 0x8E870D67F660D95d5be530380D0eC0bd388289E1; 
		symbolToAddress['GUSD'] = 0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd;
		symbolToAddress['BNB']  = 0xB8c77482e45F1F44dE1745F52C74426C631bDD52; 
		symbolToAddress['MKR']  = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2; 
		symbolToAddress['BAT']  = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF; 
		symbolToAddress['OMG']  = 0xd26114cd6EE289AccF82350c8d8487fedB8A0C07; 
		symbolToAddress['GNT']  = 0xa74476443119A942dE498590Fe1f2454d7D4aC0d; 
		symbolToAddress['ZRX']  = 0xE41d2489571d322189246DaFA5ebDe1F4699F498; 
		symbolToAddress['REP']  = 0x1985365e9f78359a9B6AD760e32412f4a445E862; 
		symbolToAddress['CRO']  = 0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b; 
		symbolToAddress['WBTC'] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;

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
		for(uint i = 0; i < coins.length; i++) {
			if (isPositive && accounts[accountAddr].tokenInfos[symbolToAddress[coins[i]]].totalAmount(block.timestamp) >= 0) {
				totalUsdValue += accounts[accountAddr].tokenInfos[symbolToAddress[coins[i]]].totalAmount(block.timestamp) * int256(symbolToPrices[coins[i]]) / BASE;
			}
			if (!isPositive && accounts[accountAddr].tokenInfos[symbolToAddress[coins[i]]].totalAmount(block.timestamp) < 0) {
				totalUsdValue += accounts[accountAddr].tokenInfos[symbolToAddress[coins[i]]].totalAmount(block.timestamp) * int256(symbolToPrices[coins[i]]) / BASE;
			}
		}
		return totalUsdValue;
	}

	/** 
	 * Get all balances for the sender's account
	 * Return a tuple of arrays: (symbol addresses, symbol balances)  
	 */ 
	function getBalances() public view returns (address[] memory, int256[] memory)
    {
        address[] memory addresses = new address[](coins.length);
        int256[] memory balances = new int256[](coins.length);
        
        for (uint i = 0; i < coins.length; i++) {
            address tokenAddress = symbolToAddress[coins[i]];
            addresses[i] = tokenAddress;
            balances[i] = tokenBalanceOf(tokenAddress);
        }
        
        return (addresses, balances);
    }

	function tokenBalanceOf(address tokenAddress) public view returns (int256 amount) {
		return accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp);
	} 

	function getCoinLength() public view returns (uint256 length){ 
		return coins.length; 
	} 

	function getCoinAddress(uint256 coinIndex) public view returns (address) { 
		require(coinIndex < coins.length, "coinIndex must be smaller than the coins length."); 
		return symbolToAddress[coins[coinIndex]]; 
	}

	function getCoinToUsdRate(uint256 coinIndex) public view returns(uint256) {
		require(coinIndex < coins.length, "coinIndex must be smaller than the coins length.");
		return symbolToPrices[coins[coinIndex]];
	}

	function borrow(address tokenAddress, uint256 amount) public payable {
        require(accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) < int256(amount), "To withdraw balance, please use withdrawToken instead.");
        require((int256(getAccountTotalUsdValue(msg.sender, false) * -1) + int256(amount.mul(symbolToPrices[addressToSymbol[tokenAddress]])) / BASE) * 100 <= (getAccountTotalUsdValue(msg.sender, true)) * 66);
		IERC20 token = IERC20(tokenAddress);
		token.transfer(msg.sender, amount);
		accounts[msg.sender].tokenInfos[tokenAddress].minusAmount(amount, 0, block.timestamp);
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		require(
			accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) < 0,
			"Balance of the token must be negative. To deposit balance, please use deposit button.");
		IERC20 token = IERC20(tokenAddress);
		token.transferFrom(msg.sender, address(this), amount);
		// APR = 5%. 1585 / 10^12 * 60 * 60 * 24* 365 = 0.05
		accounts[msg.sender].tokenInfos[tokenAddress].addAmount(amount, 1585, block.timestamp);
	}

	/** 
	 * Deposit the amount of tokenAddress to the saving pool. 
	 */ 
	function depositToken(address tokenAddress, uint256 amount) public payable {
		require(
			accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) >= 0,
			"Balance of the token must be zero or positive. To pay negative balane, please use repay button.");
		IERC20 token = IERC20(tokenAddress); 
		token.transferFrom(msg.sender, address(this), amount); 
		// APR = 5%. 1585 / 10^12 * 60 * 60 * 24* 365 = 0.05 
		accounts[msg.sender].tokenInfos[tokenAddress].addAmount(amount, 1585, block.timestamp);
	} 

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */ 
	function withdrawToken(address tokenAddress, uint256 amount) public payable { 
		require(accounts[msg.sender].tokenInfos[tokenAddress].totalAmount(block.timestamp) >= int256(amount), "Do not have enough balance.");
        require(int256(getAccountTotalUsdValue(msg.sender, false) * -1) * 100 <= (getAccountTotalUsdValue(msg.sender, true) - int256(amount.mul(symbolToPrices[addressToSymbol[tokenAddress]])) / BASE) * 66);
		IERC20 token = IERC20(tokenAddress);
		token.transfer(msg.sender, amount);
		accounts[msg.sender].tokenInfos[tokenAddress].minusAmount(amount, 0, block.timestamp);
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
			symbolToPrices[coins[i]] = stringToUint(strings.toString(token)); 
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
	function __callback(bytes32 myid,  string memory result) public { 
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
