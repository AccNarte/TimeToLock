import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting TimelockFactory deployment...\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (chainId: ${network.chainId})`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ${network.chainId === 137n ? 'MATIC' : 'ETH'}\n`);

  if (balance === 0n) {
    throw new Error("❌ Deployer has no funds! Please add MATIC/ETH to deploy.");
  }

  // Deploy TimelockFactory
  console.log("📦 Deploying TimelockFactory...");
  const Factory = await ethers.getContractFactory("TimelockFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ TimelockFactory deployed to: ${factoryAddress}`);

  // Calculate deployment cost
  const deploymentTx = factory.deploymentTransaction();
  if (deploymentTx) {
    const receipt = await ethers.provider.getTransactionReceipt(deploymentTx.hash);
    if (receipt) {
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`💸 Deployment cost: ${ethers.formatEther(gasCost)} ${network.chainId === 137n ? 'MATIC' : 'ETH'}\n`);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    factoryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${network.chainId}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`📄 Deployment info saved to: ${deploymentFile}\n`);

  // Verification instructions
  if (network.chainId === 137n || network.chainId === 80002n) {
    console.log("🔍 To verify on PolygonScan, run:");
    console.log(
      `   npx hardhat verify --network ${network.name} ${factoryAddress}\n`
    );
  }

  // Usage instructions
  console.log("📚 Next steps:");
  console.log("1. Update backend .env with:");
  console.log(`   FACTORY_ADDRESS_POLYGON=${factoryAddress}`);
  console.log("2. Update frontend .env with:");
  console.log(`   NEXT_PUBLIC_FACTORY_ADDRESS_POLYGON=${factoryAddress}`);
  console.log("3. Copy ABIs:");
  console.log("   npm run copy-abis");
  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
