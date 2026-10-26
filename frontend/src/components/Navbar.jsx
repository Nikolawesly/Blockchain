import React from "react";
import { 
  Shield, 
  User, 
  FileCheck, 
  Building2, 
  Settings, 
  PlusCircle, 
  Wallet, 
  CheckCircle2, 
  LayoutDashboard 
} from "lucide-react";
import Web3Service from "../services/web3Service";

export function Navbar({ activeRole, onRoleChange, activeTab, onTabChange, walletState, onConnectWallet }) {
  const roles = [
    { id: "CUSTOMER", label: "Policyholder", icon: User },
    { id: "SURVEYOR", label: "Surveyor", icon: FileCheck },
    { id: "INSURER", label: "Claims Officer", icon: Building2 },
    { id: "ADMIN", label: "Administrator", icon: Settings },
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-icon">
            <Shield size={24} />
          </div>
          <div>
            <div className="brand-title">InsureChain</div>
            <div className="brand-tag">BLOCKCHAIN CLAIM VERIFICATION SYSTEM</div>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => onTabChange("dashboard")}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>

          {activeRole === "CUSTOMER" && (
            <button
              className={`nav-btn ${activeTab === "register" ? "active" : ""}`}
              onClick={() => onTabChange("register")}
            >
              <PlusCircle size={16} />
              Submit Claim
            </button>
          )}

          {activeRole === "SURVEYOR" && (
            <button
              className={`nav-btn ${activeTab === "surveyor-workspace" ? "active" : ""}`}
              onClick={() => onTabChange("surveyor-workspace")}
            >
              <FileCheck size={16} />
              Surveyor Workspace
            </button>
          )}

          {activeRole === "INSURER" && (
            <button
              className={`nav-btn ${activeTab === "insurer-panel" ? "active" : ""}`}
              onClick={() => onTabChange("insurer-panel")}
            >
              <Building2 size={16} />
              Claims Review
            </button>
          )}

          {activeRole === "ADMIN" && (
            <button
              className={`nav-btn ${activeTab === "admin-dashboard" ? "active" : ""}`}
              onClick={() => onTabChange("admin-dashboard")}
            >
              <Settings size={16} />
              Admin Oversight
            </button>
          )}
        </nav>

        <div className="header-actions">
          {/* Demo Role Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e293b", padding: "4px 8px", borderRadius: 8 }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>ROLE:</span>
            <select
              value={activeRole}
              onChange={(e) => onRoleChange(e.target.value)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} style={{ background: "#0f172a", color: "#fff" }}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Wallet connection indicator */}
          {walletState.connected ? (
            <div className="wallet-badge connected" title={`Connected to Hardhat Local (Chain ID: ${walletState.chainId})`}>
              <span className="wallet-dot" />
              <span>{walletState.address.slice(0, 6)}...{walletState.address.slice(-4)}</span>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={onConnectWallet} style={{ color: "#fff", borderColor: "#334155" }}>
              <Wallet size={14} /> Connect MetaMask
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
