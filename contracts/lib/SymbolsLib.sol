pragma solidity 0.5.14;

import "./../oracle/ChainLinkOracle.sol";

contract SymbolsLib {

    uint count;
    mapping(uint => address) indexToSymbol;
    ChainLinkOracle public chainLink;

    /**
     *  initializes the symbols structure
     */
    function initialize(address[] memory tokenAddresses, ChainLinkOracle _chainLink) public {
        chainLink = _chainLink;

        count = tokenAddresses.length;
        for(uint i = 0; i < count; i++) {
            indexToSymbol[i] = tokenAddresses[i];
        }

        // Adding ETH
        address ETH_ADDR = 0x000000000000000000000000000000000000000E;
        indexToSymbol[count] = ETH_ADDR;
        count = count + 1;
    }

    function getCoinLength() public view returns (uint length) {
        return count;
    }

    function addressFromIndex(uint index) public view returns(address) {
        require(index < count, "coinIndex must be smaller than the coins length.");
        return indexToSymbol[index];
    }

    function priceFromIndex(uint index) public view returns(uint256) {
        require(index < count, "coinIndex must be smaller than the coins length.");
        address tokenAddress = indexToSymbol[index];
        // Temp fix
        if(_isETH(tokenAddress)) {
            return 1e18;
        }
        return uint256(chainLink.getLatestAnswer(tokenAddress));
    }

    function priceFromAddress(address tokenAddress) public view returns(uint256) {
        if(_isETH(tokenAddress)) {
            return 1e18;
        }
        return uint256(chainLink.getLatestAnswer(tokenAddress));
    }

    function _isETH(address _token) internal pure returns (bool) {
        return address(0x000000000000000000000000000000000000000E) == _token;
    }

}
