library AddressCoder {
    function bytesToAddress(bytes calldata data)
        private
        pure
        returns (address addr)
    {
        bytes memory b = data;
        assembly {
            addr := mload(add(b, 20))
        }
    }

    function decodeAddress(bytes calldata data)
        external
        pure
        returns (address _address)
    {
        _address = bytesToAddress(data);
    }

    function encodeAddress(address _address)
        external
        pure
        returns (bytes memory data)
    {
        data = abi.encodePacked(_address);
    }
}
