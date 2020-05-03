pragma solidity 0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title ERC20 Token Registry
 */
contract TokenRegistry is Ownable {

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    // ERC20 token => isExist
    mapping(address => bool) public tokens;

    /**
     * @dev Constructor
     */
    constructor(address[] memory _tokens) public {
        uint256 len = _tokens.length;
        require(len > 0, "Array is empty");

        for(uint256 i = 0; i < len; i++) {
            addToken(_tokens[i]);
        }
    }

    /**
     * @dev Add a new token to registry
     * @param _token token address
     */
    function addToken(address _token) public onlyOwner {
        require(_token != address(0), "Token address is zero");
        require(tokens[_token] == false, "Token already exist");

        tokens[_token] = true;
        emit TokenAdded(_token);
    }

    /**
     * @dev Remove a token from the registry
     * @param _token token address
     */
    function removeToken(address _token) external onlyOwner {
        require(tokens[_token] == true, "Token not exist");

        tokens[_token] = false;
        emit TokenRemoved(_token);
    }

    /**
     * @dev Is token address is registered
     * @param _token token address
     * @return Returns `true` when token registered, otherwise `false`
     */
    function isTokenExist(address _token) external view returns (bool isExist) {
        isExist = tokens[_token];
    }
}
