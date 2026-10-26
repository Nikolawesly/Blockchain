const crypto = require("crypto");
const fs = require("fs");
const { ethers } = require("ethers");

/**
 * Computes SHA-256 hash of a file on disk.
 */
function computeFileSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  return "0x" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Computes Ethereum-compatible keccak256 hash of a file on disk.
 */
function computeFileKeccak256(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  return ethers.keccak256(fileBuffer);
}

/**
 * Computes keccak256 of an arbitrary string (e.g., policy reference).
 */
function hashText(text) {
  return ethers.keccak256(ethers.toUtf8Bytes(String(text)));
}

/**
 * Computes combined bundle root hash for multiple files.
 */
function computeEvidenceBundleHash(fileHashes) {
  if (!fileHashes || fileHashes.length === 0) {
    return ethers.ZeroHash;
  }
  if (fileHashes.length === 1) {
    return fileHashes[0];
  }
  // Merkle-like or concatenated keccak hash
  const combined = fileHashes.join(":");
  return ethers.keccak256(ethers.toUtf8Bytes(combined));
}

/**
 * Verifies document integrity by re-reading the file and checking against recorded hash.
 */
function verifyFileIntegrity(filePath, expectedHash) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        verified: false,
        exists: false,
        error: "Original document file does not exist in storage.",
      };
    }
    const currentSha256 = computeFileSha256(filePath);
    const currentKeccak = computeFileKeccak256(filePath);

    const matches =
      currentSha256.toLowerCase() === expectedHash.toLowerCase() ||
      currentKeccak.toLowerCase() === expectedHash.toLowerCase();

    return {
      verified: matches,
      exists: true,
      currentSha256,
      currentKeccak,
      expectedHash,
      tampered: !matches,
    };
  } catch (err) {
    return {
      verified: false,
      exists: false,
      error: err.message,
    };
  }
}

module.exports = {
  computeFileSha256,
  computeFileKeccak256,
  hashText,
  computeEvidenceBundleHash,
  verifyFileIntegrity,
};
