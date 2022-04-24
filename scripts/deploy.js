const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners(); 

  console.log("Deploying contracts with the account:", deployer.address); 

  const DBIO = await hre.ethers.getContractFactory("DBioContract1155"); // Getting the Contract
  const dbioContract = await DBIO.deploy(""); //the empty string should be the account that's deploying the contract, in this case dBio

  await dbioContract.deployed(); // waiting for the contract to be deployed

  console.log("dBio Smart Contract deployed to:", dbioContract.address); // Returning the contract address on the rinkeby
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract 