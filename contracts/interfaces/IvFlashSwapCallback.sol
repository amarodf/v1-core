pragma solidity 0.8.2;
import "../types.sol";

interface IvFlashSwapCallback {
    function vFlashSwapCallback(
        address tokenIn,
        address tokenOut,
        uint256 requiredBackAmount,
        bytes calldata data
    ) external;
}
