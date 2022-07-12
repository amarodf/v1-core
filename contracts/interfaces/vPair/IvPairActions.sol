pragma solidity =0.8.1;

interface IvPairActions {
    function swapNative(
        uint256 amountOut,
        address tokenOut,
        address to,
        bytes calldata data
    ) external;

    function swapReserves(
        uint256 amountOut,
        address ikPair,
        address to,
        bytes calldata data
    ) external;

    function exchangeReserve(
        uint256 amountOut,
        address ikPair,
        address to,
        bytes calldata data
    ) external;

    function mint(address to) external returns (uint256 liquidity);

    function burn(address to)
        external
        returns (uint256 amount0, uint256 amount1);
}
