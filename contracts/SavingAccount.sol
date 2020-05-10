pragma solidity 0.5.14;

import "./lib/SymbolsLib.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./params/SavingAccountParameters.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "./Base.sol";

contract SavingAccount {
    using SymbolsLib for SymbolsLib.Symbols;
    using Base for Base.BaseVariable;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    SymbolsLib.Symbols symbols;
    Base.BaseVariable baseVariable;

    // TODO all should be in Config contract
    event LogNewProvableQuery(string description);
    event LogNewPriceTicker(string price);

    // TODO This is emergency address to allow withdrawal of funds from the contract
    address payable public constant EMERGENCY_ADDR = 0xc04158f7dB6F9c9fFbD5593236a1a3D69F92167c;
    address public constant ETH_ADDR = 0x000000000000000000000000000000000000000E;

    uint256 ACCURACY = 10**18;
    uint BLOCKS_PER_YEAR = 2102400;
    int BORROW_LTV = 60; //TODO check is this 60%?
    int LIQUIDATE_THREADHOLD = 85;
    int LIQUIDATION_DISCOUNT_RATIO = 95;

    uint COMMUNITY_FUND_RATIO = 10;
    uint256 MIN_RESERVE_RATIO = 10;
    uint256 MAX_RESERVE_RATIO = 20;

    modifier onlyEmergencyAddress() {
        require(msg.sender == EMERGENCY_ADDR, "User not authorized");
        _;
    }

    constructor(
        address[] memory tokenAddresses,
        address[] memory cTokenAddresses,
        address _chainlinkAddress
    )
        public
    {
        SavingAccountParameters params = new SavingAccountParameters();

        //TODO This needs improvement as it could go out of gas
        symbols.initialize(params.tokenNames(), tokenAddresses, _chainlinkAddress);
        baseVariable.initialize(tokenAddresses, cTokenAddresses);
        for(uint i = 0;i < tokenAddresses.length;i++) {
            if(cTokenAddresses[i] != address(0x0) && tokenAddresses[i] != ETH_ADDR) {
                baseVariable.approveAll(tokenAddresses[i]);
            }
        }
    }

	function approveAll(address tokenAddress) public {
		baseVariable.approveAll(tokenAddress);
	}

	//Update borrow rates. borrowRate = 1 + blockChangeValue * rate
	function updateDefinerRate(address tokenAddress) public {
		baseVariable.updateBorrowRate(tokenAddress);
		baseVariable.updateDepositRate(tokenAddress);
	}

	//TODO
	// 	function initialize(string memory ratesURL, string memory tokenNames, address[] memory tokenAddresses) public onlyOwner {
	// 		symbols.initialize(ratesURL, tokenNames, tokenAddresses);
	// 	}

	/**
	 * Gets the total amount of balance that give accountAddr stored in saving pool.
	 */
	function getAccountTotalUsdValue(address accountAddr) public view returns (int256 usdValue) {
		int256 totalUsdValue = 0;
		for(uint i = 0; i < symbols.getCoinLength(); i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			int balance = baseVariable.tokenBalanceAdd(tokenAddress, accountAddr);
			if(balance != 0) {
				totalUsdValue = totalUsdValue.add(
					getTotalUsdValue(tokenAddress, balance, symbols.priceFromIndex(i))
				);
			}
		}
		return totalUsdValue;
	}

	function getTotalUsdValue(address tokenAddress, int256 amount, uint price) public view returns(int) {
		if(tokenAddress == 0x000000000000000000000000000000000000000E) {
			return amount.mul(int(price)).div(10**18);
		} else {
			return amount.mul(int(price)).div(int(10**uint256(IERC20Extended(tokenAddress).decimals())));
		}
	}

	/**
	 * Get the overall state of the saving pool
	 */
	function getMarketState() public view returns (
		address[] memory addresses,
		int256[] memory deposits,
		int256[] memory loans,
		int256[] memory collateral,
		uint256[] memory depositRatePerBlock,
		uint256[] memory borrowRatePerBlock
	)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		deposits = new int256[](coinsLen);
		loans = new int256[](coinsLen);
		collateral = new int256[](coinsLen);
		depositRatePerBlock = new uint256[](coinsLen);
		borrowRatePerBlock = new uint256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			(
			deposits[i],
			loans[i],
			collateral[i],
			depositRatePerBlock[i],
			borrowRatePerBlock[i]
			) = baseVariable.getTokenState(tokenAddress);
		}
		return (addresses, deposits, loans, collateral, depositRatePerBlock, borrowRatePerBlock);
	}

	/*
	 * Get the state of the given token
	 */
	function getTokenState(address tokenAddress) public view returns (
		int256 deposits,
		int256 loans,
		int256 collateral,
		uint256 depositRatePerBlock,
		uint256 borrowRatePerBlock
	)
	{
		return baseVariable.getTokenState(tokenAddress);
	}

	/**
	 * Get all balances for the sender's account
	 */
	function getBalances() public view returns (
		address[] memory addresses,
		int256[] memory totalBalance,
		int256[] memory totalInterest
	)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		totalBalance = new int256[](coinsLen);
		totalInterest = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			(totalBalance[i], totalInterest[i]) = tokenBalanceOfAndInterestOf(tokenAddress);
		}

		return (addresses, totalBalance, totalInterest);
	}

	function getActiveAccounts() public view returns(address[] memory) {
		return baseVariable.getActiveAccounts();
	}

	function getLiquidatableAccounts() public view returns(address[] memory) {
		address[] memory liquidatableAccounts;
		uint returnIdx;
		//TODO `activeAccounts` not getting removed from array.
		//TODO its always increasing. Call to this function needing
		//TODO more gas, however, it will not be charged in ETH.
		//TODO What could be the impact?
		for (uint i = 0; i < baseVariable.getActiveAccounts().length; i++) {
			address targetAddress = baseVariable.getActiveAccounts()[i];
			if (
				baseVariable.totalBalance(targetAddress, symbols, false).mul(-1).mul(100)
				>
				getAccountTotalUsdValue(targetAddress).mul(LIQUIDATE_THREADHOLD)
				&&
				baseVariable.totalBalance(targetAddress, symbols, false).mul(-1)
				.mul(LIQUIDATION_DISCOUNT_RATIO)
				<=
				getAccountTotalUsdValue(targetAddress).mul(100)

			) {
				liquidatableAccounts[returnIdx++] = (targetAddress);
			}
		}
		return liquidatableAccounts;
	}

	function getCoinLength() public view returns(uint256 length){
		return symbols.getCoinLength();
	}

	function tokenBalanceOfAndInterestOf(address tokenAddress) public view returns(
		int256 totalBalance,
		int256 totalInterest
	) {
		return baseVariable.tokenBalanceOfAndInterestOf(tokenAddress, msg.sender);
	}

	function getCoinAddress(uint256 coinIndex) public view returns(address) {
		return symbols.addressFromIndex(coinIndex);
	}

	function getCoinToUsdRate(uint256 coinIndex) public view returns(uint256) {
		return symbols.priceFromIndex(coinIndex);
	}

	function transfer(address activeAccount, address tokenAddress, uint amount) public {
		baseVariable.transfer(activeAccount, tokenAddress, amount, symbols);
	}

	function borrow(address tokenAddress, uint256 amount) public {
		require(
			baseVariable.totalBalance(msg.sender, symbols, false).mul(-1)
			.add(int256(amount.mul(symbols.priceFromAddress(tokenAddress))))
			.mul(100).div(10**18)
			<=
			getAccountTotalUsdValue(msg.sender).mul(BORROW_LTV),
			"Insufficient collateral."
		);
		baseVariable.borrow(tokenAddress, amount);
		send(msg.sender, amount, tokenAddress);
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		receive(msg.sender, amount, tokenAddress);
		uint money = uint(baseVariable.repay(tokenAddress, msg.sender, amount));
		if(money != 0) {
			send(msg.sender, money, tokenAddress);
		}
	}
	/**
	 * Deposit the amount of tokenAddress to the saving pool.
	 */
	function depositToken(address tokenAddress, uint256 amount) public payable {
		receive(msg.sender, amount, tokenAddress);
		baseVariable.depositToken(tokenAddress, amount);
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public {
		uint _amount = baseVariable.withdrawToken(tokenAddress, amount);
		send(msg.sender, _amount, tokenAddress);
	}

	function withdrawAllToken(address tokenAddress) public {
		uint amount = baseVariable.withdrawAllToken(tokenAddress);
		send(msg.sender, amount, tokenAddress);
	}

	function liquidate(address targetAccountAddr, address targetTokenAddress) public payable {
		int totalBorrow = baseVariable.totalBalance(targetAccountAddr, symbols, false).mul(-1);
		int totalCollateral = baseVariable.totalBalance(targetAccountAddr, symbols, true);

		//是否满足清算下限
		require(
			totalBorrow.mul(100) > totalCollateral.mul(LIQUIDATE_THREADHOLD),
			"The ratio of borrowed money and collateral must be larger than 95% in order to be liquidated."
		);

		//是否满足清算上限
		require(
			totalBorrow.mul(100) <= totalCollateral.mul(LIQUIDATION_DISCOUNT_RATIO),
			"Collateral is not sufficient to be liquidated."
		);

		//被清算者需要清算掉的资产
		uint liquidationDebtValue = uint(
			totalBorrow.sub(totalCollateral.mul(BORROW_LTV)).div(LIQUIDATION_DISCOUNT_RATIO - BORROW_LTV)
		);
		//清算者需要付的钱
		uint paymentOfLiquidationAmount = uint(baseVariable.tokenBalanceAdd(targetTokenAddress, msg.sender));

		if(paymentOfLiquidationAmount < liquidationDebtValue) {
			liquidationDebtValue = paymentOfLiquidationAmount.mul(100).div(uint(LIQUIDATION_DISCOUNT_RATIO));
		}

		for(uint i = 0; i < getCoinLength(); i++) {
			address[] memory addr;
			uint[] memory u;
			addr[0] = targetAccountAddr;
			addr[1] = targetTokenAddress;
			addr[2] = symbols.addressFromIndex(i);
			u[0] = symbols.priceFromAddress(targetTokenAddress);
			u[1] = symbols.priceFromIndex(i);
			u[2] = liquidationDebtValue;
			(uint _liquidationDebtValue) = baseVariable.liquidate(
				addr, u
			);
			if(_liquidationDebtValue == 0){
				break;
			} else {
				liquidationDebtValue = _liquidationDebtValue;
			}
		}
	}

	function recycleCommunityFund(address tokenAddress) public {
		baseVariable.recycleCommunityFund(tokenAddress);
	}

	function setDeFinerCommunityFund(address payable _DeFinerCommunityFund) public {
		baseVariable.setDeFinerCommunityFund(_DeFinerCommunityFund);
	}

	function getDeFinerCommunityFund(address tokenAddress) public view returns(int256) {
		return baseVariable.getDeFinerCommunityFund(tokenAddress);
	}

	function receive(address from, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			require(msg.value == amount, "The amount is not sent from address.");
		} else {
			//When only tokens received, msg.value must be 0
			require(msg.value == 0, "msg.value must be 0 when receiving tokens");
			IERC20(tokenAddress).safeTransferFrom(from, address(this), amount);
		}
	}

	function send(address to, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			//TODO need to check for re-entrancy security attack
			//TODO Can this ETH be received by a contract?
			msg.sender.transfer(amount);
		} else {
			IERC20(tokenAddress).safeTransfer(to, amount);
		}
	}


    // ============================================
    // EMERGENCY WITHDRAWAL FUNCTIONS
    // TODO Needs to be removed when final version deployed
    // ============================================
    function emergencyWithdraw(address _token) external onlyEmergencyAddress {
        if(_token == ETH_ADDR) {
            EMERGENCY_ADDR.transfer(address(this).balance);
        } else {
            uint256 amount = IERC20(_token).balanceOf(address(this));
            require(IERC20(_token).transfer(EMERGENCY_ADDR, amount), "transfer failed");
        }
    }

    function emergencyRedeem(address _cToken, uint256 _amount) external onlyEmergencyAddress {
        ICToken(_cToken).redeem(_amount);
    }

    function emergencyRedeemUnderlying(address _cToken, uint256 _amount) external onlyEmergencyAddress {
        ICToken(_cToken).redeemUnderlying(_amount);
    }
}

interface IERC20Extended {
    function decimals() external view returns (uint8);
}