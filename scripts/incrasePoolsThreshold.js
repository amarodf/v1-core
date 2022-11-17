const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const vPairJson = require("../build/contracts/vPair.json");
const vRouterJson = require("../build/contracts/vRouter.json");
const TestnetERC20Json = require("../build/contracts/TestnetERC20.json");
const mysql = require("mysql");
const _ = require("lodash");

var polygonProvider = new HDWalletProvider(
  "5f1921c54bfa4a4cc3f9ffee097bedc5c69e72d1cd3481e3bb82b1f8fe927641",
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

async function run() {
  let pools = await queryDB("SELECT * from vswap.pools");

  let accounts = await polygonWeb3.eth.getAccounts();
  let sendArgs = { from: accounts[0], gasPrice: 35000000000 };

  for (let i = 0; i < i < pools.length; i++) {
    const pool = new polygonWeb3.eth.Contract(
      vPairJson.abi,
      pools[i].poolAddress
    );

    let currentThreshold = await pool.methods.maxReserveRatio().call();
    let setReserve = await pool.methods
      .setMaxReserveThreshold(polygonWeb3.utils.toWei("13000", "ether"))
      .send(sendArgs);
  }
}

run().then((a) => {
  console.log(a);
});
