const vRouter = artifacts.require("vRouter");
const vPair = artifacts.require("vPair");
const vPairFactory = artifacts.require("vPairFactory");
const vSwapMath = artifacts.require("vSwapMath");
const ERC20 = artifacts.require("ERC20PresetFixedSupply");
const catchRevert = require("./exceptions");

contract("ReserveRatio", (accounts) => {
  function fromWeiToNumber(number) {
    return parseFloat(web3.utils.fromWei(number, "ether")).toFixed(6) * 1;
  }

  async function getFutureBlockTimestamp() {
    const blockNumber = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(blockNumber);
    return block.timestamp + 1000000;
  }

  const A_PRICE = 1;
  const B_PRICE = 3;
  const C_PRICE = 6;
  const D_PRICE = 10;

  let tokenA, tokenB, tokenC, tokenD, WETH;

  const issueAmount = web3.utils.toWei("100000000000000", "ether");

  let vPairFactoryInstance, vRouterInstance, vSwapMathInstance;

  before(async () => {
    tokenA = await ERC20.new("tokenA", "A", issueAmount, accounts[0]);

    tokenB = await ERC20.new("tokenB", "B", issueAmount, accounts[0]);

    tokenC = await ERC20.new("tokenC", "C", issueAmount, accounts[0]);

    tokenD = await ERC20.new("tokenD", "D", issueAmount, accounts[0]);

    vPairFactoryInstance = await vPairFactory.deployed();
    vRouterInstance = await vRouter.deployed();
    vSwapMathInstance = await vSwapMath.deployed();

    await tokenA.approve(vRouterInstance.address, issueAmount);
    await tokenB.approve(vRouterInstance.address, issueAmount);
    await tokenC.approve(vRouterInstance.address, issueAmount);
    await tokenD.approve(vRouterInstance.address, issueAmount);

    const futureTs = await getFutureBlockTimestamp();

    //create pool A/B with 10,000 A and equivalent B
    let AInput = 10000 * A_PRICE;
    let BInput = (B_PRICE / A_PRICE) * AInput;

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenB.address,
      web3.utils.toWei(AInput.toString(), "ether"),
      web3.utils.toWei(BInput.toString(), "ether"),
      web3.utils.toWei(AInput.toString(), "ether"),
      web3.utils.toWei(BInput.toString(), "ether"),
      accounts[0],
      futureTs
    );

    //create pool A/C
    //create pool A/B with 10,000 A and equivalent C

    let CInput = (C_PRICE / A_PRICE) * AInput;
    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenC.address,
      web3.utils.toWei(AInput.toString(), "ether"),
      web3.utils.toWei(CInput.toString(), "ether"),
      web3.utils.toWei(AInput.toString(), "ether"),
      web3.utils.toWei(CInput.toString(), "ether"),
      accounts[0],
      futureTs
    );

    //create pool B/C
    //create pool B/C with 10,000 B and equivalent C
    BInput = 20000 * B_PRICE;
    CInput = (C_PRICE / B_PRICE) * BInput;
    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenC.address,
      web3.utils.toWei(BInput.toString(), "ether"),
      web3.utils.toWei(CInput.toString(), "ether"),
      web3.utils.toWei(BInput.toString(), "ether"),
      web3.utils.toWei(CInput.toString(), "ether"),
      accounts[0],
      futureTs
    );

    //create pool B/D
    //create pool B/D with 10,000 B and equivalent C
    BInput = 50000 * B_PRICE;
    let DInput = (D_PRICE / B_PRICE) * BInput;
    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      web3.utils.toWei(BInput.toString(), "ether"),
      web3.utils.toWei(DInput.toString(), "ether"),
      web3.utils.toWei(BInput.toString(), "ether"),
      web3.utils.toWei(DInput.toString(), "ether"),
      accounts[0],
      futureTs
    );

    //whitelist tokens in pools

    //print tokens
    console.log("tokenA: " + tokenA.address);
    console.log("tokenB: " + tokenB.address);
    console.log("tokenC: " + tokenC.address);
    console.log("tokenD: " + tokenD.address);
    //print liquidites

    //pool 1
    const address = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenB.address
    );
    const pool = await vPair.at(address);

    //whitelist token C
    await pool.setWhitelist([tokenC.address, tokenD.address]);

    let reserve0 = await pool.reserve0();
    let reserve1 = await pool.reserve1();

    reserve0 = fromWeiToNumber(reserve0);
    reserve1 = fromWeiToNumber(reserve1);

    console.log("pool1: A/B: " + reserve0 + "/" + reserve1);

    //pool 2
    const address2 = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );
    const pool2 = await vPair.at(address2);

    //whitelist token B
    await pool2.setWhitelist([tokenB.address, tokenD.address]);

    let reserve0Pool2 = await pool2.reserve0();
    let reserve1Pool2 = await pool2.reserve1();

    reserve0Pool2 = fromWeiToNumber(reserve0Pool2);
    reserve1Pool2 = fromWeiToNumber(reserve1Pool2);

    console.log("pool2: A/C: " + reserve0Pool2 + "/" + reserve1Pool2);

    //pool 3
    const address3 = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenC.address
    );
    const pool3 = await vPair.at(address3);

    //whitelist token A
    await pool3.setWhitelist([tokenA.address, tokenD.address]);

    let reserve0Pool3 = await pool3.reserve0();
    let reserve1Pool3 = await pool3.reserve1();

    reserve0Pool3 = fromWeiToNumber(reserve0Pool3);
    reserve1Pool3 = fromWeiToNumber(reserve1Pool3);

    console.log("pool3: B/C: " + reserve0Pool3 + "/" + reserve1Pool3);

    //pool 4
    const address4 = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenD.address
    );
    const pool4 = await vPair.at(address4);

    //whitelist token A
    await pool4.setWhitelist([tokenA.address, tokenC.address]);

    let reserve0Pool4 = await pool4.reserve0();
    let reserve1Pool4 = await pool4.reserve1();

    reserve0Pool4 = fromWeiToNumber(reserve0Pool4);
    reserve1Pool4 = fromWeiToNumber(reserve1Pool4);

    console.log("pool4: B/D: " + reserve0Pool4 + "/" + reserve1Pool4);
  });

  it("Should increase reserve ratio of C after adding C to pool A/B", async () => {
    const ikPair = await vPairFactoryInstance.getPair(
      tokenC.address,
      tokenB.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    let amountOut = web3.utils.toWei("15", "ether");

    const amountIn = await vRouterInstance.getVirtualAmountIn(
      jkPair,
      ikPair,
      amountOut
    );

    const pool = await vPair.at(jkPair);

    const futureTs = await getFutureBlockTimestamp();

    let tokenCReserve = await pool.reserveRatio(tokenC.address);
    await vRouterInstance.swap(
      [jkPair],
      [amountIn],
      [amountOut],
      [ikPair],
      tokenC.address,
      tokenA.address,
      accounts[0],
      futureTs
    );

    let tokenCReserveAfter = await pool.reserveRatio(tokenC.address);
    expect(fromWeiToNumber(tokenCReserve)).to.lessThan(
      fromWeiToNumber(tokenCReserveAfter)
    );
  });

  it("Should increase reserve ratio of D after adding D to pool A/B", async () => {
    const ikPair = await vPairFactoryInstance.getPair(
      tokenD.address,
      tokenB.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    let amountOut = web3.utils.toWei("150", "ether");

    const amountIn = await vRouterInstance.getVirtualAmountIn(
      jkPair,
      ikPair,
      amountOut
    );

    const pool = await vPair.at(jkPair);

    const futureTs = await getFutureBlockTimestamp();

    let tokenDReserve = await pool.reserveRatio(tokenD.address);
    await vRouterInstance.swap(
      [jkPair],
      [amountIn],
      [amountOut],
      [ikPair],
      tokenD.address,
      tokenA.address,
      accounts[0],
      futureTs
    );

    let tokenDReserveAfter = await pool.reserveRatio(tokenD.address);
    expect(fromWeiToNumber(tokenDReserve)).to.lessThan(
      fromWeiToNumber(tokenDReserveAfter)
    );
  });

  it("Assert pool A/B calculateReserveRatio() > 0", async () => {
    const jkPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    const pool = await vPair.at(jkPair);
    const poolReserveRatio = await pool.calculateReserveRatio();

    assert(fromWeiToNumber(poolReserveRatio) > 0, "Reserve ratio invalid");
  });

  it("Assert pool A/B calculateReserveRatio is correct ", async () => {
    const jkPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    let pool = await vPair.at(jkPair);
    let poolReserveRatio = await pool.calculateReserveRatio();

    let poolCReserves = await pool.reserveRatio(tokenC.address);
    let poolDReserves = await pool.reserveRatio(tokenD.address);

    poolCReserves = fromWeiToNumber(poolCReserves);
    poolDReserves = fromWeiToNumber(poolDReserves);

    let totalReserves = poolCReserves + poolDReserves;

    let reserve0 = await pool.reserve0();
    reserve0 = fromWeiToNumber(reserve0);
    let poolLiquidity = reserve0 * 2;

    let reserveRatioPCT =
      ((totalReserves / poolLiquidity) * 100).toFixed(3) * 1;
    poolReserveRatio = fromWeiToNumber(poolReserveRatio);

    assert.equal(
      (poolReserveRatio / 1000).toFixed(3) * 1,
      reserveRatioPCT,
      "Pool reserve ratio is not equal to calculated in test"
    );
  });

  it("Should add liquidity and deduct reserve ratio", async () => {
    const jkPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    let pool = await vPair.at(jkPair);
    let poolReserveRatio = await pool.calculateReserveRatio();

    let amountADesired = web3.utils.toWei("1", "ether");

    const amountBDesired = await vRouterInstance.quote(
      tokenA.address,
      tokenB.address,
      amountADesired
    );

    let reserve0 = await pool.reserve0();
    let reserve1 = await pool.reserve1();

    let poolReserve0Before = reserve0;
    let poolReserve1Before = reserve1;

    const futureTs = await getFutureBlockTimestamp();

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenB.address,
      amountADesired,
      amountBDesired,
      amountADesired,
      amountBDesired,
      accounts[0],
      futureTs
    );

    reserve0 = await pool.reserve0();
    reserve1 = await pool.reserve1();

    let poolReserve0After = reserve0;
    let poolReserve1After = reserve1;

    expect(Number(poolReserve0Before.toString())).to.lessThan(
      Number(poolReserve0After.toString())
    );

    expect(Number(poolReserve1Before.toString())).to.lessThan(
      Number(poolReserve1After.toString())
    );
  });

  it("Should revert swap that goes beyond reserve ratio", async () => {
    const ikPair = await vPairFactoryInstance.getPair(
      tokenD.address,
      tokenB.address
    );

    const jkPair = await vPairFactoryInstance.getPair(
      tokenB.address,
      tokenA.address
    );

    let amountOut = web3.utils.toWei("1500", "ether");

    const amountIn = await vRouterInstance.getVirtualAmountIn(
      jkPair,
      ikPair,
      amountOut
    );

    const futureTs = await getFutureBlockTimestamp();
    await catchRevert(
      await vRouterInstance.swap(
        [jkPair],
        [amountIn],
        [amountOut],
        [ikPair],
        tokenD.address,
        tokenA.address,
        accounts[0],
        futureTs
      )
    );
  });

  it("Should distribute reserve tokens on removeLiquidity and update reserve ratios", async () => {});
});
