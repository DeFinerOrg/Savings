pragma solidity >= 0.5.0 < 0.6.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

library TokenInfoLib {
    using SafeMath for uint256;
    struct TokenInfo {
		int256 balance;
		int256 interest;
		uint256 rate;
		uint256 lastModification;
	}
	uint256 constant BASE = 10**12;
	int256 constant POSITIVE = 1;
	int256 constant NEGATIVE = -1;

	// returns the sum of balance, interest posted to the account, and any additional intereset accrued up to the given timestamp
	function totalAmount(TokenInfo storage self, uint256 currentTimestamp) public view returns(int256) {
		return self.balance + viewInterest(self, currentTimestamp);
	}

	// returns the sum of balance and interest posted to the account
	function getCurrentTotalAmount(TokenInfo storage self) public view returns(int256) {
		return self.balance + self.interest;
	}

	function minusAmount(TokenInfo storage self, uint256 amount, uint256 rate, uint256 currentTimestamp) public {
		resetInterest(self, currentTimestamp);
        int256 _amount = int256(amount);
		if (self.balance + self.interest > 0) {
			if (self.interest >= _amount) {
				self.interest -= _amount;
				_amount = 0;
			} else if (self.balance + self.interest >= _amount){
				self.balance -= _amount - self.interest;
				self.interest = 0;
				_amount = 0;
			} else {
                _amount -= self.balance + self.interest;
				self.balance = 0;
				self.interest = 0;
				self.rate = 0;
			}
		}
        if (_amount > 0) {
			require(self.balance + self.interest <= 0, "To minus amount, the total balance must be smaller than 0.");
			self.rate = mixRate(self, _amount, rate);
			self.balance -= _amount;
		}
	}

	function addAmount(TokenInfo storage self, uint256 amount, uint256 rate, uint256 currentTimestamp) public returns(int256) {
		resetInterest(self, currentTimestamp);
		int256 _amount = int256(amount);
		if (self.balance + self.interest < 0) {
            if (self.interest + _amount <= 0) {
                self.interest += _amount;
				_amount = 0;
			} else if (self.balance + self.interest + _amount <= 0) {
				self.balance += _amount + self.interest;
				self.interest = 0;
				_amount = 0;
			} else {
                _amount += self.balance + self.interest;
				self.balance = 0;
                self.interest = 0;
                self.rate = 0;
			}
		}
        if (_amount > 0) {
			require(self.balance + self.interest >= 0, "To add amount, the total balance must be larger than 0.");
			self.rate = mixRate(self, _amount, rate);
			self.balance += _amount;
		}

		return totalAmount(self, currentTimestamp);
	}

	function mixRate(TokenInfo storage self, int256 amount, uint256 rate) private view returns (uint256){
        uint256 _balance = self.balance >= 0 ? uint256(self.balance) : uint256(-self.balance);
		uint256 _amount = amount >= 0 ? uint256(amount) : uint256(-amount);
		return _balance.mul(self.rate).add(_amount.mul(rate)).div(_balance + _amount);
	}

	function resetInterest(TokenInfo storage self, uint256 currentTimestamp) public {
		self.interest = viewInterest(self, currentTimestamp);
		self.lastModification = currentTimestamp;
	}

	function viewInterest(TokenInfo storage self, uint256 currentTimestamp) public view returns(int256) {
        int256 _sign = self.balance < 0 ? NEGATIVE : POSITIVE;
		uint256 _balance = self.balance >= 0 ? uint256(self.balance) : uint256(-self.balance);
		uint256 _difference = currentTimestamp - self.lastModification;

		return self.interest + int256(_balance.mul(self.rate).mul(_difference).div(BASE)) * _sign;
	}
}
