pragma solidity =0.8.1;

interface IvPairFactory {
    event PairCreated(
        address poolAddress,
        address factory,
        address token0,
        address token1
    );

    function createPair(address tokenA, address tokenB)
        external
        returns (address);

    function allPairsLength() external view returns (uint256);

    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address);

    function admin() external view returns (address);

    function setMaxReserveThreshold(uint256 _max_reserve_ratio_default)
        external;

    function setMaxWhitelistCount(uint256 _max_whitelist_count_default)
        external;

    function setPairFeeDefault(uint256 _pair_fee_default) external;

    function setPairVFeeDefault(uint256 _pair_vfee_default) external;
}
