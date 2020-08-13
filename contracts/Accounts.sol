pragma solidity 0.5.14;

import "./lib/TokenInfoLib.sol";
import "./lib/BitmapLib.sol";
import "./config/GlobalConfig.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";

contract Accounts {
    using TokenInfoLib for TokenInfoLib.TokenInfo;
    using BitmapLib for uint128;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    mapping(address => Account) public accounts;
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;
    uint256 public constant INT_UNIT = 10 ** uint256(18);

    GlobalConfig globalConfig;

    struct Account {
        // Note, it's best practice to use functions minusAmount, addAmount, totalAmount
        // to operate tokenInfos instead of changing it directly.
        mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
        uint128 depositBitmap;
        uint128 borrowBitmap;
    }

    /**
     * Initialize the Accounts
     * @param _globalConfig the global configuration contract
     */
    function initialize(
        GlobalConfig _globalConfig
    ) public {
        globalConfig = _globalConfig;
    }

    /**
     * Check if the user has deposit for any tokens
     * @param _account address of the user
     * @return true if the user has positive deposit balance
     */
    function isUserHasAnyDeposits(address _account) public view returns (bool) {
        Account storage account = accounts[_account];
        return account.depositBitmap > 0;
    }

    /**
     * Check if the user has deposit for a token
     * @param _account address of the user
     * @param _index index of the token
     * @return true if the user has positive deposit balance for the token
     */
    function isUserHasDeposits(address _account, uint8 _index) public view returns (bool) {
        Account storage account = accounts[_account];
        return account.depositBitmap.isBitSet(_index);
    }

    /**
     * Check if the user has borrowed a token
     * @param _account address of the user
     * @param _index index of the token
     * @return true if the user has borrowed the token
     */
    function isUserHasBorrows(address _account, uint8 _index) public view returns (bool) {
        Account storage account = accounts[_account];
        return account.borrowBitmap.isBitSet(_index);
    }

    /**
     * Set the deposit bitmap for a token.
     * @param _account address of the user
     * @param _index index of the token
     */
    function setInDepositBitmap(address _account, uint8 _index) public {
        Account storage account = accounts[_account];
        account.depositBitmap = account.depositBitmap.setBit(_index);
    }

    /**
     * Unset the deposit bitmap for a token
     * @param _account address of the user
     * @param _index index of the token
     */
    function unsetFromDepositBitmap(address _account, uint8 _index) public {
        Account storage account = accounts[_account];
        account.depositBitmap = account.depositBitmap.unsetBit(_index);
    }

    /**
     * Set the borrow bitmap for a token.
     * @param _account address of the user
     * @param _index index of the token
     */
    function setInBorrowBitmap(address _account, uint8 _index) public {
        Account storage account = accounts[_account];
        account.borrowBitmap = account.borrowBitmap.setBit(_index);
    }

    /**
     * Unset the borrow bitmap for a token
     * @param _account address of the user
     * @param _index index of the token
     */
    function unsetFromBorrowBitmap(address _account, uint8 _index) public {
        Account storage account = accounts[_account];
        account.borrowBitmap = account.borrowBitmap.unsetBit(_index);
    }

    function getDepositPrincipal(address _accountAddr, address _token) public view returns(uint256) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getDepositPrincipal();
    }

    function getBorrowPrincipal(address _accountAddr, address _token) public view returns(uint256) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getBorrowPrincipal();
    }

    function getLastDepositBlock(address _accountAddr, address _token) public view returns(uint256) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getLastDepositBlock();
    }

    function getLastBorrowBlock(address _accountAddr, address _token) public view returns(uint256) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getLastBorrowBlock();
    }

    function getDepositInterest(address _accountAddr, address _token) public view returns(uint256) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getDepositInterest();
    }

    function getBorrowInterest(address _accountAddr, address _token) public view returns(uint256) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        return tokenInfo.getBorrowInterest();
    }

    function borrow(address _accountAddr, address _token, uint256 _amount, uint256 _block) public {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint256 accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.borrow(_amount, accruedRate, _block);
    }

    /**
     * Update token info for withdraw. The interest will be withdrawn with higher priority.
     */
    function withdraw(address _accountAddr, address _token, uint256 _amount, uint256 _block) public {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint256 accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        tokenInfo.withdraw(_amount, accruedRate, _block);
        if(tokenInfo.getDepositPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            unsetFromDepositBitmap(_accountAddr, tokenIndex);
        }
    }

    /**
     * Update token info for deposit
     */
    function deposit(address _accountAddr, address _token, uint256 _amount, uint256 _block) public {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        if(tokenInfo.getDepositPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            setInDepositBitmap(_accountAddr, tokenIndex);
        }
        tokenInfo.deposit(_amount, accruedRate, _block);
    }

    function repay(address _accountAddr, address _token, uint256 _amount, uint256 _block) public {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
        tokenInfo.repay(_amount, accruedRate, _block);
        if(tokenInfo.getBorrowPrincipal() == 0) {
            uint8 tokenIndex = globalConfig.tokenInfoRegistry().getTokenIndex(_token);
            unsetFromBorrowBitmap(_accountAddr, tokenIndex);
        }
    }

    function getDepositBalanceCurrent(
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = SafeDecimalMath.getUNIT();
        uint accruedRate;
        if(tokenInfo.getDepositPrincipal() == 0) {
            return 0;
        } else {
            if(globalConfig.bank().depositeRateIndex(_token, tokenInfo.getLastDepositBlock()) == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = globalConfig.bank().depositRateIndexNow(_token)
                .mul(UNIT)
                .div(globalConfig.bank().depositeRateIndex(_token, tokenInfo.getLastDepositBlock()));
            }
            return tokenInfo.getDepositBalance(accruedRate);
        }
    }

    function getDepositBalanceStore(
        address _token,
        address _accountAddr
    ) public view returns (uint256 depositBalance) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getDepositAccruedRate(_token, tokenInfo.getLastDepositBlock());
        return tokenInfo.getDepositBalance(accruedRate);
    }

    /**
     * Get current borrow balance of a token
     * @param _token token address
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    // sichaoy: What's the diff of getBorrowBalance with getBorrowAcruedRate?
    function getBorrowBalanceCurrent(
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint UNIT = SafeDecimalMath.getUNIT();
        uint accruedRate;
        if(tokenInfo.getBorrowPrincipal() == 0) {
            return 0;
        } else {
            if(globalConfig.bank().borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()) == 0) {
                accruedRate = UNIT;
            } else {
                accruedRate = globalConfig.bank().borrowRateIndexNow(_token)
                .mul(UNIT)
                .div(globalConfig.bank().borrowRateIndex(_token, tokenInfo.getLastBorrowBlock()));
            }
            return tokenInfo.getBorrowBalance(accruedRate);
        }
    }

    function getBorrowBalanceStore(
        address _token,
        address _accountAddr
    ) public view returns (uint256 borrowBalance) {
        TokenInfoLib.TokenInfo storage tokenInfo = accounts[_accountAddr].tokenInfos[_token];
        uint accruedRate = globalConfig.bank().getBorrowAccruedRate(_token, tokenInfo.getLastBorrowBlock());
        return tokenInfo.getBorrowBalance(accruedRate);
    }

    /**
     * Get current deposit balance of a token
     * @dev This is an estimation. Add a new checkpoint first, if you want to derive the exact balance.
     */
    function getDepositETH(
        address _accountAddr
    ) public view returns (uint256 depositETH) {
        for(uint i = 0; i < globalConfig.tokenInfoRegistry().getCoinLength(); i++) {
            if(isUserHasDeposits(_accountAddr, uint8(i))) {
                address tokenAddress = globalConfig.tokenInfoRegistry().addressFromIndex(i);
                uint divisor = INT_UNIT;
                if(tokenAddress != ETH_ADDR) {
                    divisor = 10**uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(tokenAddress));
                }
                depositETH = depositETH.add(getDepositBalanceCurrent(tokenAddress, _accountAddr).mul(globalConfig.tokenInfoRegistry().priceFromIndex(i)).div(divisor));
            }
        }
        return depositETH;
    }

    /**
     * Get borrowed balance of a token in the uint of Wei
     */
    // sichaoy: change name to getTotalBorrowInETH()
    function getBorrowETH(
        address _accountAddr
    ) public view returns (uint256 borrowETH) {
        for(uint i = 0; i < globalConfig.tokenInfoRegistry().getCoinLength(); i++) {
            if(isUserHasBorrows(_accountAddr, uint8(i))) {
                address tokenAddress = globalConfig.tokenInfoRegistry().addressFromIndex(i);
                uint divisor = INT_UNIT;
                if(tokenAddress != ETH_ADDR) {
                    divisor = 10 ** uint256(globalConfig.tokenInfoRegistry().getTokenDecimals(tokenAddress));
                }
                borrowETH = borrowETH.add(getBorrowBalanceCurrent(tokenAddress, _accountAddr).mul(globalConfig.tokenInfoRegistry().priceFromIndex(i)).div(divisor));
            }
        }
        return borrowETH;
    }

    /**
	 * Check if the account is liquidatable
     * @param _borrower borrower's account
     * @return true if the account is liquidatable
	 */
    function isAccountLiquidatable(address _borrower) public view returns (bool) {
        uint256 liquidationThreshold = globalConfig.liquidationThreshold();
        uint256 liquidationDiscountRatio = globalConfig.liquidationDiscountRatio();
        uint256 totalBalance = getBorrowETH(_borrower);
        uint256 totalETHValue = getDepositETH(_borrower);
        if (
            totalBalance.mul(100) > totalETHValue.mul(liquidationThreshold) &&
            totalBalance.mul(liquidationDiscountRatio) <= totalETHValue.mul(100)
        ) {
            return true;
        }
        return false;
    }
}
