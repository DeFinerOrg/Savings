pragma solidity 0.5.14;

interface IExOraclePriceData
{
    //function registerRequesterViewer() external;
    //function put(bytes calldata message, bytes calldata signature) external returns (string memory);
    //function put(bytes[] calldata messages, bytes[] calldata signatures) external returns (string[] memory keys);
    //function latestRoundData(string calldata priceType, address dataSource) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function get(string calldata priceType, address source) external view returns (uint256 price, uint256 timestamp);
    function getOffchain(string calldata priceType, address source) external view returns (uint256 price, uint256 timestamp);
    //function getCumulativePrice(string calldata priceType, address source) external view returns (uint256 cumulativePrice,uint32 timestamp);
    //function changeSourceRecipient(address _recipient) external;
    //function changeFeederRecipient(address _recipient) external;
    //function postMining(address requester, bytes calldata message, bytes calldata signature) external;
    //function transferCredit(uint256 amount, address to) external;
}