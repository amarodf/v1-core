pragma solidity 0.8.2;

interface IvFlashSwapCallback {
    function vFlashSwapCallback(uint256 requiredBackAmount, bytes memory data)
        external;
}
