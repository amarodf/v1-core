// SPDX-License-Identifier: MIT
pragma solidity =0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

import "./types.sol";
import "./libraries/vSwapLibrary.sol";
import "./interfaces/IvPair.sol";
import "./interfaces/IvRouter.sol";
import "./interfaces/IvPairFactory.sol";

contract vRouter is IvRouter {
    address public override factory;
    address public immutable override owner;
    address public immutable override WETH;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "VSWAP: EXPIRED");
        _;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    constructor(address _factory, address _WETH) {
        owner = msg.sender;
        factory = _factory;
        WETH = _WETH;
    }

    function swap(
        address[] calldata pools,
        uint256[] calldata amountsIn,
        uint256[] calldata amountsOut,
        address[] memory iks,
        address inputToken,
        address outputToken,
        address to,
        uint256 deadline
    ) external override ensure(deadline) {
        for (uint256 i = 0; i < pools.length; ++i) {
            if (iks[i] == address(0)) {
                // REAL POOL
                SafeERC20.safeTransferFrom(
                    IERC20(inputToken),
                    msg.sender,
                    pools[i],
                    amountsIn[i]
                );

                IvPair(pools[i]).swapNative(
                    amountsOut[i],
                    outputToken,
                    to,
                    new bytes(0)
                );
            } else {
                SafeERC20.safeTransferFrom(
                    IERC20(inputToken),
                    msg.sender,
                    pools[i],
                    amountsIn[i]
                );

                IvPair(pools[i]).swapReserveToNative(
                    amountsOut[i],
                    iks[i],
                    to,
                    new bytes(0)
                );
            }
        }
    }

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

        (uint256 reserve0, uint256 reserve1) = (
            IvPair(pool).reserve0(),
            IvPair(pool).reserve1()
        );

        if (reserve0 == 0 && reserve1 == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
          
            uint256 amountBOptimal = vSwapLibrary.quote(
                amountADesired,
                reserve0,
                reserve1
            );

            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    "VSWAP: INSUFFICIENT_B_AMOUNT"
                );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = vSwapLibrary.quote(
                    amountBDesired,
                    reserve0,
                    reserve1
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

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        override
        ensure(deadline)
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = IvPairFactory(factory).getPair(token, WETH);
        SafeERC20.safeTransferFrom(
            IERC20(token),
            msg.sender,
            pair,
            amountToken
        );
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        liquidity = IvPair(pair).mint(to);
        if (msg.value > amountETH)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
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

        (uint256 amountA, uint256 amountB) = IvPair(pair).burn(to);

        require(amountA >= amountAMin, "VSWAP: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "VSWAP: INSUFFICIENT_B_AMOUNT");
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        public
        virtual
        override
        ensure(deadline)
        returns (uint256 amountToken, uint256 amountETH)
    {
        (amountToken, amountETH) = this.removeLiquidity(
            token,
            WETH,
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );
        SafeERC20.safeTransfer(IERC20(token), to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        TransferHelper.safeTransferETH(to, amountETH);
    }

    function getVirtualAmountIn(
        address jkPair,
        address ikPair,
        uint256 amountOut
    ) external view override returns (uint256 amountIn) {
        VirtualPoolModel memory vPool = this.getVirtualPool(jkPair, ikPair);

        return
            vSwapLibrary.getAmountIn(
                amountOut,
                vPool.reserve0,
                vPool.reserve1,
                IvPair(jkPair).vFee()
            );
    }

    function getVirtualPool(address jkPair, address ikPair)
        external
        view
        override
        returns (VirtualPoolModel memory vPool)
    {
        (address ik0, address ik1) = IvPair(ikPair).getTokens();

        (address jk0, address jk1) = IvPair(jkPair).getTokens();

        VirtualPoolTokens memory vPoolTokens = vSwapLibrary.findCommonToken(
            ik0,
            ik1,
            jk0,
            jk1
        );

        require(vPoolTokens.ik1 == vPoolTokens.jk1, "IOP");

        (uint256 ikReserve0, uint256 ikReserve1) = IvPair(ikPair).getReserves();
        (uint256 jkReserve0, uint256 jkReserve1) = IvPair(jkPair).getReserves();

        vPool = vSwapLibrary.calculateVPool(
            vPoolTokens.ik0 == ik0 ? ikReserve0 : ikReserve1,
            vPoolTokens.ik0 == ik0 ? ikReserve1 : ikReserve0,
            vPoolTokens.jk0 == jk0 ? jkReserve0 : jkReserve1,
            vPoolTokens.jk0 == jk0 ? jkReserve1 : jkReserve0
        );

        vPool.token0 = vPoolTokens.ik0;
        vPool.token1 = vPoolTokens.jk0;
        vPool.commonToken = vPoolTokens.ik1;
    }

    function getVirtualAmountOut(
        address jkPair,
        address ikPair,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        VirtualPoolModel memory vPool = this.getVirtualPool(jkPair, ikPair);

        return
            vSwapLibrary.getAmountOut(
                amountIn,
                vPool.reserve0,
                vPool.reserve1,
                996
            );
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

    function getAmountOut(
        address tokenA,
        address tokenB,
        uint256 amountIn
    ) external view virtual override returns (uint256 amountOut) {
        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);

        (uint256 reserve0, uint256 reserve1) = IvPair(pair).getReserves();

        (reserve0, reserve1) = vSwapLibrary.sortReserves(
            tokenA,
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

    function getAmountIn(
        address tokenA,
        address tokenB,
        uint256 amountOut
    ) external view virtual override returns (uint256 amountIn) {
        address pair = IvPairFactory(factory).getPair(tokenA, tokenB);

        (uint256 reserve0, uint256 reserve1) = IvPair(pair).getReserves();

        (reserve0, reserve1) = vSwapLibrary.sortReserves(
            tokenA,
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
}
