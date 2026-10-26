import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import CustomerDashboard from "./pages/CustomerDashboard";
import ClaimRegistrationForm from "./pages/ClaimRegistrationForm";
import SurveyorWorkspace from "./pages/SurveyorWorkspace";
import InsurerReviewPanel from "./pages/InsurerReviewPanel";
import AdminDashboard from "./pages/AdminDashboard";
import ClaimDetailsPage from "./pages/ClaimDetailsPage";
import Web3Service from "./services/web3Service";

export function App() {
  const [activeRole, setActiveRole] = useState(
    () => localStorage.getItem("insurechain_active_role") || "CUSTOMER"
  );
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [walletState, setWalletState] = useState({
    connected: false,
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    chainId: 31337,
  });

  const handleRoleChange = (newRole) => {
    setActiveRole(newRole);
    localStorage.setItem("insurechain_active_role", newRole);
    setSelectedClaimId(null);

    // Switch default tab based on role
    if (newRole === "CUSTOMER") setActiveTab("dashboard");
    else if (newRole === "SURVEYOR") setActiveTab("surveyor-workspace");
    else if (newRole === "INSURER") setActiveTab("insurer-panel");
    else if (newRole === "ADMIN") setActiveTab("admin-dashboard");
  };

  const handleConnectWallet = async () => {
    try {
      const res = await Web3Service.connectMetaMask();
      setWalletState({
        connected: true,
        address: res.address,
        chainId: res.chainId,
      });
    } catch (err) {
      alert("MetaMask connection notice: " + err.message);
    }
  };

  const handleSelectClaim = (claimId) => {
    setSelectedClaimId(claimId);
    setActiveTab("claim-details");
  };

  return (
    <div className="app-container">
      <Navbar
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setSelectedClaimId(null);
          setActiveTab(tab);
        }}
        walletState={walletState}
        onConnectWallet={handleConnectWallet}
      />

      <main className="main-content">
        {activeTab === "claim-details" && selectedClaimId ? (
          <ClaimDetailsPage
            claimId={selectedClaimId}
            onBack={() => {
              setSelectedClaimId(null);
              if (activeRole === "CUSTOMER") setActiveTab("dashboard");
              else if (activeRole === "SURVEYOR") setActiveTab("surveyor-workspace");
              else if (activeRole === "INSURER") setActiveTab("insurer-panel");
              else setActiveTab("admin-dashboard");
            }}
          />
        ) : activeTab === "register" ? (
          <ClaimRegistrationForm
            onSuccess={() => setActiveTab("dashboard")}
            onCancel={() => setActiveTab("dashboard")}
          />
        ) : activeTab === "surveyor-workspace" ? (
          <SurveyorWorkspace onSelectClaim={handleSelectClaim} />
        ) : activeTab === "insurer-panel" ? (
          <InsurerReviewPanel onSelectClaim={handleSelectClaim} />
        ) : activeTab === "admin-dashboard" ? (
          <AdminDashboard />
        ) : (
          <CustomerDashboard
            onSelectClaim={handleSelectClaim}
            onNewClaim={() => setActiveTab("register")}
          />
        )}
      </main>

      <footer style={{ background: "#0f172a", color: "#94a3b8", borderTop: "1px solid #1e293b", padding: "20px 24px", fontSize: "0.82rem", textAlign: "center" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div>
            <strong>InsureChain</strong> — Blockchain-Based Insurance Claim Management & Verification System
          </div>
          <div>
            Blockchain Technology (BCT) Course Project | Academic Year 2026
          </div>
          <div>
            Solidity • Hardhat • Ethers.js • React • Node.js • MongoDB
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
