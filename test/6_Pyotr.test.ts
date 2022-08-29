import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { tokensFixture } from "../fixtures/tokensFixture";
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

    const abFee = 997
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
    
    abPool.setFee(fixture.abFee, fixture.abFee)
    abPool.setWhitelist([fixture.tokenC.address])
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
    acPool.setFee(fixture.acFee, fixture.acFee)
    acPool.setWhitelist([fixture.tokenB.address])
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
    bdPool.setFee(fixture.bdFee, fixture.bdFee)
    bdPool.setWhitelist([fixture.tokenA.address, fixture.tokenC.address])
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
    adPool.setFee(fixture.adFee, fixture.adFee)
    adPool.setWhitelist([fixture.tokenB.address, fixture.tokenC.address])
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
      owner.address,
      data,
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

    let data2 = utils.getEncodedSwapData(
      owner.address,
      tokenA.address,
      tokenB.address,
      tokenD.address,
      amountInBD
    );

    str = await VRouter__factory.getInterface(
      VRouter__factory.abi
    ).encodeFunctionData("swapReserveToExactNative", [
      tokenD.address,
      tokenB.address,
      abPool.address,
      amountOutBD,
      owner.address,
      data2,
      futureTs,
    ]);

    multiData.push(str);

    await vRouterInstance.multicall(multiData, false);

/*
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
     
      let data = utils.getEncodedSwapData(
        owner.address,
        tokenD.address,
        tokenB.address,
        tokenD.address,
        amountInAD
      );
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await VRouter__factory.getInterface(
        VRouter__factory.abi
      ).encodeFunctionData("swapToExactNative", [
        tokenB.address,
        tokenD.address,
        amountOutAD,
        owner.address,
        data,
        futureTs,
      ]);
  
      multiData.push(str);
  
      console.log(Number(ethers.utils.formatEther(amountOutAD)))
  
  
      //let amountOutBD = await vRouterInstance.getVirtualAmountOut(
        bdPool.address,
        abPool.address,
        amountInBD
      );
  
  
      console.log(Number(ethers.utils.formatEther(amountOutBD)))
  
      let data2 = utils.getEncodedSwapData(
        owner.address,
        tokenA.address,
        tokenB.address,
        tokenD.address,
        amountInBD
      );
  
  
      str = await VRouter__factory.getInterface(
        VRouter__factory.abi
      ).encodeFunctionData("swapReserveToExactNative", [
        tokenD.address,
        tokenB.address,
        abPool.address,
        amountOutBD,
        owner.address,
        data2,
        futureTs,
      ]);
  
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  

/*
    it("Test 7: Complex Swap D --> B", async() => {
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
     
      let data = utils.getEncodedSwapData(
        owner.address,
        tokenD.address,
        tokenB.address,
        tokenD.address,
        amountInAD
      );
  
      const futureTs = await utils.getFutureBlockTimestamp();
  
      let multiData = [];
  
      let str = await VRouter__factory.getInterface(
        VRouter__factory.abi
      ).encodeFunctionData("swapToExactNative", [
        tokenB.address,
        tokenD.address,
        amountOutAD,
        owner.address,
        data,
        futureTs,
      ]);
  
      multiData.push(str);
  
      console.log(Number(ethers.utils.formatEther(amountOutAD)))
  
  
      //let amountOutBD = await vRouterInstance.getVirtualAmountOut(
        bdPool.address,
        abPool.address,
        amountInBD
      );
  
  
      console.log(Number(ethers.utils.formatEther(amountOutBD)))
  
      let data2 = utils.getEncodedSwapData(
        owner.address,
        tokenA.address,
        tokenB.address,
        tokenD.address,
        amountInBD
      );
  
  
      str = await VRouter__factory.getInterface(
        VRouter__factory.abi
      ).encodeFunctionData("swapReserveToExactNative", [
        tokenD.address,
        tokenB.address,
        abPool.address,
        amountOutBD,
        owner.address,
        data2,
        futureTs,
      ]);
  
      multiData.push(str);
  
      await vRouterInstance.multicall(multiData, false);
  
  

*/
    
   


 
//    const lp_tokens_gained_in_wei = await adPool.balanceOf(trader.address)
//    const lp_tokens_gained = Number(ethers.utils.formatEther(lp_tokens_gained_in_wei))
//    const lp_tokens_should_be_gained = Math.sqrt(AInput * DInput)
//    const difference = Math.abs(lp_tokens_gained - lp_tokens_should_be_gained)
//    expect(difference).lessThan(EPS)

  })


/*
  it("Should create pool B/C", async () => {
    const tokenB = fixture.tokenB;
    const tokenC = fixture.tokenC;
    const owner = fixture.owner;

    const vRouterInstance = fixture.vRouterInstance;

    // create pool A/B with 10,000 B and equivalent C
    let BInput = 10000 * fixture.B_PRICE;
    let CInput = (fixture.C_PRICE / fixture.B_PRICE) * BInput;

    await vRouterInstance.addLiquidity(
      tokenB.address,
      tokenC.address,
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      ethers.utils.parseEther(BInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      owner.address,
      await utils.getFutureBlockTimestamp()
    );

    const bcAddress = await fixture.vPairFactoryInstance.getPair(
      tokenB.address,
      tokenC.address
    );
    const bcPool = VPair__factory.connect(bcAddress, owner);
    fixture.bcPool = bcPool;
  });

  it("Should create pool A/C", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const owner = fixture.owner;

    const vRouterInstance = fixture.vRouterInstance;

    // create pool A/B with 10,000 B and equivalent C
    let AInput = 10000 * fixture.A_PRICE;
    let CInput = (fixture.C_PRICE / fixture.B_PRICE) * AInput;

    await vRouterInstance.addLiquidity(
      tokenA.address,
      tokenC.address,
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      ethers.utils.parseEther(AInput.toString()),
      ethers.utils.parseEther(CInput.toString()),
      owner.address,
      await utils.getFutureBlockTimestamp()
    );

    const bcAddress = await fixture.vPairFactoryInstance.getPair(
      tokenA.address,
      tokenC.address
    );
    const acPool = VPair__factory.connect(bcAddress, owner);
    fixture.acPool = acPool;
  });

  it("Should swap native A to B on pool A/B", async () => {
    accounts = _.map(fixture.accounts, "address");
    const abPool = fixture.abPool;
    const tokenA = fixture.tokenA;
    const owner = fixture.owner;
    const tokenB = fixture.tokenB;

    const aBalancePoolBefore = await tokenB.balanceOf(abPool.address);
    const bBalancePoolBefore = await tokenA.balanceOf(abPool.address);
    const aBalanceWalletBefore = await tokenB.balanceOf(owner.address);
    const bBalanceWalletBefore = await tokenA.balanceOf(owner.address);
    let aAmountOut = ethers.utils.parseEther("10");

    let amountIn = await fixture.vRouterInstance.getAmountIn(
      tokenA.address,
      tokenB.address,
      aAmountOut
    );

    await tokenA.transfer(abPool.address, amountIn);

    await abPool.swapNative(aAmountOut, tokenB.address, owner.address, []);

    const aBalancePoolAfter = await tokenB.balanceOf(abPool.address);
    const bBalancePoolAfter = await tokenA.balanceOf(abPool.address);
    const aBalanceWalletAfter = await tokenB.balanceOf(owner.address);
    const bBalanceWalletAfter = await tokenA.balanceOf(owner.address);

    expect(aBalancePoolBefore).to.be.above(aBalancePoolAfter);
    expect(bBalancePoolBefore).to.be.lessThan(bBalancePoolAfter);

    expect(aBalanceWalletBefore).to.be.lessThan(aBalanceWalletAfter);
    expect(bBalanceWalletBefore).to.be.above(bBalanceWalletAfter);
  });

  it("Should swap native B to A on pool A/B", async () => {
    const abPool = fixture.abPool;
    const tokenA = fixture.tokenA;
    const owner = fixture.owner;
    const tokenB = fixture.tokenB;

    const aBalancePoolBefore = await tokenA.balanceOf(abPool.address);
    const bBalancePoolBefore = await tokenB.balanceOf(abPool.address);
    const aBalanceWalletBefore = await tokenA.balanceOf(owner.address);
    const bBalanceWalletBefore = await tokenB.balanceOf(owner.address);

    let aAmountOut = ethers.utils.parseEther("10");

    let amountIn = await fixture.vRouterInstance.getAmountIn(
      tokenB.address,
      tokenA.address,
      aAmountOut
    );

    await tokenB.transfer(abPool.address, amountIn);

    await abPool.swapNative(aAmountOut, tokenA.address, owner.address, []);

    const aBalancePoolAfter = await tokenA.balanceOf(abPool.address);
    const bBalancePoolAfter = await tokenB.balanceOf(abPool.address);
    const aBalanceWalletAfter = await tokenA.balanceOf(owner.address);
    const bBalanceWalletAfter = await tokenB.balanceOf(owner.address);

    expect(aBalancePoolBefore).to.be.above(aBalancePoolAfter);
    expect(bBalancePoolBefore).to.be.lessThan(bBalancePoolAfter);
    expect(aBalanceWalletBefore).to.be.lessThan(aBalanceWalletAfter);
    expect(bBalanceWalletBefore).to.be.above(bBalanceWalletAfter);
  });

  it("Should quote A to B", async () => {
    const abPool = fixture.abPool;
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const vRouterInstance = fixture.vRouterInstance;

    let input = ethers.utils.parseEther("14");

    let quote = await vRouterInstance.quote(
      tokenA.address,
      tokenB.address,
      input
    );


    expect(quote).to.greaterThan(0);
    
  });

  it("Should (amountIn(amountOut(x)) = x)", async () => {
    const tokenA = fixture.tokenA;
    const tokenB = fixture.tokenB;
    const vRouterInstance = fixture.vRouterInstance;

    let X = ethers.utils.parseEther("395");

    const amountIn = await vRouterInstance.getAmountIn(
      tokenA.address,
      tokenB.address,
      X
    );

    const amountOut = await vRouterInstance.getAmountOut(
      tokenA.address,
      tokenB.address,
      amountIn
    );

    const amountOutEth = parseFloat(ethers.utils.formatEther(amountOut));
    expect(amountOutEth).to.equal(395);
  });

  it("Should calculate virtual pool A/C using A/B and B/C as oracle", async () => {
    const abPool = fixture.abPool;
    const bcPool = fixture.bcPool;

    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const vRouterInstance = fixture.vRouterInstance;

    const vPool = await vRouterInstance.getVirtualPool(
      bcPool.address,
      abPool.address
    );

    expect(
      vPool.reserve0 / vPool.reserve1 == fixture.A_PRICE / fixture.C_PRICE
    );
    expect(vPool.token0 == tokenA.address && vPool.token1 == tokenC.address);
  });

  it("Should getVirtualAmountIn(getVirtualAmountOut(x)) = x", async () => {
    const vRouterInstance = fixture.vRouterInstance;

    const _amountOut = ethers.utils.parseEther("10");

    const amountIn = await vRouterInstance.getVirtualAmountIn(
      fixture.bcPool.address,
      fixture.abPool.address,
      _amountOut
    );

    const amountOut = await vRouterInstance.getVirtualAmountOut(
      fixture.bcPool.address,
      fixture.abPool.address,
      amountIn
    );

    expect(_amountOut == amountOut);
  });

  it("Should getVirtualAmountIn for buying 10 B in virtual pool A/B", async () => {
    const vRouterInstance = fixture.vRouterInstance;

    const amountOut = ethers.utils.parseEther("10");

    const amountIn = await vRouterInstance.getVirtualAmountIn(
      fixture.bcPool.address,
      fixture.acPool.address,
      amountOut
    );

    expect(amountIn).to.greaterThan(0);
  });

  it("Should swap C to A on pool A/C", async () => {
    const tokenA = fixture.tokenA;
    const tokenC = fixture.tokenC;
    const owner = fixture.owner;

    const vRouterInstance = fixture.vRouterInstance;

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenCBalanceBefore = await tokenC.balanceOf(owner.address);

    const amountOut = ethers.utils.parseEther("10");

    let amountIn = await vRouterInstance.getAmountIn(
      tokenC.address,
      tokenA.address,
      amountOut
    );
    const futureTs = await utils.getFutureBlockTimestamp();

    let data = utils.getEncodedSwapData(
      owner.address,
      tokenC.address,
      tokenA.address,
      tokenC.address,
      amountIn
    );
    await vRouterInstance.swapToExactNative(
      tokenC.address,
      tokenA.address,
      amountOut,
      owner.address,
      data,
      futureTs
    );
    const tokenABalanceAfter = await tokenA.balanceOf(owner.address);
    const tokenCBalanceAfter = await tokenC.balanceOf(owner.address);
    expect(tokenCBalanceAfter).to.be.lessThan(tokenCBalanceBefore);

    expect(tokenABalanceAfter).to.above(tokenABalanceBefore);
  });
*/

});
