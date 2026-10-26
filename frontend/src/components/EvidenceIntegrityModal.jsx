import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, FileCheck, X, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export function EvidenceIntegrityModal({ file, claimId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyIntegrity(
        claimId,
        file.filename,
        file.keccak256Hash || file.sha256Hash
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="card-title">
            <FileCheck size={20} className="text-primary" />
            Document Integrity & Cryptographic Hash Verification
          </h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", marginBottom: 12 }}>
              To ensure tamper-evidence, the system reads the original binary file from off-chain storage, recalculates its cryptographic hash, and compares it directly against the authoritative hash committed to the smart contract.
            </p>
            <div style={{ background: "var(--slate-100)", padding: 12, borderRadius: 8, fontSize: "0.85rem" }}>
              <div><strong>Document Name:</strong> {file.originalName || file.filename}</div>
              <div style={{ marginTop: 4 }}>
                <strong>Recorded Keccak-256:</strong>
                <div className="hash-pill" style={{ marginTop: 2, display: "block", wordBreak: "break-all" }}>
                  {file.keccak256Hash || "N/A"}
                </div>
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Recorded SHA-256:</strong>
                <div className="hash-pill" style={{ marginTop: 2, display: "block", wordBreak: "break-all" }}>
                  {file.sha256Hash || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {result && (
            <div
              className={`alert ${result.verified ? "alert-success" : "alert-danger"}`}
              style={{ marginTop: 16 }}
            >
              {result.verified ? (
                <ShieldCheck size={24} style={{ flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={24} style={{ flexShrink: 0 }} />
              )}
              <div>
                <strong>
                  {result.verified
                    ? "Cryptographic Integrity Verified: Document Untampered!"
                    : "Integrity Verification Failed: Hash Discrepancy Detected!"}
                </strong>
                <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  {result.verified
                    ? "The file on disk produces an exact cryptographic match with the blockchain record. Zero byte alteration detected."
                    : "The document binary does not match the recorded hash. Either the file was modified, corrupted, or replaced."}
                </div>
                <div style={{ marginTop: 8, fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                  Recalculated SHA-256: {result.calculatedSha256}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 16 }}>
              <AlertTriangle size={18} />
              <div>{error}</div>
            </div>
          )}

          <div className="alert alert-info" style={{ marginTop: 16, fontSize: "0.78rem" }}>
            <strong>Academic Evaluation Note:</strong> A valid document hash proves that this specific digital record has remained unmodified since submission. It does not independently guarantee the truth of the real-world event described within it.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
            {loading ? "Recalculating Hashes..." : "Run Cryptographic Hash Check"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvidenceIntegrityModal;
