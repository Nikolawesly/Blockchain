const { ClaimMetadataStore } = require("../models/ClaimMetadata");
const { UserStore } = require("../models/User");
const blockchainService = require("../services/blockchainService");
const { getStoreStatus } = require("../config/db");

async function getStats(req, res) {
  try {
    const claims = await ClaimMetadataStore.getAll();
    const counts = {
      total: claims.length,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      VERIFIED: 0,
      APPROVED: 0,
      SETTLED: 0,
      FLAGGED: 0,
      REJECTED: 0,
      ADDITIONAL_INFO_REQUIRED: 0,
    };

    let totalRequestedEth = 0;
    let totalSettledEth = 0;

    for (const c of claims) {
      let status = "SUBMITTED";
      try {
        const onChain = await blockchainService.getOnChainClaim(c.claimId);
        status = onChain.statusName;
        if (status === "SETTLED") {
          totalSettledEth += parseFloat(c.requestedAmount || "0");
        }
      } catch (err) {
        // fallback
      }
      if (counts[status] !== undefined) {
        counts[status]++;
      }
      totalRequestedEth += parseFloat(c.requestedAmount || "0");
    }

    const bcStatus = await blockchainService.checkConnection();
    const dbStatus = getStoreStatus();

    return res.json({
      claimCounts: counts,
      financials: {
        totalRequested: totalRequestedEth.toFixed(2),
        totalSettled: totalSettledEth.toFixed(2),
        currencyUnit: "ETH / Digital Unit",
      },
      blockchain: bcStatus,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load dashboard statistics", details: err.message });
  }
}

async function getAdminOverview(req, res) {
  try {
    const users = await UserStore.getAll();
    const bcStatus = await blockchainService.checkConnection();
    const claims = await ClaimMetadataStore.getAll();

    return res.json({
      users,
      totalClaims: claims.length,
      blockchain: bcStatus,
      contractConfig: blockchainService.contractConfig,
    });
  } catch (err) {
    return res.status(500).json({ error: "Admin overview failed", details: err.message });
  }
}

module.exports = {
  getStats,
  getAdminOverview,
};
