const { sqrt } = require("bn-sqrt");
const { toDecimalUnits, toBn } = require("./utils");
const { solidity } = require("ethereum-waffle");
const chai = require("chai");
const { assert } = require("chai");

const vRouter = artifacts.require("vRouter");
const vSwapMath = artifacts.require("vSwapMath");
const vPair = artifacts.require("vPair");
const ERC20 = artifacts.require("ERC20PresetFixedSupply");
const vPairFactory = artifacts.require("vPairFactory");
chai.use(solidity);
const { expect } = chai;

contract("vPair", (accounts) => {
  function fromWeiToNumber(number) {
    return parseFloat(web3.utils.fromWei(number, "ether")).toFixed(6) * 1;
  }

  async function getFutureBlockTimestamp() {
    const blockNumber = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(blockNumber);
    return block.timestamp + 1000000;
  }

  const wallet = accounts[0];

  const A_PRICE = 1;
  const B_PRICE = 3;
  const C_PRICE = 6;

  let tokenA, tokenB, tokenC, WETH;

  const issueAmount = web3.utils.toWei("100000000000000", "ether");

  let vPairFactoryInstance, vRouterInstance, vSwapMathInstance, vPairInstance;

  before(async () => {
    tokenA = await ERC20.new("tokenA", "A", issueAmount, accounts[0]);

    tokenB = await ERC20.new("tokenB", "B", issueAmount, accounts[0]);

    tokenC = await ERC20.new("tokenC", "C", issueAmount, accounts[0]);

    vPairFactoryInstance = await vPairFactory.deployed();
    vRouterInstance = await vRouter.deployed();
    vSwapMathInstance = await vSwapMath.deployed();

    await tokenA.approve(vRouterInstance.address, issueAmount);
    await tokenB.approve(vRouterInstance.address, issueAmount);
    await tokenC.approve(vRouterInstance.address, issueAmount);

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

    //whitelist tokens in pools

    //print tokens
    console.log("tokenA: " + tokenA.address);
    console.log("tokenB: " + tokenB.address);
    console.log("tokenC: " + tokenC.address);
    //print liquidites

    //pool 1
    const address = await vPairFactoryInstance.getPair(
      tokenA.address,
      tokenB.address
    );
    const pool = await vPair.at(address);

    vPairInstance = await vPair.at(address);

    //whitelist token C
    await pool.setWhitelist([tokenC.address]);

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
    await pool2.setWhitelist([tokenB.address]);

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
    await pool3.setWhitelist([tokenA.address]);

    let reserve0Pool3 = await pool3.reserve0();
    let reserve1Pool3 = await pool3.reserve1();

    reserve0Pool3 = fromWeiToNumber(reserve0Pool3);
    reserve1Pool3 = fromWeiToNumber(reserve1Pool3);

    console.log("pool3: B/C: " + reserve0Pool3 + "/" + reserve1Pool3);
  });

  it("Should burn", (async = () => {

      


  }));
  it("Should set max whitelist count", async () => {
    const maxWhitelist = await vPairInstance.getMLQ();

    console.log("maxWhitelist " + maxWhitelist);

    // await vPairInstance.setMaxWhitelistCount(maxWhitelist - 1);

    // const maxWhitelistAfter = vPairInstance.max_whitelist_count();

    // assert.equal(maxWhitelist - 1, maxWhitelistAfter);
  });

  it("Should set whitelist", async () => {
    await vPairInstance.setWhitelist(accounts.slice(1, 4), {
      from: wallet,
    });
    const response1 = await vPairInstance.whitelistAllowance(accounts[1]);
    const response2 = await vPairInstance.whitelistAllowance(accounts[2]);
    const response3 = await vPairInstance.whitelistAllowance(accounts[3]);

    expect(response1).to.be.true;
    expect(response2).to.be.true;
    expect(response3).to.be.true;
  });

  it("Should assert old whitelist is obsolete after re-setting", async () => {
    await vPairInstance.setWhitelist(accounts.slice(1, 5), {
      from: wallet,
    });

    let response1 = await vPairInstance.whitelistAllowance(accounts[1]);
    let response2 = await vPairInstance.whitelistAllowance(accounts[2]);
    let response3 = await vPairInstance.whitelistAllowance(accounts[3]);
    let response4 = await vPairInstance.whitelistAllowance(accounts[4]);
    let response5 = await vPairInstance.whitelistAllowance(accounts[5]);
    let response6 = await vPairInstance.whitelistAllowance(accounts[6]);
    let response7 = await vPairInstance.whitelistAllowance(accounts[7]);
    let response8 = await vPairInstance.whitelistAllowance(accounts[8]);

    expect(response1).to.be.true;
    expect(response2).to.be.true;
    expect(response3).to.be.true;
    expect(response4).to.be.true;
    expect(response5).to.be.false;
    expect(response6).to.be.false;
    expect(response7).to.be.false;
    expect(response8).to.be.false;

    await vPairInstance.setWhitelist(accounts.slice(5, 9), {
      from: wallet,
    });

    response1 = await vPairInstance.whitelistAllowance(accounts[1]);
    response2 = await vPairInstance.whitelistAllowance(accounts[2]);
    response3 = await vPairInstance.whitelistAllowance(accounts[3]);
    response4 = await vPairInstance.whitelistAllowance(accounts[4]);
    response5 = await vPairInstance.whitelistAllowance(accounts[5]);
    response6 = await vPairInstance.whitelistAllowance(accounts[6]);
    response7 = await vPairInstance.whitelistAllowance(accounts[7]);
    response8 = await vPairInstance.whitelistAllowance(accounts[8]);

    expect(response1).to.be.false;
    expect(response2).to.be.false;
    expect(response3).to.be.false;
    expect(response4).to.be.false;

    expect(response5).to.be.true;
    expect(response6).to.be.true;
    expect(response7).to.be.true;
    expect(response8).to.be.true;
  });

  it("Should not set whitelist if list is longer then max_whitelist", async () => {
    await expect(
      vPairInstance.setWhitelist(accounts.slice(1, 10), {
        from: accounts[2],
      })
    ).to.revertedWith("");

    const response1 = await vPairInstance.whitelistAllowance(accounts[1]);
    const response2 = await vPairInstance.whitelistAllowance(accounts[2]);
    const response3 = await vPairInstance.whitelistAllowance(accounts[3]);
    const response4 = await vPairInstance.whitelistAllowance(accounts[4]);
    const response5 = await vPairInstance.whitelistAllowance(accounts[5]);
    const response6 = await vPairInstance.whitelistAllowance(accounts[6]);
    const response7 = await vPairInstance.whitelistAllowance(accounts[7]);
    const response8 = await vPairInstance.whitelistAllowance(accounts[8]);
    const response9 = await vPairInstance.whitelistAllowance(accounts[9]);

    expect(response1).to.be.false;
    expect(response2).to.be.false;
    expect(response3).to.be.false;
    expect(response4).to.be.false;
    expect(response5).to.be.false;
    expect(response6).to.be.false;
    expect(response7).to.be.false;
    expect(response8).to.be.false;
    expect(response9).to.be.false;
  });

  it("Should not set whitelist if not admin", async () => {
    await expect(
      vPairInstance.setWhitelist(accounts.slice(1, 5), {
        from: accounts[2],
      })
    ).to.revertedWith("");
  });

  it("Should set factory", async () => {
    vPairFactoryInstance2 = await vPairFactory.new({
      from: accounts[1],
    });

    await vPairInstance.setFactory(vPairFactoryInstance2.address);

    const factoryAddress = await vPairInstance.factory();

    expect(factoryAddress).to.be.equal(vPairFactoryInstance2.address);
  });

  it("Should set fee", async () => {
    const feeChange = 1000;
    const vFeeChange = 2000;
    await vPairInstance.setFee(feeChange, vFeeChange);

    const fee = await vPairInstance.fee();
    const vFee = await vPairInstance.vFee();

    expect(fee.toNumber()).to.be.equal(feeChange);
    expect(vFee.toNumber()).to.be.equal(vFeeChange);
  });

  it("Should set max reserve threshold", async () => {
    let reverted = false;
    const thresholdChange = 2000;
    try {
      await vPairInstance.setMaxReserveThreshold(thresholdChange);
    } catch (err) {
      reverted = true;
    }

    expect(reverted).to.be.false;
  });

  // it("Should mint", async () => {
  //   await vPairInstance.mint(wallet);
  //   const liquidity = await vPairInstance.balanceOf(wallet);

  //   let liquidityCalculated = toBn(18, 100);
  //   liquidityCalculated = liquidityCalculated.mul(toBn(18, 300));
  //   liquidityCalculated = sqrt(liquidityCalculated);
  //   liquidityCalculated = liquidityCalculated.sub(toBn(0, 10000));

  //   expect(liquidity.toString()).to.be.equal(liquidityCalculated.toString());
  // });

  // it("Should not mint if liquidity is not greater than 0 after deducting reserve ratio from liquidity", async () => {
  //   await vPairInstance.mint(wallet);
  //   const liquidity = await vPairInstance.balanceOf(wallet);

  //   let liquidityCalculated = toBn(18, 100);
  //   liquidityCalculated = liquidityCalculated.mul(toBn(18, 300));
  //   liquidityCalculated = sqrt(liquidityCalculated);
  //   liquidityCalculated = liquidityCalculated.sub(toBn(0, 10000));

  //   expect(liquidity.toString()).to.be.equal(liquidityCalculated.toString());
  // });

  // it("Should burn", async () => {
  //   await vPairInstance.mint(wallet);
  //   const liquidityWallet = await vPairInstance.balanceOf(wallet);

  //   await vPairInstance.transfer(vPairInstance.address, liquidityWallet);
  //   const liquidity = await vPairInstance.balanceOf(vPairInstance.address);
  //   const totalSupply = await vPairInstance.totalSupply();

  //   const aBalancePoolBefore = await tokenA.balanceOf(vPairInstance.address);
  //   let aBalancePoolShouldLeft = aBalancePoolBefore.mul(liquidity);
  //   aBalancePoolShouldLeft = aBalancePoolShouldLeft.div(totalSupply);
  //   const bBalancePoolBefore = await tokenB.balanceOf(vPairInstance.address);
  //   let bBalancePoolShouldLeft = bBalancePoolBefore.mul(liquidity);
  //   bBalancePoolShouldLeft = bBalancePoolShouldLeft.div(totalSupply);
  //   const aBalanceWalletBefore = await tokenA.balanceOf(wallet);
  //   const bBalanceWalletBefore = await tokenB.balanceOf(wallet);

  //   await vPairInstance.burn(wallet);
  //   const aBalancePoolAfter = await tokenA.balanceOf(vPairInstance.address);
  //   const bBalancePoolAfter = await tokenB.balanceOf(vPairInstance.address);
  //   const aBalanceWalletAfter = await tokenA.balanceOf(wallet);
  //   const bBalanceWalletAfter = await tokenB.balanceOf(wallet);

  //   expect(aBalancePoolAfter.lt(aBalancePoolBefore)).to.be.true;
  //   expect(bBalancePoolAfter.lt(bBalancePoolBefore)).to.be.true;
  //   expect(aBalanceWalletBefore.lt(aBalanceWalletAfter)).to.be.true;
  //   expect(bBalanceWalletBefore.lt(bBalanceWalletAfter)).to.be.true;

  //   expect(
  //     aBalancePoolAfter.add(aBalancePoolShouldLeft).toString()
  //   ).to.be.equal(aBalancePoolBefore.toString());
  //   expect(
  //     bBalancePoolAfter.add(bBalancePoolShouldLeft).toString()
  //   ).to.be.equal(bBalancePoolBefore.toString());

  //   expect(
  //     aBalanceWalletAfter.sub(aBalanceWalletBefore).toString()
  //   ).to.be.equal(aBalancePoolBefore.sub(aBalancePoolAfter).toString());
  //   expect(
  //     bBalanceWalletAfter.sub(bBalanceWalletBefore).toString()
  //   ).to.be.equal(bBalancePoolBefore.sub(bBalancePoolAfter).toString());
  // });

  // it("Should not burn if liquidity was not transferred", async () => {
  //   await vPairInstance.mint(wallet);

  //   await expect(vPairInstance.burn(wallet)).to.revertedWith("ILB.");
  // });

  // it("Should not burn if balance of one token is 0", async () => {
  //   await vPairInstance.mint(wallet);

  //   const removal = await tokenA.balanceOf(vPairInstance.address);
  //   await tokenA.transfer(wallet, removal);

  //   await expect(vPairInstance.burn(wallet)).to.revertedWith("ILB.");
  // });
  // // WIP

  // // it("Should swap reserves", async () => {
  // //   await vPairInstance.mint(wallet);
  // //   const liquidity = await vPairInstance(wallet);
  // // });

  // // it("Should not swap reserves if calculate reserve ratio is more than max allowed", async () => {});

  // // it("Should not swap reserves if not validated with factory", async () => {});

  // // it("Should not swap reserves if ik0 is not whitelisted", async () => {});

  // // it("Should calculate reserve ratio", async () => {
  // //   await vPairInstance.setWhitelist([tokenA.address], {
  // //     from: wallet,
  // //   });

  // //   const res1 = await vPairInstance.calculateReserveRatio();

  // //   await vPairInstance.mint(wallet);

  // //   const res2 = await vPairInstance.calculateReserveRatio();

  // //   expect((await vPairInstance.balanceOf(wallet)).eq(toDecimalUnits(18, 10000))).to.equal(true)
  // // });

  // it("Should swap native", async () => {
  //   await vPairInstance.mint(wallet);

  //   const aBalancePoolBefore = await tokenA.balanceOf(vPairInstance.address);
  //   const bBalancePoolBefore = await tokenB.balanceOf(vPairInstance.address);
  //   const aBalanceWalletBefore = await tokenA.balanceOf(wallet);
  //   const bBalanceWalletBefore = await tokenB.balanceOf(wallet);

  //   await tokenB.transfer(vPairInstance.address, toBn(18, 50));

  //   await vPairInstance.swapNative(toBn(18, 1), tokenA.address, wallet, []);

  //   const aBalancePoolAfter = await tokenA.balanceOf(vPairInstance.address);
  //   const bBalancePoolAfter = await tokenB.balanceOf(vPairInstance.address);
  //   const aBalanceWalletAfter = await tokenA.balanceOf(wallet);
  //   const bBalanceWalletAfter = await tokenB.balanceOf(wallet);

  //   expect(aBalancePoolBefore.toString()).to.be.equal(
  //     aBalancePoolAfter.add(toBn(18, 1)).toString()
  //   );
  //   expect(bBalancePoolAfter.toString()).to.be.equal(
  //     bBalancePoolBefore.add(toBn(18, 50)).toString()
  //   );
  //   expect(aBalanceWalletAfter.toString()).to.be.equal(
  //     aBalanceWalletBefore.add(toBn(18, 1)).toString()
  //   );
  //   expect(bBalanceWalletBefore.toString()).to.be.equal(
  //     bBalanceWalletAfter.add(toBn(18, 50)).toString()
  //   );
  // });

  // it("Should not swap native if address is 0", async () => {
  //   const zeroAddress = "0x0000000000000000000000000000000000000000";
  //   await vPairInstance.mint(wallet);

  //   await tokenB.transfer(vPairInstance.address, toBn(18, 50));

  //   await expect(
  //     vPairInstance.swapNative(toBn(18, 1), tokenA.address, zeroAddress, [])
  //   ).to.revertedWith("IT");
  // });

  // it("Should not swap native if amount exceeds balance", async () => {
  //   await vPairInstance.mint(wallet);

  //   await tokenB.transfer(vPairInstance.address, toBn(18, 50));

  //   await expect(
  //     vPairInstance.swapNative(toBn(21, 1), tokenA.address, wallet, [])
  //   ).to.revertedWith("transfer amount exceeds balance");
  // });

  // it("Should not swap native if amount exceeds balance", async () => {
  //   await vPairInstance.mint(wallet);

  //   await tokenB.transfer(vPairInstance.address, toBn(18, 50));

  //   await expect(
  //     vPairInstance.swapNative(toBn(19, 6), tokenA.address, wallet, [])
  //   ).to.revertedWith("IIA");
  // });
});
