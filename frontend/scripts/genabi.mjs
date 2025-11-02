import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "VotingSystem";

// <root>/backend
const rel = "../backend";

// <root>/frontend/abi
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/backend${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

// Network name to chainId mapping
// This mapping covers common networks. Add more as needed.
const networkChainIdMap = {
  localhost: 31337,
  hardhat: 31337,
  anvil: 31337,
  sepolia: 11155111,
  mainnet: 1,
  goerli: 5,
  mumbai: 80001,
  polygon: 137,
  arbitrum: 42161,
  arbitrumSepolia: 421614,
  optimism: 10,
  optimismSepolia: 11155420,
  base: 8453,
  baseSepolia: 84532,
  bsc: 56,
  bscTestnet: 97,
  avalanche: 43114,
  avalancheFuji: 43113,
};

function readDeployment(chainName, chainId, contractName) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);

  if (!fs.existsSync(chainDeploymentDir)) {
    return undefined;
  }

  const contractFile = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(contractFile)) {
    return undefined;
  }

  const jsonString = fs.readFileSync(contractFile, "utf-8");
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;
  obj.chainName = chainName;

  return obj;
}

// Automatically scan deployments directory for existing deployments
const deployments = {};
let primaryDeployment = null;

if (!fs.existsSync(deploymentsDir)) {
  console.error(
    `${line}Unable to locate '${deploymentsDir}' directory.${line}`
  );
  process.exit(1);
}

// Get all subdirectories in deployments directory
const deploymentDirs = fs.readdirSync(deploymentsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

if (deploymentDirs.length === 0) {
  console.error(
    `${line}No deployment directories found in '${deploymentsDir}'.${line}`
  );
  process.exit(1);
}

console.log(`Scanning deployments directory for existing deployments...`);
console.log(`Found deployment directories: ${deploymentDirs.join(", ")}`);

// Process each deployment directory
for (const chainName of deploymentDirs) {
  const chainId = networkChainIdMap[chainName];
  
  if (!chainId) {
    console.log(`Skipping ${chainName} - chainId not found in mapping`);
    continue;
  }

  const deployment = readDeployment(chainName, chainId, CONTRACT_NAME);
  
  if (deployment) {
    deployments[chainId.toString()] = deployment;
    // Use the first found deployment as primary (for ABI)
    if (!primaryDeployment) {
      primaryDeployment = deployment;
    }
    console.log(`✓ Found deployment for ${chainName} (chainId: ${chainId}) at ${deployment.address}`);
  } else {
    console.log(`Skipping ${chainName} (chainId: ${chainId}) - contract file not found`);
  }
}

// Validate that all deployments have the same ABI
if (Object.keys(deployments).length > 1) {
  const abis = Object.values(deployments).map((d) => JSON.stringify(d.abi));
  const uniqueAbis = new Set(abis);
  if (uniqueAbis.size > 1) {
    console.error(
      `${line}Deployments on different networks have different ABIs. Cannot use the same ABI on all networks. Consider re-deploying the contracts.${line}`
    );
    process.exit(1);
  }
}

if (!primaryDeployment) {
  console.error(
    `${line}No deployments found. Please deploy the contract at least to one network.${line}`
  );
  process.exit(1);
}


const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: primaryDeployment.abi }, null, 2)} as const;
\n`;

// Generate addresses object dynamically from existing deployments
const addressesEntries = Object.entries(deployments)
  .map(([chainId, deployment]) => {
    return `  "${chainId}": { address: "${deployment.address}", chainId: ${deployment.chainId}, chainName: "${deployment.chainName}" }`;
  })
  .join(",\n");

const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = { 
${addressesEntries}
};
`;

console.log(`\n${line}Generated files:${line}`);
console.log(`  - ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`  - ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);
console.log(`\nGenerated addresses for ${Object.keys(deployments).length} network(s):`);
console.log(tsAddresses);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);

