
const tokenNames = "ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC,FIN";
const url = "TODO";// `json(https://api.rinkeby.definer.org/OKh4I2yYpKU8S2af/definer/api/v1.0/saving_pool/rates/current).[${tokenNames}].USD`;

// Environment definitions for local tests and unit test deployments 
module.exports = {
     ratesURL: url,
     tokenNames: tokenNames,
     tokenAddresses: [
     '0x000000000000000000000000000000000000000E',
     '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
     '0xdac17f958d2ee523a2206206994597c13d831ec7',
     '0x0000000000085d4780B73119b644AE5ecd22b376',
     '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
     '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
     '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', 
     '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', 
     '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', 
     '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07', 
     '0xa74476443119A942dE498590Fe1f2454d7D4aC0d',
     '0xe41d2489571d322189246dafa5ebde1f4699f498',
     '0x1985365e9f78359a9B6AD760e32412f4a445E862',
     '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b',
     '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
     '0xaB8Ad2d7f39A54960Be8b71e01276a9E897833eE' // TODO FIN
     ]
}
