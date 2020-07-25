pragma solidity 0.5.14;

contract MockCToken {

//from CERC20.sol, other functions from CETHER.sol
// provide ERC20 functions, seperate sections for erc20, Cether, erc20 + cether, 
// 1. CERC20.sol
// 2. CETHER.sol
// 3. CERC20 + CETHER.sol
// 4. ERC20.sol

    // 1. CERC20 
    /* function initialize(address underlying_,
                        ComptrollerInterface comptroller_,
                        InterestRateModel interestRateModel_,
                        uint initialExchangeRateMantissa_,
                        string memory name_,
                        string memory symbol_,
                        uint8 decimals_) public; */
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    //function liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) external returns (uint);
    function _addReserves(uint addAmount) external returns (uint);
    function getCashPrior() internal view returns (uint);
    function doTransferIn(address from, uint amount) internal returns (uint);
    function doTransferOut(address payable to, uint amount) internal;

    // 2. CETHER.sol
    function mint() external payable;
    /* function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint); */
    function repayBorrow() external payable;
    function repayBorrowBehalf(address borrower) external payable;
    //function liquidateBorrow(address borrower, CToken cTokenCollateral) external payable;
    //function () external payable;
    /* function getCashPrior() internal view returns (uint);
    function doTransferIn(address from, uint amount) internal returns (uint);
    function doTransferOut(address payable to, uint amount) internal; */
    function requireNoError(uint errCode, string memory message) internal pure;

    // ERC20.sol
    function totalSupply() public view returns (uint256);
    function balanceOf(address account) public view returns (uint256);
    function transfer(address recipient, uint256 amount) public returns (bool);
    function allowance(address owner, address spender) public view returns (uint256);
    function approve(address spender, uint256 amount) public returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool);
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool);
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool);
    function _transfer(address sender, address recipient, uint256 amount) internal;
    function _mint(address account, uint256 amount) internal;
    function _burn(address account, uint256 amount) internal;
    function _approve(address owner, address spender, uint256 amount) internal;
    function _burnFrom(address account, uint256 amount) internal;

    function supplyRatePerBlock() external view returns (uint);
    function borrowRatePerBlock() external view returns (uint);
    function exchangeRateStore() external view returns (uint);
    function exchangeRateCurrent() external returns (uint);
    function getInterest() internal view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);

}