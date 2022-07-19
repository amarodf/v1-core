// const flashSwapExample = artifacts.require("flashSwapExample");
// const addressCoder = artifacts.require("addressCoder");
// const vPairFactory = artifacts.require("vPairFactory");
// const Address = artifacts.require("Address");
// const SafeERC20 = artifacts.require("SafeERC20");
// const vSwapLibrary = artifacts.require("vSwapLibrary");

// module.exports = async function (deployer, network) {
//   console.log("network name: " + network);

//   await deployer.link(Address, vPairFactory);
//   await deployer.link(SafeERC20, vPairFactory);
//   await deployer.link(vSwapLibrary, vPairFactory);
//   await deployer.deploy(vPairFactory);

//   //libraries
//   await deployer.deploy(addressCoder);

//   await deployer.link(addressCoder, flashSwapExample);
//   await deployer.deploy(flashSwapExample);
// };
