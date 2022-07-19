// SPDX-License-Identifier: MIT
pragma solidity =0.8.1;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IvFlashSwapCallback.sol";
import "../interfaces/IvPair.sol";
import "../interfaces/IvPairFactory.sol";
import "../interfaces/IvRouter.sol";

import "../libraries/addressCoder.sol";

contract flashSwapExample is IvFlashSwapCallback {
    address factory;
    address router;

    address tokenA;
    address tokenB;
    address tokenC;

    constructor(
        address _factory,
        address _router,
        address _tokenA,
        address _tokenB,
        address _tokenC
    ) {
        factory = _factory;
        router = _router;
        tokenA = _tokenA;
        tokenB = _tokenB;
        tokenC = _tokenC;
    }

    //send 10 token B to A/C pool swapReserveToNative and take out A and repay flash swap
    function vFlashSwapCallback(
        address sender,
        uint256 amount,
        uint256 requiredBackAmount,
        address tokenIn,
        bytes memory data
    ) external override {
        address token0 = IvPair(msg.sender).token0();
        address token1 = IvPair(msg.sender).token1();
        address poolAddress = IvPairFactory(factory).getPair(token0, token1);
        address abPoolAddress = IvPairFactory(factory).getPair(tokenA, tokenB);

        require(msg.sender == poolAddress, "VSWAP:INVALID_POOL"); // ensure that msg.sender is actually a registered pair

        address ik = IvPairFactory(factory).getPair(tokenB, tokenC);
        address jk = IvPairFactory(factory).getPair(tokenA, tokenC);

        uint256 vAmountIn = IvRouter(router).getVirtualAmountIn(ik, jk, amount);

        //FIX THIS LINE
        vAmountIn = vAmountIn - 1e18;


        
        address caller = AddressCoder.decodeAddress(data);

        SafeERC20.safeTransfer(IERC20(tokenB), jk, amount);

        //swap B to A in virtual pool A/B
        IvPair(jk).swapReserveToNative(
            vAmountIn,
            ik,
            abPoolAddress,
            new bytes(0)
        );

        //take delta from transaction caller
        uint256 delta = requiredBackAmount - vAmountIn;

        if (delta > 0) {
            SafeERC20.safeTransferFrom(
                IERC20(tokenB),
                caller,
                poolAddress,
                delta
            );
        }
    }

    //take 10 token B out from A/B pool with a flashswap
    function testFlashswap(address sender) external {
        address abPoolAddress = IvPairFactory(factory).getPair(tokenA, tokenB);
        SafeERC20.safeTransferFrom(
            IERC20(tokenA),
            msg.sender,
            abPoolAddress,
            50 * 1e18
        );

        bytes memory encodedAddress = AddressCoder.encodeAddress(msg.sender);

        //call flashswap
        IvPair(abPoolAddress).swapNative(
            10 * 1e18,
            tokenB,
            address(this),
            encodedAddress
        );
    }
}
