const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const STATUS_MAP = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "APPROVED",
  "SETTLED",
  "FLAGGED",
  "REJECTED",
  "ADDITIONAL_INFO_REQUIRED",
];

// Well-known Hardhat development private keys for demo/backend signing
const DEMO_SIGNER_KEYS = {
  ADMIN: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  CUSTOMER: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  SURVEYOR: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  INSURER: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};

class BlockchainService {
  constructor() {
    this.rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.contractConfig = null;
    this.contractAddress = null;
    this.contractAbi = null;
    this.initialized = false;
  }

  loadContractConfig() {
    const configPath = path.join(__dirname, "../config/contractConfig.json");
    if (!fs.existsSync(configPath)) {
      console.warn(`[BlockchainService] contractConfig.json not found at ${configPath}. Run deployment script first.`);
      return false;
    }
    try {
      this.contractConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      this.contractAddress = this.contractConfig.contractAddress;
      this.contractAbi = this.contractConfig.abi;
      this.initialized = true;
      return true;
    } catch (err) {
      console.error(`[BlockchainService] Failed to parse contractConfig:`, err.message);
      return false;
    }
  }

  getSigner(roleOrKey) {
    let privateKey = DEMO_SIGNER_KEYS[roleOrKey] || roleOrKey;
    if (!privateKey || !privateKey.startsWith("0x")) {
      privateKey = DEMO_SIGNER_KEYS.ADMIN;
    }
    return new ethers.Wallet(privateKey, this.provider);
  }

  getContract(signer = null) {
    if (!this.initialized && !this.loadContractConfig()) {
      throw new Error("Smart contract configuration is not loaded. Please deploy the contract first.");
    }
    const runner = signer || this.provider;
    return new ethers.Contract(this.contractAddress, this.contractAbi, runner);
  }

  async checkConnection() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return {
        connected: true,
        blockNumber,
        contractAddress: this.contractAddress,
        network: "Localhost Hardhat (31337)",
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message,
        rpcUrl: this.rpcUrl,
      };
    }
  }

  async getNextNonce(signer) {
    const hexCount = await this.provider.send("eth_getTransactionCount", [signer.address, "latest"]);
    return parseInt(hexCount, 16);
  }

  // --- Blockchain State Mutating Transactions ---

  async registerClaim({ claimReference, policyRefHash, category, requestedAmountWei, documentRootHash, callerRole = "CUSTOMER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.registerClaim(
      claimReference,
      policyRefHash,
      category,
      requestedAmountWei,
      documentRootHash,
      { nonce }
    );
    const receipt = await tx.wait();

    const claimId = ethers.keccak256(ethers.toUtf8Bytes(claimReference));
    return {
      success: true,
      claimId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      from: signer.address,
    };
  }

  async assignSurveyor({ claimId, surveyorAddress, callerRole = "INSURER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.assignSurveyor(claimId, surveyorAddress, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      assignedSurveyor: surveyorAddress,
    };
  }

  async submitVerification({ claimId, recommendedAmountWei, surveyorReportHash, isVerified, notes, callerRole = "SURVEYOR" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.submitVerification(
      claimId,
      recommendedAmountWei,
      surveyorReportHash,
      isVerified,
      notes || "",
      { nonce }
    );
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      isVerified,
    };
  }

  async flagClaim({ claimId, reason, callerRole = "SURVEYOR" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.flagClaim(claimId, reason, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      flagReason: reason,
    };
  }

  async unflagClaim({ claimId, reason, callerRole = "INSURER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.unflagClaim(claimId, reason, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  async requestAdditionalInfo({ claimId, reason, callerRole = "SURVEYOR" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.requestAdditionalInfo(claimId, reason, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  async provideAdditionalInfo({ claimId, newDocHash, callerRole = "CUSTOMER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.provideAdditionalInfo(claimId, newDocHash, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  async approveClaim({ claimId, approvedAmountWei, decisionReference, callerRole = "INSURER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.approveClaim(claimId, approvedAmountWei, decisionReference, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      approvedAmount: approvedAmountWei.toString(),
    };
  }

  async rejectClaim({ claimId, reason, callerRole = "INSURER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.rejectClaim(claimId, reason, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      rejectionReason: reason,
    };
  }

  async recordSettlement({ claimId, settlementReference, callerRole = "INSURER" }) {
    const signer = this.getSigner(callerRole);
    const contract = this.getContract(signer);
    const nonce = await this.getNextNonce(signer);

    const tx = await contract.recordSettlement(claimId, settlementReference, { nonce });
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      settlementReference,
    };
  }

  // --- Blockchain State Query Methods ---

  async getOnChainClaim(claimId) {
    const contract = this.getContract();
    const data = await contract.getClaim(claimId);
    return {
      claimId: data.claimId,
      claimReference: data.claimReference,
      policyRefHash: data.policyRefHash,
      category: data.category,
      requestedAmountWei: data.requestedAmount.toString(),
      recommendedAmountWei: data.recommendedAmount.toString(),
      approvedAmountWei: data.approvedAmount.toString(),
      statusCode: Number(data.status),
      statusName: STATUS_MAP[Number(data.status)] || "UNKNOWN",
      claimant: data.claimant,
      assignedSurveyor: data.assignedSurveyor,
      claimsOfficer: data.claimsOfficer,
      documentRootHash: data.documentRootHash,
      surveyorReportHash: data.surveyorReportHash,
      decisionReference: data.decisionReference,
      rejectionReason: data.rejectionReason,
      flagReason: data.flagReason,
      settlementReference: data.settlementReference,
      createdAt: Number(data.createdAt) * 1000,
      updatedAt: Number(data.updatedAt) * 1000,
      settledAt: Number(data.settledAt) > 0 ? Number(data.settledAt) * 1000 : null,
    };
  }

  async getAllClaimIds() {
    const contract = this.getContract();
    return await contract.getAllClaimIds();
  }

  async getAuditTrail(claimId) {
    const contract = this.getContract();
    const events = [];

    const filterClaimId = claimId;

    const eventNames = [
      "ClaimRegistered",
      "SurveyorAssigned",
      "VerificationSubmitted",
      "ClaimFlagged",
      "ClaimUnflagged",
      "AdditionalInfoRequested",
      "AdditionalInfoProvided",
      "ClaimApproved",
      "ClaimRejected",
      "SettlementRecorded",
      "ClaimStatusUpdated",
    ];

    for (const evtName of eventNames) {
      try {
        const filter = contract.filters[evtName](filterClaimId);
        const logs = await contract.queryFilter(filter, 0, "latest");
        for (const log of logs) {
          events.push({
            event: evtName,
            args: log.args ? Object.fromEntries(
              Object.entries(log.args).filter(([k]) => isNaN(Number(k)))
            ) : {},
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      } catch (err) {
        // Continue querying other event filters
      }
    }

    // Sort by blockNumber
    events.sort((a, b) => a.blockNumber - b.blockNumber);
    return events;
  }
}

module.exports = new BlockchainService();
