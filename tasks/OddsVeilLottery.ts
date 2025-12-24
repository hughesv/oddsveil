import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the OddsVeilLottery address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const lottery = await deployments.get("OddsVeilLottery");
  console.log("OddsVeilLottery address is " + lottery.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:buy-ticket --first 3 --second 18
 *   - npx hardhat --network sepolia task:buy-ticket --first 3 --second 18
 */
task("task:buy-ticket", "Buys a ticket with two encrypted numbers")
  .addOptionalParam("address", "Optionally specify the OddsVeilLottery contract address")
  .addParam("first", "First number (1-20)")
  .addParam("second", "Second number (1-20)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    const first = parseInt(taskArguments.first);
    const second = parseInt(taskArguments.second);
    if (!Number.isInteger(first) || !Number.isInteger(second)) {
      throw new Error("Arguments --first and --second must be integers");
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("OddsVeilLottery");
    console.log(`OddsVeilLottery: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const lottery = await ethers.getContractAt("OddsVeilLottery", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .add8(first)
      .add8(second)
      .encrypt();

    const tx = await lottery
      .connect(signers[0])
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.01"),
      });

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:draw
 *   - npx hardhat --network sepolia task:draw
 */
task("task:draw", "Draws random numbers and updates encrypted points")
  .addOptionalParam("address", "Optionally specify the OddsVeilLottery contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments } = hre;
    const { ethers } = hre;

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("OddsVeilLottery");
    console.log(`OddsVeilLottery: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const lottery = await ethers.getContractAt("OddsVeilLottery", deployment.address);

    const tx = await lottery.connect(signers[0]).draw();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-points
 *   - npx hardhat --network sepolia task:decrypt-points
 */
task("task:decrypt-points", "Decrypts a player's encrypted points")
  .addOptionalParam("address", "Optionally specify the OddsVeilLottery contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("OddsVeilLottery");
    console.log(`OddsVeilLottery: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const lottery = await ethers.getContractAt("OddsVeilLottery", deployment.address);

    const encryptedPoints = await lottery.getPoints(signers[0].address);
    if (encryptedPoints === ethers.ZeroHash) {
      console.log(`Encrypted points: ${encryptedPoints}`);
      console.log("Clear points    : 0");
      return;
    }

    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPoints,
      deployment.address,
      signers[0],
    );
    console.log(`Encrypted points: ${encryptedPoints}`);
    console.log(`Clear points    : ${clearPoints}`);
  });
