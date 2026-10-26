const express = require("express");
const router = express.Router();
const claimController = require("../controllers/claimController");
const { authenticate, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Claim submission with file upload (Customer or Demo)
router.post(
  "/",
  authenticate,
  upload.array("evidenceDocuments", 5),
  claimController.registerClaim
);

// Retrieve claims list
router.get("/", authenticate, claimController.getClaims);

// Retrieve single claim details & audit trail
router.get("/:id", authenticate, claimController.getClaimById);

// Verification Certificate
router.get("/:id/certificate", authenticate, claimController.getCertificate);

// Surveyor Assignment (INSURER or ADMIN)
router.post(
  "/:id/assign-surveyor",
  authenticate,
  requireRole("INSURER", "ADMIN"),
  claimController.assignSurveyor
);

// Surveyor verification report submission (SURVEYOR)
router.post(
  "/:id/verify",
  authenticate,
  requireRole("SURVEYOR"),
  upload.single("reportDocument"),
  claimController.submitVerification
);

// Flag claim for review
router.post(
  "/:id/flag",
  authenticate,
  requireRole("SURVEYOR", "INSURER", "ADMIN"),
  claimController.flagClaim
);

// Unflag claim back to UNDER_REVIEW
router.post(
  "/:id/unflag",
  authenticate,
  requireRole("INSURER", "ADMIN"),
  claimController.unflagClaim
);

// Request additional info
router.post(
  "/:id/request-info",
  authenticate,
  requireRole("SURVEYOR", "INSURER", "ADMIN"),
  claimController.requestAdditionalInfo
);

// Provide additional info (CUSTOMER)
router.post(
  "/:id/provide-info",
  authenticate,
  requireRole("CUSTOMER", "ADMIN"),
  upload.single("additionalDocument"),
  claimController.provideAdditionalInfo
);

// Approve claim (INSURER)
router.post(
  "/:id/approve",
  authenticate,
  requireRole("INSURER", "ADMIN"),
  claimController.approveClaim
);

// Reject claim (INSURER)
router.post(
  "/:id/reject",
  authenticate,
  requireRole("INSURER", "ADMIN"),
  claimController.rejectClaim
);

// Settle claim (INSURER)
router.post(
  "/:id/settle",
  authenticate,
  requireRole("INSURER", "ADMIN"),
  claimController.recordSettlement
);

module.exports = router;
