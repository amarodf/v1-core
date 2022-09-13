import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

// We define a fixture to reuse the same setup in every test.
// We use loadFixture to run this setup once, snapshot that state,
// and reset Hardhat Network to that snapshot in every test.
export async function tokensFixture() {
  console.log("==================");
  console.log("Tokens Fixture");
  console.log("==================");

  const issueAmount = ethers.utils.parseEther(
    "100000000000000000000000000000000000"
  );

  // Contracts are deployed using the first signer/account by default
  const [
    owner,
    account1,
    account2,
    account3,
    account4,
    account5,
    account6,
    account7,
    account8,
    account9,
    account10,
  ] = await ethers.getSigners();

  const A_PRICE = 1;
  const B_PRICE = 3;
  const C_PRICE = 6;
  const D_PRICE = 9;

  const erc20ContractFactory = await ethers.getContractFactory(
    "ERC20PresetFixedSupply"
  );
  const tokenA = await erc20ContractFactory.deploy(
    "tokenA",
    "A",
    issueAmount,
    owner.address
  );
  const tokenB = await erc20ContractFactory.deploy(
    "tokenB",
    "B",
    issueAmount,
    owner.address
  );
  const tokenC = await erc20ContractFactory.deploy(
    "tokenC",
    "C",
    issueAmount,
    owner.address
  );

  const tokenD = await erc20ContractFactory.deploy(
    "tokenD",
    "D",
    issueAmount,
    owner.address
  );

  const vPairFactoryFactory = await ethers.getContractFactory("vPairFactory");
  const vPairFactoryInstance = await vPairFactoryFactory.deploy();

  const WETH9Factory = await ethers.getContractFactory("WETH9");
  const WETH9Instance = await WETH9Factory.deploy();

  const vRouterFactory = await ethers.getContractFactory("vRouter");
  const vRouterInstance = await vRouterFactory.deploy(
    vPairFactoryInstance.address,
    WETH9Instance.address
  );

  const vExchangeReservesFactory = await ethers.getContractFactory(
    "vExchangeReserves"
  );
  const vExchangeReservesInstance = await vExchangeReservesFactory.deploy(
    vPairFactoryInstance.address
  );

  await tokenA.approve(vRouterInstance.address, issueAmount);
  await tokenB.approve(vRouterInstance.address, issueAmount);
  await tokenC.approve(vRouterInstance.address, issueAmount);
  await tokenD.approve(vRouterInstance.address, issueAmount);

  return {
    tokenA,
    tokenB,
    tokenC,
    tokenD,
    A_PRICE,
    B_PRICE,
    C_PRICE,
    D_PRICE,
    vRouterInstance,
    vExchangeReservesInstance,
    owner,
    accounts: [
      account1,
      account2,
      account3,
      account4,
      account5,
      account6,
      account7,
      account8,
      account9,
      account10,
    ],
    vPairFactoryInstance,
  };
}
