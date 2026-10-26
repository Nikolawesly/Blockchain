const express = require("express");
const router = express.Router();
const evidenceController = require("../controllers/evidenceController");
const { authenticate } = require("../middleware/auth");

// Cryptographic hash recalculation & integrity check
router.post("/verify-integrity", authenticate, evidenceController.verifyDocumentIntegrity);

// Evidence download / view endpoint
router.get("/download/:filename", authenticate, evidenceController.downloadEvidence);

module.exports = router;
