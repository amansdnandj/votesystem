import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVotingSystem = await deploy("VotingSystem", {
    from: deployer,
    log: true,
  });

  console.log(`VotingSystem contract: `, deployedVotingSystem.address);
};
export default func;
func.id = "deploy_votingSystem"; // id required to prevent reexecution
func.tags = ["VotingSystem"];

