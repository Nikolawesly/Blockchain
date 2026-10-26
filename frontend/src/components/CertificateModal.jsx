import React, { useEffect, useState } from "react";
import { Shield, Printer, X, CheckCircle, FileText } from "lucide-react";
import { api } from "../services/api";

export function CertificateModal({ claimId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCert() {
      try {
        const res = await api.getCertificate(claimId);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load certificate:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCert();
  }, [claimId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: 40, textAlign: "center" }}>
          <div>Generating Blockchain Decision Certificate...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: 30 }}>
          <div className="alert alert-danger">Failed to generate certificate.</div>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h3 className="card-title">
            <FileText size={20} className="text-primary" />
            Official Blockchain Decision Certificate
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer size={15} /> Print Certificate
            </button>
            <button className="btn btn-outline btn-sm" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="certificate-container" id="printable-certificate">
            <div className="certificate-header">
              <div className="certificate-seal">
                <Shield size={36} />
              </div>
              <div className="certificate-title">InsureChain Consortium</div>
              <div style={{ fontSize: "0.85rem", color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: 1 }}>
                Decentralized Insurance Claim Verification & Settlement Ledger
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 8, color: "#1e293b" }}>
                TAMPER-EVIDENT CLAIM DECISION CERTIFICATE
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: "0.88rem", marginBottom: 20 }}>
              <div>
                <strong>Claim Reference:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "#2563eb", fontWeight: 700 }}>
                  {data.claimReference}
                </div>
              </div>
              <div>
                <strong>Authoritative Ledger State:</strong>
                <div style={{ fontWeight: 700, color: data.status === "APPROVED" || data.status === "SETTLED" ? "#10b981" : "#d97706" }}>
                  {data.status}
                </div>
              </div>
              <div>
                <strong>Requested Amount:</strong>
                <div>{data.requestedAmountEth} ETH / Units</div>
              </div>
              <div>
                <strong>Approved / Settled Amount:</strong>
                <div>{data.approvedAmountEth} ETH / Units</div>
              </div>
              <div>
                <strong>Claimant Wallet:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                  {data.claimant}
                </div>
              </div>
              <div>
                <strong>Assigned Surveyor:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                  {data.assignedSurveyor || "None"}
                </div>
              </div>
              <div>
                <strong>Claims Officer:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                  {data.claimsOfficer || "Pending Decision"}
                </div>
              </div>
              <div>
                <strong>Settlement Reference:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  {data.settlementReference || "Not Yet Settled"}
                </div>
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontSize: "0.8rem" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Cryptographic Proof Signatures on Smart Contract:</div>
              <div style={{ marginBottom: 4 }}>
                <strong>Evidence Bundle Root Hash:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {data.documentRootHash}
                </div>
              </div>
              <div>
                <strong>Surveyor Report Findings Hash:</strong>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {data.surveyorReportHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}
                </div>
              </div>
            </div>

            {/* Academic Mandatory Disclaimer */}
            <div style={{ borderLeft: "4px solid #f59e0b", padding: "10px 14px", background: "#fffbeb", fontSize: "0.76rem", color: "#92400e" }}>
              <strong>ACADEMIC & LEGAL NOTICE:</strong> {data.disclaimer}
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--slate-500)", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
              <div>Issued At: {new Date(data.issuedAt).toLocaleString()}</div>
              <div>Network: Hardhat Local Ethereum (EVM Paris)</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Official Certificate
          </button>
        </div>
      </div>
    </div>
  );
}

export default CertificateModal;
