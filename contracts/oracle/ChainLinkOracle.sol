pragma solidity 0.5.14;

import "@chainlink/contracts/src/v0.5/dev/AggregatorInterface.sol";
import "../registry/TokenInfoRegistry.sol";

/**
 */
contract ChainLinkOracle {

    TokenInfoRegistry public tokenRegistry;

    /**
     */
    constructor(TokenInfoRegistry _tokenRegistry) public {
        require(address(_tokenRegistry) != address(0), "TokenInfoRegistry address is zero");
        tokenRegistry = _tokenRegistry;
    }

    /**
     */
    function getLatestAnswer(address _token) public view returns (int256) {
        return getAggregator(_token).latestAnswer();
    }

    /**
     */
    function getLatestTimestamp(address _token) public view returns (uint256) {
        return getAggregator(_token).latestTimestamp();
    }

    /**
     */
    function getPreviousAnswer(address _token, uint256 _back) public view returns (int256) {
        AggregatorInterface aggregator = getAggregator(_token);
        uint256 latest = aggregator.latestRound();
        require(_back <= latest, "Not enough history");
        return aggregator.getAnswer(latest - _back);
    }

    /**
     */
    function getPreviousTimestamp(address _token, uint256 _back) public view returns (uint256) {
        AggregatorInterface aggregator = getAggregator(_token);
        uint256 latest = aggregator.latestRound();
        require(_back <= latest, "Not enough history");
        return aggregator.getTimestamp(latest - _back);
    }

    /**
     */
    function getAggregator(address _token) internal view returns (AggregatorInterface) {
        return AggregatorInterface(tokenRegistry.getChainLinkAggregator(_token));
    }
}
