// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;

import { AggregatorInterface } from "@chainlink/contracts/src/v0.5/dev/AggregatorInterface.sol";
import { SafeMath} from "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract ToMaticOracle {
    using SafeMath for uint256;
    string public tokenPairName;
    string public maticPairName;
    string public targetPairName;
    // example pair DAI/ETH
    AggregatorInterface public tokenPriceOracle;
    // example pair MATIC/ETH
    AggregatorInterface public maticPriceOracle;

    constructor(
        string memory _targetPairName,
        string memory _tokenPairName,
        AggregatorInterface _tokenPriceOracle,
        string memory _maticPairName,
        AggregatorInterface _maticPriceOracle
    ) public {
        targetPairName = _targetPairName;

        // pair1
        tokenPairName = _tokenPairName;
        tokenPriceOracle = _tokenPriceOracle;

        // pair2
        maticPairName = _maticPairName;
        maticPriceOracle = _maticPriceOracle;
    }

    function latestAnswer() external view returns (int256) {
        // 1 DAI rate is represented in ETH
        uint256 tokenPrice = toUint256(tokenPriceOracle.latestAnswer());
        // 1 MATIC rate is repsented in ETH
        uint256 maticPrice = toUint256(maticPriceOracle.latestAnswer());
        // number of MATIC in 1 ETH
        // `10^18 / maticPrice = X`   number of MATIC
        // `tokenPrice * X` = DAI/MATIC rate
        return toInt256(tokenPrice.mul(10**18).div(maticPrice));

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