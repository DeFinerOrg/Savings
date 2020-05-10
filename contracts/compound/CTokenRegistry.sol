pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Compound cToken Registry to maintain Token to cToken mapping
 */
contract CTokenRegistry is Ownable {

    event CTokenAdded(address indexed token, address cToken);
    event CTokenRemoved(address indexed token);

    // ERC20 => cToken
    mapping(address => address) public cTokens;

    // TODO remove this once dependecy is removed
    address[] public cTokensList;

    /**
     * @dev Constructor
     * @param _tokens Array containing token addresses
     * @param _cTokens Array containing cToken addresses
     */
    constructor(address[] memory _tokens, address[] memory _cTokens) public {
        cTokensList = _cTokens;
        uint256 tokensLen = _tokens.length;
        require(tokensLen > 0, "Array length is zero");
        require(tokensLen == _cTokens.length, "Array lenght does not match");

        for(uint256 i = 0; i < tokensLen; i++) {
            addToken(_tokens[i], _cTokens[i]);
        }
    }

    /**
     * @dev Add a new new Token to cToken address pair. Only Owner can add a pair.
     * @param _token ERC20 Token address
     * @param _cToken cToken address
     */
    function addToken(address _token, address _cToken) public onlyOwner {
        require(_token != address(0), "Token address is zero");
        require(_cToken != address(0), "cToken address is zero");

        require(cTokens[_token] == address(0), "Token already exist");
        cTokens[_token] = _cToken;
        emit CTokenAdded(_token, _cToken);
    }

    /**
     * @dev Remove a cToken from the registry. Only Owner can remove token pair.
     * @param _token ERC20 token address
     */
    function removeToken(address _token) external onlyOwner {
        require(_token != address(0), "Token address is zero");
        require(cTokens[_token] != address(0), "cToken not exist");

        delete cTokens[_token];
        emit CTokenRemoved(_token);
    }

    /**
     * @dev Get cToken address of the corrsponding ERC20 token
     * @param _token ERC20 token address
     * @return cToken Returns cToken address
     */
    function getCToken(address _token) external view returns (address cToken) {
        cToken = cTokens[_token];
    }

    /**
     * @dev cToken address is registered or not
     * @param _token ERC20 token address
     * @return Returns `true` when cToken registered, otherwise `false`
     */
    function isTokenExist(address _token) external view returns (bool isExist) {
        isExist = cTokens[_token] != address(0);
    }

    function getCTokensList() external view returns (address[] memory) {
        return cTokensList;
    }
}
