const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const vPairFactoryJson = require("../build/contracts/vPairFactory.json");
const TestnetERC20Json = require("../build/contracts/TestnetERC20.json");

var polygonProvider = new HDWalletProvider(
  "2fcdf6468c4a3eb0504953064d670b685ccbd99a3a9f845070bcdc1d4fe831d4",
  `https://morning-twilight-cherry.matic-testnet.quiknode.pro/6ba9d2c5b8a046814b28f974c3643c679914f7ff/`
);

const polygonWeb3 = new Web3(polygonProvider);

polygonWeb3.eth.getAccounts().then(async (accounts) => {
  console.log("working with account: " + accounts[0]);
  sendArgs = { from: accounts[0], gasPrice: 35000000000 };

  let adminAddress = "0xfBa12cbd46792A07DB47BD28B73d59B89fC7ed59";

  const vPairFactory = new polygonWeb3.eth.Contract(
    vPairFactoryJson.abi,
    "0x64F43876f8473154b8b6b44C940FCc4093515f34"
  );

  try {
    let tx = await vPairFactory.methods
      .changeAdmin(adminAddress)
      .send(sendArgs);

    console.log(tx);
  } catch (ex) {
    console.log(ex);
  }
});
