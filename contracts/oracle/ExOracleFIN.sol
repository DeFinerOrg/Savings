pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title FIN Oracle
 * @dev Contract represent FIN ExOracle pair.
 */
contract ExOracle is Ownable {
    using SafeMath for uint256;

    // ExOracle contract address
    IExOraclePriceData public exOracleAddress;

    // ExOracle DataSource
    address public dataSource;

    // FIN token price in USD, with 6 decimal places
    uint256 public finPriceInUSD;
    
    // FIN token last updated timestamp
    uint256 public finLastUpdateTimestamp;

    // Pair Name: example: "DAI/ETH"
    string public constant pairName = "FIN/OKT";

    // Price Type required by ExOracle. Example: "DAI"
    string public constant priceType = "FIN";

    uint256 public constant ONE_OKT = 10 ** 18;
    // 6 decimals USD rate returned by ExOracle, multiplier, divisor
    uint256 public constant USD_DECIMALS_MUL_DIV = 10 ** 6;
    uint256 public constant OKT_NUMERATOR = ONE_OKT * USD_DECIMALS_MUL_DIV;

    event FINPriceUpdated(uint256 priceInUSD, uint256 timestamp);

    /**
     * @dev Constructor of the contract
     * @param _exOracleAddress ExOracle contract address
     * @param _dataSource Datasource address
     */
    constructor(
        address _exOracleAddress,
        address _dataSource
    ) public {
        exOracleAddress = IExOraclePriceData(_exOracleAddress);
        dataSource = _dataSource;
    }

    /**
     * @dev Only owner can set the FIN price in USD
     * @notice The price is in USD, upto 6 decimal places.
     * for example to set $1.1, set `_price = 1100000`
     */
    function setFINPriceInUSD(uint256 _price) public onlyOwner {
        finPriceInUSD = _price;
        finLastUpdateTimestamp = now;
        emit FINPriceUpdated(finPriceInUSD, finLastUpdateTimestamp);
    }

    /**
     * @dev returns the price of the a given token in OKT
     * @return a token price in OKT
     */
    function latestAnswer() public view returns (int256) {
        uint256 tokenPriceInUSD = finPriceInUSD;
        uint256 oktPriceInUSD = 0;

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