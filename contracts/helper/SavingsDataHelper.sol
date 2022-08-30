// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.5.14;
pragma experimental ABIEncoderV2;


import "../registry/TokenRegistry.sol";
import "../SavingAccount.sol";
import "../Bank.sol";
import "../Accounts.sol";
import "../config/Constant.sol";
import "../config/GlobalConfig.sol";
import "../claim/claim.sol";


interface IGlobalConfigLocal {
    function savingAccount() external view returns (SavingAccount);
    function tokenRegistry() external view returns (TokenRegistry);
    function bank() external view returns (Bank);
    function accounts() external view returns (Accounts);
}



contract SavingsDataHelper{

    address public constant NATIVE = 0x000000000000000000000000000000000000000E;
    uint256 public constant TO_SIX_DECIMAL = 10**6;

    struct SavingsData {
        HeaderInfo savingsHeaderInfo;
        TokensInfo savingsTokensInfo;
    }

    struct HeaderInfo {
        GlobalConfig globalConfig;
        SavingAccount savingAccount;
        Bank bank;
        Accounts accounts;
        TokenRegistry tokenRegistry;
        Claim claim;
        address finToken;
    } 

    GlobalConfig public globalConfig;
    Claim public claim;


    struct TokensInfo {
        address[] tokens;
        uint8[] index;
        uint8[] decimals;
        bool[] enabled;
        bool[] isSupportedOnCompound;
        address[] cToken;
        address[] chainLinkOracle;
        uint256[] borrowLTV;
        uint256[] price;
        uint256[] depositMiningSpeed;
        uint256[] borrowMiningSpeed;
        // from Bank
        uint256[] totalDeposit;
        uint256[] totalLoans;
        uint256[] totalReserve;
        uint256[] totalCompound;
        uint256[] borrowRatePerBlock;
        uint256[] depositRatePerBlock;
        // APR
        uint256[] depositMiningAPR;
        uint256[] borrowMiningAPR;
    }

    

    // This is to avoid stack too deep related restriction/limitation.

    struct TokenMiningCalcInfo {
    	address token;
    	uint256 tokenPrice;
    	uint256 tokenDecimals;
    	address finToken;
    	uint256 finPrice;
    	uint256 finDecimals;
	uint256 blocksPerYear;
    }

    constructor(GlobalConfig _globalConfig, Claim _claim) public {
    	globalConfig = _globalConfig;
    	claim = _claim;
    }

    function getAllData() view public returns(SavingsData memory data){
        data.savingsHeaderInfo = getSavingsHeaderInfo();
        data.savingsTokensInfo = getAllTokensData();
    } 

    function getSavingsHeaderInfo() view public returns(HeaderInfo memory headerInfo){
    	headerInfo.globalConfig = globalConfig;
    	headerInfo.savingAccount = globalConfig.savingAccount();
    	headerInfo.bank = globalConfig.bank();
    	headerInfo.accounts = globalConfig.accounts();
    	headerInfo.tokenRegistry = globalConfig.tokenInfoRegistry();
    	headerInfo.claim = claim;
    	address finToken = globalConfig.savingAccount().FIN_ADDR();
    	headerInfo.finToken = finToken;
    	return headerInfo;
    }

    function getAllTokensData() public view returns(TokensInfo memory tokensInfo){
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
    	tokensInfo.tokens = tokenRegistry.getTokens();
        uint256 length = tokensInfo.tokens.length;
        tokensInfo.index = new uint8[](length);
        tokensInfo.decimals = new uint8[](length);
        tokensInfo.enabled = new bool[](length);
        tokensInfo.isSupportedOnCompound = new bool[](length);
        tokensInfo.cToken = new address[](length);
        tokensInfo.chainLinkOracle = new address[](length);
        tokensInfo.borrowLTV = new uint256[](length);
        tokensInfo.price = new uint256[](length);
        tokensInfo.depositMiningSpeed = new uint256[](length);
        tokensInfo.borrowMiningSpeed = new uint256[](length);
        tokensInfo.totalDeposit = new uint256[](length);
        tokensInfo.totalLoans = new uint256[](length);
        tokensInfo.totalReserve = new uint256[](length);
        tokensInfo.totalCompound = new uint256[](length);
        tokensInfo.borrowRatePerBlock = new uint256[](length);
        tokensInfo.depositRatePerBlock = new uint256[](length);
        tokensInfo.depositMiningAPR = new uint256[](length);
        tokensInfo.borrowMiningAPR = new uint256[](length);

        for(uint256 i = 0; i<length; i++){
            address token = tokensInfo.tokens[i];
            (
                uint8 index,
                uint8 decimals,
                bool enabled,
                bool isTransferFeeEnabled,
                bool isSupportedOnCompound,
                address cToken,
                address chainLinkOracle,
                uint256 borrowLTV
            ) = tokenRegistry.tokenInfo(token);
            tokensInfo.index[i] = index;
            tokensInfo.decimals[i] = decimals;
            tokensInfo.enabled[i] = enabled;
            tokensInfo.isSupportedOnCompound[i] = isSupportedOnCompound;
            tokensInfo.cToken[i] = cToken;
            tokensInfo.chainLinkOracle[i] = chainLinkOracle;
            tokensInfo.borrowLTV[i] = borrowLTV;
            tokensInfo.price[i] = tokenRegistry.priceFromAddress(token);
            tokensInfo.depositMiningSpeed[i] = tokenRegistry.depositeMiningSpeeds(token);
            tokensInfo.borrowMiningSpeed[i] = tokenRegistry.borrowMiningSpeeds(token);
        }

        Bank bank = globalConfig.bank();

        for(uint256 i = 0; i < length; i++){
            address token = tokensInfo.tokens[i];
            tokensInfo.totalDeposit[i] = bank.getTotalDepositStore(token);
            tokensInfo.totalLoans[i] = bank.totalLoans(token);
            tokensInfo.totalReserve[i] = bank.totalReserve(token);
            tokensInfo.totalCompound[i] = bank.totalCompound(token);
            tokensInfo.borrowRatePerBlock[i] = bank.getBorrowRatePerBlock(token);
            tokensInfo.depositRatePerBlock[i] = bank.getDepositRatePerBlock(token);
            (tokensInfo.depositMiningAPR[i], tokensInfo.borrowMiningAPR[i]) = _calcTokenMiningAPRs(tokensInfo, i);
        }
        return tokensInfo;
    }

    function _calcTokenMiningAPRs(TokensInfo memory tokensInfo, uint256 tokenIdx) private view returns(uint256 depositMiningAPR, uint256 borrowMiningAPR) {
        TokenRegistry tokenRegistry = globalConfig.tokenInfoRegistry();
        SavingAccount savingAccount = globalConfig.savingAccount();
        TokenMiningCalcInfo memory tokenMiningCalcInfo;
        Bank bank = globalConfig.bank();
        uint256 tokenDepositMiningSpeed = tokensInfo.depositMiningSpeed[tokenIdx];
        uint256 tokenBorrowMiningSpeed = tokensInfo.borrowMiningSpeed[tokenIdx];
        if(tokenDepositMiningSpeed == 0 && tokenBorrowMiningSpeed == 0){
            return (0, 0);
        }
        uint256 tokenTotalDeposit = tokensInfo.totalDeposit[tokenIdx];
        uint256 tokenTotalBorrow = tokensInfo.totalLoans[tokenIdx];
        if(tokenTotalDeposit == 0 && tokenTotalBorrow == 0){
            return (0, 0);
        }
        tokenMiningCalcInfo.token = tokensInfo.tokens[tokenIdx];
        tokenMiningCalcInfo.finToken = savingAccount.FIN_ADDR();
        tokenMiningCalcInfo.finPrice = tokenRegistry.priceFromAddress(tokenMiningCalcInfo.finToken);
        tokenMiningCalcInfo.finDecimals = tokenRegistry.getTokenDecimals(tokenMiningCalcInfo.finToken);
        tokenMiningCalcInfo.blocksPerYear = bank.BLOCKS_PER_YEAR();
        tokenMiningCalcInfo.tokenDecimals = (tokenMiningCalcInfo.token == NATIVE)?18:tokensInfo.decimals[tokenIdx];
        tokenMiningCalcInfo.tokenPrice = tokensInfo.price[tokenIdx];
        if(tokenDepositMiningSpeed > 0 && tokenTotalDeposit > 0){
            uint256 perYearDepositMiningValue = (tokenDepositMiningSpeed * tokenMiningCalcInfo.blocksPerYear * tokenMiningCalcInfo.finPrice) / 10**tokenMiningCalcInfo.finDecimals;
            uint256 totalTokenDepositValue = (tokenTotalDeposit * tokenMiningCalcInfo.tokenPrice) / 10**tokenMiningCalcInfo.tokenDecimals;
            depositMiningAPR = perYearDepositMiningValue * 100 * TO_SIX_DECIMAL / totalTokenDepositValue;
        }
        if(tokenBorrowMiningSpeed > 0 && tokenTotalBorrow > 0){
            uint256 perYearBorrowMiningValue = (tokenBorrowMiningSpeed * tokenMiningCalcInfo.blocksPerYear * tokenMiningCalcInfo.finPrice) / 10**tokenMiningCalcInfo.finDecimals;
            uint256 totalTokenBorrowValue = (tokenTotalBorrow * tokenMiningCalcInfo.tokenPrice) / 10**tokenMiningCalcInfo.tokenDecimals;
            borrowMiningAPR = perYearBorrowMiningValue * 100 * TO_SIX_DECIMAL / totalTokenBorrowValue;
        }     

        return (depositMiningAPR, borrowMiningAPR);

    }

}
