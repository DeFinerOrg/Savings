pragma solidity >= 0.5.0 < 0.6.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

library TokenLib {
    struct TokenInfo {
		uint256 balance;
		uint256 rate;
		uint256 interest;
		uint256 lastModification;
	}
	uint256 constant BASE = 10**18;

	function totalAmount(TokenInfo storage self) public view returns(uint256) {
		return self.balance + viewInterest(self);
	}

	function minusAmount(TokenInfo storage self, uint256 amount) public {
		resetInterest(self);
		if (self.interest >= amount) {
			self.interest -= amount;
		} else {
			self.balance -= amount - self.interest;
			self.interest = 0;
		}
	}

	function addAmount(TokenInfo storage self, uint256 amount, uint256 rate) public {
		resetInterest(self);
		self.rate = SafeMath.div(SafeMath.mul(self.rate, self.balance) + SafeMath.mul(rate, amount), self.balance + amount);
		self.balance += amount;
	}

	function resetInterest(TokenInfo storage self) public {
		self.interest = viewInterest(self);
		self.lastModification = block.timestamp;
	}

	function viewInterest(TokenInfo storage self) public view returns(uint256) {
		return self.interest + SafeMath.div(SafeMath.mul(SafeMath.mul(self.balance, self.rate), block.timestamp - self.lastModification), BASE);
	}
}
