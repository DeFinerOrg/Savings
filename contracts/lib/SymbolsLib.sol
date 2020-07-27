pragma solidity 0.5.14;

import "./../oracle/ChainLinkOracle.sol";
import "./registry/TokenInfoRegistry.sol";

library SymbolsLib {

    struct Symbols {
        uint count;
        mapping(uint => address) indexToSymbol;
        address tokenInfoRegistryAddress;
    }

	/**
	 *  initializes the symbols structure
	 */
    function initialize(Symbols storage self, address[] memory tokenAddresses, address _tokenRegistry) public {
        self.tokenInfoRegistryAddress = _tokenRegistry;

        self.count = tokenAddresses.length;
        for(uint i = 0; i < self.count; i++) {
            self.indexToSymbol[i] = tokenAddresses[i];
        }
        // Temp fix
        // Adding ETH
        address ETH_ADDR = 0x000000000000000000000000000000000000000E;
        self.indexToSymbol[self.count] = ETH_ADDR;
        self.count = self.count + 1;
    }

    function getCoinLength(Symbols storage self) public view returns (uint length) {
        return self.count;
    }

    function addressFromIndex(Symbols storage self, uint index) public view returns(address) {
        require(index < self.count, "coinIndex must be smaller than the coins length.");
        return self.indexToSymbol[index];
    }

    function priceFromIndex(Symbols storage self, uint index) public view returns(uint256) {
        require(index < self.count, "coinIndex must be smaller than the coins length.");
        address tokenAddress = self.indexToSymbol[index];
        // Temp fix
        if(_isETH(tokenAddress)) {
            return 1e18;
        }
        return uint256(ChainLinkOracle(TokenInfoRegistry(self.tokenInfoRegistryAddress).getChainLinkAggregator(tokenAddress)).getLatestAnswer(tokenAddress));
    }

    function priceFromAddress(Symbols storage self, address tokenAddress) public view returns(uint256) {
        // Temp fix
        if(_isETH(tokenAddress)) {
            return 1e18;
        }
        return uint256(ChainLinkOracle(TokenInfoRegistry(self.tokenInfoRegistryAddress).getChainLinkAggregator(tokenAddress)).getLatestAnswer(tokenAddress));
    }

    // Temp fix
    function _isETH(address _token) internal pure returns (bool) {
        return address(0x000000000000000000000000000000000000000E) == _token;
    }

}
