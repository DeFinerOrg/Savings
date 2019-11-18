pragma solidity >= 0.5.0 < 0.6.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

library SymbolsLib {
    using SafeMath for uint256;

	struct Symbols {
		string[] coins; 
		mapping(string => uint256) symbolToPrices; 
		mapping(address => string) addressToSymbol; 
		mapping(string => address) symbolToAddress; 
	}

	function init(Symbols storage self) public
	{
		self.coins = ["ETH","DAI","USDC","USDT","TUSD","PAX","GUSD","BNB","MKR","BAT","OMG","GNT","ZRX","REP","CRO","WBTC"]; 
		self.addressToSymbol[0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359] = 'DAI'; 
		self.addressToSymbol[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = 'USDC'; 
		self.addressToSymbol[0xdAC17F958D2ee523a2206206994597C13D831ec7] = 'USDT'; 
		self.addressToSymbol[0x0000000000085d4780B73119b644AE5ecd22b376] = 'TUSD'; 
		self.addressToSymbol[0x8E870D67F660D95d5be530380D0eC0bd388289E1] = 'PAX'; 
		self.addressToSymbol[0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd] = 'GUSD'; 
		self.addressToSymbol[0xB8c77482e45F1F44dE1745F52C74426C631bDD52] = 'BNB'; 
		self.addressToSymbol[0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2] = 'MKR'; 
		self.addressToSymbol[0x0D8775F648430679A709E98d2b0Cb6250d2887EF] = 'BAT'; 
		self.addressToSymbol[0xd26114cd6EE289AccF82350c8d8487fedB8A0C07] = 'OMG'; 
		self.addressToSymbol[0xa74476443119A942dE498590Fe1f2454d7D4aC0d] = 'GNT'; 
		self.addressToSymbol[0xE41d2489571d322189246DaFA5ebDe1F4699F498] = 'ZRX'; 
		self.addressToSymbol[0x1985365e9f78359a9B6AD760e32412f4a445E862] = 'REP'; 
		self.addressToSymbol[0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b] = 'CRO'; 
		self.addressToSymbol[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = 'WBTC'; 

		self.symbolToAddress['DAI']  = 0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359; 
		self.symbolToAddress['USDC'] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; 
		self.symbolToAddress['USDT'] = 0xdAC17F958D2ee523a2206206994597C13D831ec7; 
		self.symbolToAddress['TUSD'] = 0x0000000000085d4780B73119b644AE5ecd22b376; 
		self.symbolToAddress['PAX']  = 0x8E870D67F660D95d5be530380D0eC0bd388289E1; 
		self.symbolToAddress['GUSD'] = 0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd;
		self.symbolToAddress['BNB']  = 0xB8c77482e45F1F44dE1745F52C74426C631bDD52; 
		self.symbolToAddress['MKR']  = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2; 
		self.symbolToAddress['BAT']  = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF; 
		self.symbolToAddress['OMG']  = 0xd26114cd6EE289AccF82350c8d8487fedB8A0C07; 
		self.symbolToAddress['GNT']  = 0xa74476443119A942dE498590Fe1f2454d7D4aC0d; 
		self.symbolToAddress['ZRX']  = 0xE41d2489571d322189246DaFA5ebDe1F4699F498; 
		self.symbolToAddress['REP']  = 0x1985365e9f78359a9B6AD760e32412f4a445E862; 
		self.symbolToAddress['CRO']  = 0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b; 
		self.symbolToAddress['WBTC'] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
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
}
