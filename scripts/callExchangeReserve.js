const Web3 = require("web3");
const { utils } = require("ethers");
const vRouterJson = require("../build/contracts/vRouter.json");

const vExchangeReserves = require("../build/contracts/vExchangeReserves.json");
const HDWalletProvider = require("@truffle/hdwallet-provider");

var polygonProvider = new HDWalletProvider(
  "e54c2a00a06b318911488e40fb1c744c58fb20ada0509c32d86cb4d79206ee41",
  `https://morning-twilight-cherry.matic-testnet.quiknode.pro/6ba9d2c5b8a046814b28f974c3643c679914f7ff/`
);

const web3 = new Web3(polygonProvider);

function getEncodedExchangeReserveCallbackParams(jkPair1, jkPair2, ikPair2) {
  return utils.defaultAbiCoder.encode(
    ["address", "address", "address"],
    [jkPair1, jkPair2, ikPair2]
  );
}

const vExchangeReservesInstance = new web3.eth.Contract(
  vExchangeReserves.abi,
  "0x1e3D868A2c24343aFb4D0A418597A7931D98EC49"
);

const vRouterInstance = new web3.eth.Contract(
  vRouterJson.abi,
  "0x9990a157EDdd671Fc57b596b5F3e6C5fAe5FbDb7"
);

async function run() {
  let accounts = await web3.eth.getAccounts();

  let jk1 = "0xCEe4Bbb54318279844D9b7E738b2Fba6a125D872"; // USDT / WMATIC [QUICK]
  let ik1 = "0x667373F4f78a863A5C93E5059E52aBF32c4D94fb"; // USDT / QUICK

  let jk2 = "0x6F961b5455F4400E0324D52EF70Ea7540bFD50aD"; // USDC / QUICK [WMATIC]
  let ik2 = "0x682422d6f06D67Dfa6d02068BdbcB3D5d64cEA9C"; // USDC / WMATIC

  let balanceWMATIC = web3.utils.toWei("10", "ether");

  let vRouter = vRouterInstance.methods;

  let QUICKWMATICPOOL = await vRouter.getVirtualPool(jk1, ik1).call();

  let WMATICQUICKPOOL = await vRouter.getVirtualPool(jk2, ik2).call();

  console.log(
    "JK1 QUICK: " +
      web3.utils.fromWei(QUICKWMATICPOOL.balance0, "ether") +
      " WMATIC: " +
      web3.utils.fromWei(QUICKWMATICPOOL.balance1, "ether")
  );

  console.log(
    "JK2 WMATIC: " +
      web3.utils.fromWei(WMATICQUICKPOOL.balance0, "ether") +
      " QUICK: " +
      web3.utils.fromWei(WMATICQUICKPOOL.balance1, "ether")
  );

  //how much Link should i repay for 10 WMATIC
  let vpool1AmountIn1 = await vRouter
    .getVirtualAmountIn(ik1, jk1, balanceWMATIC)
    .call();

  //how much link i would get for 10 WMATIC
  let vpool1AmountOut2 = await vRouter
    .getVirtualAmountOut(ik2, jk2, balanceWMATIC)
    .call();

  console.log(
    "1. to buy 10 WMATIC from pool USDC/LINK(JK1) i should repay: " +
      web3.utils.fromWei(vpool1AmountIn1, "ether") +
      " LINK"
  );

  console.log(
    "2. Selling 10 WMATIC to pool WMATIC/WETH(jk2) i will receive: " +
      web3.utils.fromWei(vpool1AmountOut2, "ether") +
      " LINK"
  );
}

run().then((a) => {
  console.log(a);
});
