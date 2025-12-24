import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { OddsVeilLottery, OddsVeilLottery__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("OddsVeilLottery")) as OddsVeilLottery__factory;
  const contract = (await factory.deploy()) as OddsVeilLottery;
  const address = await contract.getAddress();

  return { contract, address };
}

describe("OddsVeilLottery", function () {
  let signers: Signers;
  let lottery: OddsVeilLottery;
  let lotteryAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract: lottery, address: lotteryAddress } = await deployFixture());
  });

  it("starts with zero points", async function () {
    const encryptedPoints = await lottery.getPoints(signers.alice.address);
    expect(encryptedPoints).to.eq(ethers.ZeroHash);
  });

  it("requires exact ticket price", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(3)
      .add8(18)
      .encrypt();

    await expect(
      lottery
        .connect(signers.alice)
        .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
          value: ethers.parseEther("0.009"),
        }),
    ).to.be.reverted;
  });

  it("buys a ticket, draws, and updates points", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(4)
      .add8(12)
      .encrypt();

    await lottery
      .connect(signers.alice)
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.01"),
      });

    const ticket = await lottery.getTicket(signers.alice.address);
    expect(ticket[2]).to.eq(true);

    const drawTx = await lottery.connect(signers.alice).draw();
    await drawTx.wait();

    const encryptedPoints = await lottery.getPoints(signers.alice.address);
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPoints,
      lotteryAddress,
      signers.alice,
    );

    expect([0, 1000, 100000]).to.include(Number(clearPoints));

    const updatedTicket = await lottery.getTicket(signers.alice.address);
    expect(updatedTicket[2]).to.eq(false);
  });

  it("reverts draw without an active ticket", async function () {
    await expect(lottery.connect(signers.alice).draw()).to.be.reverted;
  });
});
