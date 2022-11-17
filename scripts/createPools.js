const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const vRouterJson = require("../build/contracts/vRouter.json");
const TestnetERC20Json = require("../build/contracts/TestnetERC20.json");
const mysql = require("mysql");
const _ = require("lodash");

var polygonProvider = new HDWalletProvider(
  "4cd4d069ecb10b4a5ff6e194976b6cdbd04e307d670e6bf4f455556497b4a63b",
  `https://morning-twilight-cherry.matic-testnet.quiknode.pro/6ba9d2c5b8a046814b28f974c3643c679914f7ff/`
);

const con = mysql.createConnection({
  host: "45.77.163.160",
  user: "backend",
  password: "13wue@yQp2Ax",
});

async function queryDB(sql) {
  return new Promise((resolve, rej) => {
    con.query(sql, function (err, result) {
      if (err) {
        console.log(err);
        rej(err);
      }

      resolve(result);
    });
  });
}

const polygonWeb3 = new Web3(polygonProvider);
const adminAddress = "0x5eA409399e47F0Df9FAC47488A4010bfD04718a4";
const router = "0x9990a157EDdd671Fc57b596b5F3e6C5fAe5FbDb7";

async function getFutureBlockTimestamp() {
  const blockNumber = await polygonWeb3.eth.getBlockNumber();
  const block = await polygonWeb3.eth.getBlock(blockNumber);
  return block.timestamp + 1000000;
}

async function createPool(tokenA, tokenB, liq0, liq1) {
  let accounts = await polygonWeb3.eth.getAccounts();
  let sendArgs = { from: accounts[0], gasPrice: 35000000000 };

  const vRouterInstance = new polygonWeb3.eth.Contract(vRouterJson.abi, router);
  let futureTs = await getFutureBlockTimestamp();

  const tokenAInstance = new polygonWeb3.eth.Contract(
    TestnetERC20Json.abi,
    tokenA
  );

  const tokenBInstance = new polygonWeb3.eth.Contract(
    TestnetERC20Json.abi,
    tokenB
  );

  await tokenAInstance.methods
    .approve(
      router,
      polygonWeb3.utils.toWei("999999999999999999999999999999", "ether")
    )
    .send(sendArgs);

  await tokenBInstance.methods
    .approve(
      router,
      polygonWeb3.utils.toWei("999999999999999999999999999999", "ether")
    )
    .send(sendArgs);
  try {
    let tx = await vRouterInstance.methods
      .addLiquidity(
        tokenA,
        tokenB,
        polygonWeb3.utils.toWei(liq0.toString(), "ether"),
        polygonWeb3.utils.toWei(liq1.toString(), "ether"),
        polygonWeb3.utils.toWei(liq0.toString(), "ether"),
        polygonWeb3.utils.toWei(liq1.toString(), "ether"),
        adminAddress,
        futureTs
      )
      .send(sendArgs);
  } catch (ex) {
    console.log(ex);
  }
}

async function run() {
  //get tokens

  let tokens = await queryDB("SELECT * from vswap.tokens");

  //get testnet_pools
  let testnet_pools = await queryDB("SELECT * from vswap.testnet_pools");

  //foreach call createPool
  for (let i = 32; i < testnet_pools.length; i++) {
    let pool = testnet_pools[i];

    let asset0 = _.find(tokens, (t) => {
      return t.symbol == pool.asset0;
    });

    let asset1 = _.find(tokens, (t) => {
      return t.symbol == pool.asset1;
    });

    await createPool(asset0.address, asset1.address, pool.liq0, pool.liq1);
    let a = 5;
  }
}

run().then((a) => {
    console.log(a);
});
