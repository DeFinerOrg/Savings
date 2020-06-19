pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";

library TokenInfoLib {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    struct TokenInfo {
        uint256 depositPrincipal;
        uint256 borrowPrincipal;
        uint256 depositInterest;
        uint256 borrowInterest;
        uint256 StartBlockNumber; // sichaoy: change the name to lastCheckpointBlockNumber
    }
    uint256 constant BASE = 10**18; // TODO: 12 vs 18?  // sichaoy: can I remove this? As UNIT has been defined somewhere else

    // returns the principal
    function getDepositPrincipal(TokenInfo storage self) public view returns(uint256) {
        return self.depositPrincipal;
    }

    function getBorrowPrincipal(TokenInfo storage self) public view returns(uint256) {
        return self.borrowPrincipal;
    }

    function getDepositBalance(TokenInfo storage self, uint accruedRate) public view returns(uint256) {
        return self.depositPrincipal.add(viewDepositInterest(self, accruedRate));
    }

    function getBorrowBalance(TokenInfo storage self, uint accruedRate) public view returns(uint256) {
        return self.borrowPrincipal.add(viewBorrowInterest(self, accruedRate));
    }

    function getStartBlockNumber(TokenInfo storage self) public view returns(uint256) {
        return self.StartBlockNumber;
    }

    function borrow(TokenInfo storage self, uint256 amount, uint256 accruedRate) public {
        resetBorrowInterest(self, accruedRate);
        self.borrowPrincipal = self.borrowPrincipal.add(amount);
    }

    function withdraw(TokenInfo storage self, uint256 amount, uint256 accruedRate) public {
        resetDepositInterest(self, accruedRate);
        if (self.depositInterest >= amount) {
            self.depositInterest = self.depositInterest.sub(amount);
        } else if (self.depositPrincipal.add(self.depositInterest) >= amount) {
            self.depositPrincipal = self.depositPrincipal.sub(amount.sub(self.depositInterest));
            self.depositInterest = 0;
        } else {
            self.depositPrincipal = 0;
            self.depositInterest = 0;
        }
    }

    /**
     * Do the actually deposit and modify the token info.
     */
    function deposit(TokenInfo storage self, uint256 amount, uint accruedRate) public {
        resetDepositInterest(self, accruedRate);
        self.depositPrincipal = self.depositPrincipal.add(amount);
    }

    function repay(TokenInfo storage self, uint256 amount, uint accruedRate) public {
        // updated rate (new index rate), applying the rate from startBlock(checkpoint) to currBlock
        resetBorrowInterest(self, accruedRate);
        // user owes money, then he tries to repays
        if (self.borrowInterest > amount) {
            self.borrowInterest = self.borrowInterest.sub(amount);
        } else if (self.borrowPrincipal.add(self.borrowInterest) > amount) {
            self.borrowPrincipal = self.borrowPrincipal.sub(amount.sub(self.borrowInterest));
            self.borrowInterest = 0;
        } else {
            self.borrowPrincipal = 0;
            self.borrowInterest = 0;
        }
    }

    // sichaoy: better to change the name to updateCheckpoint
    function resetDepositInterest(TokenInfo storage self, uint accruedRate) public {
        self.depositInterest = viewDepositInterest(self, accruedRate);
        self.StartBlockNumber = block.number;
    }

    function resetBorrowInterest(TokenInfo storage self, uint accruedRate) public {
        self.borrowInterest = viewBorrowInterest(self, accruedRate);
        self.StartBlockNumber = block.number;
    }

    // Calculating interest according to the new rate
    function viewDepositInterest(TokenInfo storage self, uint accruedRate) public view returns(uint256) {
        uint256 _balance = self.depositPrincipal;
        if(accruedRate == 0 || _balance == 0 || BASE >= accruedRate) {
            return self.depositInterest;
        } else {
            return _balance.add(self.depositInterest).mul(accruedRate).sub(_balance.mul(BASE)).div(BASE);
        }
    }

    function viewBorrowInterest(TokenInfo storage self, uint accruedRate) public view returns(uint256) {
        uint256 _balance = self.borrowPrincipal;
        if(accruedRate == 0 || _balance == 0 || BASE >= accruedRate) {
            return self.borrowInterest;
        } else {
            return _balance.add(self.borrowInterest).mul(accruedRate).sub(_balance.mul(BASE)).div(BASE);
        }
    }
}
