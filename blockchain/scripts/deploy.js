const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=================================================");
  console.log("   Deploying InsureChain Smart Contract Suite    ");
  console.log("=================================================");

  const [admin, claimant, surveyor, insurer] = await ethers.getSigners();

  console.log(`Deployer / Admin:     ${admin.address}`);
  console.log(`Demo Policyholder:   ${claimant.address}`);
  console.log(`Demo Surveyor:       ${surveyor.address}`);
  console.log(`Demo Claims Officer: ${insurer.address}`);

  const InsuranceClaimManager = await ethers.getContractFactory("InsuranceClaimManager");
  const contract = await InsuranceClaimManager.deploy(admin.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`\n>>> InsuranceClaimManager deployed to: ${contractAddress}`);

  const SURVEYOR_ROLE = await contract.SURVEYOR_ROLE();
  const INSURER_ROLE = await contract.INSURER_ROLE();
  const CUSTOMER_ROLE = await contract.CUSTOMER_ROLE();

  console.log("\nGranting initial roles for demonstration...");
  const tx1 = await contract.connect(admin).grantRole(SURVEYOR_ROLE, surveyor.address);
  await tx1.wait();
  console.log(` Granted SURVEYOR_ROLE to ${surveyor.address}`);

  const tx2 = await contract.connect(admin).grantRole(INSURER_ROLE, insurer.address);
  await tx2.wait();
  console.log(` Granted INSURER_ROLE to ${insurer.address}`);

  const tx3 = await contract.connect(admin).grantRole(CUSTOMER_ROLE, claimant.address);
  await tx3.wait();
  console.log(` Granted CUSTOMER_ROLE to ${claimant.address}`);

  // Seed sample initial claim for demonstration
  console.log("\nSeeding initial demonstration claim on-chain...");
  const seedClaimRef = "CLM-2026-DEMO-01";
  const seedPolicyRefHash = ethers.keccak256(ethers.toUtf8Bytes("POL-2026-MOTOR-9812"));
  const seedCategory = "Motor Vehicle";
  const seedRequestedAmount = ethers.parseEther("1.85");
  const seedDocHash = ethers.keccak256(
    ethers.toUtf8Bytes("Demonstration Evidence Bundle: Vehicle Collision Report + Repair Quotation v1.0")
  );

  const regTx = await contract.connect(claimant).registerClaim(
    seedClaimRef,
    seedPolicyRefHash,
    seedCategory,
    seedRequestedAmount,
    seedDocHash
  );
  await regTx.wait();
  console.log(` Registered seed claim: ${seedClaimRef} (tx: ${regTx.hash})`);

  // Assign surveyor
  const seedClaimId = ethers.keccak256(ethers.toUtf8Bytes(seedClaimRef));
  const assignTx = await contract.connect(insurer).assignSurveyor(seedClaimId, surveyor.address);
  await assignTx.wait();
  console.log(` Assigned surveyor ${surveyor.address} to ${seedClaimRef} (Status: UNDER_REVIEW)`);

  // Export contract address and ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/InsuranceClaimManager.sol/InsuranceClaimManager.json");
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const configData = {
    network: "localhost",
    chainId: 31337,
    contractAddress: contractAddress,
    deployedAt: new Date().toISOString(),
    roles: {
      admin: admin.address,
      claimant: claimant.address,
      surveyor: surveyor.address,
      insurer: insurer.address,
    },
    abi: contractArtifact.abi,
  };

  const backendConfigDir = path.join(__dirname, "../../backend/src/config");
  const frontendConfigDir = path.join(__dirname, "../../frontend/src/config");

  fs.mkdirSync(backendConfigDir, { recursive: true });
  fs.mkdirSync(frontendConfigDir, { recursive: true });

  fs.writeFileSync(
    path.join(backendConfigDir, "contractConfig.json"),
    JSON.stringify(configData, null, 2)
  );
  fs.writeFileSync(
    path.join(frontendConfigDir, "contractConfig.json"),
    JSON.stringify(configData, null, 2)
  );

  console.log("\n Contract configuration successfully exported to backend and frontend!");
  console.log("=================================================\n");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
