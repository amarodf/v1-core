const Web3 = require("web3");
const ethers = require("ethers");
const _ = require("lodash");
const mysql = require("mysql");
const { utils } = require("ethers");
const vRouterJson = require("../build/contracts/vRouter.json");
const vSwapHelper = require("./vSwapHelpers");
const axios = require("axios");

const vExchangeReservesJson = require("../build/contracts/vExchangeReserves.json");
const HDWalletProvider = require("@truffle/hdwallet-provider");

var polygonProvider = new HDWalletProvider(
  "4cd4d069ecb10b4a5ff6e194976b6cdbd04e307d670e6bf4f455556497b4a63b",
  `https://morning-twilight-cherry.matic-testnet.quiknode.pro/6ba9d2c5b8a046814b28f974c3643c679914f7ff/`
);

const web3 = new Web3(polygonProvider);

let vRouter = new web3.eth.Contract(
  vRouterJson.abi,
  "0x9990a157EDdd671Fc57b596b5F3e6C5fAe5FbDb7"
);
const vExchangeReservesInstance = new web3.eth.Contract(
  vExchangeReservesJson.abi,
  "0x1e3D868A2c24343aFb4D0A418597A7931D98EC49" // "0x71C95911E9a5D330f4D621842EC243EE1343292e", // localhost
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

function getEncodedExchangeReserveCallbackParams(jkPair1, jkPair2, ikPair2) {
  return utils.defaultAbiCoder.encode(
    ["address", "address", "address"],
    [jkPair1, jkPair2, ikPair2]
  );
}

function getTokenNameByAddress(tokens, address) {
  let token0 = _.find(tokens, (t) => {
    return t.address == address;
  });
  return token0.symbol;
}

function getTokenName(tokens, pool) {
  let token0 = _.find(tokens, (t) => {
    return t.address == pool.token0;
  });
  let token1 = _.find(tokens, (t) => {
    return t.address == pool.token1;
  });
  return token0.symbol + "/" + token1.symbol;
}

function getPoolName(pools, tokens, address) {
  let poolIndex = vSwapHelper.getPoolIndexByAddress(pools, address);
  return getTokenName(tokens, pools[poolIndex]);
}

async function run() {
  let accounts = await web3.eth.getAccounts();
  let poolsRaw = await axios.get("https://api.virtuswap.io/pools");
  let tokens = await axios.get("https://api.virtuswap.io/tokens");
  tokens = tokens.data;
  let pools = [];
  for (let i = 0; i < poolsRaw.data.length; i++) {
    pools.push(poolsRaw.data[i]);

    pools[i].balance0 = ethers.utils.formatEther(pools[i].balance0);
    pools[i].balance1 = ethers.utils.formatEther(pools[i].balance1);
  }
  let vPools = vSwapHelper._calculateVirtualPools(pools, tokens);

  for (let i = 0; i < i < pools.length; i++) {
    let pool = pools[i];
    let pool_reserves = await queryDB(
      "SELECT * from vswap.pool_reserves WHERE poolAddress = '" +
        pool.poolAddress +
        "';"
    );

    console.log("Side 1 pool: " + getPoolName(pools, tokens, pool.poolAddress));

    for (let j = 0; j < pool_reserves.length; j++) {
      let pool_reserve = pool_reserves[j];

      let parsedBalance = parseFloat(
        web3.utils.fromWei(pool_reserve.balance, "ether")
      );

      if (parsedBalance > 0) {
        console.log(
          "Side 1 pool have reserve asset: " +
            getTokenNameByAddress(tokens, pool_reserve.reserveAddress) +
            " balance: " +
            parsedBalance
        );

        let poolIndexLeg1 = vSwapHelper.getPoolIndex(
          vPools,
          pool.token0,
          pool_reserve.reserveAddress
        );

        let poolIndexLeg2 = vSwapHelper.getPoolIndex(
          vPools,
          pool.token1,
          pool_reserve.reserveAddress
        );

        console.log(
          "leg1: " +
            getTokenNameByAddress(tokens, vPools[poolIndexLeg1].token0) +
            "/" +
            getTokenNameByAddress(tokens, vPools[poolIndexLeg1].token1)
        );

        console.log(
          "leg2: " +
            getTokenNameByAddress(tokens, vPools[poolIndexLeg2].token0) +
            "/" +
            getTokenNameByAddress(tokens, vPools[poolIndexLeg2].token1)
        );

        let vPoolLeg1 = vPools[poolIndexLeg1];
        let vPoolLeg2 = vPools[poolIndexLeg2];

        let leg1IK = null;
        let leg2IK = null;
        // console.log("Leg1 compositions:");
        // console.log("------------------");
        for (let z = 0; z < vPoolLeg1.composition.js.length; z++) {
          //   console.log(
          //     "JK: " + getPoolName(pools, tokens, vPoolLeg1.composition.js[z])
          //   );

          //   console.log(
          //     "iK: " + getPoolName(pools, tokens, vPoolLeg1.composition.ks[z])
          //   );

          if (vPoolLeg1.composition.ks[z] == pool.poolAddress) {
            leg1IK = vPoolLeg1.composition.js[z];
          }
        }
        // console.log("Leg2 compositions:");
        // console.log("------------------");
        for (let z = 0; z < vPoolLeg2.composition.js.length; z++) {
          //   console.log(
          //     "JK: " + getPoolName(pools, tokens, vPoolLeg2.composition.js[z])
          //   );

          //   console.log(
          //     "iK: " + getPoolName(pools, tokens, vPoolLeg2.composition.ks[z])
          //   );

          if (vPoolLeg2.composition.ks[z] == pool.poolAddress) {
            leg2IK = vPoolLeg2.composition.js[z];
          }
        }

        console.log("vpool IK leg 1: " + getPoolName(pools, tokens, leg1IK));
        console.log("vpool IK leg 2: " + getPoolName(pools, tokens, leg2IK));

        let optionalTrades = [];

        //handling trade side 2 leg1
        console.log("Leg1 side trading options:");
        console.log("---------------------");
        for (let z = 0; z < vPoolLeg1.composition.js.length; z++) {
          let trade2Leg1PoolBalance = await queryDB(
            "SELECT * from vswap.pool_reserves WHERE poolAddress = '" +
              vPoolLeg1.composition.js[z] +
              "' AND reserveAddress = '" +
              pool.token0 +
              "';"
          );
          let cbalance = web3.utils.fromWei(
            trade2Leg1PoolBalance[0].balance,
            "ether"
          );
          console.log(
            "Pool: " +
              getPoolName(pools, tokens, vPoolLeg1.composition.js[z]) +
              " have " +
              cbalance +
              " of " +
              getTokenNameByAddress(tokens, pool.token0)
          );

          console.log(
            "IK: " + getPoolName(pools, tokens, vPoolLeg1.composition.ks[z])
          );

          optionalTrades.push({
            ik1: pool.poolAddress,
            jk1: leg1IK,
            ik2: vPoolLeg1.composition.js[z],
            jk2: vPoolLeg1.composition.ks[z],
            balance1Out: parsedBalance,
          });
        }

        console.log("Leg2 side 2 trading options:");
        console.log("---------------------");
        for (let z = 0; z < vPoolLeg2.composition.js.length; z++) {
          let trade2Leg2PoolBalance = await queryDB(
            "SELECT * from vswap.pool_reserves WHERE poolAddress = '" +
              vPoolLeg2.composition.js[z] +
              "' AND reserveAddress = '" +
              pool.token1 +
              "';"
          );
          let cbalance = web3.utils.fromWei(
            trade2Leg2PoolBalance[0].balance,
            "ether"
          );
          console.log(
            "Pool: " +
              getPoolName(pools, tokens, vPoolLeg2.composition.js[z]) +
              " have " +
              web3.utils.fromWei(trade2Leg2PoolBalance[0].balance, "ether") +
              " of " +
              getTokenNameByAddress(tokens, pool.token1)
          );
          console.log(
            "IK: " + getPoolName(pools, tokens, vPoolLeg2.composition.ks[z])
          );

          optionalTrades.push({
            ik1: pool.poolAddress,
            jk1: leg2IK,
            ik2: vPoolLeg2.composition.js[z],
            jk2: vPoolLeg2.composition.ks[z],
            balance1Out: parsedBalance,
          });
        }

        console.log("Possible trades:");
        console.log("----------------");
        for (let h = 0; h < optionalTrades.length; h++) {
          console.log(
            "Side 1 JK: " +
              getPoolName(pools, tokens, optionalTrades[h].jk1) +
              " Side 1 IK: " +
              getPoolName(pools, tokens, optionalTrades[h].ik1) +
              " Side 2 JK: " +
              getPoolName(pools, tokens, optionalTrades[h].jk2) +
              " Side 2 IK: " +
              getPoolName(pools, tokens, optionalTrades[h].ik2)
          );

          let vpool1 = await vRouter.methods
            .getVirtualPool(optionalTrades[h].jk1, optionalTrades[h].ik1)
            .call();

          let vpool2 = await vRouter.methods
            .getVirtualPool(optionalTrades[h].jk2, optionalTrades[h].ik2)
            .call();

          console.log(
            "Side 1 vPool: " +
              getTokenNameByAddress(tokens, vpool1.token0) +
              "/" +
              getTokenNameByAddress(tokens, vpool1.token1)
          );

          console.log(
            "Side 2 vPool: " +
              getTokenNameByAddress(tokens, vpool2.token0) +
              "/" +
              getTokenNameByAddress(tokens, vpool2.token1)
          );

          //for 10 CRV how much USDC
          let output =
            10 *
            (parseFloat(web3.utils.fromWei(vpool1.balance1, "ether")) /
              parseFloat(web3.utils.fromWei(vpool1.balance0, "ether")));

          //for 10 CRV how much USDC
          let output2 =
            10 *
            (parseFloat(web3.utils.fromWei(vpool2.balance0, "ether")) /
              parseFloat(web3.utils.fromWei(vpool2.balance1, "ether")));

          let b = 5;
          if (output2 >= output) {
            let data = getEncodedExchangeReserveCallbackParams(
              optionalTrades[h].jk1,
              optionalTrades[h].jk2,
              optionalTrades[h].ik2
            );
            try {
              const tx = await vExchangeReservesInstance.methods
                .exchange(
                  optionalTrades[h].jk1,
                  optionalTrades[h].ik1,
                  optionalTrades[h].jk2,
                  web3.utils.toWei(output2.toString(), "ether"),
                  data
                )
                .send({ from: accounts[0] });

              console.log("hash: " + tx.transactionHash);
            } catch (ex) {
              console.log("Exception: " + JSON.stringify(ex));
            }
          }
        }
      }

      let a = 5;
    }
  }
}

run().then((r) => {
  console.log(r);
});
