// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.2;

import "../interfaces/IvPairFactory.sol";

/// @title Provides functions for deriving a pool address from the factory and token
library PoolAddress {
    bytes32 internal constant POOL_INIT_CODE_HASH =
        0xe77dfb3cd16f4a9e8efbd95441fe1aca9e46cd7bae9b2505eb196dcc585fc0e4;

    function orderAddresses(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        return (tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA));
    }

    function getSalt(address tokenA, address tokenB)
        internal
        pure
        returns (bytes32 salt)
    {
        (address token0, address token1) = orderAddresses(tokenA, tokenB);
        salt = keccak256(abi.encode(token0, token1));
    }

    function computeAddress(
        address factory,
        address token0,
        address token1
    ) internal pure returns (address pool) {
        bytes32 _salt = getSalt(token0, token1);

        pool = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            factory,
                            _salt,
                            POOL_INIT_CODE_HASH
                        )
                    )
                )
            )
        );
    }
}
