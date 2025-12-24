import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { OddsVeilLottery } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("OddsVeilLotterySepolia", function () {
  let signers: Signers;
  let lottery: OddsVeilLottery;
  let lotteryAddress: string;

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("OddsVeilLottery");
      lotteryAddress = deployment.address;
      lottery = await ethers.getContractAt("OddsVeilLottery", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  it("buys a ticket and draws", async function () {
    this.timeout(4 * 40000);

    const encryptedInput = await fhevm
      .createEncryptedInput(lotteryAddress, signers.alice.address)
      .add8(5)
      .add8(14)
      .encrypt();

    const buyTx = await lottery
      .connect(signers.alice)
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.01"),
      });
    await buyTx.wait();

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
  });
});
