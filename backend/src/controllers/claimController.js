const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
const { ClaimMetadataStore } = require("../models/ClaimMetadata");
const blockchainService = require("../services/blockchainService");
const cryptoService = require("../services/cryptoService");

/**
 * Register a new claim on-chain and store private supporting documents off-chain.
 */
async function registerClaim(req, res) {
  try {
    const {
      policyNumber,
      category,
      incidentDate,
      incidentDescription,
      requestedAmount,
    } = req.body;

    if (!policyNumber || !category || !incidentDate || !incidentDescription || !requestedAmount) {
      return res.status(400).json({ error: "All claim details are mandatory." });
    }

    const requestedAmountNum = parseFloat(requestedAmount);
    if (isNaN(requestedAmountNum) || requestedAmountNum <= 0) {
      return res.status(400).json({ error: "Invalid requested amount. Must be greater than 0." });
    }

    // Process uploaded evidence files
    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        error: "At least one supporting evidence document (bill, incident photo, report) is required.",
      });
    }

    const processedDocs = [];
    const docHashes = [];

    for (const file of uploadedFiles) {
      const sha256 = cryptoService.computeFileSha256(file.path);
      const keccak = cryptoService.computeFileKeccak256(file.path);
      processedDocs.push({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sha256Hash: sha256,
        keccak256Hash: keccak,
        path: file.path,
        uploadedAt: new Date(),
      });
      docHashes.push(keccak);
    }

    const documentRootHash = cryptoService.computeEvidenceBundleHash(docHashes);
    const policyRefHash = cryptoService.hashText(policyNumber.trim().toUpperCase());
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const claimReference = `CLM-${new Date().getFullYear()}-${uniqueSuffix}`;

    // Convert requested amount to wei units for blockchain precision
    const requestedAmountWei = ethers.parseEther(requestedAmountNum.toString());

    // 1. Submit on-chain transaction
    const callerRole = req.user?.role || "CUSTOMER";
    const onChainResult = await blockchainService.registerClaim({
      claimReference,
      policyRefHash,
      category,
      requestedAmountWei,
      documentRootHash,
      callerRole,
    });

    // 2. Save offchain metadata (MongoDB / Resilient Store)
    const metadata = await ClaimMetadataStore.create({
      claimReference,
      claimId: onChainResult.claimId,
      policyNumber,
      policyRefHash,
      claimantWallet: req.user?.walletAddress || onChainResult.from,
      category,
      incidentDate,
      incidentDescription,
      requestedAmount: requestedAmountNum.toString(),
      supportingDocuments: processedDocs,
      transactions: [
        {
          action: "ClaimRegistered",
          txHash: onChainResult.txHash,
          actor: req.user?.walletAddress || onChainResult.from,
          timestamp: new Date(),
        },
      ],
    });

    return res.status(201).json({
      message: "Insurance claim successfully registered on blockchain.",
      claimReference,
      claimId: onChainResult.claimId,
      txHash: onChainResult.txHash,
      blockNumber: onChainResult.blockNumber,
      documentRootHash,
      policyRefHash,
      status: "SUBMITTED",
      metadata,
    });
  } catch (err) {
    console.error("Error in registerClaim:", err);
    return res.status(500).json({
      error: "Claim registration failed",
      message: err.message,
    });
  }
}

/**
 * Retrieves all claims merging authoritative on-chain state with off-chain metadata.
 */
async function getClaims(req, res) {
  try {
    const offchainList = await ClaimMetadataStore.getAll();
    const userRole = req.user?.role;
    const userWallet = req.user?.walletAddress?.toLowerCase();

    const mergedClaims = [];

    for (const item of offchainList) {
      let onChainData = null;
      try {
        onChainData = await blockchainService.getOnChainClaim(item.claimId);
      } catch (err) {
        // If contract is not yet queried or offline
      }

      const claimObj = {
        claimReference: item.claimReference,
        claimId: item.claimId,
        category: item.category,
        incidentDate: item.incidentDate,
        incidentDescription: item.incidentDescription,
        policyNumber: userRole === "CUSTOMER" ? item.policyNumber : `***${item.policyNumber.slice(-4)}`,
        policyRefHash: item.policyRefHash,
        claimantWallet: item.claimantWallet,
        requestedAmount: item.requestedAmount,
        supportingDocumentsCount: item.supportingDocuments ? item.supportingDocuments.length : 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        transactions: item.transactions || [],
        // Authoritative blockchain status
        blockchain: onChainData || {
          statusName: "OFFLINE",
          statusCode: -1,
        },
      };

      // Role-based visibility filtering
      if (userRole === "CUSTOMER") {
        if (item.claimantWallet?.toLowerCase() === userWallet) {
          mergedClaims.push(claimObj);
        }
      } else if (userRole === "SURVEYOR") {
        // Surveyor sees claims assigned to them or submitted / under review
        const isAssigned = onChainData?.assignedSurveyor?.toLowerCase() === userWallet;
        const isAvailableForSurvey = ["SUBMITTED", "UNDER_REVIEW", "FLAGGED"].includes(onChainData?.statusName);
        if (isAssigned || isAvailableForSurvey) {
          mergedClaims.push(claimObj);
        }
      } else {
        // INSURER and ADMIN see all claims
        mergedClaims.push(claimObj);
      }
    }

    return res.json({
      count: mergedClaims.length,
      claims: mergedClaims,
    });
  } catch (err) {
    console.error("Error in getClaims:", err);
    return res.status(500).json({ error: "Failed to fetch claims", details: err.message });
  }
}

/**
 * Get full claim details, evidence files, on-chain state and audit trail.
 */
async function getClaimById(req, res) {
  try {
    const { id } = req.params;
    let metadata = await ClaimMetadataStore.findByClaimId(id);
    if (!metadata) {
      metadata = await ClaimMetadataStore.findByReference(id);
    }

    if (!metadata) {
      return res.status(404).json({ error: "Claim not found in system records." });
    }

    // Fetch authoritative smart contract state
    let onChainData = null;
    let auditTrail = [];
    try {
      onChainData = await blockchainService.getOnChainClaim(metadata.claimId);
      auditTrail = await blockchainService.getAuditTrail(metadata.claimId);
    } catch (err) {
      console.warn("Could not query blockchain for claim details:", err.message);
    }

    return res.json({
      claimReference: metadata.claimReference,
      claimId: metadata.claimId,
      policyNumber: metadata.policyNumber,
      policyRefHash: metadata.policyRefHash,
      category: metadata.category,
      incidentDate: metadata.incidentDate,
      incidentDescription: metadata.incidentDescription,
      requestedAmount: metadata.requestedAmount,
      claimantWallet: metadata.claimantWallet,
      supportingDocuments: metadata.supportingDocuments || [],
      surveyorReport: metadata.surveyorReport || null,
      flagReason: metadata.flagReason || onChainData?.flagReason || "",
      rejectionReason: metadata.rejectionReason || onChainData?.rejectionReason || "",
      settlementReference: metadata.settlementReference || onChainData?.settlementReference || "",
      createdAt: metadata.createdAt,
      transactions: metadata.transactions || [],
      blockchain: onChainData,
      auditTrail: auditTrail,
    });
  } catch (err) {
    return res.status(500).json({ error: "Error retrieving claim", details: err.message });
  }
}

/**
 * Assign surveyor to a claim (INSURER or ADMIN role).
 */
async function assignSurveyor(req, res) {
  try {
    const { id } = req.params;
    const { surveyorAddress } = req.body;

    if (!surveyorAddress || !ethers.isAddress(surveyorAddress)) {
      return res.status(400).json({ error: "Valid Ethereum surveyor wallet address required." });
    }

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) {
      return res.status(404).json({ error: "Claim record not found." });
    }

    const result = await blockchainService.assignSurveyor({
      claimId: metadata.claimId,
      surveyorAddress,
      callerRole: req.user?.role || "INSURER",
    });

    await ClaimMetadataStore.addTransaction(metadata.claimReference, {
      action: "SurveyorAssigned",
      txHash: result.txHash,
      actor: req.user?.walletAddress,
      timestamp: new Date(),
    });

    return res.json({
      message: "Surveyor assigned successfully on-chain.",
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      status: "UNDER_REVIEW",
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to assign surveyor", details: err.message });
  }
}

/**
 * Submit surveyor verification report and recommendation (SURVEYOR role).
 */
async function submitVerification(req, res) {
  try {
    const { id } = req.params;
    const { recommendedAmount, findingsSummary, isVerified } = req.body;

    if (recommendedAmount === undefined || isVerified === undefined) {
      return res.status(400).json({ error: "recommendedAmount and isVerified flag are required." });
    }

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) {
      return res.status(404).json({ error: "Claim record not found." });
    }

    const recAmountNum = parseFloat(recommendedAmount);
    const recommendedAmountWei = ethers.parseEther(recAmountNum.toString());
    const verifiedBool = String(isVerified).toLowerCase() === "true" || isVerified === true;

    // Handle optional inspection report file
    let reportDoc = null;
    let surveyorReportHash = null;

    if (req.file) {
      const sha256 = cryptoService.computeFileSha256(req.file.path);
      const keccak = cryptoService.computeFileKeccak256(req.file.path);
      reportDoc = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        sha256Hash: sha256,
        keccak256Hash: keccak,
        path: req.file.path,
      };
      surveyorReportHash = keccak;
    } else {
      // Hash findings summary text
      surveyorReportHash = cryptoService.hashText(
        findingsSummary || `Surveyor Verification Report for ${metadata.claimReference}`
      );
    }

    const result = await blockchainService.submitVerification({
      claimId: metadata.claimId,
      recommendedAmountWei,
      surveyorReportHash,
      isVerified: verifiedBool,
      notes: findingsSummary,
      callerRole: "SURVEYOR",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      surveyorReport: {
        findingsSummary,
        recommendedAmount: recAmountNum.toString(),
        isVerified: verifiedBool,
        reportFile: reportDoc,
        submittedBy: req.user?.walletAddress,
        submittedAt: new Date(),
      },
      flagReason: verifiedBool ? "" : findingsSummary,
      transactions: [
        {
          action: "VerificationSubmitted",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: verifiedBool
        ? "Surveyor verification approved and committed to blockchain."
        : "Surveyor flagged claim with discrepancies on blockchain.",
      status: verifiedBool ? "VERIFIED" : "FLAGGED",
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      surveyorReportHash,
    });
  } catch (err) {
    return res.status(500).json({ error: "Verification submission failed", details: err.message });
  }
}

/**
 * Flag a claim for suspicious patterns.
 */
async function flagClaim(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Flag reason required" });

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const result = await blockchainService.flagClaim({
      claimId: metadata.claimId,
      reason,
      callerRole: req.user?.role || "SURVEYOR",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      flagReason: reason,
      transactions: [
        {
          action: "ClaimFlagged",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Claim flagged on blockchain for further investigation.",
      status: "FLAGGED",
      txHash: result.txHash,
    });
  } catch (err) {
    return res.status(500).json({ error: "Flagging failed", details: err.message });
  }
}

/**
 * Unflag a claim back to UNDER_REVIEW (INSURER or ADMIN).
 */
async function unflagClaim(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const result = await blockchainService.unflagClaim({
      claimId: metadata.claimId,
      reason: reason || "Investigation cleared",
      callerRole: req.user?.role || "INSURER",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      flagReason: "",
      transactions: [
        {
          action: "ClaimUnflagged",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Claim unflagged and returned to review state.",
      status: "UNDER_REVIEW",
      txHash: result.txHash,
    });
  } catch (err) {
    return res.status(500).json({ error: "Unflagging failed", details: err.message });
  }
}

/**
 * Request additional information / documentation from customer.
 */
async function requestAdditionalInfo(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reason is required" });

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const result = await blockchainService.requestAdditionalInfo({
      claimId: metadata.claimId,
      reason,
      callerRole: req.user?.role || "SURVEYOR",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      flagReason: reason,
      transactions: [
        {
          action: "AdditionalInfoRequested",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Additional information requested on blockchain.",
      status: "ADDITIONAL_INFO_REQUIRED",
      txHash: result.txHash,
    });
  } catch (err) {
    return res.status(500).json({ error: "Request info failed", details: err.message });
  }
}

/**
 * Provide additional documentation requested by surveyor (CUSTOMER).
 */
async function provideAdditionalInfo(req, res) {
  try {
    const { id } = req.params;
    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    if (!req.file) {
      return res.status(400).json({ error: "Additional document file is required" });
    }

    const sha256 = cryptoService.computeFileSha256(req.file.path);
    const keccak = cryptoService.computeFileKeccak256(req.file.path);

    const newDoc = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sha256Hash: sha256,
      keccak256Hash: keccak,
      path: req.file.path,
      uploadedAt: new Date(),
    };

    const existingDocs = metadata.supportingDocuments || [];
    const allHashes = [...existingDocs.map((d) => d.keccak256Hash), keccak];
    const newRootHash = cryptoService.computeEvidenceBundleHash(allHashes);

    const result = await blockchainService.provideAdditionalInfo({
      claimId: metadata.claimId,
      newDocHash: newRootHash,
      callerRole: "CUSTOMER",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      supportingDocuments: [...existingDocs, newDoc],
      flagReason: "",
      transactions: [
        {
          action: "AdditionalInfoProvided",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Additional evidence uploaded and updated on blockchain.",
      status: "UNDER_REVIEW",
      txHash: result.txHash,
      newDocumentHash: newRootHash,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to provide additional info", details: err.message });
  }
}

/**
 * Approve verified claim (INSURER role).
 */
async function approveClaim(req, res) {
  try {
    const { id } = req.params;
    const { approvedAmount, decisionReference } = req.body;

    if (!approvedAmount) {
      return res.status(400).json({ error: "Approved amount is required." });
    }

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const approvedAmountNum = parseFloat(approvedAmount);
    const approvedAmountWei = ethers.parseEther(approvedAmountNum.toString());
    const decisionRef = decisionReference || `DEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await blockchainService.approveClaim({
      claimId: metadata.claimId,
      approvedAmountWei,
      decisionReference: decisionRef,
      callerRole: "INSURER",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      decisionReference: decisionRef,
      transactions: [
        {
          action: "ClaimApproved",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Claim approved on blockchain by Claims Officer.",
      status: "APPROVED",
      txHash: result.txHash,
      decisionReference: decisionRef,
      approvedAmount: approvedAmountNum.toString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Approval failed", details: err.message });
  }
}

/**
 * Reject claim with justification reason (INSURER role).
 */
async function rejectClaim(req, res) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: "Explicit rejection reason is mandatory." });
    }

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const result = await blockchainService.rejectClaim({
      claimId: metadata.claimId,
      reason: rejectionReason,
      callerRole: "INSURER",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      rejectionReason,
      transactions: [
        {
          action: "ClaimRejected",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Claim rejected on blockchain with documented reason.",
      status: "REJECTED",
      txHash: result.txHash,
      rejectionReason,
    });
  } catch (err) {
    return res.status(500).json({ error: "Rejection failed", details: err.message });
  }
}

/**
 * Record settlement after approval (INSURER role).
 */
async function recordSettlement(req, res) {
  try {
    const { id } = req.params;
    const { settlementReference } = req.body;

    const settlementRef = settlementReference || `SETTLE-TXN-${Date.now().toString().slice(-8)}`;

    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const result = await blockchainService.recordSettlement({
      claimId: metadata.claimId,
      settlementReference: settlementRef,
      callerRole: "INSURER",
    });

    await ClaimMetadataStore.updateByReference(metadata.claimReference, {
      settlementReference: settlementRef,
      transactions: [
        {
          action: "SettlementRecorded",
          txHash: result.txHash,
          actor: req.user?.walletAddress,
          timestamp: new Date(),
        },
      ],
    });

    return res.json({
      message: "Settlement recorded on blockchain. Ledger entry synchronized.",
      status: "SETTLED",
      txHash: result.txHash,
      settlementReference: settlementRef,
    });
  } catch (err) {
    return res.status(500).json({ error: "Settlement recording failed", details: err.message });
  }
}

/**
 * Generate printable claim decision certificate and cryptographic audit trail.
 */
async function getCertificate(req, res) {
  try {
    const { id } = req.params;
    let metadata = await ClaimMetadataStore.findByClaimId(id) || await ClaimMetadataStore.findByReference(id);
    if (!metadata) return res.status(404).json({ error: "Claim not found" });

    const onChainData = await blockchainService.getOnChainClaim(metadata.claimId);
    const auditTrail = await blockchainService.getAuditTrail(metadata.claimId);

    return res.json({
      certificateTitle: "INSURECHAIN TAMPER-EVIDENT CLAIM DECISION CERTIFICATE",
      issuedAt: new Date().toISOString(),
      disclaimer:
        "CRITICAL NOTICE: Blockchain records certify the integrity, authenticity, and immutable chronology of submitted digital documents and authorized approvals. Blockchain verification does not independently certify the real-world truth of the underlying physical incident.",
      claimReference: metadata.claimReference,
      claimId: metadata.claimId,
      policyReferenceHash: metadata.policyRefHash,
      claimant: onChainData.claimant,
      status: onChainData.statusName,
      requestedAmountEth: ethers.formatEther(onChainData.requestedAmountWei),
      recommendedAmountEth: ethers.formatEther(onChainData.recommendedAmountWei),
      approvedAmountEth: ethers.formatEther(onChainData.approvedAmountWei),
      documentRootHash: onChainData.documentRootHash,
      surveyorReportHash: onChainData.surveyorReportHash,
      assignedSurveyor: onChainData.assignedSurveyor,
      claimsOfficer: onChainData.claimsOfficer,
      settlementReference: onChainData.settlementReference,
      decisionReference: onChainData.decisionReference,
      rejectionReason: onChainData.rejectionReason,
      supportingDocuments: metadata.supportingDocuments.map((d) => ({
        originalName: d.originalName,
        sha256Hash: d.sha256Hash,
        keccak256Hash: d.keccak256Hash,
      })),
      blockchainAuditLog: auditTrail,
    });
  } catch (err) {
    return res.status(500).json({ error: "Certificate generation failed", details: err.message });
  }
}

module.exports = {
  registerClaim,
  getClaims,
  getClaimById,
  assignSurveyor,
  submitVerification,
  flagClaim,
  unflagClaim,
  requestAdditionalInfo,
  provideAdditionalInfo,
  approveClaim,
  rejectClaim,
  recordSettlement,
  getCertificate,
};
