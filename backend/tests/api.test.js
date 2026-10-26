const cryptoService = require("../src/services/cryptoService");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

async function runTests() {
  console.log("--------------------------------------------------");
  console.log(" Running Backend Core & Cryptographic Hash Tests ");
  console.log("--------------------------------------------------");

  // Test 1: File SHA-256 and Keccak256 calculation
  const testFilePath = path.join(__dirname, "test-document.txt");
  fs.writeFileSync(testFilePath, "InsureChain Medical Discharge Summary & Pharmacy Invoices 2026");

  const sha256 = cryptoService.computeFileSha256(testFilePath);
  const keccak = cryptoService.computeFileKeccak256(testFilePath);

  console.log("Computed SHA-256:", sha256);
  console.log("Computed Keccak256:", keccak);

  assert(sha256.startsWith("0x"), "SHA256 must start with 0x");
  assert(keccak.startsWith("0x"), "Keccak256 must start with 0x");
  assert.strictEqual(sha256.length, 66, "SHA256 hex string must be 66 chars");
  assert.strictEqual(keccak.length, 66, "Keccak256 hex string must be 66 chars");
  console.log("✔ Test 1: Cryptographic hash generation passed.");

  // Test 2: File integrity verification when document is untouched
  const integrityMatch = cryptoService.verifyFileIntegrity(testFilePath, sha256);
  assert(integrityMatch.verified, "Document integrity should match original hash");
  assert(!integrityMatch.tampered, "Document should not be flagged as tampered");
  console.log("✔ Test 2: Untouched file integrity verification passed.");

  // Test 3: Document Tampering Detection
  // Simulate an adversary maliciously modifying the invoice amount in the stored file!
  fs.appendFileSync(testFilePath, "\n[TAMPERED CONTENT: Injected fraudulent claim amount: +$50,000]");
  const tamperedCheck = cryptoService.verifyFileIntegrity(testFilePath, sha256);

  assert(!tamperedCheck.verified, "Tampered file MUST fail hash check!");
  assert(tamperedCheck.tampered, "Tampered file MUST be detected and flagged!");
  console.log("✔ Test 3: Tampering detection successfully flagged modified file!");

  // Clean up test file
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }

  // Test 4: Evidence bundle root hash
  const hashList = [
    "0x1111111111111111111111111111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222222222222222222222222222",
  ];
  const bundleHash = cryptoService.computeEvidenceBundleHash(hashList);
  assert(bundleHash.startsWith("0x") && bundleHash.length === 66, "Bundle hash must be valid keccak256");
  console.log("✔ Test 4: Evidence bundle root hash calculation passed.");

  console.log("--------------------------------------------------");
  console.log(" All Backend Cryptographic Verification Tests PASSED! ");
  console.log("--------------------------------------------------");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
