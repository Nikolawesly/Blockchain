import React, { useEffect, useState } from "react";
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Upload, 
  ArrowRight, 
  RefreshCw, 
  Shield 
} from "lucide-react";
import { api } from "../services/api";
import ClaimStatusBadge from "../components/ClaimStatusBadge";

export function SurveyorWorkspace({ onSelectClaim }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [verificationModal, setVerificationModal] = useState(false);
  const [flagModal, setFlagModal] = useState(false);

  // Form states
  const [recommendedAmount, setRecommendedAmount] = useState("");
  const [findingsSummary, setFindingsSummary] = useState("");
  const [isVerified, setIsVerified] = useState(true);
  const [reportFile, setReportFile] = useState(null);
  const [flagReason, setFlagReason] = useState("");
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

  const openVerifyModal = (claim) => {
    setSelectedClaim(claim);
    setRecommendedAmount(claim.requestedAmount || "");
    setFindingsSummary("Physical and digital evidence inspected. Damage assessment consistent with policy limits.");
    setIsVerified(true);
    setReportFile(null);
    setVerificationModal(true);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("recommendedAmount", recommendedAmount);
      formData.append("findingsSummary", findingsSummary);
      formData.append("isVerified", isVerified);
      if (reportFile) {
        formData.append("reportDocument", reportFile);
      }

      const res = await api.submitVerification(selectedClaim.claimId, formData);
      setFeedback({
        type: "success",
        message: res.data.message + ` (Tx: ${res.data.txHash})`,
      });
      setVerificationModal(false);
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

  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.flagClaim(selectedClaim.claimId, flagReason);
      setFeedback({
        type: "success",
        message: "Claim flagged on blockchain for investigation.",
      });
      setFlagModal(false);
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
            Surveyor Inspection Workspace
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.88rem" }}>
            Conduct digital evidence verification, inspect damage integrity, record findings, and submit on-chain recommendations.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchClaims}>
          <RefreshCw size={14} /> Refresh Assigned Claims
        </button>
      </div>

      <div className="alert alert-info">
        <Shield size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Surveyor Role Requirement:</strong> The smart contract strictly enforces that claims cannot be approved by an insurer until an authorized surveyor records a valid verification report on-chain.
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === "success" ? "alert-success" : "alert-danger"}`}>
          {feedback.type === "success" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <div>{feedback.message}</div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileCheck size={20} className="text-primary" />
            Inspection Queue & Verification Decisions
          </h3>
          <span className="role-badge role-SURVEYOR">Authorized Surveyor</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
            Querying assigned claims from smart contract...
          </div>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
            No claims pending surveyor inspection at this time.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim Reference</th>
                  <th>Category</th>
                  <th>Requested Amount</th>
                  <th>Current State</th>
                  <th>Incident Narrative</th>
                  <th>Surveyor Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const status = claim.blockchain?.statusName || "SUBMITTED";
                  const canVerify = ["SUBMITTED", "UNDER_REVIEW", "FLAGGED", "ADDITIONAL_INFO_REQUIRED"].includes(status);

                  return (
                    <tr key={claim.claimId || claim.claimReference}>
                      <td>
                        <strong>{claim.claimReference}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                          {claim.incidentDate}
                        </div>
                      </td>
                      <td>{claim.category}</td>
                      <td><strong>{claim.requestedAmount} ETH</strong></td>
                      <td>
                        <ClaimStatusBadge status={status} />
                      </td>
                      <td style={{ maxWidth: 280, fontSize: "0.82rem", color: "var(--slate-600)" }}>
                        {claim.incidentDescription.slice(0, 90)}...
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => onSelectClaim(claim.claimId || claim.claimReference)}
                          >
                            Inspect Evidence
                          </button>
                          {canVerify && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openVerifyModal(claim)}
                              >
                                Submit Report
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  setSelectedClaim(claim);
                                  setFlagReason("Suspected digital photo alteration or pre-existing damage.");
                                  setFlagModal(true);
                                }}
                              >
                                Flag
                              </button>
                            </>
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

      {/* Verification Modal */}
      {verificationModal && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title">
                <FileCheck size={20} className="text-primary" />
                Submit Verification Report: {selectedClaim.claimReference}
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setVerificationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleVerifySubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Inspection Verification Outcome</label>
                  <select
                    className="form-control"
                    value={isVerified}
                    onChange={(e) => setIsVerified(e.target.value === "true")}
                  >
                    <option value="true">VERIFIED — Damage is consistent with policy coverage</option>
                    <option value="false">FLAGGED — Anomalies or discrepancies detected</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Surveyor Recommended Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={recommendedAmount}
                    onChange={(e) => setRecommendedAmount(e.target.value)}
                    required
                  />
                  <div className="form-help">Original requested: {selectedClaim.requestedAmount} ETH</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Inspection Findings Summary</label>
                  <textarea
                    className="form-control"
                    value={findingsSummary}
                    onChange={(e) => setFindingsSummary(e.target.value)}
                    placeholder="Enter detailed assessment, itemized parts cost, or reason for adjustment..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Inspection Report PDF (Optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => setReportFile(e.target.files[0])}
                    accept=".pdf,.png,.docx"
                  />
                  <div className="form-help">A cryptographic hash of the report will be recorded on-chain.</div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setVerificationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Signing On Blockchain..." : "Commit Verification to Smart Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {flagModal && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title text-danger">
                <AlertTriangle size={20} />
                Flag Claim for Discrepancies
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setFlagModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFlagSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reason for Discrepancy Flag</label>
                  <textarea
                    className="form-control"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    required
                  />
                  <div className="form-help">
                    This flag will be permanently logged on the smart contract and will prevent immediate claim approval.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setFlagModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? "Submitting..." : "Flag Claim on Blockchain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyorWorkspace;
