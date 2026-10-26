import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  Shield, 
  FileCheck, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Printer, 
  ExternalLink 
} from "lucide-react";
import { api } from "../services/api";
import ClaimStatusBadge from "../components/ClaimStatusBadge";
import ClaimLifecycleStepper from "../components/ClaimLifecycleStepper";
import EvidenceIntegrityModal from "../components/EvidenceIntegrityModal";
import CertificateModal from "../components/CertificateModal";

export function ClaimDetailsPage({ claimId, onBack, onRefreshNeeded }) {
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFileForIntegrity, setSelectedFileForIntegrity] = useState(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const fetchClaimDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getClaimById(claimId);
      setClaim(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimDetails();
  }, [claimId]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 60 }}>
        <div>Loading authoritative blockchain state and audit history...</div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="card">
        <div className="alert alert-danger">{error || "Claim not found"}</div>
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const currentStatus = claim.blockchain?.statusName || "SUBMITTED";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to List
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowCertificate(true)}>
          <Printer size={16} /> Printable Decision Certificate
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{claim.claimReference}</h2>
              <ClaimStatusBadge status={currentStatus} />
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--slate-500)", marginTop: 4 }}>
              Registered: {new Date(claim.createdAt).toLocaleString()} | Category: <strong>{claim.category}</strong>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--slate-500)", textTransform: "uppercase" }}>
              Requested Amount
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb" }}>
              {claim.requestedAmount} ETH
            </div>
          </div>
        </div>

        {/* Stepper */}
        <ClaimLifecycleStepper currentStatus={currentStatus} />

        {/* Overview details */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, background: "var(--slate-50)", padding: 18, borderRadius: 8, margin: "20px 0", border: "1px solid var(--slate-200)" }}>
          <div>
            <div className="stat-label">Claim ID (On-Chain)</div>
            <div className="hash-pill" style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>
              {claim.claimId}
            </div>
          </div>
          <div>
            <div className="stat-label">Policy Reference Hash</div>
            <div className="hash-pill" style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>
              {claim.policyRefHash}
            </div>
          </div>
          <div>
            <div className="stat-label">Policyholder Wallet</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
              {claim.claimantWallet}
            </div>
          </div>
          <div>
            <div className="stat-label">Assigned Surveyor</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
              {claim.blockchain?.assignedSurveyor || "Unassigned"}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>Incident Loss Narrative</h4>
          <p style={{ color: "var(--slate-700)", fontSize: "0.9rem", lineHeight: 1.6, background: "#fff", padding: 14, borderRadius: 6, border: "1px solid var(--slate-200)" }}>
            {claim.incidentDescription}
          </p>
        </div>

        {/* Supporting Documents & Integrity Verifier */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              Supporting Evidence Documents & Cryptographic Hashes ({claim.supportingDocuments.length})
            </h4>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>File Size</th>
                  <th>Cryptographic SHA-256 Hash</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claim.supportingDocuments.map((doc, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FileText size={16} className="text-primary" />
                        <strong>{doc.originalName || doc.filename}</strong>
                      </div>
                    </td>
                    <td>{doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : "N/A"}</td>
                    <td>
                      <span className="hash-pill" title={doc.sha256Hash}>
                        {doc.sha256Hash ? `${doc.sha256Hash.slice(0, 14)}...${doc.sha256Hash.slice(-10)}` : "N/A"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedFileForIntegrity(doc)}
                        >
                          <Shield size={14} /> Verify Integrity
                        </button>
                        <a
                          href={api.getEvidenceUrl(doc.filename)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                        >
                          <Download size={14} /> View
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Surveyor Inspection Findings Section */}
        {claim.surveyorReport && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 18, marginBottom: 24 }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#166534", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <FileCheck size={18} /> Official Surveyor Verification Report
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.85rem", marginBottom: 10 }}>
              <div>
                <strong>Recommended Amount:</strong> {claim.surveyorReport.recommendedAmount} ETH
              </div>
              <div>
                <strong>Verification Outcome:</strong> {claim.surveyorReport.isVerified ? "VERIFIED (Approved for Insurer Decision)" : "FLAGGED FOR INVESTIGATION"}
              </div>
            </div>
            <div style={{ fontSize: "0.88rem", color: "#1e293b", background: "#fff", padding: 12, borderRadius: 6, border: "1px solid #dcfce7" }}>
              <strong>Surveyor Findings Summary:</strong>
              <div style={{ marginTop: 4 }}>{claim.surveyorReport.findingsSummary}</div>
            </div>
          </div>
        )}

        {/* Claims Officer Approved / Settled Info */}
        {currentStatus === "APPROVED" && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <h4 style={{ color: "#065f46", fontSize: "0.95rem", fontWeight: 700 }}>
              Claims Officer Approved Decision
            </h4>
            <p style={{ fontSize: "0.88rem", marginTop: 4 }}>
              Decision Reference: <strong>{claim.blockchain?.decisionReference || "DEC-APPROVED"}</strong> | Approved Amount: <strong>{claim.blockchain?.approvedAmountWei ? (Number(claim.blockchain.approvedAmountWei) / 1e18).toFixed(2) : claim.requestedAmount} ETH</strong>
            </p>
          </div>
        )}

        {currentStatus === "SETTLED" && (
          <div style={{ background: "#d1fae5", border: "1px solid #34d399", borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <h4 style={{ color: "#065f46", fontSize: "0.95rem", fontWeight: 700 }}>
              Financial Settlement Recorded on Ledger
            </h4>
            <p style={{ fontSize: "0.88rem", marginTop: 4 }}>
              Settlement Reference: <strong>{claim.settlementReference || claim.blockchain?.settlementReference}</strong>
            </p>
            <div style={{ fontSize: "0.75rem", color: "#047857", marginTop: 4 }}>
              * Distinction Notice: This ledger record certifies that settlement payment was authorized and documented off-chain.
            </div>
          </div>
        )}

        {/* Blockchain Audit Trail from Contract Events */}
        <div>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>
            Authoritative Blockchain Audit Trail (Solidity Events)
          </h4>
          {claim.auditTrail && claim.auditTrail.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Block Height</th>
                    <th>Transaction Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {claim.auditTrail.map((evt, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="status-badge status-VERIFIED">{evt.event}</span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>Block #{evt.blockNumber}</td>
                      <td>
                        <span className="hash-pill" title={evt.txHash}>
                          {evt.txHash ? `${evt.txHash.slice(0, 16)}...${evt.txHash.slice(-10)}` : "Local"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "var(--slate-500)", background: "var(--slate-50)", padding: 14, borderRadius: 6 }}>
              No event logs currently retrieved for this claim ID.
            </div>
          )}
        </div>
      </div>

      {selectedFileForIntegrity && (
        <EvidenceIntegrityModal
          file={selectedFileForIntegrity}
          claimId={claim.claimId}
          onClose={() => setSelectedFileForIntegrity(null)}
        />
      )}

      {showCertificate && (
        <CertificateModal
          claimId={claim.claimId}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}

export default ClaimDetailsPage;
