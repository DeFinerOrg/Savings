pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";

library TokenInfoLib {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    struct TokenInfo {
        uint256 depositBalance;
        uint256 borrowBalance;
        uint256 depositInterest;
        uint256 borrowInterest;
        uint256 rate;
        uint256 StartBlockNumber;
    }
    uint256 constant BASE = 10**18; // TODO: 12 vs 18?

    function isDeposit(TokenInfo storage self) public view returns(bool) {
        return self.depositBalance >= self.borrowBalance ? true : false;
    }

    // returns the principal
    // TODO: change the name from balance to principal
    function totalBalance(TokenInfo storage self) public view returns(uint256) {
        return self.depositBalance == 0 ? self.borrowBalance : self.depositBalance;
    }

    // returns the sum of balance, interest posted to the account, and any additional intereset accrued up to the given timestamp
    // TODO: change the name from amount to balance
    function totalAmount(TokenInfo storage self, uint rate) public view returns(uint256) {
        return (self.depositBalance == 0 ? self.borrowBalance : self.depositBalance).add(viewInterest(self, rate));
    }

    function getCurrentTotalAmount(TokenInfo storage self) public view returns(uint256) {
        return (self.depositBalance == 0 ? self.borrowBalance : self.depositBalance).add(self.interest);
    }

    function getStartBlockNumber(TokenInfo storage self) public view returns(uint256) {
        return self.StartBlockNumber;
    }

    function minusAmount(TokenInfo storage self, uint256 amount, uint256 rate, uint256 blockNumber) public {
        resetInterest(self, blockNumber, rate);
        if (self.depositBalance > 0) {
            if (self.interest >= amount) {
                self.interest = self.interest.sub(amount);
                amount = 0;
            } else if (self.depositBalance.add(self.interest) >= amount) {
                self.depositBalance = self.depositBalance.sub(amount.sub(self.interest));
                self.interest = 0;
                amount = 0;
            } else {
                amount = amount.sub(self.depositBalance.add(self.interest));
                self.depositBalance = 0;
                self.interest = 0;
            }
        }

        if (amount > 0) {
            require(self.depositBalance == 0, "To minus amount, the total balance must be equal to 0.");
            self.borrowBalance = self.borrowBalance.add(amount);
        }
    }

    // TODO Principal + interest
    // `balance` should be called `principal`
    function addAmount(TokenInfo storage self, uint256 amount, uint rate, uint256 blockNumber) public {
        // updated rate (new index rate), applying the rate from startBlock(checkpoint) to currBlock
        resetInterest(self, blockNumber, rate);
        // user owes money, then he tries to repays
        if (self.borrowBalance > 0) {
            if (self.interest > amount) {
                self.interest = self.interest.sub(amount);
                amount = 0;
            } else if (self.borrowBalance.add(self.interest) > amount) {
                self.borrowBalance = self.borrowBalance.sub(amount.sub(self.interest));
                self.interest = 0;
                amount = 0;
            } else {
                amount = amount.sub(self.borrowBalance.add(self.interest));
                self.borrowBalance = 0;
                self.interest = 0;
            }
        }
        // TODO _amount will always is greater than 0, then why?
        if (amount > 0) {
            require(self.borrowBalance == 0, "To add amount, the total balance must be equal to 0.");
            self.depositBalance = self.depositBalance.add(amount);
        }
    }

    // 1. Calculate interest from startBlockNum(checkpoint) to CurrentBlockNum
    // 2. Reset the startBlockNum of the user to the latest blockNum(new checkpoint)
    function resetInterest(TokenInfo storage self, uint256 blockNumber, uint rate) public {
        self.interest = viewInterest(self, rate);
        self.StartBlockNumber = blockNumber;
    }

    // Calculating interest according to the new rate
    function viewInterest(TokenInfo storage self, uint rate) public view returns(uint256) {
        uint256 _balance = self.depositBalance == 0 ? self.borrowBalance : self.depositBalance;
        if(rate == 0 || _balance == 0 || BASE > rate) {
            return self.interest;
        } else {
            return _balance.add(self.interest).mul(rate).sub(_balance.mul(BASE)).div(BASE);
        }
    }
}
