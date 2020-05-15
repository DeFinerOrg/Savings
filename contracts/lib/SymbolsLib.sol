pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./../external/strings.sol";
import "./../oracle/ChainLinkOracle.sol";

library SymbolsLib {
    using SafeMath for uint256;

    struct Symbols {
        uint count;
        mapping(uint => string) indexToSymbol;
        mapping(string => uint256) symbolToPrices;
        mapping(address => string) addressToSymbol;
        mapping(string => address) symbolToAddress;
        ChainLinkOracle chainlinkAggregator;
    }

	/**
	 *  initializes the symbols structure
	 */
    function initialize(Symbols storage self, string memory tokenNames, address[] memory tokenAddresses, address _chainlinkAddress) public {
        self.chainlinkAggregator = ChainLinkOracle(_chainlinkAddress);

        strings.slice memory delim = strings.toSlice(",");
        strings.slice memory tokensList = strings.toSlice(tokenNames);

        self.count = strings.count(tokensList, delim) + 1;
        require(self.count == tokenAddresses.length, "");

        for(uint i = 0; i < self.count; i++) {
            strings.slice memory token;
            strings.split(tokensList, delim, token);

            address tokenAddress = tokenAddresses[i];
            string memory tokenName = strings.toString(token);

            self.indexToSymbol[i] = tokenName;
            self.addressToSymbol[tokenAddress] = tokenName;
            self.symbolToAddress[tokenName] = tokenAddress;
        }
    }

    function getCoinLength(Symbols storage self) public view returns (uint length) {
        return self.count;
    }

    function addressFromIndex(Symbols storage self, uint index) public view returns(address) {
        require(index < self.count, "coinIndex must be smaller than the coins length.");
        return self.symbolToAddress[self.indexToSymbol[index]];
    }

    function priceFromIndex(Symbols storage self, uint index) public view returns(uint256) {
        require(index < self.count, "coinIndex must be smaller than the coins length.");
        address tokenAddress = self.symbolToAddress[self.indexToSymbol[index]];
        return uint256(self.chainlinkAggregator.getLatestAnswer(tokenAddress));
    }

    function priceFromAddress(Symbols storage self, address tokenAddress) public view returns(uint256) {
        return uint256(self.chainlinkAggregator.getLatestAnswer(tokenAddress));
    }
}
