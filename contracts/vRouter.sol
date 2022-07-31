// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/base/Multicall.sol";

import "./types.sol";
import "./vPair.sol";
import "./libraries/vSwapLibrary.sol";
import "./interfaces/IvRouter.sol";
import "./interfaces/IvPairFactory.sol";

contract vRouter is IvRouter, Multicall {
    address public override factory;
    address public immutable override owner;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "VSWAP: EXPIRED");
        _;
    }

    constructor(address _factory) {
        owner = msg.sender;
        factory = _factory;
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external override {
        require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        (address tokenIn, address tokenOut, uint24 fee) = data
            .path
            .decodeFirstPool();
        CallbackValidation.verifyCallback(factory, tokenIn, tokenOut, fee);

        (bool isExactInput, uint256 amountToPay) = amount0Delta > 0
            ? (tokenIn < tokenOut, uint256(amount0Delta))
            : (tokenOut < tokenIn, uint256(amount1Delta));
        if (isExactInput) {
            pay(tokenIn, data.payer, msg.sender, amountToPay);
        } else {
            // either initiate the next swap or pay
            if (data.path.hasMultiplePools()) {
                data.path = data.path.skipToken();
                exactOutputInternal(amountToPay, msg.sender, 0, data);
            } else {
                amountInCached = amountToPay;
                tokenIn = tokenOut; // swap in/out because exact output swaps are reversed
                pay(tokenIn, data.payer, msg.sender, amountToPay);
            }
        }
    }

    function swapToExactNative(
        address tokenA,
        address tokenB,
        uint256 amountOut,
        address to
    ) {
        address pair = IvPairFactory.getPair(tokenA, tokenB);
        uint256 amountIn = _getAmountIn(pair, tokenA, amountOut);

        SafeERC20.safeTransferFrom(IERC20(tokenA), msg.sender, pair, amountIn);

        IvPair(pair).swapNative(amountOut, tokenB, to, new bytes(0));
    }

    function swapExactNative(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        address to
    ) {
        address pair = IvPairFactory.getPair(tokenA, tokenB);
        uint256 amountOut = _getAmountOut(pair, tokenA, amountIn);

        SafeERC20.safeTransferFrom(IERC20(tokenA), msg.sender, pair, amountIn);

        IvPair(pair).swapNative(amountOut, tokenB, to, new bytes(0));
    }

    function swapToExactReserveToNative(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        address to
    ) {}

    function swapExactReserveToNative(
        address jkPool,
        address ikPool,
        uint256 amountIn,
        address to
    ) {
        //validate jk pool
        address pair = IvPairFactory.getPair(tokenA, tokenB);

        uint256 amountOut = _getAmountOut(pair, tokenA, amountIn);

        SafeERC20.safeTransferFrom(IERC20(tokenA), msg.sender, pair, amountIn);

        IvPair(pair).swapNative(amountOut, tokenB, to, new bytes(0));
    }

    function swapExactNativeToReserve(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        address to
    ) {}

    function swapToExactNativeToReserve(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        address to
    ) {}

    // function swap(
    //     address[] calldata pools,
    //     uint256[] calldata amountsIn,
    //     uint256[] calldata amountsOut,
    //     address[] memory iks,
    //     address inputToken,
    //     address outputToken,
    //     address to,
    //     uint256 deadline
    // ) external override ensure(deadline) {
    //     for (uint256 i = 0; i < pools.length; ++i) {
    //         if (iks[i] == address(0)) {
    //             // REAL POOL
    //             SafeERC20.safeTransferFrom(
    //                 IERC20(inputToken),
    //                 msg.sender,
    //                 pools[i],
    //                 amountsIn[i]
    //             );

    //             IvPair(pools[i]).swapNative(
    //                 amountsOut[i],
    //                 outputToken,
    //                 to,
    //                 new bytes(0)
    //             );
    //         } else {
    //             SafeERC20.safeTransferFrom(
    //                 IERC20(inputToken),
    //                 msg.sender,
    //                 pools[i],
    //                 amountsIn[i]
    //             );

    //             IvPair(pools[i]).swapReserveToNative(
    //                 amountsOut[i],
    //                 iks[i],
    //                 to,
    //                 new bytes(0)
    //             );
    //         }
    //     }
    // }

    function changeFactory(address _factory) external override onlyOwner {
        factory = _factory;
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        address pool = IvPairFactory(factory).getPair(tokenA, tokenB);
        // create the pair if it doesn't exist yet
        if (pool == address(0))
            pool = IvPairFactory(factory).createPair(tokenA, tokenB);

        (uint256 reserve0, uint256 reserve1) = IvPair(pool).getReserves();

        if (reserve0 == 0 && reserve1 == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = vSwapLibrary.quote(
                reserve0,
                reserve1,
                amountADesired
            );

            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    "VSWAP: INSUFFICIENT_B_AMOUNT"
                );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = vSwapLibrary.quote(
                    reserve1,
                    reserve0,
                    amountBDesired
                );

                assert(amountAOptimal <= amountADesired);
                require(
                    amountAOptimal >= amountAMin,
                    "VSWAP: INSUFFICIENT_A_AMOUNT"
                );
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        override
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);

        SafeERC20.safeTransferFrom(IERC20(tokenA), msg.sender, pair, amountA);
        SafeERC20.safeTransferFrom(IERC20(tokenB), msg.sender, pair, amountB);
        liquidity = IvPair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        override
        ensure(deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);

        require(pair > address(0), "VSWAP: PAIR_DONT_EXIST");
        SafeERC20.safeTransferFrom(IERC20(pair), msg.sender, pair, liquidity);

        (amountA, amountB) = IvPair(pair).burn(to);

        require(amountA >= amountAMin, "VSWAP: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "VSWAP: INSUFFICIENT_B_AMOUNT");
    }

    function getVirtualAmountIn(
        address jkPair,
        address ikPair,
        uint256 amountOut
    ) external view override returns (uint256 amountIn) {
        VirtualPoolModel memory vPool = this.getVirtualPool(jkPair, ikPair);

        amountIn = vSwapLibrary.getAmountIn(
            amountOut,
            vPool.reserve0,
            vPool.reserve1,
            vPool.fee
        );
    }

    function getVirtualAmountOut(
        address jkPair,
        address ikPair,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        VirtualPoolModel memory vPool = this.getVirtualPool(jkPair, ikPair);

        amountOut = vSwapLibrary.getAmountOut(
            amountIn,
            vPool.reserve0,
            vPool.reserve1,
            vPool.fee
        );
    }

    function getVirtualPool(address jkPair, address ikPair)
        external
        view
        override
        returns (VirtualPoolModel memory vPool)
    {
        vPool = vSwapLibrary.getVirtualPool(jkPair, ikPair);
    }

    function quote(
        address tokenA,
        address tokenB,
        uint256 amount
    ) external view override returns (uint256 quote) {
        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);

        (uint256 reserve0, uint256 reserve1) = IvPair(pair).getReserves();

        (reserve0, reserve1) = vSwapLibrary.sortReserves(
            tokenA,
            IvPair(pair).token0(),
            reserve0,
            reserve1
        );

        quote = vSwapLibrary.quote(amount, reserve0, reserve1);
    }

    function _getAmountOut(
        address pair,
        address tokenIn,
        uint256 amountIn
    ) internal view returns (uint256 amountOut) {
        require(pair > address(0), "VSWAP:INVALID_PAIR");

        (uint256 reserve0, uint256 reserve1) = IvPair(pair).getReserves();

        (reserve0, reserve1) = vSwapLibrary.sortReserves(
            tokenIn,
            IvPair(pair).token0(),
            reserve0,
            reserve1
        );

        amountOut = vSwapLibrary.getAmountOut(
            amountIn,
            reserve0,
            reserve1,
            IvPair(pair).fee()
        );
    }

    function _getAmountIn(
        address pair,
        address tokenIn,
        uint256 amountOut
    ) internal view returns (uint256 amountIn) {
        require(pair > address(0), "VSWAP:INVALID_PAIR");

        (uint256 reserve0, uint256 reserve1) = IvPair(pair).getReserves();

        (reserve0, reserve1) = vSwapLibrary.sortReserves(
            tokenIn,
            IvPair(pair).token0(),
            reserve0,
            reserve1
        );

        amountIn = vSwapLibrary.getAmountIn(
            amountOut,
            reserve0,
            reserve1,
            IvPair(pair).fee()
        );
    }

    function getAmountOut(
        address tokenA,
        address tokenB,
        uint256 amountIn
    ) external view virtual override returns (uint256 amountOut) {
        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);
        amountOut = _getAmountOut(pair, tokenA, amountIn);
    }

    function getAmountIn(
        address tokenA,
        address tokenB,
        uint256 amountOut
    ) external view virtual override returns (uint256 amountIn) {
        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);
        amountIn = _getAmountIn(pair, tokenA, amountOut);
    }
}
