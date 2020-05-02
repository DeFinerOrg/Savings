pragma solidity 0.5.14;

contract Config {

    address[] public cTokenAddresses;

    constructor() public {
        cTokenAddresses = new address[](6);
        cTokenAddresses[0] = 0xd6801a1DfFCd0a410336Ef88DeF4320D6DF1883e; //cETH
        cTokenAddresses[1] = 0x6D7F0754FFeb405d23C51CE938289d4835bE3b14; //cDAI
        cTokenAddresses[2] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[3] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[4] = 0x0000000000000000000000000000000000000000;
        cTokenAddresses[5] = 0x0000000000000000000000000000000000000000;
    }

    function getCTokenAddresses() public view returns(address[] memory) {
        return cTokenAddresses;
    }
}
