pragma solidity >= 0.5.0 < 0.6.0;

contract SavingAccountParameters {
    string public ratesURL;
	string public tokenNames;
    address[] public tokenAddresses;

    constructor() public payable{
        ratesURL = "json(https://api.rinkeby.definer.org/OKh4I2yYpKU8S2af/definer/api/v1.0/saving_pool/rates/current).[ETH,DAI,USDT,TUSD,GUSD,FIN].USD";
    	tokenNames = "ETH,DAI,USDT,TUSD,GUSD,FIN";

		tokenAddresses = new address[](6);
		tokenAddresses[0] = 0x000000000000000000000000000000000000000E;
		tokenAddresses[1] = 0x8c8c812ea7bb3c32B45645f7cbf84c7F902049d6;
		tokenAddresses[2] = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
		tokenAddresses[3] = 0x36e5aA7Ee4D004067eE3D0177F805269434DdC83;
		tokenAddresses[4] = 0x388B0D6c519B1a502302f81a56EFeDA0B137d9c1;
		tokenAddresses[5] = 0xaB8Ad2d7f39A54960Be8b71e01276a9E897833eE;
	}

	function getTokenAddresses() public view returns(address[] memory){
        return tokenAddresses;
    }
}