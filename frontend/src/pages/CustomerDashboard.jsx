import React, { useEffect, useState } from "react";
import { PlusCircle, FileText, ArrowRight, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import ClaimStatusBadge from "../components/ClaimStatusBadge";

export function CustomerDashboard({ onSelectClaim, onNewClaim }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getClaims();
      setClaims(res.data.claims || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Policyholder Claims Portal
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.88rem" }}>
            Register new insurance claims, review surveyor progress, and track blockchain settlement status.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={fetchClaims}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={onNewClaim}>
            <PlusCircle size={16} /> Submit New Claim
          </button>
        </div>
      </div>

      {/* Policyholder Quick Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Claims Submitted</span>
          <span className="stat-value">{claims.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Under Inspection</span>
          <span className="stat-value" style={{ color: "#d97706" }}>
            {claims.filter((c) => ["SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"].includes(c.blockchain?.statusName)).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved & Settled</span>
          <span className="stat-value" style={{ color: "#10b981" }}>
            {claims.filter((c) => ["APPROVED", "SETTLED"].includes(c.blockchain?.statusName)).length}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={20} className="text-primary" />
            My Insurance Claims
          </h3>
          <span className="role-badge role-CUSTOMER">Policyholder View</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
            Querying blockchain claim records...
          </div>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
            No claims registered under this wallet address yet. Click <strong>"Submit New Claim"</strong> to register your first claim.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim Reference</th>
                  <th>Category</th>
                  <th>Requested Amount</th>
                  <th>Status</th>
                  <th>Incident Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.claimId || claim.claimReference}>
                    <td>
                      <strong>{claim.claimReference}</strong>
                    </td>
                    <td>{claim.category}</td>
                    <td><strong>{claim.requestedAmount} ETH</strong></td>
                    <td>
                      <ClaimStatusBadge status={claim.blockchain?.statusName || "SUBMITTED"} />
                    </td>
                    <td>{claim.incidentDate}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onSelectClaim(claim.claimId || claim.claimReference)}
                      >
                        Track Lifecycle <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDashboard;
