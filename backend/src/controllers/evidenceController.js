const path = require("path");
const fs = require("fs");
const cryptoService = require("../services/cryptoService");
const { ClaimMetadataStore } = require("../models/ClaimMetadata");
const blockchainService = require("../services/blockchainService");

/**
 * Verify document integrity by recalculating hash of file on disk vs recorded hash on-chain / metadata.
 */
async function verifyDocumentIntegrity(req, res) {
  try {
    const { claimId, filename, expectedHash } = req.body;

    if (!filename) {
      return res.status(400).json({ error: "Filename is required for integrity check." });
    }

    const uploadDir = path.join(__dirname, "../../uploads");
    const filePath = path.join(uploadDir, path.basename(filename));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        verified: false,
        exists: false,
        error: "Physical file could not be found in off-chain evidence repository.",
        notice: "Integrity cannot be certified for missing files.",
      });
    }

    // Recalculate cryptographic hashes from disk
    const calculatedSha256 = cryptoService.computeFileSha256(filePath);
    const calculatedKeccak256 = cryptoService.computeFileKeccak256(filePath);

    let matches = false;
    if (expectedHash) {
      matches =
        calculatedSha256.toLowerCase() === expectedHash.toLowerCase() ||
        calculatedKeccak256.toLowerCase() === expectedHash.toLowerCase();
    }

    // Check against on-chain claim if claimId provided
    let onChainMatch = null;
    if (claimId) {
      try {
        const onChain = await blockchainService.getOnChainClaim(claimId);
        if (
          onChain.documentRootHash.toLowerCase() === calculatedKeccak256.toLowerCase() ||
          onChain.surveyorReportHash.toLowerCase() === calculatedKeccak256.toLowerCase()
        ) {
          onChainMatch = true;
        }
      } catch (e) {
        // Ignored
      }
    }

    return res.json({
      verified: matches || onChainMatch === true,
      exists: true,
      filename: path.basename(filename),
      calculatedSha256,
      calculatedKeccak256,
      expectedHash: expectedHash || "N/A",
      onChainMatch,
      tampered: expectedHash ? !matches : false,
      timestamp: new Date().toISOString(),
      disclaimer:
        "Cryptographic hash match establishes that the digital document has not been altered or tampered with since submission. It does NOT prove that the document's real-world assertions are inherently factual.",
    });
  } catch (err) {
    return res.status(500).json({ error: "Verification failed", details: err.message });
  }
}

/**
 * Download or view an evidence document securely.
 */
async function downloadEvidence(req, res) {
  try {
    const { filename } = req.params;
    const uploadDir = path.join(__dirname, "../../uploads");
    const safePath = path.join(uploadDir, path.basename(filename));

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: "Document not found" });
    }

    return res.sendFile(safePath);
  } catch (err) {
    return res.status(500).json({ error: "Failed to download evidence", details: err.message });
  }
}

module.exports = {
  verifyDocumentIntegrity,
  downloadEvidence,
};
