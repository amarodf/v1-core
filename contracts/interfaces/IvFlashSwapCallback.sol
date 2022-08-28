pragma solidity 0.8.2;
import "../types.sol";

interface IvFlashSwapCallback {
    function vFlashSwapCallback(
        uint256 requiredBackAmount,
        bytes calldata data
    ) external;
}
