import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { tokensFixture } from "./fixtures/tokensFixture";
import { ethers } from "hardhat";
import utils from "./utils";
import _ from "lodash";
import { VRouter__factory } from "../typechain-types/index";
import { VPair__factory } from "../typechain-types/index";

const EPS = 0.000001

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

    const abFee = "997"
    const acFee = 990
    const adFee = 997
    const bcFee = 999
    const bdFee = 997
    const cdFee = 990

    const account1 = fixture.accounts[0]
    await tokenA.transfer(account1.address, 300)
    await tokenB.transfer(account1.address, 200)
    await tokenD.transfer(account1.address, 550)

    const account2 = fixture.accounts[1]
    await tokenA.transfer(account2.address, 200)
    await tokenC.transfer(account2.address, 50)

    const account3 = fixture.accounts[2]
    await tokenB.transfer(account3.address, 300)
    await tokenD.transfer(account3.address, 450)

    const account4 = fixture.accounts[3]
    await tokenC.transfer(account4.address, 20)
    await tokenD.transfer(account4.address, 230)

    const account5 = fixture.accounts[4]
    await tokenB.transfer(account5.address, 100)
    await tokenD.transfer(account5.address, 150)
    
  });

  it("Test 1: Intital Liquidity Provision for A/B", async() => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const trader = fixture.accounts[0];
    const owner = fixture.owner

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

    const abPool = VPair__factory.connect(abAddress, trader);
    
    await abPool.setFee(ethers.utils.parseEther(fixture.abFee), ethers.utils.parseEther(fixture.abFee))
    await abPool.setWhitelist([fixture.tokenC.address])
    console.log(accounts.slice(1, 4))
    fixture.abPool = abPool;

    
    const lp_tokens_gained_in_wei = await abPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(AInput * BInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)

  });

  it("Test 2: Initial Liquidity Proivsion for A/C", async() => {
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

    const acPool = VPair__factory.connect(acAddress, trader);
    await acPool.setFee(fixture.acFee, fixture.acFee)
    await acPool.setWhitelist([fixture.tokenB.address])
    fixture.acPool = acPool;
    
    const lp_tokens_gained_in_wei = await acPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(AInput * CInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)

  });

  it("Test 3: Initial Liquidity Proivsion for B/D", async() => {
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

    const bdPool = VPair__factory.connect(bdAddress, trader);
    await bdPool.setFee(fixture.bdFee, fixture.bdFee)
    await bdPool.setWhitelist([fixture.tokenA.address, fixture.tokenC.address])
    fixture.bdPool = bdPool;
    
    const lp_tokens_gained_in_wei = await bdPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(BInput * DInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)

  })

  it("Test 4: Initial Liquidity Proivsion for A/D", async() => {
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

    const adPool = VPair__factory.connect(adAddress, trader);
    await adPool.setFee(fixture.adFee, fixture.adFee)
    await adPool.setWhitelist([fixture.tokenB.address, fixture.tokenC.address])
    fixture.adPool = adPool;
    
    const lp_tokens_gained_in_wei = await adPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(AInput * DInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)

  })

  it("Test 5: Complex Swap A --> D", async() => {
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

    const abPool = fixture.abPool
    const adPool = fixture.adPool
    const bdPool = fixture.bdPool

    let amountOutAD = await vRouterInstance.getAmountOut(
      tokenA.address,
      tokenD.address,
      amountInAD
    );
   
    let data = utils.getEncodedSwapData(
      owner.address,
      tokenD.address,
      tokenA.address,
      tokenD.address,
      amountInAD
    );

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapToExactNative", [
      tokenA.address,
      tokenD.address,
      amountOutAD,
      amountInAD,
      owner.address,
      futureTs,
    ]);

    multiData.push(str);

    console.log(Number(ethers.utils.formatEther(amountOutAD)))


    let amountOutBD = await vRouterInstance.getVirtualAmountOut(
      bdPool.address,
      abPool.address,
      amountInBD
    );

    console.log(Number(ethers.utils.formatEther(amountOutBD)))

    str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapReserveToExactNative", [
      tokenD.address,
      tokenB.address,
      abPool.address,
      amountOutBD,
      amountInBD,
      owner.address,
      futureTs,
    ]);

    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);
  })


  it("Test 6: Complex Swap D --> B, should fail as D is not in whitelist", async() => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const tokenD = fixture.tokenD;
    const owner = fixture.owner;

    const amountInBD = ethers.utils.parseEther("5");
    const amountInAB = ethers.utils.parseEther("1");

    const vRouterInstance = fixture.vRouterInstance;

    const abPool = fixture.abPool
    const adPool = fixture.adPool
    const bdPool = fixture.bdPool

    let amountOutBD = await vRouterInstance.getAmountOut(
      tokenA.address,
      tokenD.address,
      amountInBD
    );

    const futureTs = await utils.getFutureBlockTimestamp();

    let multiData = [];

    let str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapToExactNative", [
      tokenB.address,
      tokenD.address,
      amountOutBD,
      amountInBD,
      owner.address,
      futureTs,
    ]);

    multiData.push(str);

    console.log(Number(ethers.utils.formatEther(amountOutBD)))


    let amountOutAB = await vRouterInstance.getVirtualAmountOut(
      abPool.address,
      adPool.address,
      amountInAB
    );


    console.log(Number(ethers.utils.formatEther(amountOutBD)))


    str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapReserveToExactNative", [
      tokenA.address,
      tokenB.address,
      adPool.address,
      amountOutAB,
      amountInAB,
      owner.address,
      futureTs,
    ]);

    multiData.push(str);

    await expect(vRouterInstance.multicall(multiData, false)).to.revertedWith(
      "TNW"
    );
})

      
it("Test 7: Complex Swap A --> B", async() => {
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

  const abPool = fixture.abPool
  const adPool = fixture.adPool
  const bdPool = fixture.bdPool

  let amountOutAB = await vRouterInstance.getAmountOut(
    tokenA.address,
    tokenB.address,
    amountInAB
  );

  const futureTs = await utils.getFutureBlockTimestamp();

  let multiData = [];

  let str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapToExactNative", [
    tokenA.address,
    tokenD.address,
    amountOutAB,
    amountInAB,
    owner.address,
    futureTs,
  ]);

  multiData.push(str);

  console.log(Number(ethers.utils.formatEther(amountOutAB)))


  let amountOutBD = await vRouterInstance.getVirtualAmountOut(
    bdPool.address,
    adPool.address,
    amountInBD
  );

  console.log(Number(ethers.utils.formatEther(amountOutBD)))

  str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapReserveToExactNative", [
    tokenB.address,
    tokenD.address,
    abPool.address,
    amountOutBD,
    amountInBD,
    owner.address,
    futureTs,
  ]);
    
  multiData.push(str);
    
  await vRouterInstance.multicall(multiData, false);
  })
    
it("Test 8: Complex Swap A --> B, should fail due to reserve ratio becomes below threshold", async() => {
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

  const abPool = fixture.abPool
  const adPool = fixture.adPool
  const bdPool = fixture.bdPool

  let amountOutAB = await vRouterInstance.getAmountOut(
    tokenA.address,
    tokenB.address,
    amountInAB
  );

  const futureTs = await utils.getFutureBlockTimestamp();

  let multiData = [];

  let str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapToExactNative", [
    tokenA.address,
    tokenD.address,
    amountOutAB,
    amountInAB,
    owner.address,
    futureTs,
  ]);

  multiData.push(str);

  console.log(Number(ethers.utils.formatEther(amountOutAB)))


  let amountOutBD = await vRouterInstance.getVirtualAmountOut(
    bdPool.address,
    adPool.address,
    amountInBD
  );

  console.log(Number(ethers.utils.formatEther(amountOutBD)))

  str = await VRouter__factory.getInterface(
    VRouter__factory.abi
  ).encodeFunctionData("swapReserveToExactNative", [
    tokenB.address,
    tokenD.address,
    abPool.address,
    amountOutBD,
    amountInBD,
    owner.address,
    futureTs,
  ]);
    
  multiData.push(str);
    
  await vRouterInstance.multicall(multiData, false).should.revertedWith(
    "TBPT"
  );
  })


  it("Test 9: Initial Liquidity Proivsion for C/D", async() => {
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

    const cdPool = VPair__factory.connect(cdAddress, trader);
    await cdPool.setFee(fixture.cdFee, fixture.cdFee)
    await cdPool.setWhitelist([fixture.tokenA.address, fixture.tokenB.address])
    fixture.cdPool = cdPool;
    
    const lp_tokens_gained_in_wei = await cdPool.balanceOf(trader.address)
    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
    const lp_tokens_should_be_gained = Math.sqrt(CInput * DInput)
    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
    expect(difference).lessThan(EPS)

  })

  it("Test 10: Complex Swap C --> B, should fail as assets are going to zero-zero native pool and as reserve ratio becomes higher than threshold", async() => {
    console.log('Not working, for additional info -- read comments')
    // This test is not implementable due to the way pools are organized
    // (we can't address to zero-zero pools as we create pools in the moment of liquidity provision)
  })
  
  it("Test 11: Complex Swap C --> B", async() => {
    // will be done when questions about swaps are resolved
  })
  
  it("Test 12: Subsequent liquidity provision for B/D", async() =>{
    const tokenB = fixture.tokenB;
    const tokenD = fixture.tokenD;
    const trader = fixture.accounts[4];
    const bdPool = fixture.bdPool

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
  })

})