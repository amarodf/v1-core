import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { tokensFixture } from "./fixtures/tokensFixture";
import { ethers } from "hardhat";
import utils from "./utils";
import _ from "lodash";
import { VRouter__factory, VPair__factory } from "../typechain-types/index";
import { BigNumber } from "ethers";

const EPS = 0.000001;

async function swapInNativePool(
  vRouterInstance: any,
  trader: any,
  sellToken: any,
  buyToken: any,
  amountIn: any,
  futureTs: any
) {
  let amountOut = await vRouterInstance.getAmountOut(
    sellToken.address,
    buyToken.address,
    amountIn
  );

  let str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapExactOutput", [
    sellToken.address,
    buyToken.address,
    amountOut,
    amountIn,
    trader.address,
    futureTs,
  ]);

  return str;
}

async function swapInReservePool(
  vRouterInstance: any,
  trader: any,
  mainPool: any,
  supportPool: any,
  sellToken: any,
  buyToken: any,
  amountIn: any,
  futureTs: any
) {
  let amountOut = await vRouterInstance.getVirtualAmountOut(
    mainPool.address,
    supportPool.address,
    amountIn
  );

  let str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapReserveExactOutput", [
    buyToken.address,
    sellToken.address,
    supportPool.address,
    amountOut,
    amountIn,
    trader.address,
    futureTs,
  ]);

  return str;
}

async function createPool(
  vRouterInstance: any,
  vPairFactoryInstance: any,
  owner: any,
  trader: any,
  leftToken: any,
  rightToken: any,
  leftInput: any,
  rightInput: any,
  fee: any
) {
  await vRouterInstance.addLiquidity(
    leftToken.address,
    rightToken.address,
    ethers.utils.parseEther(leftInput.toString()),
    ethers.utils.parseEther(rightInput.toString()),
    ethers.utils.parseEther(leftInput.toString()),
    ethers.utils.parseEther(rightInput.toString()),
    trader.address,
    await utils.getFutureBlockTimestamp()
  );

  const abAddress = await vPairFactoryInstance.getPair(
    leftToken.address,
    rightToken.address
  );

  const pool = VPair__factory.connect(abAddress, owner);
  await pool.setFee(fee, fee);
  await pool.setMaxReserveThreshold(ethers.utils.parseEther("10000"));

  return pool;
}

function calculateNativeAmountOut(
  amountSell: number,
  amountBuy: number,
  amountIn: number,
  tradingFee: number
): number {
  return (
    +amountBuy -
    (+amountBuy * +amountSell) / (+amountSell + amountIn * (1 - tradingFee))
  );
}

function calculateReserveAmountOut(
  amountReserve: number,
  amountSellInPool: number,
  amountSellInNativePool: number,
  amountBuyInPool: number,
  amountReserveInNative: number,
  tradingFee: number
): number {
  const amountSell = Math.min(amountSellInNativePool, amountSellInPool);
  const leftSide = (amountBuyInPool * amountSell) / amountSellInPool;
  const rightSide =
    (amountReserveInNative * amountSell) / amountSellInNativePool;
  return (
    leftSide -
    (leftSide * rightSide) / (+rightSide + +amountReserve * (1 - tradingFee))
  );
}

describe("Pyotr tests", () => {
  let accounts: any = [];
  let fixture: any = {};

  before(async function () {
    fixture = await loadFixture(tokensFixture);

    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    fixture.abFee = "990";
    fixture.acFee = "980";
    fixture.adFee = "985";
    fixture.bcFee = "966";
    fixture.bdFee = "999";
    fixture.cdFee = "950";

    fixture

    const account1 = fixture.accounts[0];
    await tokenA.transfer(account1.address, 10000);
    await tokenB.transfer(account1.address, 4000);
    await tokenC.transfer(account1.address, 2000);
    await tokenD.transfer(account1.address, 10100);

    const account2 = fixture.accounts[1];
    await tokenA.transfer(account2.address, 4000);
    await tokenB.transfer(account2.address, 2000);
    await tokenC.transfer(account2.address, 4100);
    await tokenD.transfer(account2.address, 8000);

    const account3 = fixture.accounts[2];
    await tokenB.transfer(account3.address, 20000);
    await tokenD.transfer(account3.address, 20000);

    const account4 = fixture.accounts[3];
    await tokenC.transfer(account4.address, 40);
    await tokenD.transfer(account4.address, 460);

    const account5 = fixture.accounts[4];
    await tokenB.transfer(account5.address, 20000);
    await tokenD.transfer(account5.address, 30000);
  });

  it("Test 1: Intital Liquidity Provision for A/B, trader 0, 300-333", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const trader = fixture.accounts[0];

    const vRouterInstance = fixture.vRouterInstance;

    let AInput = 300;
    let BInput = 333;

    const abPool = await createPool(
      vRouterInstance,
      fixture.vPairFactoryInstance,
      fixture.owner,
      trader,
      tokenA,
      tokenB,
      AInput,
      BInput,
      fixture.abFee
    );
    await abPool.setAllowList([fixture.tokenC.address]);

    fixture.abPool = abPool;

    const lp_tokens_gained_in_wei = await abPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(AInput * BInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 2: Initial Liquidity Proivsion for A/C, trader 0, 1000-100", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const trader = fixture.accounts[0];

    const vRouterInstance = fixture.vRouterInstance;

    let AInput = 1000;
    let CInput = 100;

    const acPool = await createPool(
      vRouterInstance,
      fixture.vPairFactoryInstance,
      fixture.owner,
      trader,
      tokenA,
      tokenC,
      AInput,
      CInput,
      fixture.acFee
    );
    await acPool.setAllowList([fixture.tokenB.address]);

    fixture.acPool = acPool;

    const lp_tokens_gained_in_wei = await acPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(AInput * CInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 3: Initial Liquidity Proivsion for B/D, trader 1, 99-100", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[1];
    const vRouterInstance = fixture.vRouterInstance;

    let BInput = 99;
    let DInput = 100;

    const bdPool = await createPool(
      vRouterInstance,
      fixture.vPairFactoryInstance,
      fixture.owner,
      trader,
      tokenB,
      tokenD,
      BInput,
      DInput,
      fixture.bdFee
    );
    await bdPool.setAllowList([fixture.tokenA.address, fixture.tokenC.address]);
    fixture.bdPool = bdPool;

    const lp_tokens_gained_in_wei = await bdPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(BInput * DInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 4: Initial Liquidity Proivsion for A/D, trader 1, 250-550", async () => {
    const tokenA = fixture.tokenA;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[1];

    const vRouterInstance = fixture.vRouterInstance;

    let AInput = 250;
    let DInput = 550;

    const adPool = await createPool(
      vRouterInstance,
      fixture.vPairFactoryInstance,
      fixture.owner,
      trader,
      tokenA,
      tokenD,
      AInput,
      DInput,
      fixture.adFee
    );
    await adPool.setAllowList([fixture.tokenB.address, fixture.tokenC.address]);
    fixture.adPool = adPool;

    const lp_tokens_gained_in_wei = await adPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(AInput * DInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 5: Complex Swap A --> D", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAD = ethers.utils.parseEther("1");
    const amountInBD = ethers.utils.parseEther("1");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
    const tokenAPoolBDBalanceBefore = await tokenA.balanceOf(bdPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);

    const tokenDPoolABBalanceBefore = await tokenD.balanceOf(abPool.address);
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);

    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenA,
      tokenD,
      amountInAD,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      abPool,
      tokenB,
      tokenD,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const tokenAPoolABBalanceAfter = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceAfter = await tokenA.balanceOf(adPool.address);
    const tokenAPoolBDBalanceAfter = await tokenA.balanceOf(bdPool.address);

    const tokenDPoolABBalanceAfter = await tokenD.balanceOf(abPool.address);
    const tokenDPoolADBalanceAfter = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceAfter = await tokenD.balanceOf(bdPool.address);

    const mathAmountOut0 = calculateNativeAmountOut(
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(amountInAD.toString()),
      1 - Number(fixture.adFee) / 1000
    );

    const mathAmountOut1 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const differenceA =
      +ethers.utils.formatEther(amountInAD.toString()) +
      +ethers.utils.formatEther(amountInBD.toString());

    const differenceAinAD = Math.abs(
      tokenAPoolADBalanceAfter - tokenAPoolADBalanceBefore
    );
    const differenceAinBD = Math.abs(
      tokenAPoolBDBalanceAfter - tokenAPoolBDBalanceBefore
    );
    const differenceDinBD = Math.abs(
      tokenDPoolBDBalanceAfter - tokenDPoolBDBalanceBefore
    );

    const differenceDinAD = Math.abs(
      tokenDPoolADBalanceAfter - tokenDPoolADBalanceBefore
    );

    const AinAD = ethers.utils.formatEther(differenceAinAD.toString());
    const DoutAD = ethers.utils.formatEther(differenceDinAD.toString());
    const AinBD = ethers.utils.formatEther(differenceAinBD.toString());
    const DoutBD = ethers.utils.formatEther(differenceDinBD.toString());
    const AOut = ethers.utils.formatEther(differenceA.toString());

    const checkD0 = Math.abs(DoutAD - mathAmountOut0);
    const checkA0 = Math.abs(
      AinAD - ethers.utils.formatEther(amountInAD.toString())
    );
    const checkD1 = Math.abs(DoutBD - mathAmountOut1);
    const checkA1 = Math.abs(
      AinBD - ethers.utils.formatEther(amountInBD.toString())
    );
    const checkA2 = Math.abs(differenceA - AinBD - AinAD);

    expect(checkD0).to.be.lessThan(EPS);
    expect(checkA0).to.be.lessThan(EPS);
    expect(checkD1).to.be.lessThan(EPS);
    expect(checkA1).to.be.lessThan(EPS);
    expect(checkA2).to.be.lessThan(EPS);

    console.log("Amount out AD = %f", DoutAD);
    console.log("Amount out BD = %f", DoutBD);
  });

  it("Test 6: Complex Swap D --> B, should fail as D is not in whitelist", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInBD = ethers.utils.parseEther("10");
    const amountInAB = ethers.utils.parseEther("15");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenD,
      tokenB,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      abPool,
      adPool,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);

    let fail = false;
    try {
      await vRouterInstance.multicall(multiData, false);
    } catch (ex: any) {
      console.log(ex.message.indexOf("TNW"));
      expect(ex.message.indexOf("TMV") > -1);
      fail = true;
    }

    expect(fail).to.be.true;
  });


  it("Test 7: Complex Swap A --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("1");
    const amountInBD = ethers.utils.parseEther("3");

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
    const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      adPool,
      tokenD,
      tokenB,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const mathAmountOut0 = calculateNativeAmountOut(
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(amountInAB.toString()),
      1 - Number(fixture.abFee) / 1000
    );

    const mathAmountOut1 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);

    const differenceInAB = ethers.utils.formatEther(
      (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
    );
    const differenceInBD = ethers.utils.formatEther(
      (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
    );

    console.log("Amount out AD = %f", differenceInAB);
    console.log("Amount out BD = %f", differenceInBD);
    expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
    expect(Math.abs(differenceInBD - mathAmountOut1)).to.be.lessThan(EPS);
  });


  it("Test 8: Complex Swap A --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("6");
    const amountInBD = ethers.utils.parseEther("194");

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
    const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      adPool,
      tokenD,
      tokenB,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    
    let fail = false;
    try {
      await vRouterInstance.multicall(multiData, false);
    } catch (ex: any) {
      console.log(ex.message.indexOf("TNW"));
      expect(ex.message.indexOf("TMV") > -1);
      fail = true;
    }

    expect(fail).to.be.true;
  });

  it("Test 9: Initial Liquidity Proivsion for C/D", async () => {
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[1];

    const vRouterInstance = fixture.vRouterInstance;

    let CInput = 250;
    let DInput = 1250;

    const cdPool = await createPool(
      vRouterInstance,
      fixture.vPairFactoryInstance,
      fixture.owner,
      trader,
      tokenC,
      tokenD,
      CInput,
      DInput,
      fixture.cdFee
    );
    await cdPool.setAllowList([fixture.tokenA.address, fixture.tokenB.address]);
    fixture.cdPool = cdPool;

    const lp_tokens_gained_in_wei = await cdPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(CInput * DInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 10: Initial Liquidity Proivsion for B/D", async () => {
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const trader = fixture.accounts[1];

    const vRouterInstance = fixture.vRouterInstance;

    let BInput = 1000;
    let CInput = 1000;

    const bcPool = await createPool(
      vRouterInstance,
      fixture.vPairFactoryInstance,
      fixture.owner,
      trader,
      tokenB,
      tokenC,
      BInput,
      CInput,
      fixture.bcFee
    );
    await bcPool.setAllowList([fixture.tokenA.address]);
    fixture.bcPool = bcPool;

    const lp_tokens_gained_in_wei = await bcPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(CInput * BInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 11: Complex Swap C --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("4");
    const amountInBC = ethers.utils.parseEther("95")
    const amountInBD = ethers.utils.parseEther("1");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const acPool = fixture.acPool;
    
    const cdPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const bcPool = fixture.bcPool;


    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolACBalanceBefore = await tokenA.balanceOf(acPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
    const tokenCPoolACBalanceBefore = await tokenC.balanceOf(acPool.address);

    const tokenBPoolBCBalanceBefore = await tokenB.balanceOf(bcPool.address);
    const tokenCPoolBCBalanceBefore = await tokenC.balanceOf(bcPool.address);


    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      abPool,
      acPool,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);


    str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenC,
      tokenB,
      amountInBC,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      cdPool,
      tokenD,
      tokenB,
      amountInBD,
      futureTs
    );
    multiData.push(str);


    await vRouterInstance.multicall(multiData, false);

    const mathAmountOut0 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInAB.toString()),
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      ethers.utils.formatEther(tokenAPoolACBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(tokenCPoolACBalanceBefore),
      1 - Number(fixture.abFee) / 1000
    );

    const mathAmountOut1 = calculateNativeAmountOut(
      ethers.utils.formatEther(tokenCPoolBCBalanceBefore),
      ethers.utils.formatEther(tokenBPoolBCBalanceBefore),
      ethers.utils.formatEther(amountInBC.toString()),
      1 - Number(fixture.bcFee) / 1000
    );

    const mathAmountOut2 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBCBalanceAfter = await tokenB.balanceOf(bcPool.address);
    const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);

    const differenceInAB = ethers.utils.formatEther(
      (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
    );
    const differenceInBC = ethers.utils.formatEther(
      (tokenBPoolBCBalanceBefore - tokenBPoolBCBalanceAfter).toString()
    );
    const differenceInBD = ethers.utils.formatEther(
      (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
    );

    console.log("Amount out AD = %f", differenceInAB);
    console.log("Amount out BC = %f", differenceInBC);
    console.log("Amount out BD = %f", differenceInBD);
    expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
    expect(Math.abs(differenceInBC - mathAmountOut1)).to.be.lessThan(EPS);
    expect(Math.abs(differenceInBD - mathAmountOut2)).to.be.lessThan(EPS);

    
  });

  it("Test 12: buying D for A in BD", async () => {

    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInBD = ethers.utils.parseEther("6");

    const vRouterInstance = fixture.vRouterInstance;

    const bdPool = fixture.bdPool;
    const abPool = fixture.abPool;


    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      abPool,
      tokenB,
      tokenD,
      amountInBD,
      futureTs
    );

    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);

    const mathAmountOut = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const differenceInBD = ethers.utils.formatEther(
      (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
    );

    console.log("Amount out BD = %f", differenceInBD);
    expect(Math.abs(differenceInBD - mathAmountOut)).to.be.lessThan(EPS);
  });


  it("Test 13: Subsequent liquidity provision for B/D", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[2];
    const bdPool = fixture.bdPool;

    //const bdPoolPreviousAmount = tokenB.bala

    const vRouterInstance = fixture.vRouterInstance;

    console.log(tokenB.balanceOf(trader.address))
    console.log(tokenD.balanceOf(trader.address))

    let BInput = ethers.utils.parseEther("10000");
    let DInput = ethers.utils.parseEther("10000");

    const amountBDesired = await vRouterInstance.quote(
      tokenD.address,
      tokenB.address,
      DInput
    );


    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      amountBDesired,
      DInput,
      amountBDesired,
      DInput,
      trader.address,
      await utils.getFutureBlockTimestamp()
    );
  });

  it("Test 14: Liquidity withdrawal (B/D)", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[1];
    const bdPool = fixture.bdPool;
    const vRouterInstance = fixture.vRouterInstance;

    const withdrawAmount = await bdPool.balanceOf(trader.address)
    await bdPool
      .connect(trader)
      .approve(
        vRouterInstance.address,
        ethers.utils.parseEther("10000000000000000000")
      );

    const futureTs = await utils.getFutureBlockTimestamp();
    await vRouterInstance
      .connect(trader)
      .removeLiquidity(
        tokenB.address,
        tokenD.address,
        withdrawAmount,
        0,
        0,
        trader.address,
        futureTs
      );

    let lpBalanceBefore = await bdPool.balanceOf(trader.address);
    console.log(ethers.utils.formatEther(lpBalanceBefore.toString()));
  });


  it("Test 15: Complex Swap C --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("1");
    const amountInBC = ethers.utils.parseEther("1")
    const amountInBD = ethers.utils.parseEther("40");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const acPool = fixture.acPool;
    
    const cdPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const bcPool = fixture.bcPool;


    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolACBalanceBefore = await tokenA.balanceOf(acPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
    const tokenCPoolACBalanceBefore = await tokenC.balanceOf(acPool.address);

    const tokenBPoolBCBalanceBefore = await tokenB.balanceOf(bcPool.address);
    const tokenCPoolBCBalanceBefore = await tokenC.balanceOf(bcPool.address);


    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      abPool,
      acPool,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);


    str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenC,
      tokenB,
      amountInBC,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      cdPool,
      tokenD,
      tokenB,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const mathAmountOut0 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInAB.toString()),
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      ethers.utils.formatEther(tokenAPoolACBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(tokenCPoolACBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const mathAmountOut1 = calculateNativeAmountOut(
      ethers.utils.formatEther(tokenCPoolBCBalanceBefore),
      ethers.utils.formatEther(tokenBPoolBCBalanceBefore),
      ethers.utils.formatEther(amountInBC.toString()),
      1 - Number(fixture.bcFee) / 1000
    );

    const mathAmountOut2 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBCBalanceAfter = await tokenB.balanceOf(bcPool.address);
    const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);

    const differenceInAB = ethers.utils.formatEther(
      (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
    );
    const differenceInBC = ethers.utils.formatEther(
      (tokenBPoolBCBalanceBefore - tokenBPoolBCBalanceAfter).toString()
    );
    const differenceInBD = ethers.utils.formatEther(
      (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
    );

    console.log("Amount out AD = %f", differenceInAB);
    console.log("Amount out BC = %f", differenceInBC);
    console.log("Amount out BD = %f", differenceInBD);
    expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
    expect(Math.abs(differenceInBC - mathAmountOut1)).to.be.lessThan(EPS);
    expect(Math.abs(differenceInBD - mathAmountOut2)).to.be.lessThan(EPS);

    
  });



  it("Test 16: Complex Swap A --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("0.01");
    const amountInBD = ethers.utils.parseEther("0.039");

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
    const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      adPool,
      tokenD,
      tokenB,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const mathAmountOut0 = calculateNativeAmountOut(
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(amountInAB.toString()),
      1 - Number(fixture.abFee) / 1000
    );

    const mathAmountOut1 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
    const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);

    const differenceInAB = ethers.utils.formatEther(
      (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
    );
    const differenceInBD = ethers.utils.formatEther(
      (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
    );

    console.log("Amount out AD = %f", differenceInAB);
    console.log("Amount out BD = %f", differenceInBD);
    expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
    expect(Math.abs(differenceInBD - mathAmountOut1)).to.be.lessThan(EPS);
  });


  it("Test 17: Subsequent liquidity provision for B/D", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[1];
    const bdPool = fixture.bdPool;

    //const bdPoolPreviousAmount = tokenB.bala

    const vRouterInstance = fixture.vRouterInstance;

    let DInput = ethers.utils.parseEther("99.99");

    const amountBDesired = await vRouterInstance.quote(
      tokenD.address,
      tokenB.address,
      DInput
    );


    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      amountBDesired,
      DInput,
      amountBDesired,
      DInput,
      trader.address,
      await utils.getFutureBlockTimestamp()
    );
  });
  
  it("Test 18: Subsequent liquidity provision for B/D", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[4];
    const bdPool = fixture.bdPool;

    //const bdPoolPreviousAmount = tokenB.bala

    const vRouterInstance = fixture.vRouterInstance;

    let BInput = ethers.utils.parseEther("7654.321098");

    const amountDDesired = await vRouterInstance.quote(
      tokenD.address,
      tokenB.address,
      BInput
    );

    console.log(amountDDesired) 


    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      BInput,
      amountDDesired,
      BInput,
      amountDDesired,
      trader.address,
      await utils.getFutureBlockTimestamp()
    );
  });

  it("Test 19: buying D for A in СD", async () => {

    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInCD = ethers.utils.parseEther("3.501");

    const vRouterInstance = fixture.vRouterInstance;

    const cdPool = fixture.cdPool;
    const acPool = fixture.acPool;


    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
    const tokenCPoolACBalanceBefore = await tokenC.balanceOf(acPool.address);
    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenAPoolACBalanceBefore = await tokenA.balanceOf(acPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      cdPool,
      acPool,
      tokenC,
      tokenD,
      amountInCD,
      futureTs
    );

    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);

    const mathAmountOut = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInCD.toString()),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenCPoolACBalanceBefore),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolACBalanceBefore),
      1 - Number(fixture.cdFee) / 1000
    );

    const differenceInCD = ethers.utils.formatEther(
      (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
    );

    console.log("Amount out BD = %f", differenceInCD);
    expect(Math.abs(differenceInCD - mathAmountOut)).to.be.lessThan(EPS);
  });

  it("Test 20: Liquidity withdrawal (A/D)", async () => {
    const tokenA = fixture.tokenA;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[1];
    const adPool = fixture.adPool;
    const vRouterInstance = fixture.vRouterInstance;

    const withdrawAmount = await adPool.balanceOf(trader.address)
    const withdrawAmount2 = withdrawAmount.div(2)
    await adPool
      .connect(trader)
      .approve(
        vRouterInstance.address,
        ethers.utils.parseEther("10000000000000000000")
      );

    const futureTs = await utils.getFutureBlockTimestamp();
    await vRouterInstance
      .connect(trader)
      .removeLiquidity(
        tokenA.address,
        tokenD.address,
        withdrawAmount2,
        0,
        0,
        trader.address,
        futureTs
      );

    let lpBalanceBefore = await adPool.balanceOf(trader.address);
    console.log(ethers.utils.formatEther(lpBalanceBefore.toString()));
  });

  it("Test 21: Complex Swap A --> B, should fail due to reserve ratio becomes below threshold", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("1000");
    const amountInAC = ethers.utils.parseEther("1000");
    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const acPool = fixture.acPool;
    const bcPool = fixture.bcPool;

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenA,
      tokenB,
      amountInAB,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bcPool,
      acPool,
      tokenC,
      tokenB,
      amountInAC,
      futureTs
    );
    multiData.push(str);

    let fail = false;
    try {
      await vRouterInstance.multicall(multiData, false);
    } catch (ex: any) {
      console.log(ex.message.indexOf("TBPT"));
      expect(ex.message.indexOf("TBPT") > -1);
      fail = true;
    }

    expect(fail).to.be.true;
  });

  it("Test 22: Reserve A in CD", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInCD = ethers.utils.parseEther("2.222");
    const vRouterInstance = fixture.vRouterInstance;

    const cdPool = fixture.cdPool;
    const adPool = fixture.adPool;

    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();
    let multiData = [];
    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      cdPool,
      adPool,
      tokenD,
      tokenC,
      amountInCD,
      futureTs
    );
    multiData.push(str);

    const mathAmountOut0 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInCD.toString()),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      1 - Number(fixture.cdFee) / 1000
    );

    await vRouterInstance.multicall(multiData, false);

    const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);

    const differenceInCD = ethers.utils.formatEther(
      (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
    );

    console.log("Amount out CD = %f", differenceInCD);
    expect(Math.abs(differenceInCD - mathAmountOut0)).to.be.lessThan(EPS);
  });

  it("Test 23: Reserve A in CD 2", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInCD = ethers.utils.parseEther("3.333");
    const vRouterInstance = fixture.vRouterInstance;

    const cdPool = fixture.cdPool;
    const adPool = fixture.adPool;

    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();
    let multiData = [];
    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      cdPool,
      adPool,
      tokenD,
      tokenC,
      amountInCD,
      futureTs
    );
    multiData.push(str);

    const mathAmountOut0 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInCD.toString()),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      1 - Number(fixture.cdFee) / 1000
    );

    await vRouterInstance.multicall(multiData, false);

    const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);

    const differenceInCD = ethers.utils.formatEther(
      (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
    );

    console.log("Amount out CD = %f", differenceInCD);
    expect(Math.abs(differenceInCD - mathAmountOut0)).to.be.lessThan(EPS);
  });


  it("Test 24: Reserve A in CD 3", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInCD = ethers.utils.parseEther("4.444");
    const vRouterInstance = fixture.vRouterInstance;

    const cdPool = fixture.cdPool;
    const adPool = fixture.adPool;

    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();
    let multiData = [];
    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      cdPool,
      adPool,
      tokenD,
      tokenC,
      amountInCD,
      futureTs
    );
    multiData.push(str);

    const mathAmountOut0 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInCD.toString()),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      1 - Number(fixture.cdFee) / 1000
    );

    await vRouterInstance.multicall(multiData, false);

    const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);

    const differenceInCD = ethers.utils.formatEther(
      (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
    );

    console.log("Amount out CD = %f", differenceInCD);
    expect(Math.abs(differenceInCD - mathAmountOut0)).to.be.lessThan(EPS);
  });

  it("Test 25: Reserve C in AD", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAD = ethers.utils.parseEther("10");
    const vRouterInstance = fixture.vRouterInstance;

    const cdPool = fixture.cdPool;
    const adPool = fixture.adPool;

    const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();
    let multiData = [];
    let str = await swapInReservePool(
      vRouterInstance,
      owner,
      adPool,
      cdPool,
      tokenD,
      tokenA,
      amountInAD,
      futureTs
    );
    multiData.push(str);

    const mathAmountOut0 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInAD.toString()),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
      1 - Number(fixture.adFee) / 1000
    );

    await vRouterInstance.multicall(multiData, false);

    const tokenAPoolADBalanceAfter = await tokenC.balanceOf(cdPool.address);

    const differenceInAD = ethers.utils.formatEther(
      (tokenAPoolADBalanceBefore - tokenAPoolADBalanceAfter).toString()
    );

    console.log("Amount out CD = %f", differenceInAD);
    expect(Math.abs(differenceInAD - mathAmountOut0)).to.be.lessThan(EPS);
  });

  it("Test 26: Exchange reserves AD <-> CD", async () => {
    const adPool = fixture.adPool;
    const cdPool = fixture.cdPool;
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;

    let amountAInReserve = await cdPool.balanceOf(tokenA.address);

    await fixture.vPairFactoryInstance.setExchangeReservesAddress(
      fixture.vExchangeReservesInstance.address
    );

    let data = utils.getEncodedExchangeReserveCallbackParams(
      cdPool.address, //jk1
      adPool.address, //jk2
      cdPool.address //ik2
    );
  });

  it("Test 27: Subsequent Liquidity Proivsion for A/D, trader 1, 250-550", async () => {
    const tokenA = fixture.tokenA;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[4];
    const adPool = fixture.adPool;

    //const bdPoolPreviousAmount = tokenB.bala

    const vRouterInstance = fixture.vRouterInstance;

    let DInput = ethers.utils.parseEther("1234.321098");

    const amountADesired = await vRouterInstance.quote(
      tokenA.address,
      tokenD.address,
      DInput
    );
  
  });

  it("Test 28: Complex Swap A --> D", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInAD = ethers.utils.parseEther("2.1");
      const amountInBD = ethers.utils.parseEther("32.1");
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const adPool = fixture.adPool;
      const bdPool = fixture.bdPool;
  
      const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
      const tokenAPoolBDBalanceBefore = await tokenA.balanceOf(bdPool.address);
      const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
  
      const tokenDPoolABBalanceBefore = await tokenD.balanceOf(abPool.address);
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
  
      const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenA,
        tokenD,
        amountInAD,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        bdPool,
        abPool,
        tokenB,
        tokenD,
        amountInBD,
        futureTs
      );
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenAPoolABBalanceAfter = await tokenA.balanceOf(abPool.address);
      const tokenAPoolADBalanceAfter = await tokenA.balanceOf(adPool.address);
      const tokenAPoolBDBalanceAfter = await tokenA.balanceOf(bdPool.address);
  
      const tokenDPoolABBalanceAfter = await tokenD.balanceOf(abPool.address);
      const tokenDPoolADBalanceAfter = await tokenD.balanceOf(adPool.address);
      const tokenDPoolBDBalanceAfter = await tokenD.balanceOf(bdPool.address);
  
      const mathAmountOut0 = calculateNativeAmountOut(
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(amountInAD.toString()),
        1 - Number(fixture.adFee) / 1000
      );
  
      const mathAmountOut1 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInBD.toString()),
        ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenBPoolABBalanceBefore),
        ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolABBalanceBefore),
        1 - Number(fixture.bdFee) / 1000
      );
  
      const differenceA =
        +ethers.utils.formatEther(amountInAD.toString()) +
        +ethers.utils.formatEther(amountInBD.toString());
  
      const differenceAinAD = Math.abs(
        tokenAPoolADBalanceAfter - tokenAPoolADBalanceBefore
      );
      const differenceAinBD = Math.abs(
        tokenAPoolBDBalanceAfter - tokenAPoolBDBalanceBefore
      );
      const differenceDinBD = Math.abs(
        tokenDPoolBDBalanceAfter - tokenDPoolBDBalanceBefore
      );
  
      const differenceDinAD = Math.abs(
        tokenDPoolADBalanceAfter - tokenDPoolADBalanceBefore
      );
  
      const AinAD = ethers.utils.formatEther(differenceAinAD.toString());
      const DoutAD = ethers.utils.formatEther(differenceDinAD.toString());
      const AinBD = ethers.utils.formatEther(differenceAinBD.toString());
      const DoutBD = ethers.utils.formatEther(differenceDinBD.toString());
      const AOut = ethers.utils.formatEther(differenceA.toString());
  
      const checkD0 = Math.abs(DoutAD - mathAmountOut0);
      const checkA0 = Math.abs(
        AinAD - ethers.utils.formatEther(amountInAD.toString())
      );
      const checkD1 = Math.abs(DoutBD - mathAmountOut1);
      const checkA1 = Math.abs(
        AinBD - ethers.utils.formatEther(amountInBD.toString())
      );
      const checkA2 = Math.abs(differenceA - AinBD - AinAD);
  
      expect(checkD0).to.be.lessThan(EPS);
      expect(checkA0).to.be.lessThan(EPS);
      expect(checkD1).to.be.lessThan(EPS);
      expect(checkA1).to.be.lessThan(EPS);
      expect(checkA2).to.be.lessThan(EPS);
  
      console.log("Amount out AD = %f", DoutAD);
      console.log("Amount out BD = %f", DoutBD);
    });
  
    it("Test 29: Complex Swap D --> C, should fail as D is not in whitelist", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInBD = ethers.utils.parseEther("10");
      const amountInAB = ethers.utils.parseEther("15");
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const adPool = fixture.adPool;
      const bdPool = fixture.bdPool;
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenD,
        tokenB,
        amountInBD,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        abPool,
        adPool,
        tokenA,
        tokenB,
        amountInAB,
        futureTs
      );
      multiData.push(str);
  
      let fail = false;
      try {
        await vRouterInstance.multicall(multiData, false);
      } catch (ex: any) {
        console.log(ex.message.indexOf("TNW"));
        expect(ex.message.indexOf("TMV") > -1);
        fail = true;
      }
  
      expect(fail).to.be.true;
    });
  
  
    it("Test 30: Complex Swap A --> B", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInAB = ethers.utils.parseEther("3.14");
      const amountInBD = ethers.utils.parseEther("1.49");
  
      const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
      const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
      const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const adPool = fixture.adPool;
      const bdPool = fixture.bdPool;
  
      const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
      const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
      const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenA,
        tokenB,
        amountInAB,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        bdPool,
        adPool,
        tokenD,
        tokenB,
        amountInBD,
        futureTs
      );
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
      const mathAmountOut0 = calculateNativeAmountOut(
        ethers.utils.formatEther(tokenAPoolABBalanceBefore),
        ethers.utils.formatEther(tokenBPoolABBalanceBefore),
        ethers.utils.formatEther(amountInAB.toString()),
        1 - Number(fixture.abFee) / 1000
      );
  
      const mathAmountOut1 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInBD.toString()),
        ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        1 - Number(fixture.bdFee) / 1000
      );
  
      const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
      const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);
  
      const differenceInAB = ethers.utils.formatEther(
        (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
      );
      const differenceInBD = ethers.utils.formatEther(
        (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
      );
  
      console.log("Amount out AD = %f", differenceInAB);
      console.log("Amount out BD = %f", differenceInBD);
      expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
      expect(Math.abs(differenceInBD - mathAmountOut1)).to.be.lessThan(EPS);
    });
  
  
    it("Test 31: Complex Swap A --> B", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInAB = ethers.utils.parseEther("6");
      const amountInBD = ethers.utils.parseEther("194");
  
      const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
      const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
      const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const adPool = fixture.adPool;
      const bdPool = fixture.bdPool;
  
      const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
      const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
      const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenA,
        tokenB,
        amountInAB,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        bdPool,
        adPool,
        tokenD,
        tokenB,
        amountInBD,
        futureTs
      );
      multiData.push(str);
  
      
      let fail = false;
      try {
        await vRouterInstance.multicall(multiData, false);
      } catch (ex: any) {
        console.log(ex.message.indexOf("TNW"));
        expect(ex.message.indexOf("TMV") > -1);
        fail = true;
      }
  
      expect(fail).to.be.true;
    });
  
    it("Test 32: Liquidity Proivsion for C/D", async () => {
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[4];
      const cdPool = fixture.cdPool;
  
      //const bdPoolPreviousAmount = tokenB.bala
  
      const vRouterInstance = fixture.vRouterInstance;
  
      let DInput = ethers.utils.parseEther("1034.001098");
  
      const amountCDesired = await vRouterInstance.quote(
        tokenC.address,
        tokenD.address,
        DInput
      );
    
    });
  
  
    it("Test 33: Subsrequent Liquidity Proivsion for B/D", async () => {
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[1];
      const bdPool = fixture.bdPool;
  
      //const bdPoolPreviousAmount = tokenB.bala
  
      const vRouterInstance = fixture.vRouterInstance;
  
      let DInput = ethers.utils.parseEther("1000");
  
      const amountBDesired = await vRouterInstance.quote(
        tokenB.address,
        tokenD.address,
        DInput
      );
    
    });
  
  
    it("Test 34: buying D for A in BD", async () => {
  
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInBD = ethers.utils.parseEther("6.61");
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const bdPool = fixture.bdPool;
      const abPool = fixture.abPool;
  
  
      const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
      const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
      const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
      const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        bdPool,
        abPool,
        tokenB,
        tokenD,
        amountInBD,
        futureTs
      );
  
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);
  
      const mathAmountOut = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInBD.toString()),
        ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenBPoolABBalanceBefore),
        ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolABBalanceBefore),
        1 - Number(fixture.bdFee) / 1000
      );
  
      const differenceInBD = ethers.utils.formatEther(
        (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
      );
  
      console.log("Amount out BD = %f", differenceInBD);
      expect(Math.abs(differenceInBD - mathAmountOut)).to.be.lessThan(EPS);
    });
  
  
    it("Test 35: Subsequent liquidity provision for B/D", async () => {
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[4];
      const bdPool = fixture.bdPool;
  
      //const bdPoolPreviousAmount = tokenB.bala
  
      const vRouterInstance = fixture.vRouterInstance;
  
      let DInput = ethers.utils.parseEther("1000");
  
      const amountADesired = await vRouterInstance.quote(
        tokenB.address,
        tokenD.address,
        DInput
      );
    
    });
  
  
    it("Test 36: Liquidity withdrawal (B/D)", async () => {
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[1];
      const bdPool = fixture.bdPool;
      const vRouterInstance = fixture.vRouterInstance;
  
      const withdrawAmount = await bdPool.balanceOf(trader.address)
      const withdrawAmount2 = withdrawAmount.div(2)
      await bdPool
        .connect(trader)
        .approve(
          vRouterInstance.address,
          ethers.utils.parseEther("10000000000000000000")
        );
  
      const futureTs = await utils.getFutureBlockTimestamp();
      await vRouterInstance
        .connect(trader)
        .removeLiquidity(
          tokenB.address,
          tokenD.address,
          withdrawAmount2,
          0,
          0,
          trader.address,
          futureTs
        );
  
      let lpBalanceBefore = await bdPool.balanceOf(trader.address);
      console.log(ethers.utils.formatEther(lpBalanceBefore.toString()));
    });
  
  
    it("Test 37: Complex Swap C --> B", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInAB = ethers.utils.parseEther("0.1");
      const amountInBC = ethers.utils.parseEther("0.1")
      const amountInBD = ethers.utils.parseEther("140");
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const acPool = fixture.acPool;
      
      const cdPool = fixture.adPool;
      const bdPool = fixture.bdPool;
  
      const bcPool = fixture.bcPool;
  
  
      const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
      const tokenAPoolACBalanceBefore = await tokenA.balanceOf(acPool.address);
      const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
      const tokenCPoolACBalanceBefore = await tokenC.balanceOf(acPool.address);
  
      const tokenBPoolBCBalanceBefore = await tokenB.balanceOf(bcPool.address);
      const tokenCPoolBCBalanceBefore = await tokenC.balanceOf(bcPool.address);
  
  
      const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
      const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
      const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
      const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        abPool,
        acPool,
        tokenA,
        tokenB,
        amountInAB,
        futureTs
      );
      multiData.push(str);
  
  
      str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenC,
        tokenB,
        amountInBC,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        bdPool,
        cdPool,
        tokenD,
        tokenB,
        amountInBD,
        futureTs
      );
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
      const mathAmountOut0 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInAB.toString()),
        ethers.utils.formatEther(tokenAPoolABBalanceBefore),
        ethers.utils.formatEther(tokenAPoolACBalanceBefore),
        ethers.utils.formatEther(tokenBPoolABBalanceBefore),
        ethers.utils.formatEther(tokenCPoolACBalanceBefore),
        1 - Number(fixture.bdFee) / 1000
      );
  
      const mathAmountOut1 = calculateNativeAmountOut(
        ethers.utils.formatEther(tokenCPoolBCBalanceBefore),
        ethers.utils.formatEther(tokenBPoolBCBalanceBefore),
        ethers.utils.formatEther(amountInBC.toString()),
        1 - Number(fixture.bcFee) / 1000
      );
  
      const mathAmountOut2 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInBD.toString()),
        ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
        1 - Number(fixture.bdFee) / 1000
      );
  
      const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
      const tokenBPoolBCBalanceAfter = await tokenB.balanceOf(bcPool.address);
      const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);
  
      const differenceInAB = ethers.utils.formatEther(
        (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
      );
      const differenceInBC = ethers.utils.formatEther(
        (tokenBPoolBCBalanceBefore - tokenBPoolBCBalanceAfter).toString()
      );
      const differenceInBD = ethers.utils.formatEther(
        (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
      );
  
      console.log("Amount out AD = %f", differenceInAB);
      console.log("Amount out BC = %f", differenceInBC);
      console.log("Amount out BD = %f", differenceInBD);
      expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
      expect(Math.abs(differenceInBC - mathAmountOut1)).to.be.lessThan(EPS);
      expect(Math.abs(differenceInBD - mathAmountOut2)).to.be.lessThan(EPS);
  
      
    });
  
  
  
    it("Test 38: Complex Swap A --> B", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInAB = ethers.utils.parseEther("0.0101");
      const amountInBD = ethers.utils.parseEther("1.039");
  
      const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
      const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
      const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const adPool = fixture.adPool;
      const bdPool = fixture.bdPool;
  
      const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
      const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);
      const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenA,
        tokenB,
        amountInAB,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        bdPool,
        adPool,
        tokenD,
        tokenB,
        amountInBD,
        futureTs
      );
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
      const mathAmountOut0 = calculateNativeAmountOut(
        ethers.utils.formatEther(tokenAPoolABBalanceBefore),
        ethers.utils.formatEther(tokenBPoolABBalanceBefore),
        ethers.utils.formatEther(amountInAB.toString()),
        1 - Number(fixture.abFee) / 1000
      );
  
      const mathAmountOut1 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInBD.toString()),
        ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        1 - Number(fixture.bdFee) / 1000
      );
  
      const tokenBPoolABBalanceAfter = await tokenB.balanceOf(abPool.address);
      const tokenBPoolBDBalanceAfter = await tokenB.balanceOf(bdPool.address);
  
      const differenceInAB = ethers.utils.formatEther(
        (tokenBPoolABBalanceBefore - tokenBPoolABBalanceAfter).toString()
      );
      const differenceInBD = ethers.utils.formatEther(
        (tokenBPoolBDBalanceBefore - tokenBPoolBDBalanceAfter).toString()
      );
  
      console.log("Amount out AD = %f", differenceInAB);
      console.log("Amount out BD = %f", differenceInBD);
      expect(Math.abs(differenceInAB - mathAmountOut0)).to.be.lessThan(EPS);
      expect(Math.abs(differenceInBD - mathAmountOut1)).to.be.lessThan(EPS);
    });
  
  
    it("Test 39: Subsequent liquidity provision for B/D", async () => {
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[1];
      const bdPool = fixture.bdPool;
  
      //const bdPoolPreviousAmount = tokenB.bala
  
      const vRouterInstance = fixture.vRouterInstance;
  
      let DInput = ethers.utils.parseEther("12.99");
  
      const amountBDesired = await vRouterInstance.quote(
        tokenD.address,
        tokenB.address,
        DInput
      );
  
  
      await vRouterInstance.addLiquidity(
        tokenB.address,
        tokenD.address,
        amountBDesired,
        DInput,
        amountBDesired,
        DInput,
        trader.address,
        await utils.getFutureBlockTimestamp()
      );
    });
    
    it("Test 40: Subsequent liquidity provision for B/D", async () => {
      const tokenB = fixture.tokenB;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[4];
      const bdPool = fixture.bdPool;
  
      //const bdPoolPreviousAmount = tokenB.bala
  
      const vRouterInstance = fixture.vRouterInstance;
  
      let BInput = ethers.utils.parseEther("1000");
  
      const amountDDesired = await vRouterInstance.quote(
        tokenD.address,
        tokenB.address,
        BInput
      );
  
      console.log(amountDDesired) 
  
  
      await vRouterInstance.addLiquidity(
        tokenB.address,
        tokenD.address,
        BInput,
        amountDDesired,
        BInput,
        amountDDesired,
        trader.address,
        await utils.getFutureBlockTimestamp()
      );
    });
  
    it("Test 41: buying D for A in CD", async () => {
  
      const tokenA = fixture.tokenA;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInCD = ethers.utils.parseEther("3.501");
  
      const vRouterInstance = fixture.vRouterInstance;
  
      const cdPool = fixture.cdPool;
      const acPool = fixture.acPool;
  
  
      const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
      const tokenCPoolACBalanceBefore = await tokenC.balanceOf(acPool.address);
      const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
      const tokenAPoolACBalanceBefore = await tokenA.balanceOf(acPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        cdPool,
        acPool,
        tokenC,
        tokenD,
        amountInCD,
        futureTs
      );
  
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);
  
      const mathAmountOut = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInCD.toString()),
        ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenCPoolACBalanceBefore),
        ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolACBalanceBefore),
        1 - Number(fixture.cdFee) / 1000
      );
  
      const differenceInCD = ethers.utils.formatEther(
        (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
      );
  
      console.log("Amount out BD = %f", differenceInCD);
      expect(Math.abs(differenceInCD - mathAmountOut)).to.be.lessThan(EPS);
    });
  
    it("Test 43: Liquidity withdrawal (A/D)", async () => {
      const tokenA = fixture.tokenA;
      const tokenD = fixture.tokenD;
      const trader = fixture.accounts[1];
      const adPool = fixture.adPool;
      const vRouterInstance = fixture.vRouterInstance;
  
      const withdrawAmount = await adPool.balanceOf(trader.address)
      const withdrawAmount2 = withdrawAmount.div(2)
      await adPool
        .connect(trader)
        .approve(
          vRouterInstance.address,
          ethers.utils.parseEther("10000000000000000000")
        );
  
      const futureTs = await utils.getFutureBlockTimestamp();
      await vRouterInstance
        .connect(trader)
        .removeLiquidity(
          tokenA.address,
          tokenD.address,
          withdrawAmount2,
          0,
          0,
          trader.address,
          futureTs
        );
  
      let lpBalanceBefore = await adPool.balanceOf(trader.address);
      console.log(ethers.utils.formatEther(lpBalanceBefore.toString()));
    });
  
    it("Test 44: Complex Swap A --> B, should fail due to reserve ratio becomes below threshold", async () => {
      const tokenA = fixture.tokenA;
      const tokenB = fixture.tokenB;
      const tokenC = fixture.tokenC;
      const owner = fixture.owner;
  
      const amountInAB = ethers.utils.parseEther("10000");
      const amountInAC = ethers.utils.parseEther("10000");
      const vRouterInstance = fixture.vRouterInstance;
  
      const abPool = fixture.abPool;
      const acPool = fixture.acPool;
      const bcPool = fixture.bcPool;
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await swapInNativePool(
        vRouterInstance,
        owner,
        tokenA,
        tokenB,
        amountInAB,
        futureTs
      );
      multiData.push(str);
  
      str = await swapInReservePool(
        vRouterInstance,
        owner,
        bcPool,
        acPool,
        tokenC,
        tokenB,
        amountInAC,
        futureTs
      );
      multiData.push(str);
  
      let fail = false;
      try {
        await vRouterInstance.multicall(multiData, false);
      } catch (ex: any) {
        console.log(ex.message.indexOf("TBPT"));
        expect(ex.message.indexOf("TBPT") > -1);
        fail = true;
      }
  
      expect(fail).to.be.true;
    });
  
    it("Test 45: Reserve A in CD", async () => {
      const tokenA = fixture.tokenA;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInCD = ethers.utils.parseEther("0.222");
      const vRouterInstance = fixture.vRouterInstance;
  
      const cdPool = fixture.cdPool;
      const adPool = fixture.adPool;
  
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
      const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
      let multiData = [];
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        cdPool,
        adPool,
        tokenD,
        tokenC,
        amountInCD,
        futureTs
      );
      multiData.push(str);
  
      const mathAmountOut0 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInCD.toString()),
        ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        1 - Number(fixture.cdFee) / 1000
      );
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);
  
      const differenceInCD = ethers.utils.formatEther(
        (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
      );
  
      console.log("Amount out CD = %f", differenceInCD);
      expect(Math.abs(differenceInCD - mathAmountOut0)).to.be.lessThan(EPS);
    });
  
    it("Test 46: Reserve A in CD 2", async () => {
      const tokenA = fixture.tokenA;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInCD = ethers.utils.parseEther("0.333");
      const vRouterInstance = fixture.vRouterInstance;
  
      const cdPool = fixture.cdPool;
      const adPool = fixture.adPool;
  
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
      const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
      let multiData = [];
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        cdPool,
        adPool,
        tokenD,
        tokenC,
        amountInCD,
        futureTs
      );
      multiData.push(str);
  
      const mathAmountOut0 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInCD.toString()),
        ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        1 - Number(fixture.cdFee) / 1000
      );
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);
  
      const differenceInCD = ethers.utils.formatEther(
        (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
      );
  
      console.log("Amount out CD = %f", differenceInCD);
      expect(Math.abs(differenceInCD - mathAmountOut0)).to.be.lessThan(EPS);
    });
  
  
    it("Test 47: Reserve A in CD 3", async () => {
      const tokenA = fixture.tokenA;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInCD = ethers.utils.parseEther("0.94");
      const vRouterInstance = fixture.vRouterInstance;
  
      const cdPool = fixture.cdPool;
      const adPool = fixture.adPool;
  
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
      const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
      let multiData = [];
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        cdPool,
        adPool,
        tokenD,
        tokenC,
        amountInCD,
        futureTs
      );
      multiData.push(str);
  
      const mathAmountOut0 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInCD.toString()),
        ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        1 - Number(fixture.cdFee) / 1000
      );
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenCPoolCDBalanceAfter = await tokenC.balanceOf(cdPool.address);
  
      const differenceInCD = ethers.utils.formatEther(
        (tokenCPoolCDBalanceBefore - tokenCPoolCDBalanceAfter).toString()
      );
  
      console.log("Amount out CD = %f", differenceInCD);
      expect(Math.abs(differenceInCD - mathAmountOut0)).to.be.lessThan(EPS);
    });
  
    it("Test 48: Reserve C in AD", async () => {
      const tokenA = fixture.tokenA;
      const tokenC = fixture.tokenC;
      const tokenD = fixture.tokenD;
      const owner = fixture.owner;
  
      const amountInAD = ethers.utils.parseEther("1");
      const vRouterInstance = fixture.vRouterInstance;
  
      const cdPool = fixture.cdPool;
      const adPool = fixture.adPool;
  
      const tokenDPoolCDBalanceBefore = await tokenD.balanceOf(cdPool.address);
      const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
      const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
      const tokenCPoolCDBalanceBefore = await tokenC.balanceOf(cdPool.address);
  
      const futureTs = await utils.getFutureBlockTimestamp();
      let multiData = [];
      let str = await swapInReservePool(
        vRouterInstance,
        owner,
        adPool,
        cdPool,
        tokenD,
        tokenA,
        amountInAD,
        futureTs
      );
      multiData.push(str);
  
      const mathAmountOut0 = calculateReserveAmountOut(
        ethers.utils.formatEther(amountInAD.toString()),
        ethers.utils.formatEther(tokenDPoolADBalanceBefore),
        ethers.utils.formatEther(tokenDPoolCDBalanceBefore),
        ethers.utils.formatEther(tokenAPoolADBalanceBefore),
        ethers.utils.formatEther(tokenCPoolCDBalanceBefore),
        1 - Number(fixture.adFee) / 1000
      );
  
      await vRouterInstance.multicall(multiData, false);
  
      const tokenAPoolADBalanceAfter = await tokenC.balanceOf(cdPool.address);
  
      const differenceInAD = ethers.utils.formatEther(
        (tokenAPoolADBalanceBefore - tokenAPoolADBalanceAfter).toString()
      );
  
      console.log("Amount out CD = %f", differenceInAD);
      expect(Math.abs(differenceInAD - mathAmountOut0)).to.be.lessThan(EPS);
    });
  
    it("Test 49: Exchange reserves AD <-> CD", async () => {
      const adPool = fixture.adPool;
      const cdPool = fixture.cdPool;
      const tokenA = fixture.tokenA;
      const tokenC = fixture.tokenC;
  
      let amountAInReserve = await cdPool.balanceOf(tokenA.address);
  
      await fixture.vPairFactoryInstance.setExchangeReservesAddress(
        fixture.vExchangeReservesInstance.address
      );
  
      let data = utils.getEncodedExchangeReserveCallbackParams(
        cdPool.address, //jk1
        adPool.address, //jk2
        cdPool.address //ik2
      );
  
      

    //    let aReserveInBC = await cdPool.reserves(tokenA.address);
    //    let cReserveInAB = await abPool.reserves(tokenC.address);
    //    let poolABRR = await abPool.calculateReserveRatio();

    //    let tokenAReserveBaseValue = await cdPool.reservesBaseValue(tokenA.address);
    //    let tokenCReserveBaseValue = await abPool.reservesBaseValue(tokenC.address);

    //    let poolBCRR = await cdPool.calculateReserveRatio();

    //get flash swap of amount required amount C from pool BC.
      await fixture.vExchangeReservesInstance.exchange(
        cdPool.address, //jk1
        adPool.address, // ik1
      adPool.address, //jk2
      amountAInReserve,
      data
    );

    //let tokenAReserveBaseValueAfter = await cdPool.reservesBaseValue(
    //  tokenA.address
    //);
    //let tokenCReserveBaseValueAfter = await abPool.reservesBaseValue(
    //  tokenC.address
    //);

    //let aReserveInBCAfter = await cdPool.reserves(tokenA.address);
    // let cReserveInABAfter = await abPool.reserves(tokenC.address);
    // let poolABRRAfter = await abPool.calculateReserveRatio();

    // let poolBCRRAfter = await cdPool.calculateReserveRatio();
  });

  it("Test 50: Complex Swap A --> D", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAD = ethers.utils.parseEther("0.1");
    const amountInBD = ethers.utils.parseEther("34.1");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address);
    const tokenAPoolBDBalanceBefore = await tokenA.balanceOf(bdPool.address);
    const tokenBPoolABBalanceBefore = await tokenB.balanceOf(abPool.address);

    const tokenDPoolABBalanceBefore = await tokenD.balanceOf(abPool.address);
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address);

    const tokenBPoolBDBalanceBefore = await tokenB.balanceOf(bdPool.address);

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(
      vRouterInstance,
      owner,
      tokenA,
      tokenD,
      amountInAD,
      futureTs
    );
    multiData.push(str);

    str = await swapInReservePool(
      vRouterInstance,
      owner,
      bdPool,
      abPool,
      tokenB,
      tokenD,
      amountInBD,
      futureTs
    );
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const tokenAPoolABBalanceAfter = await tokenA.balanceOf(abPool.address);
    const tokenAPoolADBalanceAfter = await tokenA.balanceOf(adPool.address);
    const tokenAPoolBDBalanceAfter = await tokenA.balanceOf(bdPool.address);

    const tokenDPoolABBalanceAfter = await tokenD.balanceOf(abPool.address);
    const tokenDPoolADBalanceAfter = await tokenD.balanceOf(adPool.address);
    const tokenDPoolBDBalanceAfter = await tokenD.balanceOf(bdPool.address);

    const mathAmountOut0 = calculateNativeAmountOut(
      ethers.utils.formatEther(tokenAPoolADBalanceBefore),
      ethers.utils.formatEther(tokenDPoolADBalanceBefore),
      ethers.utils.formatEther(amountInAD.toString()),
      1 - Number(fixture.adFee) / 1000
    );

    const mathAmountOut1 = calculateReserveAmountOut(
      ethers.utils.formatEther(amountInBD.toString()),
      ethers.utils.formatEther(tokenBPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenBPoolABBalanceBefore),
      ethers.utils.formatEther(tokenDPoolBDBalanceBefore),
      ethers.utils.formatEther(tokenAPoolABBalanceBefore),
      1 - Number(fixture.bdFee) / 1000
    );

    const differenceA =
      +ethers.utils.formatEther(amountInAD.toString()) +
      +ethers.utils.formatEther(amountInBD.toString());

    const differenceAinAD = Math.abs(
      tokenAPoolADBalanceAfter - tokenAPoolADBalanceBefore
    );
    const differenceAinBD = Math.abs(
      tokenAPoolBDBalanceAfter - tokenAPoolBDBalanceBefore
    );
    const differenceDinBD = Math.abs(
      tokenDPoolBDBalanceAfter - tokenDPoolBDBalanceBefore
    );

    const differenceDinAD = Math.abs(
      tokenDPoolADBalanceAfter - tokenDPoolADBalanceBefore
    );

    const AinAD = ethers.utils.formatEther(differenceAinAD.toString());
    const DoutAD = ethers.utils.formatEther(differenceDinAD.toString());
    const AinBD = ethers.utils.formatEther(differenceAinBD.toString());
    const DoutBD = ethers.utils.formatEther(differenceDinBD.toString());
    const AOut = ethers.utils.formatEther(differenceA.toString());

    const checkD0 = Math.abs(DoutAD - mathAmountOut0);
    const checkA0 = Math.abs(
      AinAD - ethers.utils.formatEther(amountInAD.toString())
    );
    const checkD1 = Math.abs(DoutBD - mathAmountOut1);
    const checkA1 = Math.abs(
      AinBD - ethers.utils.formatEther(amountInBD.toString())
    );
    const checkA2 = Math.abs(differenceA - AinBD - AinAD);

    expect(checkD0).to.be.lessThan(EPS);
    expect(checkA0).to.be.lessThan(EPS);
    expect(checkD1).to.be.lessThan(EPS);
    expect(checkA1).to.be.lessThan(EPS);
    expect(checkA2).to.be.lessThan(EPS);

    console.log("Amount out AD = %f", DoutAD);
    console.log("Amount out BD = %f", DoutBD);
  });


  after(async function () {
    console.log("TABLES");
    const pools = [
      fixture.abPool,
      fixture.acPool,
      fixture.adPool,
      fixture.bcPool,
      fixture.bdPool,
      fixture.cdPool,
    ];
    const poolNames = ["AB", "AC", "AD", "BC", "BD", "CD"];
    const tokens = [
      fixture.tokenA,
      fixture.tokenB,
      fixture.tokenC,
      fixture.tokenD,
    ];
    const tokenNames = ["A", "B", "C", "D"];
    const fees = [
      fixture.abFee,
      fixture.acFee,
      fixture.adFee,
      fixture.bcFee,
      fixture.bdFee,
      fixture.cdFee
    ]

    for (let i = 0; i < 5; i++) {
      console.log("Pool %s", poolNames[i]);
      for (let j = 0; j < 4; ++j) {
        console.log(
          "\tToken %s amount: %f",
          tokenNames[j],
          ethers.utils.formatEther(await tokens[j].balanceOf(pools[i].address))
          );  
        }
        console.log("\n")
  
        console.log(1 - Number(fees[i]) / 1000)
        for (let j = 0; j < 4; ++j){
          let isNative = poolNames[i].indexOf(tokenNames[j]) > -1;
          if(!isNative){
            let reservedAmount = await pools[i].reservesBaseValue(tokens[j].address);
            if (reservedAmount > EPS * EPS){
              console.log(
                "\tToken %s, reserved ratio: %f",
                tokenNames[j],
                ethers.utils.formatEther(reservedAmount)
              );
              let tmp = await tokens[j].balanceOf(pools[i].address);
  
              let tmp2 = ethers.utils.formatEther(tmp)
              console.log(tmp2)
            }
          }
        }
  
        console.log("\tTotal Pools reserve ratio: %f", await pools[i].calculateReserveRatio())
  
        console.log("\n");
      
      for (let j = 0; j < 5; ++j) {
        console.log(
          "\tTrader %i, LP tokens amount: %f",
          j,
          ethers.utils.formatEther(
            await pools[i].balanceOf(fixture.accounts[j].address)
          )
        );
      }
      
      console.log();
    }
  });


  

});
