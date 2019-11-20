pragma solidity >= 0.5.0 < 0.6.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./../external/strings.sol";

library SymbolsLib {
    using SafeMath for uint256;

	struct Symbols {
		string[] coins; 
		mapping(string => uint256) symbolToPrices; 
		mapping(address => string) addressToSymbol; 
		mapping(string => address) symbolToAddress; 
	}

	// initializes the sumbols structure
	function initialize(Symbols storage self, string memory tokenNames, address[] memory tokenAddresses) public {
		strings.slice memory delim = strings.toSlice(",");
		strings.slice memory substring = strings.toSlice(tokenNames);

		uint count = strings.count(substring, delim) + 1;

		require(count == tokenAddresses.length);

		self.coins = new string[](count);
		
		for(uint i = 0; i < count; i++) {
			strings.slice memory token;
			strings.split(substring, delim, token);

		 	address tokenAddress = tokenAddresses[i];
		 	string memory tokenName = strings.toString(token);

		 	self.coins[i] = tokenName;
		 	self.addressToSymbol[tokenAddress] = tokenName;
		 	self.symbolToAddress[tokenName]  = tokenAddress;
		}
	}

	function getCoinLength(Symbols storage self) public view returns (uint length){ 
		return self.coins.length; 
	} 

	function addressFromIndex(Symbols storage self, uint index) public view returns(address) {
		require(index < self.coins.length, "coinIndex must be smaller than the coins length.");
		return self.symbolToAddress[self.coins[index]];
	} 

	function priceFromIndex(Symbols storage self, uint index) public view returns(uint256) {
		require(index < self.coins.length, "coinIndex must be smaller than the coins length.");
		return self.symbolToPrices[self.coins[index]];
	} 

	function priceFromAddress(Symbols storage self, address tokenAddress) public view returns(uint256) {
		return self.symbolToPrices[self.addressToSymbol[tokenAddress]];
	} 

	function setPrice(Symbols storage self, uint index, uint256 price) public { 
		require(index < self.coins.length, "coinIndex must be smaller than the coins length.");
		self.symbolToPrices[self.coins[index]] = price;
	}

	function isEth(Symbols storage self, address tokenAddress) public view returns(bool) {
		return self.symbolToAddress["ETH"] == tokenAddress;
	}
}
