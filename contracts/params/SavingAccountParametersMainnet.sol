// Copyright DeFiner Inc. 2018-2020

pragma solidity >= 0.5.0 < 0.6.0;

contract SavingAccountParameters {
    string public ratesURL;
	string public tokenNames;
    address[] public tokenAddresses;

    constructor() public payable{
        ratesURL = "json(https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC&tsyms=USD).[ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC].USD";
    	tokenNames = "ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC";

		tokenAddresses = new address[](16);
		tokenAddresses[0] = 0x000000000000000000000000000000000000000E;
		tokenAddresses[1] = 0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359;
		tokenAddresses[2] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
		tokenAddresses[3] = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
		tokenAddresses[4] = 0x0000000000085d4780B73119b644AE5ecd22b376;
		tokenAddresses[5] = 0x8E870D67F660D95d5be530380D0eC0bd388289E1;
		tokenAddresses[6] = 0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd;
		tokenAddresses[7] = 0xB8c77482e45F1F44dE1745F52C74426C631bDD52;
		tokenAddresses[8] = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2;
		tokenAddresses[9] = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF;
		tokenAddresses[10] = 0xd26114cd6EE289AccF82350c8d8487fedB8A0C07;
		tokenAddresses[11] = 0xa74476443119A942dE498590Fe1f2454d7D4aC0d;
		tokenAddresses[12] = 0xE41d2489571d322189246DaFA5ebDe1F4699F498;
		tokenAddresses[13] = 0x1985365e9f78359a9B6AD760e32412f4a445E862;
		tokenAddresses[14] = 0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b;
		tokenAddresses[15] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
	}

	function getTokenAddresses() public view returns(address[] memory){
        return tokenAddresses;
    }
}