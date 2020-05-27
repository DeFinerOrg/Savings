pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @dev Token Info Registry to manage Token information
 *      The Owner of the contract allowed to update the information
 */
contract TokenInfoRegistry is Ownable {

    using SafeMath for uint256;

    /**
     * @dev TokenInfo struct stores Token Information, this includes:
     *      ERC20 Token address, Compound Token address, ChainLink Aggregator address etc.
     * @notice This struct will consume 2 storage locations
     */
    struct TokenInfo {
        // ERC20 Token Info
        // ===================
        // ERC20 Token decimal
        uint8 decimals;
        // Is ERC20 token charge transfer fee? For example USDT
        bool isTransferFeeEnabled;

        // Compound Token
        // ================
        // Is Token supported on Compound
        bool isSupportedOnCompound;
        // cToken address on Compound
        address cToken;

        // ChainLinkOracle
        // ================
        // Chain Link Oracle's Aggregator address for TOKEN/ETH pair name. Example "DAI/ETH"
        address chainLinkAggregator;
    }

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event TokenUpdated(address indexed token);

    mapping (address => TokenInfo) public tokenInfo;

    address[] public tokens;

    /**
     */
    modifier whenTokenExists(address _token) {
        require(isTokenExist(_token), "Token not exists");
        _;
    }

    /**
     * @dev Add a new token to registry
     * @param _token token address
     * @param _decimals
     * @param _isTransferFeeEnabled
     * @param _isSupportedOnCompound
     * @param _cToken
     * @param _chainLinkAggregator
     */
    function addToken(
        address _token,
        uint8 _decimals,
        bool _isTransferFeeEnabled,
        bool _isSupportedOnCompound,
        address _cToken,
        address _chainLinkAggregator

    )
        public
        onlyOwner
    {
        require(_token != address(0), "Token address is zero");
        require(!isTokenExist(_token), "Token already exist");
        require(_chainLinkAggregator != address(0), "ChainLinkAggregator address is zero");

        TokenInfo storage storageTokenInfo = tokenInfo[_token];
        storageTokenInfo.decimals = _decimals;
        storageTokenInfo.isTransferFeeEnabled = _isTransferFeeEnabled;
        storageTokenInfo.isSupportedOnCompound = _isSupportedOnCompound;
        storageTokenInfo.cToken = _cToken;
        storageTokenInfo.chainLinkAggregator = _chainLinkAggregator;

        tokens.push(_token);
        emit TokenAdded(_token);
    }

    /**
     */
    function updateTokenTransferFeeFlag(
        address _token,
        bool _isTransfeFeeEnabled
    )
        external
        onlyOwner
        whenTokenExists(_token)
    {
        tokenInfo[_token].isTransferFeeEnabled = _isTransfeFeeEnabled;
        emit TokenUpdated(_token);
    }

    /**
     */
    function updateTokenSupportedOnCompoundFlag(
        address _token,
        bool _isSupportedOnCompound
    )
        external
        onlyOwner
        whenTokenExists(_token)
    {
        tokenInfo[_token].isSupportedOnCompound = _isSupportedOnCompound;
        emit TokenUpdated(_token);
    }

    /**
     */
    function updateCToken(
        address _token,
        address _cToken
    )
        external
        onlyOwner
        whenTokenExists(_token)
    {
        tokenInfo[_token].cToken = _cToken;
        emit TokenUpdated(_token);
    }

    /**
     */
    function updateChainLinkAggregator(
        address _token,
        address _chainLinkAggregator
    )
        external
        onlyOwner
        whenTokenExists(_token)
    {
        tokenInfo[_token].chainLinkAggregator = _chainLinkAggregator;
        emit TokenUpdated(_token);
    }


    /**
     * @dev Remove a token from the token registry
     * @param _token Token address to remove
     * @param _index Index location of the token in tokens array
     */
    function removeToken(address _token, uint8 _index) external onlyOwner {
        require(isTokenExist(_token), "Token not exist");
        require(tokens[_index] == _token, "Token address and index not matched");

        delete tokenInfo[_token];

        uint256 lastIndex = tokens.length.sub(1);
        // When element to be removed is not the last element in array, then move the element first
        // Otherwise, when its the last element, just do pop()
        if(_index != lastIndex) {
            tokens[_index] = tokens[lastIndex];
        }
        tokens.pop();

        emit TokenRemoved(_token);
    }

    /**
     * @dev Is token address is registered
     * @param _token token address
     * @return Returns `true` when token registered, otherwise `false`
     */
    function isTokenExist(address _token) public view returns (bool isExist) {
        isExist = tokenInfo[_token].chainLinkAggregator != address(0);
    }

    function getTokens() external view returns (address[] memory) {
        return tokens;
    }

    // ===================================
    //      Compound Token Info
    // ===================================

    /**
     */
    function getCToken(address _token) external view returns (address cToken) {
        cToken = tokenInfo[_token].cToken;
    }

    /**
     */
    function getCTokens() external view returns (address[] memory cTokens) {
        uint256 len = tokens.length;
        cTokens = new address[](len);
        for(uint256 i = 0; i < len; i++) {
            cTokens[i] = tokenInfo[tokens[i]].cToken;
        }
    }

    // ===================================
    //      Chain Link Aggregator
    // ===================================
}