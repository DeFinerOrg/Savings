pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./IExOraclePriceData.sol";

/**
 * @title TPT Oracle
 * @dev Contract represent TPT ExOracle pair.
 */
contract ExOracleTPT is Ownable {
    using SafeMath for uint256;

    // ExOracle contract address
    IExOraclePriceData public exOracleAddress;

    // ExOracle DataSource
    address public dataSource;

    // TPT token price in USD, with 6 decimal places
    uint256 public tptPriceInUSD;

    // TPT token last updated timestamp
    uint256 public tptLastUpdateTimestamp;

    // Pair Name: example: "DAI/ETH"
    string public constant pairName = "TPT/OKT";

    // Price Type required by ExOracle. Example: "DAI"
    string public constant priceType = "TPT";

    uint256 public constant ONE_OKT = 10 ** 18;
    // 6 decimals USD rate returned by ExOracle, multiplier, divisor
    uint256 public constant USD_DECIMALS_MUL_DIV = 10 ** 6;
    uint256 public constant OKT_NUMERATOR = ONE_OKT * USD_DECIMALS_MUL_DIV;

    event PriceUpdated(uint256 priceInUSD, uint256 timestamp);

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
     * @dev Only owner can set the TPT price in USD
     * @notice The price is in USD, upto 6 decimal places.
     * for example to set $1.1, set `_price = 1100000`
     */
    function setTPTPriceInUSD(uint256 _price) public onlyOwner {
        tptPriceInUSD = _price;
        tptLastUpdateTimestamp = now;
        emit PriceUpdated(tptPriceInUSD, tptLastUpdateTimestamp);
    }

    /**
     * @dev returns the price of the a given token in OKT
     * @return a token price in OKT
     */
    function latestAnswer() public view returns (int256) {
        uint256 tokenPriceInUSD = tptPriceInUSD;
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