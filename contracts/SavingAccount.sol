// Copyright DeFiner Inc. 2018-2020

pragma solidity >= 0.5.0 < 0.6.0;

import "./external/provableAPI.sol";
import "./external/strings.sol";
import "./lib/TokenInfoLib.sol";
import "./lib/SymbolsLib.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./params/SavingAccountParameters.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";

interface CToken {
	function supplyRatePerBlock() external view returns (uint);
	function borrowRatePerBlock() external view returns (uint);
}

contract SavingAccount is Ownable, usingProvable {
	using TokenInfoLib for TokenInfoLib.TokenInfo;
	using SymbolsLib for SymbolsLib.Symbols;
	using SafeMath for uint256;
	using SignedSafeMath for int256;

	struct Account {
		// Note, it's best practice to use functions minusAmount, addAmount, totalAmount 
		// to operate tokenInfos instead of changing it directly.
		//翻译：请注意，这是最好的做法是使用功能减额，增加金额，总金额直接改变它的操作令牌的相关信息来代替。
		mapping(address => TokenInfoLib.TokenInfo) tokenInfos;
		bool active;
	}

	mapping(address => Account) accounts;
	mapping(address => int256) totalDeposits;
	mapping(address => int256) totalLoans;
	mapping(address => int256) totalCollateral;
	mapping(address => address) cTokenAddress;
	mapping(address => mapping(uint => uint)) depositRateRecord;
	mapping(address => mapping(uint => uint)) borrowRateRecord;
	mapping(address => uint) depositRateLastModifiedBlockNumber;
	mapping(address => uint) borrowRateLastModifiedBlockNumber;

	address[] activeAccounts;

	SymbolsLib.Symbols symbols;

	event LogNewProvableQuery(string description);
	event LogNewPriceTicker(string price);
	int256 BASE = 10**6;//精度
	uint256 ACCURACY = 10**18;
	uint256 CAPITAL_COMPOUND_Ratio = 0;	// Assume
	uint BLOCKS_PER_YEAR = 2102400;
	int BORROW_LTV = 60; //TODO check is this 60%?
	int LIQUIDATE_THREADHOLD = 85;
	int LIQUIDATION_DISCOUNT_RATIO = 95;
	uint COMMUNITY_FUND_RATIO = 10;
	address payable DeFinerCommunityFund;

	constructor() public {
		SavingAccountParameters params = new SavingAccountParameters();
		address[] memory tokenAddresses = params.getTokenAddresses();
		//TODO This needs improvement as it could go out of gas
		symbols.initialize(params.ratesURL(), params.tokenNames(), tokenAddresses);
		cTokenAddress[tokenAddresses[0]] = 0xd6801a1DfFCd0a410336Ef88DeF4320D6DF1883e; //ETH
		cTokenAddress[tokenAddresses[1]] = 0x6D7F0754FFeb405d23C51CE938289d4835bE3b14; //DAI
	}

	//Get compound deposit rate. The scale is 10 ** 18
	function getCompoundSupplyRatePerBlock(address _cTokenAddress) public view returns(uint) {
		CToken cToken = CToken(_cTokenAddress);
		return cToken.supplyRatePerBlock();
	}

	//Get compound borrowing interest rate. The scale is 10 ** 18
	function getCompoundBorrowRatePerBlock(address _cTokenAddress) public view returns(uint) {
		CToken cToken = CToken(_cTokenAddress);
		return cToken.borrowRatePerBlock();
	}

	//Get the borrowing interest rate Borrowing interest rate.
	//(compound deposit rate + compound borrowing rate) / 2. The scaling is 10 ** 18
	function getBorrowRatePerBlock(address tokenAddress) public view returns(uint borrowRatePerBlock) {
		if(cTokenAddress[tokenAddress] == address(0)){
			return 0;
		} else {
			return getCompoundSupplyRatePerBlock(cTokenAddress[tokenAddress])
			.add(getCompoundBorrowRatePerBlock(cTokenAddress[tokenAddress])).div(2);
		}
	}

	//Get Deposit Rate.  Deposit APR = (Borrow APR * Utilization Rate (U) +  Compound Supply Rate *
	//Capital Compound Ratio (C) )* (1- DeFiner Community Fund Ratio (D)). The scaling is 10 ** 18
	function getDepositRatePerBlock(address tokenAddress) public view returns(uint depositAPR) {
		uint d1 = getBorrowRatePerBlock(tokenAddress).mul(getCapitalUtilizationRate(tokenAddress).div(100));
		uint d2 = getCompoundSupplyRatePerBlock(cTokenAddress[tokenAddress]).mul(CAPITAL_COMPOUND_Ratio).div(100);
		return d1.add(d2).mul(100-COMMUNITY_FUND_RATIO);
	}

	//Get capital utilization. 2.	Capital Utilization Rate (U )= total loan outstanding / Total market deposit
	//The scaling is 10 ** 18
	function getCapitalUtilizationRate(address tokenAddress) public view returns(uint capitalUtilizationRate) {
		return uint(totalLoans[tokenAddress].div(totalDeposits[tokenAddress]).mul(100));
	}

	//Update Deposit Rate. depositRate = 1 + blockChangeValue * rate
	function updateDepositRate(address tokenAddress, uint blockNumber) public {
		if(depositRateLastModifiedBlockNumber[tokenAddress] == 0) {
			depositRateRecord[tokenAddress][blockNumber] = ACCURACY.add(getDepositRatePerBlock(tokenAddress));
			depositRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
		} else {
			depositRateRecord[tokenAddress][blockNumber] =
			depositRateRecord[tokenAddress][depositRateLastModifiedBlockNumber[tokenAddress]]
			.mul(ACCURACY.add(blockNumber
			.sub(depositRateLastModifiedBlockNumber[tokenAddress]).mul(getDepositRatePerBlock(tokenAddress))))
			.div(ACCURACY);
			depositRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
		}
	}

	//Update borrow rates. borrowRate = 1 + blockChangeValue * rate
	function updateBorrowRate(address tokenAddress, uint blockNumber) public {
		if(borrowRateLastModifiedBlockNumber[tokenAddress] == 0) {
			borrowRateRecord[tokenAddress][blockNumber] = ACCURACY.add(getBorrowRatePerBlock(tokenAddress));
			borrowRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
		} else {
			borrowRateRecord[tokenAddress][blockNumber] =
			borrowRateRecord[tokenAddress][borrowRateLastModifiedBlockNumber[tokenAddress]]
			.mul(ACCURACY.add(blockNumber
			.sub(borrowRateLastModifiedBlockNumber[tokenAddress]).mul(getBorrowRatePerBlock(tokenAddress))))
			.div(ACCURACY);
			borrowRateLastModifiedBlockNumber[tokenAddress] = blockNumber;
		}
	}

	//Get the current block height.
	function getBlockNumber() internal view returns (uint256) {
		return block.number;
	}

	//Get the deposit rate of the block interval.
	function getBlockIntervalDepositRate(
		address tokenAddress,
		TokenInfoLib.TokenInfo storage tokenInfo
	) internal view returns (uint256) {
		if (depositRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()] == 0) {
			return 0;
		} else {
			return depositRateRecord[tokenAddress][getBlockNumber()].div(depositRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()]);
		}
	}

	//Get the borrowing rate of the block interval
	function getBlockIntervalBorrowRate(
		address tokenAddress,
		TokenInfoLib.TokenInfo storage tokenInfo
	) internal view returns (uint256) {
		if (borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()] == 0) {
			return 0;
		} else {
			return borrowRateRecord[tokenAddress][getBlockNumber()].div(borrowRateRecord[tokenAddress][tokenInfo.getStartBlockNumber()]);
		}
	}

	//TODO
	// 	function initialize(string memory ratesURL, string memory tokenNames, address[] memory tokenAddresses) public onlyOwner {
	// 		symbols.initialize(ratesURL, tokenNames, tokenAddresses);
	// 	}

	/** 
	 * Gets the total amount of balance that give accountAddr stored in saving pool.
	 */
	function getAccountTotalUsdValue(address accountAddr) public view returns (int256 usdValue) {
		return getAccountTotalUsdValue(accountAddr, true).add(getAccountTotalUsdValue(accountAddr, false));
	}

	function getAccountTotalUsdValue(address accountAddr, bool isPositive) private view returns (int256 usdValue){
		int256 totalUsdValue = 0;
		for(uint i = 0; i < getCoinLength(); i++) {

			uint DRate = getBlockIntervalDepositRate(symbols.addressFromIndex(i), accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)]);

			uint BRate = getBlockIntervalBorrowRate(symbols.addressFromIndex(i), accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)]);

			if (isPositive && accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(getBlockNumber(), DRate) >= 0) {
				totalUsdValue = totalUsdValue.add(
					accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(getBlockNumber(), DRate)
					.mul(int256(symbols.priceFromIndex(i)))
					.div(BASE)
				);
			}
			if (!isPositive && accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(getBlockNumber(), BRate) < 0) {
				totalUsdValue = totalUsdValue.add(
					accounts[accountAddr].tokenInfos[symbols.addressFromIndex(i)].totalAmount(getBlockNumber(), BRate)
					.mul(int256(symbols.priceFromIndex(i)))
					.div(BASE)
				);
			}
		}
		return totalUsdValue;
	}

	/** 
	 * Get the overall state of the saving pool
	 */
	function getMarketState() public view returns (
		address[] memory addresses,
		int256[] memory deposits,
		int256[] memory loans,
		int256[] memory collateral)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		deposits = new int256[](coinsLen);
		loans = new int256[](coinsLen);
		collateral = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			deposits[i] = totalDeposits[tokenAddress];
			loans[i] = totalLoans[tokenAddress];
			collateral[i] = totalCollateral[tokenAddress];
		}

		return (addresses, deposits, loans, collateral);
	}

	/*
	 * Get the state of the given token
	 */
	function getTokenState(address tokenAddress) public view returns (int256 deposits, int256 loans, int256 collateral)
	{
		return (totalDeposits[tokenAddress], totalLoans[tokenAddress], totalCollateral[tokenAddress]);
	}

	/** 
	 * Get all balances for the sender's account
	 */
	function getBalances() public view returns (address[] memory addresses, int256[] memory balances)
	{
		uint coinsLen = getCoinLength();

		addresses = new address[](coinsLen);
		balances = new int256[](coinsLen);

		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			addresses[i] = tokenAddress;
			balances[i] = tokenBalanceOf(tokenAddress);
		}

		return (addresses, balances);
	}

	function getActiveAccounts() public view returns (address[] memory) {
		return activeAccounts;
	}

	function getLiquidatableAccounts() public view returns (address[] memory) {
		address[] memory liquidatableAccounts;
		uint returnIdx;
		//TODO `activeAccounts` not getting removed from array.
		//TODO its always increasing. Call to this function needing
		//TODO more gas, however, it will not be charged in ETH.
		//TODO What could be the impact? 
		for (uint i = 0; i < activeAccounts.length; i++) {
			address targetAddress = activeAccounts[i];
			if (
				int256(getAccountTotalUsdValue(targetAddress, false).mul(-1)).mul(100)
				>
				getAccountTotalUsdValue(targetAddress, true).mul(LIQUIDATE_THREADHOLD)
				&&
				int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
				.mul(LIQUIDATION_DISCOUNT_RATIO)
				<=
				getAccountTotalUsdValue(targetAddress, true).mul(100)

			) {
				liquidatableAccounts[returnIdx++] = (targetAddress);
			}
		}
		return liquidatableAccounts;
	}

	function getCoinLength() public view returns (uint256 length){
		return symbols.getCoinLength();
	}

	function tokenBalanceOf(address tokenAddress) public view returns (int256 amount) {
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];
		if(tokenInfo.getCurrentTotalAmount() >= 0) {
			uint rate = getBlockIntervalDepositRate(tokenAddress, tokenInfo);
			return tokenInfo.totalAmount(getBlockNumber(), rate);
		} else {
			uint rate = getBlockIntervalBorrowRate(tokenAddress, tokenInfo);
			return tokenInfo.totalAmount(getBlockNumber(), rate);
		}
	}

	function getCoinAddress(uint256 coinIndex) public view returns (address) {
		return symbols.addressFromIndex(coinIndex);
	}

	function getCoinToUsdRate(uint256 coinIndex) public view returns(uint256) {
		return symbols.priceFromIndex(coinIndex);
	}

	function borrow(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].active, "Account not active, please deposit first.");
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		uint rate = getBlockIntervalDepositRate(tokenAddress,tokenInfo);

		require(tokenInfo.totalAmount(getBlockNumber(), rate) < int256(amount), "Borrow amount less than available balance, please use withdraw instead.");
		require(
			(
			int256(getAccountTotalUsdValue(msg.sender, false) * -1)
			.add(int256(amount.mul(symbols.priceFromAddress(tokenAddress))))
			.div(BASE)
			).mul(100)
			<=
			(getAccountTotalUsdValue(msg.sender, true)).mul(BORROW_LTV),
			"Insufficient collateral.");

		tokenInfo.minusAmount(amount, rate, getBlockNumber());
		totalLoans[tokenAddress] = totalLoans[tokenAddress].add(int256(amount));
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int256(amount));

		send(msg.sender, amount, tokenAddress);
		updateDepositRate(tokenAddress, getBlockNumber());
	}

	function repay(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].active, "Account not active, please deposit first.");
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		uint rate = getBlockIntervalBorrowRate(tokenAddress,tokenInfo);

		int256 amountOwedWithInterest = tokenInfo.totalAmount(getBlockNumber(), rate);
		require(amountOwedWithInterest <= 0, "Balance of the token must be negative. To deposit balance, please use deposit button.");

		int256 amountBorrowed = tokenInfo.totalAmount(getBlockNumber(), rate).mul(-1); // get the actual amount that was borrowed (abs)
		int256 amountToRepay = int256(amount);
		tokenInfo.addAmount(amount, rate, getBlockNumber());

		// check if paying interest
		if (amountToRepay > amountBorrowed) {
			// add interest (if any) to total deposit
			totalDeposits[tokenAddress] = totalDeposits[tokenAddress].add(amountToRepay.sub(amountBorrowed));
			// loan are reduced by amount payed
			totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(amountBorrowed);
		}
		else {
			// loan are reduced by amount payed
			totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(amountToRepay);
		}

		// collateral increased by amount payed  
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(amountToRepay);

		receive(msg.sender, amount, tokenAddress);
		updateDepositRate(tokenAddress, getBlockNumber());
	}

	/** 
	 * Deposit the amount of tokenAddress to the saving pool.
	 */
	function depositToken(address tokenAddress, uint256 amount) public payable {
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];
		if (!accounts[msg.sender].active) {
			accounts[msg.sender].active = true;
			activeAccounts.push(msg.sender);
		}

		int256 currentBalance = tokenInfo.getCurrentTotalAmount();

		require(currentBalance >= 0,
			"Balance of the token must be zero or positive. To pay negative balance, please use repay button.");

		uint rate = getBlockIntervalDepositRate(tokenAddress,tokenInfo);

		// deposited amount is new balance after addAmount minus previous balance
		int256 depositedAmount = tokenInfo.addAmount(amount, rate, getBlockNumber()) - currentBalance;
		totalDeposits[tokenAddress] = totalDeposits[tokenAddress].add(depositedAmount);
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(depositedAmount);

		receive(msg.sender, amount, tokenAddress);
		updateDepositRate(tokenAddress, getBlockNumber());
	}

	/**
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest
	 * will be deducted first.
	 */
	function withdrawToken(address tokenAddress, uint256 amount) public payable {
		require(accounts[msg.sender].active, "Account not active, please deposit first.");
		TokenInfoLib.TokenInfo storage tokenInfo = accounts[msg.sender].tokenInfos[tokenAddress];

		uint rate = getBlockIntervalDepositRate(tokenAddress,tokenInfo);

		require(tokenInfo.totalAmount(getBlockNumber(), rate) >= int256(amount), "Insufficient balance.");
		// 		require(int256(getAccountTotalUsdValue(msg.sender, false) * -1) * 100 <= (getAccountTotalUsdValue(msg.sender, true) - int256(amount.mul(symbols.priceFromAddress(tokenAddress))) / BASE) * BORROW_LTV);
		if(tokenInfo.viewInterest(getBlockNumber(), rate) > 0) {
			int256 _money = tokenInfo.viewInterest(getBlockNumber(), rate).mul(int256(amount).div(tokenInfo.getCurrentTotalAmount().sub(tokenInfo.viewInterest(getBlockNumber(), rate)))).div(10);
			tokenInfo.updateInterest(_money);
			payCommunityFund(_money);
		}
		tokenInfo.minusAmount(amount, rate, getBlockNumber());
		totalDeposits[tokenAddress] = totalDeposits[tokenAddress].sub(int256(amount));
		totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int256(amount));

		send(msg.sender, amount, tokenAddress);
		updateDepositRate(tokenAddress, getBlockNumber());
	}

	function liquidate(address targetAddress, uint256 amount) public payable {
		require(
			int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
			.mul(100)
			>
			getAccountTotalUsdValue(targetAddress, true).mul(LIQUIDATE_THREADHOLD),
			"The ratio of borrowed money and collateral must be larger than 95% in order to be liquidated.");

		require(
			int256(getAccountTotalUsdValue(targetAddress, false).mul(-1))
			.mul(LIQUIDATION_DISCOUNT_RATIO)
			<=
			getAccountTotalUsdValue(targetAddress, true).mul(100),
			"Collateral is not sufficient to be liquidated."
		);

		if (symbols.isEth(tokenAddress)) {
			require(msg.value > 0, "支付金额必须大于0");
		} else {
			require(msg.value == 0, "支付金额必须等于0");
			require(amount > 0, "Token transfer failed");
		}

		//计算维持到之前的借款比例需要清算多少抵押资产
		int totalBorrow = int256(getAccountTotalUsdValue(targetAddress, false).mul(-1));
		int totalMortgage = int256(getAccountTotalUsdValue(targetAddress, true));
		int minimumAmountDue = LIQUIDATION_DISCOUNT_RATIO.mul(totalBorrow)
								.sub(BORROW_LTV.div(LIQUIDATION_DISCOUNT_RATIO).mul(totalMortgage))
								.div(LIQUIDATION_DISCOUNT_RATIO.sub(BORROW_LTV));
		uint a1 = uint(minimumAmountDue);
		uint a2 = uint(minimumAmountDue);

		uint coinsLen = getCoinLength();
		for (uint i = 0; i < coinsLen; i++) {
			address tokenAddress = symbols.addressFromIndex(i);
			TokenInfoLib.TokenInfo storage tokenInfo = accounts[targetAddress].tokenInfos[tokenAddress];
			if(tokenInfo.getCurrentTotalAmount() >= 0 && a1 > 0) {
				uint rate = getBlockIntervalDepositRate(tokenAddress, tokenInfo);
				uint256 totalAmount = uint(tokenInfo.totalAmount(getBlockNumber(), rate).mul(int256(symbols.priceFromIndex(i))));
				if(a1 >= totalAmount) {
					uint _totalAmount = uint(totalAmount.div(symbols.priceFromIndex(i)));
					tokenInfo.minusAmount(_totalAmount, rate, getBlockNumber());
					totalDeposits[tokenAddress] = totalDeposits[tokenAddress].sub(int256(_totalAmount));
					totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int256(_totalAmount));
					send(msg.sender, _totalAmount, tokenAddress);
					updateDepositRate(tokenAddress, getBlockNumber());
					a1 = a1.sub(_totalAmount);
				} else {
					tokenInfo.minusAmount(a1, rate, getBlockNumber());
					totalDeposits[tokenAddress] = totalDeposits[tokenAddress].sub(int256(a1));
					totalCollateral[tokenAddress] = totalCollateral[tokenAddress].sub(int256(a1));
					send(msg.sender, a1, tokenAddress);
					updateDepositRate(tokenAddress, getBlockNumber());
					a1 = 0;
				}
			} else if(tokenInfo.getCurrentTotalAmount() < 0 && a2 > 0) {
				uint rate = getBlockIntervalBorrowRate(tokenAddress, tokenInfo);
				int256 totalAmount = tokenInfo.totalAmount(getBlockNumber(), rate).mul(int256(symbols.priceFromIndex(i)));

				uint256 _totalAmount = totalAmount > 0 ? uint256(totalAmount) : uint256(-totalAmount);
				if(a2 >= _totalAmount) {
					tokenInfo.addAmount(_totalAmount, rate, getBlockNumber());
					// check if paying interest
					if (amountToRepay > amountBorrowed) {
						// add interest (if any) to total deposit
						totalDeposits[tokenAddress] = totalDeposits[tokenAddress].add(amountToRepay.sub(amountBorrowed));
						// loan are reduced by amount payed
						totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(amountBorrowed);
					} else {
						// loan are reduced by amount payed
						totalLoans[tokenAddress] = totalLoans[tokenAddress].sub(amountToRepay);
					}
					// collateral increased by amount payed
					totalCollateral[tokenAddress] = totalCollateral[tokenAddress].add(amountToRepay);
					receive(msg.sender, amount, tokenAddress);
					updateDepositRate(tokenAddress, getBlockNumber());
					a2 = a2.sub(uint256(-totalAmount));
				} else {
					//TODO uint256(-totalAmount) this will underflow - Critical Security Issue
					//TODO what is the reason for doing this???
					//receive(msg.sender, uint256(-totalAmount), tokenAddress);
					repay(tokenAddress, a2);
					a2 = 0;
				}
			}
			updateDepositRate(tokenAddress, getBlockNumber());
		}
	}

	function receive(address from, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			require(msg.value == amount, "The amount is not sent from address.");
		} else {
			//When only tokens received, msg.value must be 0
			require(msg.value == 0, "msg.value must be 0 when receiving tokens");
			require(IERC20(tokenAddress).transferFrom(from, address(this), amount), "Token transfer failed");
		}
	}

	function send(address to, uint256 amount, address tokenAddress) private {
		if (symbols.isEth(tokenAddress)) {
			//TODO need to check for re-entrancy security attack
			//TODO Can this ETH be received by a contract?
			msg.sender.transfer(amount);
		} else {
			require(IERC20(tokenAddress).transfer(to, amount), "Token transfer failed");
		}
	}

	function payCommunityFund(int256 money) private {
		DeFinerCommunityFund.transfer(uint256(money));
	}

	function setDeFinerCommunityFund(address payable _DeFinerCommunityFund) public {
		DeFinerCommunityFund = _DeFinerCommunityFund;
	}

	/** 
	 * Callback function which is used to parse query the oracle. Once 
	 * parsed results from oracle, it will recursively call oracle for data.
	 **/
	function __callback(bytes32,  string memory result) public {
		require(msg.sender == provable_cbAddress(), "Unauthorized address");
		emit LogNewPriceTicker(result);
		symbols.parseRates(result);
		// updatePrice(30 * 60); // Call from external
		updatePrice();
	}

	// Customized gas limit for querying oracle. That's because the function 
	// symbols.parseRates() is heavy and need more gas.
	//TODO This should not be hard-coded as Ethereum keeps changing gas
	//TODO consumption of opcodes. It should be configurable.
	uint constant CUSTOM_GAS_LIMIT = 6000000;

	/** 
	 * Update coins price every 30 mins. The contract must have enough gas fee.
	 翻译：更新硬币价格每30分钟一班。 该合同必须有足够的天然气费用。
	 */
	function updatePriceWithDelay(uint256 delaySeconds) public payable {
		//TODO address(this).balance this should be avoided for security reasons
		if (provable_getPrice("URL", CUSTOM_GAS_LIMIT) > address(this).balance) {
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee!");
		} else {
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
			provable_query(delaySeconds, "URL", symbols.ratesURL, CUSTOM_GAS_LIMIT);
		}
	}

	// Manually Update Price
	function updatePrice() public payable {
		if (provable_getPrice("URL") > address(this).balance) {
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee");
		} else {
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer..");
			provable_query("URL", symbols.ratesURL);
		}
	}

	// Make the contract payable so that the contract will have enough gass fee 
	// to query oracle. 
	function() external payable {}
}
