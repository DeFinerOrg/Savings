
const tokenNames = "ETH,DAI,USDT,TUSD,GUSD,FIN";
const url = `json(https://api.rinkeby.definer.org/OKh4I2yYpKU8S2af/definer/api/v1.0/saving_pool/rates/current).[${tokenNames}].USD`;

// Environment definitions for local tests and unit test deployments 
module.exports = {
     ratesURL: url,
     tokenNames: tokenNames,
     tokenAddresses: [
     '0x0000000000000000000000000000000000000000',
     '0x8c8c812ea7bb3c32b45645f7cbf84c7f902049d6',
     '0xdac17f958d2ee523a2206206994597c13d831ec7',
     '0x36e5aa7ee4d004067ee3d0177f805269434ddc83',
     '0x388b0d6c519b1a502302f81a56efeda0b137d9c1',
     '0xaB8Ad2d7f39A54960Be8b71e01276a9E897833eE'
     ]
}
