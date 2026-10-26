const mongoose = require("mongoose");
const { isMongoConnected, memoryStore } = require("../config/db");

const ClaimMetadataSchema = new mongoose.Schema(
  {
    claimReference: { type: String, required: true, unique: true, index: true },
    claimId: { type: String, required: true, unique: true, index: true },
    policyNumber: { type: String, required: true },
    policyRefHash: { type: String, required: true },
    claimantWallet: { type: String, required: true, lowercase: true },
    category: { type: String, required: true },
    incidentDate: { type: String, required: true },
    incidentDescription: { type: String, required: true },
    requestedAmount: { type: String, required: true },
    supportingDocuments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        sizeBytes: Number,
        sha256Hash: String,
        keccak256Hash: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    surveyorReport: {
      findingsSummary: String,
      recommendedAmount: String,
      isVerified: Boolean,
      reportFile: {
        filename: String,
        originalName: String,
        sha256Hash: String,
        keccak256Hash: String,
        path: String,
      },
      submittedBy: String,
      submittedAt: Date,
    },
    flagReason: String,
    rejectionReason: String,
    decisionReference: String,
    settlementReference: String,
    transactions: [
      {
        action: String,
        txHash: String,
        actor: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const ClaimMetadataModel =
  mongoose.models.ClaimMetadata ||
  mongoose.model("ClaimMetadata", ClaimMetadataSchema);

class ClaimMetadataStore {
  static async create(data) {
    const normalized = {
      ...data,
      claimantWallet: data.claimantWallet.toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: data.transactions || [],
    };

    if (isMongoConnected()) {
      return await ClaimMetadataModel.create(normalized);
    }

    const id = "clm_" + Math.random().toString(36).substring(2, 11);
    const doc = { _id: id, id, ...normalized };
    memoryStore.claimMetadata.push(doc);
    return doc;
  }

  static async findByReference(reference) {
    if (isMongoConnected()) {
      return await ClaimMetadataModel.findOne({ claimReference: reference });
    }
    return memoryStore.claimMetadata.find((c) => c.claimReference === reference);
  }

  static async findByClaimId(claimId) {
    if (isMongoConnected()) {
      return await ClaimMetadataModel.findOne({ claimId });
    }
    return memoryStore.claimMetadata.find(
      (c) => c.claimId.toLowerCase() === claimId.toLowerCase()
    );
  }

  static async getAll() {
    if (isMongoConnected()) {
      return await ClaimMetadataModel.find().sort({ createdAt: -1 });
    }
    return [...memoryStore.claimMetadata].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  static async updateByReference(reference, updateData) {
    if (isMongoConnected()) {
      return await ClaimMetadataModel.findOneAndUpdate(
        { claimReference: reference },
        { $set: updateData, $push: updateData.transactions ? { transactions: { $each: updateData.transactions } } : {} },
        { new: true }
      );
    }
    const idx = memoryStore.claimMetadata.findIndex(
      (c) => c.claimReference === reference
    );
    if (idx !== -1) {
      const existing = memoryStore.claimMetadata[idx];
      const mergedTx = [
        ...(existing.transactions || []),
        ...(updateData.transactions || []),
      ];
      memoryStore.claimMetadata[idx] = {
        ...existing,
        ...updateData,
        transactions: mergedTx,
        updatedAt: new Date(),
      };
      return memoryStore.claimMetadata[idx];
    }
    return null;
  }

  static async addTransaction(reference, txData) {
    if (isMongoConnected()) {
      return await ClaimMetadataModel.findOneAndUpdate(
        { claimReference: reference },
        { $push: { transactions: txData } },
        { new: true }
      );
    }
    const record = memoryStore.claimMetadata.find(
      (c) => c.claimReference === reference
    );
    if (record) {
      if (!record.transactions) record.transactions = [];
      record.transactions.push({ ...txData, timestamp: new Date() });
      return record;
    }
    return null;
  }
}

module.exports = {
  ClaimMetadataModel,
  ClaimMetadataStore,
};
