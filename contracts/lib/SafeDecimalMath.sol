pragma solidity 0.5.14;

/**
 * @dev Library code taken from
 * https://github.com/Synthetixio/synthetix/blob/master/contracts/SafeDecimalMath.sol
 */
library SafeDecimalMath {

    /* Number of decimal places in the representations. */
    uint8 public constant decimals = 18;
    uint8 public constant highPrecisionDecimals = 27;

    /* The number representing 1.0. */
    uint256 public constant UNIT = 10 ** uint256(decimals);
    int256 public constant UINT_UNIT = 10 ** uint256(18);

    function getUNIT() internal pure returns (uint256) {
        return UNIT;
    }

    function getUINT_UNIT() internal pure returns (uint256) {
        return UINT_UNIT;
    }
}