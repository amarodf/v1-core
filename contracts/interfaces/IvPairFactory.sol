pragma solidity ^0.8.0;

/// @title The interface for the Virtuswap V1 Factory
/// @notice Virtuswap V1 Factory facilitates the setup of Virtuswap V1 pools and allows control of the protocol fees
interface IvPairFactory {
    /// @notice Emitted when a pair is created
    /// @param token0 The first token of the pool by address sort order
    /// @param token1 The second token of the pool by address sort order
    /// @param poolAddress The address of the created pool
    event PairCreated(
        address poolAddress,
        address factory,
        address token0,
        address token1
    );

    /// @notice Creates a pair for the given two tokens
    /// @param tokenA One of the two tokens in the desired pair
    /// @param tokenB The other of the two tokens in the desired pair
    /// @dev tokenA and tokenB may be passed in either order: token0/token1 or token1/token0.
    /// The call will revert if the pair already exists.
    /// @return pairAddress The address of the newly created pair
    function createPair(address tokenA, address tokenB)
        external
        returns (address pairAddress);

    /// @notice Get vPairFactory admin address
    /// @return adminAddress The address of the admin
    function admin() external view returns (address adminAddress);

    /// @notice Get the address of the exchange reserve deployed contract.
    function exchangeReserves() external view returns (address);

    /// @notice Returns the address of a pair of tokens, or 0 if the pair does not exist.
    /// @dev tokenA and tokenB may be passed in either token0/token1 or token1/token0 order
    /// @param tokenA The contract address of either token0 or token1
    /// @param tokenB The contract address of the other token
    /// @return pairAddress The pair address
    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pairAddress);

    /// @notice Set the address of the exchange reserve deployed contract.
    /// @dev this can be called only by admin
    /// @param _exchangeReserves The new address of the exchange reserves contract
    function setExchangeReservesAddress(address _exchangeReserves) external;
}
