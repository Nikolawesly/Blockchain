const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsuranceClaimManager Smart Contract", function () {
  let contract;
  let admin, claimant, surveyor, insurer, unauthorizedUser;
  let SURVEYOR_ROLE, INSURER_ROLE, CUSTOMER_ROLE;

  const sampleClaimRef = "CLM-2026-0001";
  const samplePolicyRefHash = ethers.keccak256(ethers.toUtf8Bytes("POL-HEALTH-889911"));
  const sampleCategory = "Health";
  const requestedAmount = ethers.parseEther("2.5"); // e.g. 2.5 ETH or unit equivalent
  const sampleDocHash = ethers.keccak256(ethers.toUtf8Bytes("Sample Medical Invoices Document V1"));
  const sampleReportHash = ethers.keccak256(ethers.toUtf8Bytes("Surveyor Inspection Findings Document"));
  const updatedDocHash = ethers.keccak256(ethers.toUtf8Bytes("Additional Hospital Discharge Summary"));

  beforeEach(async function () {
    [admin, claimant, surveyor, insurer, unauthorizedUser] = await ethers.getSigners();

    const InsuranceClaimManager = await ethers.getContractFactory("InsuranceClaimManager");
    contract = await InsuranceClaimManager.deploy(admin.address);
    await contract.waitForDeployment();

    SURVEYOR_ROLE = await contract.SURVEYOR_ROLE();
    INSURER_ROLE = await contract.INSURER_ROLE();
    CUSTOMER_ROLE = await contract.CUSTOMER_ROLE();

    // Grant roles
    await contract.connect(admin).grantRole(SURVEYOR_ROLE, surveyor.address);
    await contract.connect(admin).grantRole(INSURER_ROLE, insurer.address);
  });

  describe("1. Deployment and Access Control Setup", function () {
    it("Should set the deployer as DEFAULT_ADMIN_ROLE", async function () {
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should correctly grant SURVEYOR_ROLE and INSURER_ROLE", async function () {
      expect(await contract.hasRole(SURVEYOR_ROLE, surveyor.address)).to.be.true;
      expect(await contract.hasRole(INSURER_ROLE, insurer.address)).to.be.true;
      expect(await contract.hasRole(SURVEYOR_ROLE, unauthorizedUser.address)).to.be.false;
    });

    it("Should prevent unauthorized accounts from granting roles", async function () {
      await expect(
        contract.connect(unauthorizedUser).grantRole(SURVEYOR_ROLE, unauthorizedUser.address)
      ).to.be.reverted;
    });
  });

  describe("2. Claim Registration", function () {
    it("Should register a claim successfully with document hash", async function () {
      const tx = await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );
      const receipt = await tx.wait();

      const expectedClaimId = ethers.keccak256(ethers.toUtf8Bytes(sampleClaimRef));
      const claim = await contract.getClaim(expectedClaimId);

      expect(claim.claimReference).to.equal(sampleClaimRef);
      expect(claim.policyRefHash).to.equal(samplePolicyRefHash);
      expect(claim.category).to.equal(sampleCategory);
      expect(claim.requestedAmount).to.equal(requestedAmount);
      expect(claim.claimant).to.equal(claimant.address);
      expect(claim.documentRootHash).to.equal(sampleDocHash);
      expect(claim.status).to.equal(0); // SUBMITTED

      // Claimant automatically gets CUSTOMER_ROLE
      expect(await contract.hasRole(CUSTOMER_ROLE, claimant.address)).to.be.true;
      expect(await contract.getClaimCount()).to.equal(1);
    });

    it("Should prevent duplicate claim references", async function () {
      await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );

      await expect(
        contract.connect(claimant).registerClaim(
          sampleClaimRef,
          samplePolicyRefHash,
          sampleCategory,
          requestedAmount,
          sampleDocHash
        )
      ).to.be.revertedWithCustomError(contract, "ClaimAlreadyExists");
    });

    it("Should reject zero requested amount or invalid document hash", async function () {
      await expect(
        contract.connect(claimant).registerClaim(
          "CLM-INVALID-1",
          samplePolicyRefHash,
          sampleCategory,
          0,
          sampleDocHash
        )
      ).to.be.revertedWithCustomError(contract, "InvalidAmount");

      await expect(
        contract.connect(claimant).registerClaim(
          "CLM-INVALID-2",
          samplePolicyRefHash,
          sampleCategory,
          requestedAmount,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(contract, "InvalidDocumentHash");
    });
  });

  describe("3. Surveyor Assignment", function () {
    let claimId;

    beforeEach(async function () {
      await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );
      claimId = ethers.keccak256(ethers.toUtf8Bytes(sampleClaimRef));
    });

    it("Should allow claims officer or admin to assign surveyor and move to UNDER_REVIEW", async function () {
      const tx = await contract.connect(insurer).assignSurveyor(claimId, surveyor.address);
      await expect(tx)
        .to.emit(contract, "SurveyorAssigned")
        .withArgs(claimId, surveyor.address, insurer.address, (val) => true);

      const claim = await contract.getClaim(claimId);
      expect(claim.assignedSurveyor).to.equal(surveyor.address);
      expect(claim.status).to.equal(1); // UNDER_REVIEW
    });

    it("Should prevent unauthorized users from assigning surveyors", async function () {
      await expect(
        contract.connect(unauthorizedUser).assignSurveyor(claimId, surveyor.address)
      ).to.be.revertedWithCustomError(contract, "UnauthorizedCaller");
    });

    it("Should reject assigning an address that lacks SURVEYOR_ROLE", async function () {
      await expect(
        contract.connect(insurer).assignSurveyor(claimId, unauthorizedUser.address)
      ).to.be.revertedWithCustomError(contract, "UnauthorizedCaller");
    });
  });

  describe("4. Verification & Fraud Prevention Workflow", function () {
    let claimId;

    beforeEach(async function () {
      await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );
      claimId = ethers.keccak256(ethers.toUtf8Bytes(sampleClaimRef));
      await contract.connect(insurer).assignSurveyor(claimId, surveyor.address);
    });

    it("Should allow assigned surveyor to submit positive verification", async function () {
      const recommended = ethers.parseEther("2.2");
      const tx = await contract.connect(surveyor).submitVerification(
        claimId,
        recommended,
        sampleReportHash,
        true,
        "All bills and hospital records verified with hospital."
      );

      await expect(tx)
        .to.emit(contract, "VerificationSubmitted")
        .withArgs(claimId, surveyor.address, recommended, sampleReportHash, true, (val) => true);

      const claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(2); // VERIFIED
      expect(claim.recommendedAmount).to.equal(recommended);
      expect(claim.surveyorReportHash).to.equal(sampleReportHash);
    });

    it("Should flag claim when surveyor submits negative verification", async function () {
      const recommended = 0;
      await contract.connect(surveyor).submitVerification(
        claimId,
        recommended,
        sampleReportHash,
        false,
        "Mismatch between claimed damage and photographic evidence."
      );

      const claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(5); // FLAGGED
      expect(claim.flagReason).to.include("Mismatch");
    });

    it("Should prevent non-surveyors from submitting verification report", async function () {
      await expect(
        contract.connect(claimant).submitVerification(
          claimId,
          requestedAmount,
          sampleReportHash,
          true,
          "Self verification attempt"
        )
      ).to.be.revertedWithCustomError(contract, "UnauthorizedCaller");
    });
  });

  describe("5. Additional Information Loop & Flagging", function () {
    let claimId;

    beforeEach(async function () {
      await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );
      claimId = ethers.keccak256(ethers.toUtf8Bytes(sampleClaimRef));
      await contract.connect(insurer).assignSurveyor(claimId, surveyor.address);
    });

    it("Should handle request for additional info and claimant response", async function () {
      // Surveyor requests additional receipts
      await contract.connect(surveyor).requestAdditionalInfo(
        claimId,
        "Please provide hospital pharmacy tax invoice"
      );

      let claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(7); // ADDITIONAL_INFO_REQUIRED

      // Claimant responds with updated document hash
      await contract.connect(claimant).provideAdditionalInfo(claimId, updatedDocHash);

      claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(1); // UNDER_REVIEW
      expect(claim.documentRootHash).to.equal(updatedDocHash);
    });

    it("Should allow flagging and unflagging by insurer", async function () {
      await contract.connect(insurer).flagClaim(claimId, "Duplicate incident reported nearby");
      let claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(5); // FLAGGED

      await contract.connect(insurer).unflagClaim(claimId, "Discrepancy resolved upon re-inspection");
      claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(1); // UNDER_REVIEW
    });
  });

  describe("6. Claim Decision (Approve / Reject)", function () {
    let claimId;

    beforeEach(async function () {
      await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );
      claimId = ethers.keccak256(ethers.toUtf8Bytes(sampleClaimRef));
      await contract.connect(insurer).assignSurveyor(claimId, surveyor.address);
    });

    it("Should PREVENT approval before surveyor verification", async function () {
      // Current status is UNDER_REVIEW, not VERIFIED
      await expect(
        contract.connect(insurer).approveClaim(
          claimId,
          requestedAmount,
          "DEC-2026-001"
        )
      ).to.be.revertedWithCustomError(contract, "ClaimNotVerified");
    });

    it("Should approve claim once verified by surveyor", async function () {
      // 1. Surveyor verifies
      await contract.connect(surveyor).submitVerification(
        claimId,
        ethers.parseEther("2.4"),
        sampleReportHash,
        true,
        "Verified"
      );

      // 2. Insurer approves
      const approvedAmount = ethers.parseEther("2.4");
      const tx = await contract.connect(insurer).approveClaim(
        claimId,
        approvedAmount,
        "DEC-2026-APPROVAL-99"
      );

      await expect(tx)
        .to.emit(contract, "ClaimApproved")
        .withArgs(claimId, insurer.address, approvedAmount, "DEC-2026-APPROVAL-99", (val) => true);

      const claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(3); // APPROVED
      expect(claim.approvedAmount).to.equal(approvedAmount);
      expect(claim.claimsOfficer).to.equal(insurer.address);
    });

    it("Should allow claims officer to reject claim with documented reason", async function () {
      // Surveyor verifies or flags
      await contract.connect(surveyor).submitVerification(
        claimId,
        0,
        sampleReportHash,
        false,
        "Damage outside policy coverage period"
      );

      const tx = await contract.connect(insurer).rejectClaim(
        claimId,
        "Exclusion Clause 4.B applies: Pre-existing condition"
      );

      await expect(tx)
        .to.emit(contract, "ClaimRejected")
        .withArgs(claimId, insurer.address, "Exclusion Clause 4.B applies: Pre-existing condition", (val) => true);

      const claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(6); // REJECTED
      expect(claim.rejectionReason).to.include("Exclusion Clause");
    });
  });

  describe("7. Claim Settlement Recording", function () {
    let claimId;

    beforeEach(async function () {
      await contract.connect(claimant).registerClaim(
        sampleClaimRef,
        samplePolicyRefHash,
        sampleCategory,
        requestedAmount,
        sampleDocHash
      );
      claimId = ethers.keccak256(ethers.toUtf8Bytes(sampleClaimRef));
      await contract.connect(insurer).assignSurveyor(claimId, surveyor.address);
      await contract.connect(surveyor).submitVerification(
        claimId,
        ethers.parseEther("2.0"),
        sampleReportHash,
        true,
        "Valid"
      );
    });

    it("Should PREVENT settlement before approval", async function () {
      await expect(
        contract.connect(insurer).recordSettlement(claimId, "BANK-TX-REF-10023")
      ).to.be.revertedWithCustomError(contract, "InvalidStateTransition");
    });

    it("Should record settlement after approval", async function () {
      await contract.connect(insurer).approveClaim(
        claimId,
        ethers.parseEther("2.0"),
        "DEC-999"
      );

      const tx = await contract.connect(insurer).recordSettlement(
        claimId,
        "BANK-ACH-TRANSFER-REF-998811"
      );

      await expect(tx)
        .to.emit(contract, "SettlementRecorded")
        .withArgs(claimId, insurer.address, ethers.parseEther("2.0"), "BANK-ACH-TRANSFER-REF-998811", (val) => true);

      const claim = await contract.getClaim(claimId);
      expect(claim.status).to.equal(4); // SETTLED
      expect(claim.settlementReference).to.equal("BANK-ACH-TRANSFER-REF-998811");
      expect(claim.settledAt).to.be.gt(0);
    });
  });
});
