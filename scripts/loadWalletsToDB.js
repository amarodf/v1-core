const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const mysql = require("mysql");
const _ = require("lodash");

const csv = require("csv-parser");
const fs = require("fs");

const con = mysql.createConnection({
  host: "45.77.163.160",
  user: "backend",
  password: "13wue@yQp2Ax",
});

const twoDigits = function (d) {
  if (0 <= d && d < 10) return "0" + d.toString();
  if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
  return d.toString();
};

const SQLDate = function (datetime) {
  if (typeof datetime == "number" || typeof datetime == "string") {
    datetime = new Date(datetime);
  }
  return (
    datetime.getFullYear() +
    "-" +
    twoDigits(1 + datetime.getMonth()) +
    "-" +
    twoDigits(datetime.getDate()) +
    " " +
    twoDigits(datetime.getHours()) +
    ":" +
    twoDigits(datetime.getMinutes()) +
    ":" +
    twoDigits(datetime.getSeconds())
  );
};

const SQLNow = function () {
  return SQLDate(new Date());
};

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
let results = [];
fs.createReadStream("./scripts/w8.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", async () => {
    console.log(results);

    for (let i = 2500; i < results.length; i++) {
      let result = results[i];
      let wallet = result.metamask;

      const user = await queryDB(
        `SELECT * FROM vswap.faucet_users WHERE walletAddress = '${wallet}' LIMIT 1;`
      );

      if (user.length == 0) {
        let insert = await queryDB(
          `INSERT INTO vswap.faucet_users (walletAddress, timestamp, fromTg)
             VALUES ('${wallet}', '${SQLNow()}', 1);`
        );
      }
      let a = 4;
    }
  });
