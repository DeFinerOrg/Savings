pragma solidity 0.5.14;

import "../config/GlobalConfigV1.sol";

library UtilsV1{

    function _isETH(address globalConfig, address _token) public view returns (bool) {
        return GlobalConfigV1(globalConfig).constants().ETH_ADDR() == _token;
    }

    function getDivisor(address globalConfig, address _token) public view returns (uint256) {
        if(_isETH(globalConfig, _token)) return GlobalConfigV1(globalConfig).constants().INT_UNIT();
        return 10 ** uint256(GlobalConfigV1(globalConfig).tokenInfoRegistry().getTokenDecimals(_token));
    }

}