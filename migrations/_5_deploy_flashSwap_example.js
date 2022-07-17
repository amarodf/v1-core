const FlashSwapExample = artifacts.require("flashSwapExample");

module.exports = async function (deployer) {
  await connectDB();

  await deployer.deploy(vSwapLibrary);

  await deployer.link(vSwapLibrary, FlashSwapExample);
  await deployer.deploy(FlashSwapExample);
};
