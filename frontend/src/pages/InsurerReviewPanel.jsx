import React, { useEffect, useState } from "react";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  UserCheck, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle, 
  ShieldCheck 
} from "lucide-react";
import { api } from "../services/api";
import ClaimStatusBadge from "../components/ClaimStatusBadge";

export function InsurerReviewPanel({ onSelectClaim }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);

  // Modals
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [settleModal, setSettleModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  // Form states
  const [approvedAmount, setApprovedAmount] = useState("");
  const [decisionReference, setDecisionReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [settlementReference, setSettlementReference] = useState("");
  const [surveyorAddress, setSurveyorAddress] = useState("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await api.getClaims();
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const openApproveModal = (claim) => {
    setSelectedClaim(claim);
    setApprovedAmount(claim.requestedAmount || "");
    setDecisionReference(`DEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setApproveModal(true);
  };

  const openRejectModal = (claim) => {
    setSelectedClaim(claim);
    setRejectionReason("Policy exclusion clause 8.2: Loss occurred prior to policy inception period.");
    setRejectModal(true);
  };

  const openSettleModal = (claim) => {
    setSelectedClaim(claim);
    setSettlementReference(`SETTLE-ACH-${Date.now().toString().slice(-8)}`);
    setSettleModal(true);
  };

  const openAssignModal = (claim) => {
    setSelectedClaim(claim);
    setAssignModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.approveClaim(selectedClaim.claimId, approvedAmount, decisionReference);
      setFeedback({
        type: "success",
        message: `Claim approved successfully on blockchain. Tx: ${res.data.txHash}`,
      });
      setApproveModal(false);
      fetchClaims();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.rejectClaim(selectedClaim.claimId, rejectionReason);
      setFeedback({
        type: "success",
        message: `Claim rejected on blockchain. Tx: ${res.data.txHash}`,
      });
      setRejectModal(false);
      fetchClaims();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.recordSettlement(selectedClaim.claimId, settlementReference);
      setFeedback({
        type: "success",
        message: `Settlement recorded on blockchain. Tx: ${res.data.txHash}`,
      });
      setSettleModal(false);
      fetchClaims();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.assignSurveyor(selectedClaim.claimId, surveyorAddress);
      setFeedback({
        type: "success",
        message: `Surveyor assigned on blockchain. Claim state moved to UNDER_REVIEW. Tx: ${res.data.txHash}`,
      });
      setAssignModal(false);
      fetchClaims();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Claims Officer Decision & Settlement Panel
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.88rem" }}>
            Review surveyor inspection reports, assign certified loss assessors, approve/reject claims, and record blockchain settlements.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchClaims}>
          <RefreshCw size={14} /> Refresh Claims
        </button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === "success" ? "alert-success" : "alert-danger"}`}>
          {feedback.type === "success" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <div>{feedback.message}</div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Building2 size={20} className="text-primary" />
            Active Claims Review & Governance
          </h3>
          <span className="role-badge role-INSURER">Claims Officer Authority</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
            Loading all claims from smart contract...
          </div>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
            No claims available in the system.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim Reference</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Assigned Surveyor</th>
                  <th>Insurer Decision Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const status = claim.blockchain?.statusName || "SUBMITTED";
                  const canAssign = status === "SUBMITTED";
                  const canApproveOrReject = status === "VERIFIED";
                  const canSettle = status === "APPROVED";

                  return (
                    <tr key={claim.claimId || claim.claimReference}>
                      <td>
                        <strong>{claim.claimReference}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                          Policy: {claim.policyNumber}
                        </div>
                      </td>
                      <td>{claim.category}</td>
                      <td><strong>{claim.requestedAmount} ETH</strong></td>
                      <td>
                        <ClaimStatusBadge status={status} />
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                        {claim.blockchain?.assignedSurveyor ? (
                          `${claim.blockchain.assignedSurveyor.slice(0, 8)}...`
                        ) : (
                          <span style={{ color: "#d97706" }}>Not Assigned</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => onSelectClaim(claim.claimId || claim.claimReference)}
                          >
                            Details
                          </button>

                          {canAssign && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openAssignModal(claim)}
                            >
                              <UserCheck size={14} /> Assign Surveyor
                            </button>
                          )}

                          {canApproveOrReject && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => openApproveModal(claim)}
                              >
                                <CheckCircle2 size={14} /> Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => openRejectModal(claim)}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}

                          {canSettle && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openSettleModal(claim)}
                              style={{ background: "#059669", borderColor: "#059669" }}
                            >
                              <CreditCard size={14} /> Record Settlement
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Surveyor Modal */}
      {assignModal && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title">Assign Authorized Surveyor</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Claim Reference</label>
                  <input className="form-control" value={selectedClaim.claimReference} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Authorized Surveyor Wallet Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={surveyorAddress}
                    onChange={(e) => setSurveyorAddress(e.target.value)}
                    required
                  />
                  <div className="form-help">Default demo surveyor: Bob Martinez (0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Signing On Blockchain..." : "Assign on Smart Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title text-success">
                <CheckCircle2 size={20} />
                Approve Verified Claim: {selectedClaim.claimReference}
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setApproveModal(false)}>✕</button>
            </div>
            <form onSubmit={handleApproveSubmit}>
              <div className="modal-body">
                <div className="alert alert-success">
                  <ShieldCheck size={18} />
                  <div>
                    This claim has been officially verified by an authorized surveyor. Approving it will lock the approved amount on-chain.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Approved Settlement Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-control"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    required
                  />
                  <div className="form-help">Requested: {selectedClaim.requestedAmount} ETH</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Decision Reference Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={decisionReference}
                    onChange={(e) => setDecisionReference(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setApproveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? "Committing Approval..." : "Approve Claim on Blockchain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title text-danger">
                <XCircle size={20} />
                Reject Claim: {selectedClaim.claimReference}
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setRejectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mandatory Rejection Reason</label>
                  <textarea
                    className="form-control"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                  <div className="form-help">
                    The reason will be permanently recorded on the blockchain ledger.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? "Rejecting On Blockchain..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleModal && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title">
                <CreditCard size={20} className="text-primary" />
                Record Settlement on Ledger: {selectedClaim.claimReference}
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setSettleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSettleSubmit}>
              <div className="modal-body">
                <div className="alert alert-info">
                  <Building2 size={18} />
                  <div>
                    <strong>Ledger Synchronization:</strong> This operation records that financial disbursement has been executed off-chain. It does not replace real bank fiat currency wire transfers.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bank / Ledger Settlement Reference</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settlementReference}
                    onChange={(e) => setSettlementReference(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setSettleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Recording..." : "Record Settlement on Smart Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InsurerReviewPanel;
