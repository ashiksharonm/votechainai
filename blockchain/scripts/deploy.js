const hre = require("hardhat");

async function main() {
    console.log("Deploying VoteLedger contract...");

    // Get the contract factory
    const VoteLedger = await hre.ethers.getContractFactory("VoteLedger");

    // Deploy the contract
    const voteLedger = await VoteLedger.deploy();

    // Wait for deployment to complete
    await voteLedger.waitForDeployment();

    const address = await voteLedger.getAddress();

    console.log(`VoteLedger deployed to: ${address}`);
    console.log("");
    console.log("Add this to your .env file:");
    console.log(`CONTRACT_ADDRESS=${address}`);
    console.log("");

    // Verify deployment
    const admin = await voteLedger.admin();
    console.log(`Admin address: ${admin}`);

    return address;
}

// Execute deployment
main()
    .then((address) => {
        console.log("\nDeployment successful!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
