import { JsonRpcProvider } from "ethers";

const RPC_URL = "http://localhost:8545";

async function checkHardhatNode() {
  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    console.log(`Hardhat node is running on chainId ${network.chainId}`);
    provider.destroy();
    process.exit(0);
  } catch (error) {
    console.error(`Hardhat node is not running at ${RPC_URL}`);
    console.error(error.message);
    process.exit(1);
  }
}

checkHardhatNode();

