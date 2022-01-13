pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "@chainlink/contracts/src/v0.5/dev/AggregatorInterface.sol";

/**
 * @title FIN Oracle
 */
contract FixedPriceOracleFIN is Ownable {
    using SafeMath for uint256;

    // "MATIC / USD" price feed address
    AggregatorInterface public maticUsdChainLinkPriceFeed;

    // FIN token price in USD, with 8 decimal places
    uint256 public finPriceInUSD;

    // FIN token last updated timestamp
    uint256 public finLastUpdateTimestamp;

    // Pair Name: example: "FIN/MATIC"
    string public constant pairName = "FIN/MATIC";

    uint256 public constant ONE_MATIC = 10 ** 18;
    // 8 decimals USD rate returned by Chainlink Oracle, multiplier, divisor
    uint256 public constant USD_DECIMALS_MUL_DIV = 10 ** 8;
    uint256 public constant MATIC_NUMERATOR = ONE_MATIC * USD_DECIMALS_MUL_DIV;

    event FINPriceUpdated(uint256 priceInUSD, uint256 timestamp);

    /**
     * @dev Constructor of the contract
     */
    constructor(AggregatorInterface _maticUsdChainLinkPriceFeed) public {
        maticUsdChainLinkPriceFeed = _maticUsdChainLinkPriceFeed;
    }

    /**
     * @dev Only owner can set the FIN price in USD
     * @notice The price is in USD, upto 8 decimal places.
     */
    function setFINPriceInUSD(uint256 _price) public onlyOwner {
        finPriceInUSD = _price;
        finLastUpdateTimestamp = now;
        emit FINPriceUpdated(finPriceInUSD, finLastUpdateTimestamp);
    }

    /**
     * @dev returns the price of the a given token in MATIC
     * @return a token price in MATIC
     */
    function latestAnswer() public view returns (int256) {
        // example : finPriceInUSD = 20 000 000 = $0.2 (8 decimals)
        uint256 tokenPriceInUSD = finPriceInUSD;
        uint256 maticPriceInUSD = 0;

        // get the "MATIC / USD" pair rate in USD with 8 decimals
        // example `maticPriceInUSD = 200000000` = $2 per MATIC
        (maticPriceInUSD, ) = _getMaticUSDPrice();

        // 10^(18+8) / 200000000 = 500 000 000 000 000 000
        // means $1 = 500 000 000 000 000 000 MATIC
        uint256 maticPerUSD = MATIC_NUMERATOR.div(maticPriceInUSD);

        // 500 000 000 000 000 000 * 20 000 000 / (10^8) = 100 000 000 000 000 000 MATIC = 0.1 MATIC
        uint256 finPricePerTokenInMATIC = maticPerUSD.mul(tokenPriceInUSD).div(USD_DECIMALS_MUL_DIV);
        return toInt256(finPricePerTokenInMATIC);
    }

    /**
     * @dev Get the price in USD (8 decimals) from ChainLink and validate that the price is
     *      not expired.
     * @return returns the price in USD and the timestamp
     */
    function _getMaticUSDPrice() internal view returns (uint256 priceInUSD, uint256 timestamp) {
        timestamp = maticUsdChainLinkPriceFeed.latestTimestamp();
        // price should not be older than 1 hour
        uint256 expired = now.sub(1 hours);
        require(timestamp > expired, "Token price expired");

        int256 priceInUSD_8_decimal = maticUsdChainLinkPriceFeed.latestAnswer();
        priceInUSD = toUint256(priceInUSD_8_decimal);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        require(value < uint256(-1), "value doesn\'t fit in 256 bits");
        return int256(value);
    }

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "value must be positive");
        return uint256(value);
    }
}