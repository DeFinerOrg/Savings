pragma solidity 0.5.14;

import "@chainlink/contracts/src/v0.5/dev/AggregatorInterface.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 */
contract ChainLinkOracle is Ownable {

    mapping(address => AggregatorInterface) public aggregators;

    /**
     */
    constructor(address[] memory _tokens, address[] memory _aggregators) public {
        addAggregators(_tokens, _aggregators);
    }

    /**
     */
    function addAggregator(address _token, address _aggregator) public onlyOwner {
        require(_token != address(0), "Token address is zero");
        require(_aggregator != address(0), "Aggregator address is zero");
        require(address(aggregators[_token]) == address(0), "Aggregator already set");

        aggregators[_token] = AggregatorInterface(_aggregator);
    }

    /**
     */
    function addAggregators(address[] memory _tokens, address[] memory _aggregators) public onlyOwner {
        require(_tokens.length > 0, "Empty arrays provided");
        require(_tokens.length == _aggregators.length, "Length must be same");

        for(uint256 i = 0; i < _tokens.length; i++) {
            addAggregator(_tokens[i], _aggregators[i]);
        }
    }

    /**
     */
    function updateAggregator(address _token, address _aggregator) external onlyOwner {
        require(address(aggregators[_token]) != address(0), "Aggregator not found");
        require(_aggregator != address(0), "Aggregator address is zero");
        require(address(aggregators[_token]) != _aggregator, "Same aggregator address provided");

        aggregators[_token] = AggregatorInterface(_aggregator);
    }

    /**
     */
    function removeAggregator(address _token) external onlyOwner {
        require(_token != address(0), "Token address is zero");
        require(address(aggregators[_token]) != address(0), "Aggregator not exist");

        delete aggregators[_token];
    }

    /**
     */
    function getLatestAnswer(address _token) public view returns (int256) {
        return aggregators[_token].latestAnswer();
    }

    /**
     */
    function getLatestTimestamp(address _token) public view returns (uint256) {
        return aggregators[_token].latestTimestamp();
    }

    /**
     */
    function getPreviousAnswer(address _token, uint256 _back) public view returns (int256) {
        uint256 latest = aggregators[_token].latestRound();
        require(_back <= latest, "Not enough history");
        return aggregators[_token].getAnswer(latest - _back);
    }

    /**
     */
    function getPreviousTimestamp(address _token, uint256 _back) public view returns (uint256) {
        uint256 latest = aggregators[_token].latestRound();
        require(_back <= latest, "Not enough history");
        return aggregators[_token].getTimestamp(latest - _back);
    }
}
