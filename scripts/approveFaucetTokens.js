const TestnetERC20Json = require("../build/contracts/TestnetERC20.json");
const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const mysql = require("mysql");

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

var polygonProvider = new HDWalletProvider(
  "e54c2a00a06b318911488e40fb1c744c58fb20ada0509c32d86cb4d79206ee41",
  `https://morning-twilight-cherry.matic-testnet.quiknode.pro/6ba9d2c5b8a046814b28f974c3643c679914f7ff/`
);

const polygonWeb3 = new Web3(polygonProvider);

async function run() {
  let tokens = await queryDB(`SELECT address FROM vswap.tokens;`);

  let accounts = await polygonWeb3.eth.getAccounts();
  let nonce = await polygonWeb3.eth.getTransactionCount(accounts[0]);
  for (let i = 0; i < tokens.length; i++) {
    const pair = new polygonWeb3.eth.Contract(
      TestnetERC20Json.abi,
      tokens[i].address
    );
    try {
      let tx = await pair.methods
        .approve(
          "0x1e3D868A2c24343aFb4D0A418597A7931D98EC49",
          polygonWeb3.utils.toWei("1000000000000000000000000", "ether")
        )
        .send({ from: accounts[0] });
      let a = 5;
    } catch (ex) {
      console.log(ex);
    }
  }
}

run().then((a) => {
  console.log(a);
});
