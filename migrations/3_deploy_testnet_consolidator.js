const ConsolidateERC20Txs = artifacts.require("ConsolidateERC20Txs");

module.exports = async function (deployer, network) {
  await deployer.deploy(
    ConsolidateERC20Txs,
    "0xd359d19F37C14edb5105370ba6c64fc55c26df10"
  );
};
