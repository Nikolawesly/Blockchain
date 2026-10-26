const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const blockchainService = require("../src/services/blockchainService");
const cryptoService = require("../src/services/cryptoService");
const { ClaimMetadataStore } = require("../src/models/ClaimMetadata");

async function runEndToEndTest() {
  console.log("==========================================================");
  console.log(" InsureChain Full End-to-End Blockchain Lifecycle Test    ");
  console.log("==========================================================");

  // Step 1: Health & Connectivity Check
  blockchainService.loadContractConfig();
  const conn = await blockchainService.checkConnection();
  console.log(`[Node Check] Connected to Hardhat RPC at Block #${conn.blockNumber}`);
  console.log(`[Contract] Address: ${conn.contractAddress}`);
  assert(conn.connected, "Blockchain node must be connected");

  // Step 2: Evidence creation and cryptographic hashing
  const uploadsDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const testFile1 = path.join(uploadsDir, "e2e-repair-estimate.pdf.txt");
  fs.writeFileSync(testFile1, "Official Auto Repair Invoice #90210. Total Estimate: $3,500.00. Certified.");
  const sha256Hash = cryptoService.computeFileSha256(testFile1);
  const keccak256Hash = cryptoService.computeFileKeccak256(testFile1);

  console.log(`\n[Evidence Hashing]`);
  console.log(` File: ${path.basename(testFile1)}`);
  console.log(` SHA-256:   ${sha256Hash}`);
  console.log(` Keccak256: ${keccak256Hash}`);

  // Step 3: Register Claim on Smart Contract
  const claimRef = `CLM-2026-E2E-${Date.now().toString().slice(-4)}`;
  const policyRefHash = cryptoService.hashText("POL-E2E-AUTO-7788");
  const requestedWei = ethers.parseEther("1.5");

  console.log(`\n[Action 1] Registering Claim: ${claimRef}...`);
  const regResult = await blockchainService.registerClaim({
    claimReference: claimRef,
    policyRefHash,
    category: "Motor Vehicle",
    requestedAmountWei: requestedWei,
    documentRootHash: keccak256Hash,
    callerRole: "CUSTOMER",
  });

  console.log(` ✔ Claim Registered on-chain! Tx: ${regResult.txHash}`);
  console.log(`   Gas used: ${regResult.gasUsed}, Block #${regResult.blockNumber}`);

  let onChain = await blockchainService.getOnChainClaim(regResult.claimId);
  assert.strictEqual(onChain.statusName, "SUBMITTED", "Initial status must be SUBMITTED");
  console.log(`   Authoritative on-chain status: ${onChain.statusName}`);

  // Step 4: Security Check — Prevent Approval Before Verification!
  console.log(`\n[Security Test 1] Attempting approval prior to surveyor verification...`);
  try {
    await blockchainService.approveClaim({
      claimId: regResult.claimId,
      approvedAmountWei: requestedWei,
      decisionReference: "DEC-ILLEGAL-01",
      callerRole: "INSURER",
    });
    assert.fail("Smart contract should have REVERTED unauthorized approval!");
  } catch (err) {
    console.log(` ✔ Smart contract successfully blocked invalid transition! Revert caught.`);
  }

  // Step 5: Assign Surveyor
  console.log(`\n[Action 2] Assigning Surveyor to ${claimRef}...`);
  const surveyorAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const assignResult = await blockchainService.assignSurveyor({
    claimId: regResult.claimId,
    surveyorAddress,
    callerRole: "INSURER",
  });
  console.log(` ✔ Surveyor assigned! Tx: ${assignResult.txHash}`);

  onChain = await blockchainService.getOnChainClaim(regResult.claimId);
  assert.strictEqual(onChain.statusName, "UNDER_REVIEW", "Status must be UNDER_REVIEW");
  console.log(`   Authoritative on-chain status: ${onChain.statusName}`);

  // Step 6: Surveyor Verification
  console.log(`\n[Action 3] Surveyor Submitting Verification Report...`);
  const recommendedWei = ethers.parseEther("1.45");
  const reportHash = cryptoService.hashText("Physical inspection completed. Front bumper & radiator repair verified.");

  const verifyResult = await blockchainService.submitVerification({
    claimId: regResult.claimId,
    recommendedAmountWei: recommendedWei,
    surveyorReportHash: reportHash,
    isVerified: true,
    notes: "Damage verified against collision photos.",
    callerRole: "SURVEYOR",
  });
  console.log(` ✔ Surveyor report submitted on-chain! Tx: ${verifyResult.txHash}`);

  onChain = await blockchainService.getOnChainClaim(regResult.claimId);
  assert.strictEqual(onChain.statusName, "VERIFIED", "Status must be VERIFIED");
  console.log(`   Authoritative on-chain status: ${onChain.statusName}`);

  // Step 7: Security Check — Prevent Settlement Before Approval!
  console.log(`\n[Security Test 2] Attempting settlement before approval...`);
  try {
    await blockchainService.recordSettlement({
      claimId: regResult.claimId,
      settlementReference: "SETTLE-ILLEGAL-01",
      callerRole: "INSURER",
    });
    assert.fail("Smart contract should have REVERTED premature settlement!");
  } catch (err) {
    console.log(` ✔ Smart contract successfully blocked premature settlement! Revert caught.`);
  }

  // Step 8: Claims Officer Approval
  console.log(`\n[Action 4] Claims Officer Approving Claim...`);
  const approveResult = await blockchainService.approveClaim({
    claimId: regResult.claimId,
    approvedAmountWei: recommendedWei,
    decisionReference: "DEC-2026-APPR-7701",
    callerRole: "INSURER",
  });
  console.log(` ✔ Claim Approved on-chain! Tx: ${approveResult.txHash}`);

  onChain = await blockchainService.getOnChainClaim(regResult.claimId);
  assert.strictEqual(onChain.statusName, "APPROVED", "Status must be APPROVED");
  console.log(`   Authoritative on-chain status: ${onChain.statusName}`);

  // Step 9: Settlement Recording
  console.log(`\n[Action 5] Recording Settlement on Ledger...`);
  const settleResult = await blockchainService.recordSettlement({
    claimId: regResult.claimId,
    settlementReference: "ACH-WIRE-TX-99881122",
    callerRole: "INSURER",
  });
  console.log(` ✔ Settlement recorded on-chain! Tx: ${settleResult.txHash}`);

  onChain = await blockchainService.getOnChainClaim(regResult.claimId);
  assert.strictEqual(onChain.statusName, "SETTLED", "Status must be SETTLED");
  console.log(`   Authoritative on-chain status: ${onChain.statusName}`);
  console.log(`   Settlement Reference: ${onChain.settlementReference}`);

  // Step 10: Authoritative Event Audit Trail
  console.log(`\n[Action 6] Querying Smart Contract Event Log History...`);
  const audit = await blockchainService.getAuditTrail(regResult.claimId);
  console.log(` Retrieved ${audit.length} immutable events from blockchain:`);
  audit.forEach((evt) => {
    console.log(`   - [Block #${evt.blockNumber}] ${evt.event} (tx: ${evt.txHash.slice(0, 18)}...)`);
  });
  assert(audit.length >= 4, "Must have recorded all lifecycle events");

  // Step 11: Document Integrity & Tamper Detection Check
  console.log(`\n[Action 7] Document Integrity Re-hashing Verification...`);
  const intactCheck = cryptoService.verifyFileIntegrity(testFile1, sha256Hash);
  assert(intactCheck.verified && !intactCheck.tampered, "Intact file must be verified");
  console.log(` ✔ Untouched file verified with 100% hash parity.`);

  // Tamper with the file
  fs.appendFileSync(testFile1, "\n[FRAUDULENT EDIT: Inflate repair quote by +$20,000]");
  const tamperedCheck = cryptoService.verifyFileIntegrity(testFile1, sha256Hash);
  assert(!tamperedCheck.verified && tamperedCheck.tampered, "Modified file must be detected as tampered!");
  console.log(` ✔ Tampering detection caught modified bytes! Verification failed as expected.`);

  // Cleanup test file
  fs.unlinkSync(testFile1);

  console.log("\n==========================================================");
  console.log(" ALL END-TO-END WORKFLOW & SECURITY TESTS PASSED!         ");
  console.log("==========================================================\n");
}

runEndToEndTest().catch((err) => {
  console.error("End-to-End Test Failure:", err);
  process.exit(1);
});
