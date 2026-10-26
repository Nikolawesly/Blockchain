import React, { useEffect, useState } from "react";
import { 
  Settings, 
  Shield, 
  Layers, 
  Database, 
  Users, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { api } from "../services/api";

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, adminRes] = await Promise.all([
        api.getStats(),
        api.getAdminOverview(),
      ]);
      setStats(statsRes.data);
      setAdminData(adminRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)" }}>
            Administrator Consortium Oversight
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.88rem" }}>
            Monitor smart contract state, verify role-based access control, and audit system integrity.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh Ledger State
        </button>
      </div>

      {/* Global Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Claims</span>
          <span className="stat-value">{stats?.claimCounts?.total || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Under Inspection</span>
          <span className="stat-value" style={{ color: "#d97706" }}>
            {(stats?.claimCounts?.UNDER_REVIEW || 0) + (stats?.claimCounts?.SUBMITTED || 0)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified</span>
          <span className="stat-value" style={{ color: "#2563eb" }}>
            {stats?.claimCounts?.VERIFIED || 0}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Settled on Ledger</span>
          <span className="stat-value" style={{ color: "#10b981" }}>
            {stats?.claimCounts?.SETTLED || 0}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Blockchain Status Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Layers size={20} className="text-primary" />
              Smart Contract Architecture & Node Status
            </h3>
            <span className="status-badge status-APPROVED">
              {stats?.blockchain?.connected ? "Node Connected" : "Local Mock Node"}
            </span>
          </div>

          <div style={{ fontSize: "0.88rem" }}>
            <div style={{ marginBottom: 12 }}>
              <strong>EVM Network:</strong>
              <div style={{ color: "var(--slate-600)" }}>Hardhat Local Development Network (Chain ID: 31337)</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Deployed Smart Contract Address:</strong>
              <div className="hash-pill" style={{ display: "block", wordBreak: "break-all" }}>
                {stats?.blockchain?.contractAddress || adminData?.contractConfig?.contractAddress || "Deploying..."}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Consensus Mechanism:</strong>
              <div style={{ color: "var(--slate-600)" }}>Local EVM Paris / Hardhat Deterministic RPC</div>
            </div>
            <div>
              <strong>Current Block Number:</strong>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                #{stats?.blockchain?.blockNumber || "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Database size={20} className="text-primary" />
              Off-Chain Storage & Privacy Layer
            </h3>
            <span className="status-badge status-VERIFIED">
              {stats?.database?.mode || "Active"}
            </span>
          </div>

          <div style={{ fontSize: "0.88rem" }}>
            <div style={{ marginBottom: 12 }}>
              <strong>Database Backend:</strong>
              <div style={{ color: "var(--slate-600)" }}>
                {stats?.database?.isMongoConnected
                  ? "MongoDB Replica / Service (mongodb://localhost:27017)"
                  : "Resilient In-Memory Storage Engine (Zero-setup Fallback)"}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Document Integrity Engine:</strong>
              <div style={{ color: "var(--slate-600)" }}>Dual Cryptographic Hashing: Keccak-256 (On-Chain) + SHA-256 (Off-Chain Verification)</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Data Privacy Separation:</strong>
              <div style={{ color: "var(--slate-600)" }}>Sensitive PII (names, invoices) kept strictly off-chain; only cryptographic hashes committed to blockchain.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control Setup Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={20} className="text-primary" />
            Consortium Participants & Smart Contract Roles
          </h3>
          <span className="role-badge role-ADMIN">RBAC Authorization</span>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Participant Name</th>
                <th>Role Key</th>
                <th>Ethereum Address</th>
                <th>Organization</th>
                <th>Permissions Summary</th>
              </tr>
            </thead>
            <tbody>
              {adminData?.users?.map((u) => (
                <tr key={u.username}>
                  <td><strong>{u.fullName}</strong></td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>{u.role}</span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                    {u.walletAddress}
                  </td>
                  <td>{u.organization}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--slate-600)" }}>
                    {u.role === "ADMIN" && "Full role management & contract administrative functions"}
                    {u.role === "CUSTOMER" && "Register claims, upload evidence, view own claim history"}
                    {u.role === "SURVEYOR" && "Inspect digital evidence, submit verification reports, flag discrepancies"}
                    {u.role === "INSURER" && "Assign surveyors, approve/reject verified claims, record settlements"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
