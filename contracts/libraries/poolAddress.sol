// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.2;

import "../interfaces/IvPairFactory.sol";

/// @title Provides functions for deriving a pool address from the factory and token
library PoolAddress {
    bytes32 internal constant POOL_INIT_CODE_HASH =
        0x35f40ca35b3286e0a3bb66491a636e850a6d16dd0a37ce636735bb6f0ac28798;

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
