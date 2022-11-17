const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const ConsolidateERC20TxsJson = require("./artifacts/ConsolidateERC20Txs.json");
const mysql = require("mysql");
const _ = require("lodash");

const consolidatorAddress = "0x7c55c688Bb91436d412940899086dE802036ef5e";
var polygonProvider = new HDWalletProvider(
  "4cd4d069ecb10b4a5ff6e194976b6cdbd04e307d670e6bf4f455556497b4a63b",
  `https://morning-twilight-cherry.matic-testnet.quiknode.pro/6ba9d2c5b8a046814b28f974c3643c679914f7ff/`
);
const web3 = new Web3(polygonProvider);

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

let locked = false;
async function run() {
  if (!locked) {
    locked = true;
    let accounts = await web3.eth.getAccounts();

    let wallets = await queryDB(
      "SELECT distinct(walletAddress),sent FROM vswap.faucet_users WHERE sent IS NULL;"
    );

    let tokens = await queryDB(
      `SELECT address, faucet_amount FROM vswap.tokens;`
    );

    const addresses = tokens.map((t) => t.address);
    const amounts = tokens.map((t) => {
      return web3.utils.toWei(t.faucet_amount.toString());
    });

    const consolidatorContract = new web3.eth.Contract(
      ConsolidateERC20TxsJson.abi,
      consolidatorAddress
    );

    let nonce = await web3.eth.getTransactionCount(accounts[0]);
    let promises = [];
    console.log("total of " + wallets.length + " should receive tokens");
    let chunks = _.chunk(wallets, 15);
    for (let j = 0; j < chunks.length; j++) {
      for (let i = 0; i < chunks[j].length; i++) {
        let wallet = chunks[j][i].walletAddress;
        if (wallet.length == 0) continue;

        if (chunks[j][i].sent == null) {
          const tokensTx = await consolidatorContract.methods.sendTokens(
            wallet,
            addresses,
            amounts
          );
          console.log("sending tokens to " + wallet);
          const txData = tokensTx.encodeABI();
          let promise = web3.eth.sendTransaction({
            from: accounts[0],
            nonce: nonce,
            data: txData,
            to: consolidatorAddress, //or smartContractObject.address depending on web3 version,
          });

          promises.push(promise);
          nonce++;

          const amount = 0.1;
          const amountToSend = web3.utils.toWei(amount.toString(), "ether"); // Convert to wei value
          const ethTx = web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet,
            value: amountToSend,
            nonce: nonce,
          });

          promises.push(ethTx);

          nonce++;
        }
      }

      try {
        let res = await Promise.all(promises);
      } catch (ex) {
        console.log(ex);
      }
      for (let i = 0; i < chunks[j].length; i++) {
        await queryDB(
          `UPDATE vswap.faucet_users
         SET sent = 1
         WHERE walletAddress = '${chunks[j][i].walletAddress}';`
        );
      }
      console.log(
        "finished processing " + chunks[j].length + " faucet requests"
      );
    }
    locked = false;
    return true;
  }
  return false;
}

setInterval(run, 15000);
