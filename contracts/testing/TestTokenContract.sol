pragma solidity >= 0.5.0 < 0.6.0;

import "../lib/TokenLib.sol";

contract TestTokenContract {
    using TokenLib for TokenLib.TokenInfo;

    TokenLib.TokenInfo tokenInfo;

    function setTokenInfo(int256 balance, int256 interest, uint256 rate, uint256 lastModification) public {
        tokenInfo = TokenLib.TokenInfo(balance, interest, rate, lastModification);
    }

    function minusAmount(uint256 amount, uint256 rate, uint256 currentTimestamp) public {
        tokenInfo.minusAmount(amount, rate, currentTimestamp);
	}

	function addAmount(uint256 amount, uint256 rate, uint256 currentTimestamp) public {
		tokenInfo.addAmount(amount, rate, currentTimestamp);
	}

	function resetInterest(uint256 currentTimestamp) public {
        tokenInfo.resetInterest(currentTimestamp);
	}

	function totalAmount(uint256 currentTimestamp) public view returns(int256) {
        return tokenInfo.totalAmount(currentTimestamp);
	}

	function viewInterest(uint256 currentTimestamp) public view returns(int256) {
		return tokenInfo.viewInterest(currentTimestamp);
	}

	function getRate()  public view returns(uint256) {
		return tokenInfo.rate;
	}
}
