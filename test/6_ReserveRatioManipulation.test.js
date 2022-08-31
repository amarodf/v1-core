const vRouter = artifacts.require("vRouter");
const vPair = artifacts.require("vPair");
const vPairFactory = artifacts.require("vPairFactory");
const vSwapLibrary = artifacts.require("vSwapLibrary");
const ERC20 = artifacts.require("ERC20PresetFixedSupply");
const { expect, assert } = require("chai");
const { getEncodedSwapData } = require("./utils");


// ## Based on https://docs.google.com/spreadsheets/d/1OW2c76WO-FvI4dp-5HB0LGUbDfv_YzVw/edit?usp=sharing&ouid=100308376099877825660&rtpof=true&sd=true
contract("ReserveRatio Manipulation", (accounts) => {
  function fromWeiToNumber(number) {
    return (
      parseFloat(web3.utils.fromWei(number.toString(), "ether")).toFixed(6) * 1
    );
  }

  async function getFutureBlockTimestamp() {
    const blockNumber = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(blockNumber);
    return block.timestamp + 1000000;
  }

  const A_PRICE = 1;
  const B_PRICE = 2;
  const C_PRICE = 6;
  const D_PRICE = 10;

  let tokenA, tokenB, tokenC, tokenD;

  const issueAmount = web3.utils.toWei("100000000000000", "ether");

  let vPairFactoryInstance, vRouterInstance, vSwapLibraryInstance;

  beforeEach(async () => {
    tokenA = await ERC20.new("tokenA", "A", issueAmount, accounts[0]);

    tokenB = await ERC20.new("tokenB", "B", issueAmount, accounts[0]);

    tokenC = await ERC20.new("tokenC", "C", issueAmount, accounts[0]);

    tokenD = await ERC20.new("tokenD", "D", issueAmount, accounts[0]);

    vPairFactoryInstance = await vPairFactory.deployed();
    vRouterInstance = await vRouter.deployed();
    vSwapLibraryInstance = await vSwapLibrary.deployed();

    await tokenA.approve(vRouterInstance.address, issueAmount);
    await tokenB.approve(vRouterInstance.address, issueAmount);
    await tokenC.approve(vRouterInstance.address, issueAmount);
    await tokenD.approve(vRouterInstance.address, issueAmount);

    const futureTs = await getFutureBlockTimestamp();

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenB.address,
      web3.utils.toWei("100", "ether"),
      web3.utils.toWei("100", "ether"),
      web3.utils.toWei("100", "ether"),
      web3.utils.toWei("100", "ether"),
      accounts[0],
      futureTs
    );

    //create pool A/C
    //create pool A/B with 10,000 A and equivalent C

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenC.address,
      web3.utils.toWei("50", "ether"),
      web3.utils.toWei("200", "ether"),
      web3.utils.toWei("50", "ether"),
      web3.utils.toWei("200", "ether"),
      accounts[0],
      futureTs
    );

    //create pool B/C
    //create pool B/C with 10,000 B and equivalent C

    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenC.address,
      web3.utils.toWei("50", "ether"),
      web3.utils.toWei("200", "ether"),
      web3.utils.toWei("50", "ether"),
      web3.utils.toWei("200", "ether"),
      accounts[0],
      futureTs
    );

    //whitelist tokens in pools

    //pool 1
    const address = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenB.address
    );
    const pool = await vPair.at(address);
    await pool.setMaxReserveThreshold(web3.utils.toWei("100000", "ether"));
    //whitelist token C
    await pool.setWhitelist([tokenC.address, tokenD.address]);

    let reserve0 = await pool.reserve0();
    let reserve1 = await pool.reserve1();

    reserve0 = fromWeiToNumber(reserve0);
    reserve1 = fromWeiToNumber(reserve1);

    // console.log("pool1: A/B: " + reserve0 + "/" + reserve1);

    //pool 2
    const address2 = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );
    const pool2 = await vPair.at(address2);

    //whitelist token B
    await pool2.setWhitelist([tokenB.address, tokenD.address]);
    await pool2.setMaxReserveThreshold(web3.utils.toWei("100000", "ether"));
    let reserve0Pool2 = await pool2.reserve0();
    let reserve1Pool2 = await pool2.reserve1();

    reserve0Pool2 = fromWeiToNumber(reserve0Pool2);
    reserve1Pool2 = fromWeiToNumber(reserve1Pool2);

    // console.log("pool2: A/C: " + reserve0Pool2 + "/" + reserve1Pool2);

    //pool 3
    const address3 = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenC.address
    );
    const pool3 = await vPair.at(address3);

    //whitelist token A
    await pool3.setWhitelist([tokenA.address, tokenD.address]);
    await pool3.setMaxReserveThreshold(web3.utils.toWei("100000", "ether"));

    let reserve0Pool3 = await pool3.reserve0();
    let reserve1Pool3 = await pool3.reserve1();

    reserve0Pool3 = fromWeiToNumber(reserve0Pool3);
    reserve1Pool3 = fromWeiToNumber(reserve1Pool3);

    // console.log("pool3: B/C: " + reserve0Pool3 + "/" + reserve1Pool3);
  });

  it("Normal trade: send 1B to AC", async () => {
    const ikPair = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenB.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );
    let amountIn = web3.utils.toWei("1", "ether");
    let amountOut = await vRouterInstance.getVirtualAmountOut(
      jkPair,
      ikPair,
      amountIn
    );
    const futureTs = await getFutureBlockTimestamp();

    await vRouterInstance.swapReserveToExactNative(
      tokenC.address,
      tokenA.address,
      ikPair,
      amountOut,
      amountIn,
      accounts[0],
      futureTs
    );
  });

  it("Manipulation 1: manipulating pool AB in order to reduce reserve ratio (i.e. making A more expensive)", async () => {
    console.log("===========================================");
    console.log("STEP1: Buying A and paying 300 B in pool AB");
    console.log("===========================================");

    let amountIn = web3.utils.toWei("300", "ether");
    let amountOut = await vRouterInstance.getAmountOut(
      tokenB.address,
      tokenA.address,
      amountIn
    );

    const futureTs = await getFutureBlockTimestamp();
    await vRouterInstance.swapToExactNative(
      tokenB.address,
      tokenA.address,
      amountOut,
      amountIn,
      accounts[0],
      futureTs
    );

    console.log("===========================================");
    console.log("STEP2: send 1B to pool AC");
    console.log("===========================================");

    const ikPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );

    let amountBIn = web3.utils.toWei("1", "ether");
    let amountCOut = await vRouterInstance.getVirtualAmountOut(
      jkPair,
      ikPair,
      amountBIn
    );

    console.log("Amount B Sent to pool: " + fromWeiToNumber(amountBIn));
    console.log("Amount C Received from pool " + fromWeiToNumber(amountCOut));
    const futureTs2 = await getFutureBlockTimestamp();
    let jkPairInstance = await vPair.at(jkPair);

    let rrBefore = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio before " + fromWeiToNumber(rrBefore) / 1000 + "%"
    );

    await vRouterInstance.swapReserveToExactNative(
      tokenC.address,
      tokenA.address,
      ikPair,
      amountCOut,
      amountBIn,
      accounts[0],
      futureTs2
    );

    let reserveRatioAfter = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio after " + fromWeiToNumber(reserveRatioAfter) / 1000 + "%"
    );
  });

  it("Manipulation 2: manipulating pool AB in order to make B more expensive (and get more C in the trade)", async () => {
    console.log("===========================================");
    console.log("STEP1: Buying B and paying 300A in pool AB");
    console.log("===========================================");

    let amountIn = web3.utils.toWei("300", "ether");
    let amountOut = await vRouterInstance.getAmountOut(
      tokenA.address,
      tokenB.address,
      amountIn
    );

    const futureTs = await getFutureBlockTimestamp();
    await vRouterInstance.swapToExactNative(
      tokenA.address,
      tokenB.address,
      amountOut,
      amountIn,
      accounts[0],
      futureTs
    );

    console.log("===========================================");
    console.log("STEP2: send 1B to pool AC");
    console.log("===========================================");

    const ikPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );

    let amountBIn = web3.utils.toWei("1", "ether");
    let amountCOut = await vRouterInstance.getVirtualAmountOut(
      jkPair,
      ikPair,
      amountBIn
    );

    console.log("Amount B Sent to pool: " + fromWeiToNumber(amountBIn));
    console.log("Amount C Received from pool " + fromWeiToNumber(amountCOut));
    const futureTs2 = await getFutureBlockTimestamp();
    let jkPairInstance = await vPair.at(jkPair);

    let rrBefore = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio before " + fromWeiToNumber(rrBefore) / 1000 + "%"
    );

    let cBalance = await tokenC.balanceOf(jkPair);
    let aBalance = await tokenA.balanceOf(jkPair);
    let bBalance = await tokenB.balanceOf(jkPair);

    console.log("cBalance " + cBalance);
    console.log("aBalance " + aBalance);
    console.log("bBalance " + bBalance);

    let vPool = await vRouterInstance.getVirtualPool(jkPair, ikPair);
    console.log(JSON.stringify(vPool));

    await vRouterInstance.swapReserveToExactNative(
      tokenC.address,
      tokenA.address,
      ikPair,
      amountCOut,
      amountBIn,
      accounts[0],
      futureTs2
    );

    let cBalanceAfter = await tokenC.balanceOf(jkPair);
    let aBalanceAfter = await tokenA.balanceOf(jkPair);
    let bBalanceAfter = await tokenB.balanceOf(jkPair);

    console.log("cBalanceAfter " + cBalanceAfter);
    console.log("aBalanceAfter " + aBalanceAfter);
    console.log("bBalanceAfter " + bBalanceAfter);

    let reserveRatioAfter = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio after " + fromWeiToNumber(reserveRatioAfter) / 1000 + "%"
    );
  });

  it("Manipulation 3: manipulating pool AC in order to make C cheaper (and get more C in the trade)", async () => {
    console.log("===========================================");
    console.log("STEP1: Buying A and paying 300C in pool AC");
    console.log("===========================================");

    let amountIn = web3.utils.toWei("300", "ether");
    let amountOut = await vRouterInstance.getAmountOut(
      tokenC.address,
      tokenA.address,
      amountIn
    );

    const futureTs = await getFutureBlockTimestamp();
    await vRouterInstance.swapToExactNative(
      tokenC.address,
      tokenA.address,
      amountOut,
      amountIn,
      accounts[0],
      futureTs
    );

    console.log("===========================================");
    console.log("STEP2: send 1B to pool AC");
    console.log("===========================================");

    const ikPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );

    let amountBIn = web3.utils.toWei("1", "ether");
    let amountCOut = await vRouterInstance.getVirtualAmountOut(
      jkPair,
      ikPair,
      amountBIn
    );

    console.log("Amount B Sent to pool: " + fromWeiToNumber(amountBIn));
    console.log("Amount C Received from pool " + fromWeiToNumber(amountCOut));
    const futureTs2 = await getFutureBlockTimestamp();
    let jkPairInstance = await vPair.at(jkPair);

    let rrBefore = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio before " + fromWeiToNumber(rrBefore) / 1000 + "%"
    );

    let cBalance = await tokenC.balanceOf(jkPair);
    let aBalance = await tokenA.balanceOf(jkPair);
    let bBalance = await tokenB.balanceOf(jkPair);

    console.log("cBalance " + cBalance);
    console.log("aBalance " + aBalance);
    console.log("bBalance " + bBalance);

    let vPool = await vRouterInstance.getVirtualPool(jkPair, ikPair);
    console.log(JSON.stringify(vPool));

    await vRouterInstance.swapReserveToExactNative(
      tokenC.address,
      tokenA.address,
      ikPair,
      amountCOut,
      amountBIn,
      accounts[0],
      futureTs2
    );

    let cBalanceAfter = await tokenC.balanceOf(jkPair);
    let aBalanceAfter = await tokenA.balanceOf(jkPair);
    let bBalanceAfter = await tokenB.balanceOf(jkPair);

    console.log("cBalanceAfter " + cBalanceAfter);
    console.log("aBalanceAfter " + aBalanceAfter);
    console.log("bBalanceAfter " + bBalanceAfter);

    let reserveRatioAfter = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio after " + fromWeiToNumber(reserveRatioAfter) / 1000 + "%"
    );
  });

  it("Manipulation 4: manipulating pool AC in order to make C cheaper (and get more C in the trade)", async () => {
    console.log("===========================================");
    console.log("STEP1: Buying C and paying 300A in pool AC");
    console.log("===========================================");

    let amountIn = web3.utils.toWei("300", "ether");
    let amountOut = await vRouterInstance.getAmountOut(
      tokenA.address,
      tokenC.address,
      amountIn
    );

    const futureTs = await getFutureBlockTimestamp();
    await vRouterInstance.swapToExactNative(
      tokenA.address,
      tokenC.address,
      amountOut,
      amountIn,
      accounts[0],
      futureTs
    );

    console.log("===========================================");
    console.log("STEP2: send 1B to pool AC");
    console.log("===========================================");

    const ikPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );

    let amountBIn = web3.utils.toWei("1", "ether");
    let amountCOut = await vRouterInstance.getVirtualAmountOut(
      jkPair,
      ikPair,
      amountBIn
    );

    console.log("Amount B Sent to pool: " + fromWeiToNumber(amountBIn));
    console.log("Amount C Received from pool " + fromWeiToNumber(amountCOut));
    const futureTs2 = await getFutureBlockTimestamp();
    let jkPairInstance = await vPair.at(jkPair);

    let rrBefore = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio before " + fromWeiToNumber(rrBefore) / 1000 + "%"
    );

    let cBalance = await tokenC.balanceOf(jkPair);
    let aBalance = await tokenA.balanceOf(jkPair);
    let bBalance = await tokenB.balanceOf(jkPair);

    console.log("cBalance " + cBalance);
    console.log("aBalance " + aBalance);
    console.log("bBalance " + bBalance);

    let vPool = await vRouterInstance.getVirtualPool(jkPair, ikPair);
    console.log(JSON.stringify(vPool));

    await vRouterInstance.swapReserveToExactNative(
      tokenC.address,
      tokenA.address,
      ikPair,
      amountCOut,
      amountBIn,
      accounts[0],
      futureTs2
    );

    let cBalanceAfter = await tokenC.balanceOf(jkPair);
    let aBalanceAfter = await tokenA.balanceOf(jkPair);
    let bBalanceAfter = await tokenB.balanceOf(jkPair);

    console.log("cBalanceAfter " + cBalanceAfter);
    console.log("aBalanceAfter " + aBalanceAfter);
    console.log("bBalanceAfter " + bBalanceAfter);

    let reserveRatioAfter = await jkPairInstance.calculateReserveRatio();
    console.log(
      "reserveRatio after " + fromWeiToNumber(reserveRatioAfter) / 1000 + "%"
    );
  });
});
