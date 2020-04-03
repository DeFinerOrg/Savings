pragma solidity >= 0.5.0 < 0.6.0;

contract Config {

    address[] public cTokenAddresses;

    constructor() public {
        cTokenAddresses = new address[](16);
        cTokenAddresses[0] = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5; //cETH
        cTokenAddresses[1] = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643; //cDAI
        cTokenAddresses[2] = 0x39AA39c021dfbaE8faC545936693aC917d5E7563; //cUSDC
        cTokenAddresses[3] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[4] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[5] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[6] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[7] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[8] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[9] = 0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E; //cBAT
        cTokenAddresses[10] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[11] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[12] = 0xB3319f5D18Bc0D84dD1b4825Dcde5d5f7266d407; //cZRX
        cTokenAddresses[13] = 0x158079Ee67Fce2f58472A96584A73C7Ab9AC95c1; //cREP
        cTokenAddresses[14] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[15] = 0xC11b1268C1A384e55C48c2391d8d480264A3A7F4; //cWBTC
    }

    function getCTokenAddresses() public view returns(address[] memory) {
        return cTokenAddresses;
    }
}
