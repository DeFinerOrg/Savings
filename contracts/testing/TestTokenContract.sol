pragma solidity >= 0.5.0 < 0.6.0;

import "../lib/TokenLib.sol";

contract TestTokenContract {
    using TokenLib for TokenLib.TokenInfo;

    TokenLib.TokenInfo tokenInfo;

    function setTokenInfo(uint256 balance, uint256 rate, uint256 interest, uint256 lastModification) public {
        tokenInfo = TokenLib.TokenInfo(balance, rate, interest, lastModification);
    }

    function minusAmount(uint256 amount) public {
        tokenInfo.minusAmount(amount);
	}

	function addAmount(uint256 amount, uint256 rate) public {
		tokenInfo.addAmount(amount, rate);
	}

	function resetInterest() public {
        tokenInfo.resetInterest();
	}

	function totalAmount() public view returns(uint256) {
        return tokenInfo.totalAmount();
	}

	function viewInterest() public view returns(uint256) {
		return tokenInfo.viewInterest();
	}
}
