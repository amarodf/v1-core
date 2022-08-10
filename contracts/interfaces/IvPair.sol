pragma solidity ^0.8.0;

interface IvPair {
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);

    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );

    event WhitelistChanged(address[] tokens);

    event Sync(uint256 balance0, uint256 balance1);

    event ReserveSync(address asset, uint256 balance);

    function fee() external view returns (uint24);

    function vFee() external view returns (uint24);

    function setFee(uint24 _fee, uint24 _vFee) external;

    function swapNative(
        uint256 amountOut,
        address tokenOut,
        address to,
        bytes calldata data
    ) external returns (uint256 _amountIn);

    function swapReserveToNative(
        uint256 amountOut,
        address ikPair,
        address to,
        bytes calldata data
    ) external returns (uint256 _amountIn);

    function swapNativeToReserve(
        uint256 amountOut,
        address ikPair,
        address to,
        bytes calldata data
    ) external returns (uint256 _amountIn);

    /// @notice Adds liquidity for the given recipient/tickLower/tickUpper position
    /// @dev The caller of this method receives a callback in the form of IUniswapV3MintCallback#uniswapV3MintCallback
    /// in which they must pay any token0 or token1 owed for the liquidity. The amount of token0/token1 due depends
    /// on tickLower, tickUpper, the amount of liquidity, and the current price.
    /// @param recipient The address for which the liquidity will be created
    /// @param tickLower The lower tick of the position in which to add liquidity
    /// @param tickUpper The upper tick of the position in which to add liquidity
    /// @param amount The amount of liquidity to mint
    /// @param data Any data that should be passed through to the callback
    /// @return amount0 The amount of token0 that was paid to mint the given amount of liquidity. Matches the value in the callback
    /// @return amount1 The amount of token1 that was paid to mint the given amount of liquidity. Matches the value in the callback
    function mint(address to) external returns (uint256 liquidity);

    /// @notice Burn liquidity from the sender and account tokens owed for the liquidity to the position
    /// @dev Can be used to trigger a recalculation of fees owed to a position by calling with an amount of 0
    /// @dev Fees must be collected separately via a call to #collect
    /// @param tickLower The lower tick of the position for which to burn liquidity
    /// @param tickUpper The upper tick of the position for which to burn liquidity
    /// @param amount How much liquidity to burn
    /// @return amount0 The amount of token0 sent to the recipient
    /// @return amount1 The amount of token1 sent to the recipient
    function burn(address to)
        external
        returns (uint256 amount0, uint256 amount1);

    function setWhitelist(address[] memory _whitelist) external;

    function setMaxWhitelistCount(uint24 maxWhitelist) external;

    function calculateReserveRatio() external view returns (uint256 rRatio);

    function setMaxReserveThreshold(uint256 threshold) external;

    function token0() external view returns (address);

    function token1() external view returns (address);

    function reserve0() external view returns (uint256);

    function reserve1() external view returns (uint256);

    function max_whitelist_count() external view returns (uint24);

    function getReserves() external view returns (uint256, uint256);

    function getTokens() external view returns (address, address);

    function reservesBaseValue(address reserveAddress)
        external
        view
        returns (uint256);

    function reserves(address reserveAddress) external view returns (uint256);
}
