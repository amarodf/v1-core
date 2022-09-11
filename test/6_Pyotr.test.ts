import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { tokensFixture } from "./fixtures/tokensFixture";
import { ethers } from "hardhat";
import utils from "./utils";
import _ from "lodash";
import { VRouter__factory, VPair__factory } from "../typechain-types/index";
import { BigNumber } from "ethers";

const EPS = 0.000001;

async function swapInNativePool(vRouterInstance: any, trader: any, sellToken: any, buyToken: any, amountIn: any, futureTs: any){

  let amountOut = await vRouterInstance.getAmountOut(
    sellToken.address,
    buyToken.address,
    amountIn
  );

  let str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapToExactNative", [
    sellToken.address,
    buyToken.address,
    amountOut,
    amountIn,
    trader.address,
    futureTs
  ]);

  return str
  
}

async function swapInReservePool(vRouterInstance: any, trader: any, mainPool: any, supportPool: any, sellToken: any, buyToken: any, amountIn: any, futureTs: any){
  
  let amountOut = await vRouterInstance.getVirtualAmountOut(
    mainPool.address,
    supportPool.address,
    amountIn
  );


  let str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapReserveToExactNative", [
    buyToken.address,
    sellToken.address,
    supportPool.address,
    amountOut,
    amountIn,
    trader.address,
    futureTs
  ]);

  return str

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

    fixture.abFee = "997";
    fixture.acFee = "990";
    fixture.adFee = "997";
    fixture.bcFee = "999";
    fixture.bdFee = "997";
    fixture.cdFee = "990";

    const account1 = fixture.accounts[0];
    await tokenA.transfer(account1.address, 300);
    await tokenB.transfer(account1.address, 200);
    await tokenD.transfer(account1.address, 550);

    const account2 = fixture.accounts[1];
    await tokenA.transfer(account2.address, 200);
    await tokenC.transfer(account2.address, 50);

    const account3 = fixture.accounts[2];
    await tokenB.transfer(account3.address, 300);
    await tokenD.transfer(account3.address, 450);

    const account4 = fixture.accounts[3];
    await tokenC.transfer(account4.address, 20);
    await tokenD.transfer(account4.address, 230);

    const account5 = fixture.accounts[4];
    await tokenB.transfer(account5.address, 100);
    await tokenD.transfer(account5.address, 150);
  });

  it("Test 1: Intital Liquidity Provision for A/B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const trader = fixture.accounts[0];

    const vRouterInstance = fixture.vRouterInstance;

    let AInput = 100;
    let BInput = 200;

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenB.address,
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(BInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );

    const abAddress = await fixture.vPairFactoryInstance.getPair(
      tokenA.address,
      tokenB.address
    );

    const abPool = VPair__factory.connect(abAddress, fixture.owner);
    fixture.abPool = abPool;
    await abPool.setFee(fixture.abFee, fixture.abFee);
    await abPool.setWhitelist([fixture.tokenC.address]);
    await abPool.setMaxReserveThreshold(ethers.utils.parseEther('2000'));
    console.log(accounts.slice(1, 4));
    fixture.abPool = abPool;

    const lp_tokens_gained_in_wei = await abPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(AInput * BInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 2: Initial Liquidity Proivsion for A/C", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const trader = fixture.accounts[1];

    const vRouterInstance = fixture.vRouterInstance;

    let AInput = 50;
    let CInput = 200;

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenC.address,
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );

    const acAddress = await fixture.vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );

    const acPool = VPair__factory.connect(acAddress, fixture.owner);
    await acPool.setFee(fixture.acFee, fixture.acFee);
    await acPool.setWhitelist([fixture.tokenB.address]);
    await acPool.setMaxReserveThreshold(ethers.utils.parseEther('2000'));
    fixture.acPool = acPool;

    const lp_tokens_gained_in_wei = await acPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(AInput * CInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 3: Initial Liquidity Proivsion for B/D", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[2];
    const vRouterInstance = fixture.vRouterInstance;

    let BInput = 300;
    let DInput = 450;

    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );

    const bdAddress = await fixture.vPairFactoryInstance.getPair(
      tokenB.address,
      tokenD.address
    );

    const bdPool = VPair__factory.connect(bdAddress, fixture.owner);
    await bdPool.setFee(fixture.bdFee, fixture.bdFee);
    await bdPool.setWhitelist([fixture.tokenA.address, fixture.tokenC.address]);
    await bdPool.setMaxReserveThreshold(ethers.utils.parseEther('2000'));
    fixture.bdPool = bdPool;

    const lp_tokens_gained_in_wei = await bdPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(BInput * DInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 4: Initial Liquidity Proivsion for A/D", async () => {
    const tokenA = fixture.tokenA;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[0];

    const vRouterInstance = fixture.vRouterInstance;

    let AInput = 200;
    let DInput = 550;

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenD.address,
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );

    const adAddress = await fixture.vPairFactoryInstance.getPair(
      tokenA.address,
      tokenD.address
    );

    const adPool = VPair__factory.connect(adAddress, fixture.owner);
    await adPool.setFee(fixture.adFee, fixture.adFee);
    await adPool.setWhitelist([fixture.tokenB.address, fixture.tokenC.address]);
    await adPool.setMaxReserveThreshold(ethers.utils.parseEther('2000'));
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

    const amountInAD = ethers.utils.parseEther("4");
    const amountInBD = ethers.utils.parseEther("2");

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
    const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);
 

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const tokenAPoolABBalanceBefore = await tokenA.balanceOf(abPool.address)
    const tokenAPoolADBalanceBefore = await tokenA.balanceOf(adPool.address)
    const tokenAPoolBDBalanceBefore = await tokenA.balanceOf(bdPool.address)

    const tokenDPoolABBalanceBefore = await tokenD.balanceOf(abPool.address)
    const tokenDPoolADBalanceBefore = await tokenD.balanceOf(adPool.address)
    const tokenDPoolBDBalanceBefore = await tokenD.balanceOf(bdPool.address)
    console.log(tokenAPoolABBalanceBefore)
    

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(vRouterInstance, owner, tokenA, tokenD, amountInAD, futureTs)
    multiData.push(str);

    str = await swapInReservePool(vRouterInstance, owner, bdPool, abPool, tokenB, tokenD, amountInBD, futureTs)
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

    const tokenAPoolABBalanceAfter = await tokenA.balanceOf(abPool.address)
    const tokenAPoolADBalanceAfter = await tokenA.balanceOf(adPool.address)
    const tokenAPoolBDBalanceAfter = await tokenA.balanceOf(bdPool.address)

    const tokenDPoolABBalanceAfter = await tokenD.balanceOf(abPool.address)
    const tokenDPoolADBalanceAfter = await tokenD.balanceOf(adPool.address)
    const tokenDPoolBDBalanceAfter = await tokenD.balanceOf(bdPool.address)

  //  const differenceAinAB = tokenAPoolABBalanceAfter - tokenAPoolABBalanceBefore
  //  const differenceAinAD = tokenAPoolADBalanceAfter - tokenAPoolADBalanceBefore
   // const differenceAinBD = tokenAPoolBDBalanceAfter - tokenAPoolBDBalanceBefore
   // const differenceDinAB = tokenDPoolABBalanceAfter - tokenDPoolABBalanceBefore
  
   const differenceDinAD = (tokenDPoolADBalanceAfter - tokenDPoolADBalanceBefore).toString()
  // const differenceDinAD_Tokens = ethers.utils.formatEther(differenceDinAD)
  // const amountOutAD_Tokens = ethers.utils.formatEther()
  
    // const differenceDinBD = tokenDPoolBDBalanceAfter - tokenDPoolBDBalanceBefore*/
    
 //   const differenceDinAD = _differenceDinAD.toString()
  
    console.log('NUMBERS')
    console.log(differenceDinAD)
    console.log(ethers.utils.formatEther(differenceDinAD))
  //  console.log(amountOutAD)
  //  console.log(ethers.utils.formatEther(amountOutAD))

    
  });

  it("Test 6: Complex Swap D --> B, should fail as D is not in whitelist", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInBD = ethers.utils.parseEther("5");
    const amountInAB = ethers.utils.parseEther("1");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(vRouterInstance, owner, tokenD, tokenB, amountInBD, futureTs)
    multiData.push(str);

    str = await swapInNativePool(vRouterInstance, owner, tokenD, tokenA, amountInAB, futureTs)
    multiData.push(str);

    await expect(vRouterInstance.multicall(multiData, false)).to.revertedWith(
      "TNW"
    );
  });

  it("Test 7: Complex Swap A --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
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

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(vRouterInstance, owner, tokenA, tokenB, amountInAB, futureTs)
    multiData.push(str);

    str = await swapInReservePool(vRouterInstance, owner, bdPool, adPool, tokenD, tokenB, amountInBD, futureTs)
    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);
  });

  it("Test 8: Complex Swap A --> B, should fail due to reserve ratio becomes below threshold", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("6");
    const amountInBD = ethers.utils.parseEther("4");

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
    const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const adPool = fixture.adPool;
    const bdPool = fixture.bdPool;

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await swapInNativePool(vRouterInstance, owner, tokenA, tokenB, amountInAB, futureTs)
    multiData.push(str);

    str = await swapInReservePool(vRouterInstance, owner, bdPool, adPool, tokenD, tokenB, amountInBD, futureTs)
    multiData.push(str);

    await vRouterInstance
      .multicall(multiData, false)
      .should.revertedWith("TBPT");
  });

  it("Test 9: Initial Liquidity Proivsion for C/D", async () => {
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[3];

    const vRouterInstance = fixture.vRouterInstance;

    let CInput = 20;
    let DInput = 230;

    await vRouterInstance.addLiquidity(
      tokenC.address,
      tokenD.address,
      ethers.utils.parseEther(CInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );

    const cdAddress = await fixture.vPairFactoryInstance.getPair(
      tokenC.address,
      tokenD.address
    );

    const cdPool = VPair__factory.connect(cdAddress, fixture.owner);
    await cdPool.setFee(fixture.cdFee, fixture.cdFee);
    await cdPool.setWhitelist([fixture.tokenA.address, fixture.tokenB.address]);
    await cdPool.setMaxReserveThreshold(ethers.utils.parseEther('2000'));
    fixture.cdPool = cdPool;

    const lp_tokens_gained_in_wei = await cdPool.balanceOf(trader.address);
    const lp_tokens_gained = Number(
      ethers.utils.formatEther(lp_tokens_gained_in_wei)
    );
    const lp_tokens_should_be_gained = Math.sqrt(CInput * DInput);
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained);
    expect(difference).lessThan(EPS);
  });

  it("Test 10: Complex Swap C --> B, should fail as assets are going to zero-zero native pool and as reserve ratio becomes higher than threshold", async () => {
    console.log("Not working, for additional info -- read comments");
    // This test is not implementable due to the way pools are organized
    // (we can't address to zero-zero pools as we create pools in the moment of liquidity provision)
  });

  it("Test 11: Complex Swap C --> B", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;    
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInAB = ethers.utils.parseEther("0.9");
    const amountInBD = ethers.utils.parseEther("0.1");

 //   const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
 //   const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);
 //   const tokenDBalanceBefore = await tokenD.balanceOf(owner.address);

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool;
    const cdPool = fixture.cdPool;
    const bdPool = fixture.bdPool;
    const acPool = fixture.acPool;

    let amountOutAB = await vRouterInstance.getVirtualAmountOut(
      abPool.address,
      acPool.address,
      amountInAB
    );

    console.log(Number(ethers.utils.formatEther(amountOutAB)));

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapReserveToExactNative", [
      tokenB.address,
      tokenA.address,
      acPool.address,
      amountOutAB,
      amountInAB,
      owner.address,
      futureTs
    ]);

    let amountOutBD = await vRouterInstance.getVirtualAmountOut(
      bdPool.address,
      cdPool.address,
      amountInAB
    );

    str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapReserveToExactNative", [
      tokenB.address,
      tokenD.address,
      cdPool.address,
      amountOutBD,
      amountInBD,
      owner.address,
      futureTs
    ]);

    multiData.push(str);
    await vRouterInstance.multicall(multiData, false);

  });

  it("Test 12: Subsequent liquidity provision for B/D", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[4];
    const bdPool = fixture.bdPool;

    //const bdPoolPreviousAmount = tokenB.bala

    const vRouterInstance = fixture.vRouterInstance;

    let BInput = 100;
    let DInput = 150;

    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );
    
    const lp_tokens_gained_in_wei = await bdPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(BInput * DInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)
  });
  

  it("Test 13: Liquidity withdrawal (B/D)", async () => {
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[2];
    const bdPool = fixture.bdPool;

    //const bdPoolPreviousAmount = tokenB.bala

    const vRouterInstance = fixture.vRouterInstance;

    let BInput = 100;
    let DInput = 150;

    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenD.address,
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(DInput.toString()),
      trader.address,
      await utils.getFutureBlockTimestamp()
    );
    /*
    const lp_tokens_gained_in_wei = await bdPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(BInput * DInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)*/
  });
});
