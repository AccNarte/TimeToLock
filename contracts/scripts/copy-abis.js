const fs = require('fs');
const path = require('path');

// Define paths
const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts', 'contracts');
const BACKEND_ABI_DIR = path.join(__dirname, '..', '..', 'backend', 'backend', 'src', 'modules', 'blockchain', 'abis');
const FRONTEND_ABI_DIR = path.join(__dirname, '..', '..', 'front', 'lib', 'contracts');

// Contracts to copy
const CONTRACTS = [
  {
    name: 'TimelockFactory',
    path: 'TimelockFactory.sol/TimelockFactory.json',
  },
  {
    name: 'TimelockVault',
    path: 'TimelockVault.sol/TimelockVault.json',
  },
  {
    name: 'ITimelockVault',
    path: 'interfaces/ITimelockVault.sol/ITimelockVault.json',
  },
];

// ERC20 ABI for token interactions
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

function createDirIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function copyABI(contractName, sourcePath, targetDir) {
  const fullSourcePath = path.join(ARTIFACTS_DIR, sourcePath);

  if (!fs.existsSync(fullSourcePath)) {
    console.warn(`⚠️  Warning: ${contractName} artifact not found at ${fullSourcePath}`);
    return false;
  }

  const artifact = JSON.parse(fs.readFileSync(fullSourcePath, 'utf8'));
  const abi = artifact.abi;

  const targetPath = path.join(targetDir, `${contractName}.json`);

  // Create a clean ABI file with just the ABI array
  const abiContent = JSON.stringify(abi, null, 2);
  fs.writeFileSync(targetPath, abiContent);

  console.log(`✅ Copied ${contractName} ABI to ${targetPath}`);
  return true;
}

function main() {
  console.log('🚀 Starting ABI copy process...\n');

  // Create target directories
  createDirIfNotExists(BACKEND_ABI_DIR);
  createDirIfNotExists(FRONTEND_ABI_DIR);

  let successCount = 0;
  let failCount = 0;

  // Copy contract ABIs to both backend and frontend
  for (const contract of CONTRACTS) {
    console.log(`\n📄 Processing ${contract.name}...`);

    const backendSuccess = copyABI(contract.name, contract.path, BACKEND_ABI_DIR);
    const frontendSuccess = copyABI(contract.name, contract.path, FRONTEND_ABI_DIR);

    if (backendSuccess && frontendSuccess) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Create ERC20 ABI file
  console.log('\n📄 Creating ERC20 ABI...');
  const erc20Content = JSON.stringify(ERC20_ABI, null, 2);
  fs.writeFileSync(path.join(BACKEND_ABI_DIR, 'ERC20.json'), erc20Content);
  fs.writeFileSync(path.join(FRONTEND_ABI_DIR, 'ERC20.json'), erc20Content);
  console.log('✅ Created ERC20 ABI');

  // Copy deployment addresses if they exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (fs.existsSync(deploymentsDir)) {
    console.log('\n📋 Copying deployment addresses...');
    const deploymentFiles = fs.readdirSync(deploymentsDir).filter(f => f.endsWith('.json'));

    for (const file of deploymentFiles) {
      const deploymentPath = path.join(deploymentsDir, file);
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

      // Create address config for frontend
      const addressConfig = {
        chainId: deployment.chainId,
        factoryAddress: deployment.factoryAddress,
        deployedAt: deployment.timestamp,
      };

      const configPath = path.join(FRONTEND_ABI_DIR, `addresses-${deployment.chainId}.json`);
      fs.writeFileSync(configPath, JSON.stringify(addressConfig, null, 2));
      console.log(`✅ Copied deployment config for chain ${deployment.chainId}`);
    }
  }

  console.log('\n\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount} contracts`);
  console.log(`   ❌ Failed: ${failCount} contracts`);

  if (failCount === 0) {
    console.log('\n✨ All ABIs copied successfully!');
  } else {
    console.log('\n⚠️  Some ABIs failed to copy. Run "npm run compile" first.');
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Error copying ABIs:');
  console.error(error);
  process.exit(1);
}
