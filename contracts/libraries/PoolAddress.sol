// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.2;

/// @title Provides functions for deriving a pool address from the factory and token
library PoolAddress {
    //local 0x5e2c53146a5dae93216e921083c77cff22430a938b441d1d1e4754f93a3d1f3f
    //mumbai 0x501ab8b57f651e35036ffa4e1e289a76d14924a4b6201272ac3800e7959700cd
    bytes32 internal constant POOL_INIT_CODE_HASH =
        0x501ab8b57f651e35036ffa4e1e289a76d14924a4b6201272ac3800e7959700cd;


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
