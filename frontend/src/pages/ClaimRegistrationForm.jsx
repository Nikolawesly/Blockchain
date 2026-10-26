import React, { useState } from "react";
import { PlusCircle, Upload, ShieldCheck, AlertTriangle, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { api } from "../services/api";

export function ClaimRegistrationForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    policyNumber: "POL-2026-HLTH-8821",
    category: "Health",
    incidentDate: new Date().toISOString().split("T")[0],
    incidentDescription: "Emergency appendectomy hospital admission and surgical intervention invoices.",
    requestedAmount: "1.75",
  });

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please attach at least one supporting document (hospital invoice, police report, or damage photos).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("policyNumber", formData.policyNumber);
      data.append("category", formData.category);
      data.append("incidentDate", formData.incidentDate);
      data.append("incidentDescription", formData.incidentDescription);
      data.append("requestedAmount", formData.requestedAmount);

      for (const file of files) {
        data.append("evidenceDocuments", file);
      }

      const res = await api.registerClaim(data);
      setSuccessResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successResult) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <CheckCircle size={36} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Claim Successfully Registered on Blockchain
          </h2>
          <p style={{ color: "var(--slate-600)", maxWidth: 500, margin: "8px auto 24px" }}>
            The claim record and cryptographic evidence hashes have been permanently committed to the smart contract.
          </p>

          <div style={{ background: "var(--slate-50)", border: "1px solid var(--slate-200)", borderRadius: 10, padding: 20, maxWidth: 600, margin: "0 auto", textAlign: "left", fontSize: "0.88rem" }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Claim Reference:</strong>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2563eb", fontFamily: "var(--font-mono)" }}>
                {successResult.claimReference}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Blockchain Transaction Hash:</strong>
              <div className="hash-pill" style={{ display: "block", wordBreak: "break-all" }}>
                {successResult.txHash}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Evidence Root Hash (Keccak-256):</strong>
              <div className="hash-pill" style={{ display: "block", wordBreak: "break-all" }}>
                {successResult.documentRootHash}
              </div>
            </div>
            <div>
              <strong>Current Status:</strong> <span className="status-badge status-SUBMITTED">SUBMITTED</span>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={onSuccess}>
              View Claim Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <PlusCircle size={22} className="text-primary" />
          Register New Insurance Claim
        </h2>
        <span className="role-badge role-CUSTOMER">Policyholder Action</span>
      </div>

      <div className="alert alert-info">
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Tamper-Evident Registration:</strong> Your policy reference and document hashes will be stored on-chain. Sensitive personal information remains off-chain in encrypted storage.
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Policy Number / Reference</label>
            <input
              type="text"
              className="form-control"
              value={formData.policyNumber}
              onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
              required
            />
            <div className="form-help">Hashed on-chain via keccak256 to safeguard customer privacy.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Insurance Category</label>
            <select
              className="form-control"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Health">Health Insurance</option>
              <option value="Motor">Motor Vehicle</option>
              <option value="Property">Home & Property</option>
              <option value="Travel">Travel & Baggage</option>
              <option value="Commercial">Commercial Liability</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Incident / Loss Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.incidentDate}
              onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Requested Claim Amount (ETH / Unit)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-control"
              value={formData.requestedAmount}
              onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Detailed Incident Narrative</label>
          <textarea
            className="form-control"
            value={formData.incidentDescription}
            onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
            placeholder="Describe the sequence of events, damages incurred, or medical treatment received..."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Supporting Evidence Documents (Bills, Photos, Incident Reports)
          </label>
          <input
            type="file"
            className="form-control"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
          />
          <div className="form-help">
            Accepted: PDF, PNG, JPG, DOCX. Cryptographic SHA-256 and Keccak-256 hashes are automatically computed upon submission.
          </div>
          {files.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {files.map((f, i) => (
                <div key={i} className="hash-pill">
                  <FileText size={14} /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          {onCancel && (
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Upload size={16} /> : <ShieldCheck size={16} />}
            {loading ? "Registering on Blockchain..." : "Submit Claim to Smart Contract"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClaimRegistrationForm;
