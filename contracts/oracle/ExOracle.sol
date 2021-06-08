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
    IExOraclePriceData public exOracleAddress;

    // ExOracle DataSource
    address public dataSource;

    // Pair Name: example: "DAI/ETH"
    string public pairName;

    // Price Type required by ExOracle. Example: "DAI"
    string public priceType;

    uint256 public constant ONE_OKT = 10 ** 18;
    // 6 decimals USD rate returned by ExOracle, multiplier, divisor
    uint256 public constant USD_DECIMALS_MUL_DIV = 10 ** 6;
    uint256 public constant OKT_NUMERATOR = ONE_OKT * USD_DECIMALS_MUL_DIV;

    /**
     * @dev Constructor of the contract
     * @param _exOracleAddress ExOracle contract address
     * @param _dataSource Datasource address
     * @param _pairName Price pair name. Example "DAI/ETH". Return DAI price in ETH
     * @param _priceType Price type to fetch the price for. Example "DAI"
     */
    constructor(
        address _exOracleAddress,
        address _dataSource,
        string memory _pairName,
        string memory _priceType
    ) public {
        exOracleAddress = IExOraclePriceData(_exOracleAddress);
        pairName = _pairName;
        priceType = _priceType;
        dataSource = _dataSource;
    }

    /**
     * @dev returns the price of the a given token in OKT
     * @return a token price in OKT
     */
    function latestAnswer() public view returns (int256) {
        // #### NOTICE: Eample calculation is in DAI & ETH #####
        // -----------------------------------------------------
        // Get the price of priceType "DAI"
        // Example DAI price in USD = 1001150 = 1.001150 (6 decimals)
        uint256 tokenPriceInUSD = 0;
        uint256 oktPriceInUSD = 0;
        (tokenPriceInUSD, ) = _getPrice(priceType);

        // SavingAccounts contract takes prices in ETH
        // ChainLinkOracle "DAI/ETH" rate is = 000359840000000000 in ETH (data from chainlink)
        // 2781.624292 = ETHPriceInUSD
        (oktPriceInUSD, ) = _getPrice("OKT");

        // 10^(18+6) / 2781624292 = 000359502181109079
        // means $1 = 000359502181109079 ETH
        uint256 oktPerUSD = OKT_NUMERATOR.div(oktPriceInUSD);

        // 000359502181109079 * 1001150 / (10^6) = 359915608617354
        uint256 pricePerTokenInOKT = oktPerUSD.mul(tokenPriceInUSD).div(USD_DECIMALS_MUL_DIV);
        return int256(pricePerTokenInOKT);
    }

    /**
     * @dev Get the price in USD (6 decimals) from ExOracle and validate that the price is
     *      not expired.
     * @param _priceType The price type
     * @return returns the price in USD and the timestamp
     */
    function _getPrice(string memory _priceType) internal view returns (uint256 priceInUSD, uint256 timestamp) {
        (priceInUSD, timestamp) = exOracleAddress.get(_priceType, dataSource);
        // price should not be older than 1 hour
        uint256 expired = now.sub(1 hours);
        require(timestamp > expired, "Token price expired");
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