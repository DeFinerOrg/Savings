pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title OKExChain Oracle : ExOracle
 * @dev Contract represent ExOracle pair for the given tokens.
 * @notice It has functions similar to ChainLinkOracles, so that it can be easily integrated with
 * SavingAccount contracts.
 * @dev For every token (its oracle), need to deploy this contract instance
 */
contract ExOracle {
    using SafeMath for uint256;

    // ExOracle contract address
    address public exOracleAddress;

    // ExOracle DataSource
    address public dataSource;

    // Pair Name: example: "DAI/ETH"
    string public pairName;

    // Price Type required by ExOracle. Example: "DAI"
    string public priceType;

    uint public constant ONE_ETH = 10 ** 18;
    // 6 decimals USD rate returned by ExOracle
    uint public constant USD_RATE_DECIMALS = 10 ** 6;
    uint public constant ETH_NUMERATOR = ONE_ETH * USD_RATE_DECIMALS;

    constructor(
        address _exOracleAddress,
        address _dataSource,
        string memory _pairName,
        string memory _priceType
    ) public {
        exOracleAddress = _exOracleAddress;
        pairName = _pairName;
        priceType = _priceType;
        dataSource = _dataSource;
    }

    /**
     * @dev returns the price of the a given token in ETH
     * @return a token price in ETH
     */
    function latestAnswer() public view returns (int256) {
        // Get the price of priceType "DAI"
        // Example DAI price in USD = 1001150 = 1.001150 (6 decimals)
        uint256 timestamp = 0;
        uint256 tokenPriceInUSD = 0;
        uint256 ethPriceInUSD = 0;
        (tokenPriceInUSD, timestamp) = IExOraclePriceData(exOracleAddress).get(priceType, dataSource);
        // price should not be older than 1 hour
        uint expired = now.sub(1 hours);
        require(timestamp > expired, "Token price expired");

        // SavingAccounts contract takes prices in ETH
        // ChainLinkOracle "DAI/ETH" rate is = 000359840000000000 in ETH (data from chainlink)
        // 2781.624292 = ETHPriceInUSD
        (ethPriceInUSD, timestamp) = IExOraclePriceData(exOracleAddress).get("ETH", dataSource);
        require(timestamp > expired, "ETH price expired");

        // 1^(18+6) / 2781624292 = 000359502181109079
        // means $1 = 000359502181109079 ETH
        uint ethPerUSD = ETH_NUMERATOR.div(ethPriceInUSD);

        // 000359502181109079 * 1001150 / (10^6) = 359915608617354
        uint pricePerTokenInETH = ethPerUSD.mul(tokenPriceInUSD).div(USD_RATE_DECIMALS);
        return int256(pricePerTokenInETH);
    }
}

interface IExOraclePriceData
{
    //function registerRequesterViewer() external;
    //function put(bytes calldata message, bytes calldata signature) external returns (string memory);
    //function put(bytes[] calldata messages, bytes[] calldata signatures) external returns (string[] memory keys);
    //function latestRoundData(string calldata priceType, address dataSource) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function get(string calldata priceType, address source) external view returns (uint256 price, uint256 timestamp);
    //function getOffchain(string calldata priceType, address source) external view returns (uint256 price, uint256 timestamp);
    //function getCumulativePrice(string calldata priceType, address source) external view returns (uint256 cumulativePrice,uint32 timestamp);
    //function changeSourceRecipient(address _recipient) external;
    //function changeFeederRecipient(address _recipient) external;
    //function postMining(address requester, bytes calldata message, bytes calldata signature) external;
    //function transferCredit(uint256 amount, address to) external;
}