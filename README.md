# InsureChain: Blockchain-Based Insurance Claim Management and Verification System

**A Complete, Runnable Decentralized Application (dApp) for Academic & Enterprise Evaluation**  
*Blockchain Technology (BCT) Course Project — Academic Year 2026*

---

## 1. Project Overview

**InsureChain** is a full-stack blockchain web application designed to manage the complete insurance claim lifecycle:
$$\text{SUBMITTED} \rightarrow \text{UNDER\_REVIEW} \rightarrow \text{VERIFIED} \rightarrow \text{APPROVED} \rightarrow \text{SETTLED}$$

### Core Features
- **Smart Contract Role-Based Access Control (RBAC):** Privileged actions are strictly guarded by Solidity code using OpenZeppelin `AccessControl`.
- **Deterministic State Transitions:** Unverified claims cannot be approved; unapproved claims cannot be settled.
- **Cryptographic Document Integrity:** Supporting bills and photos are hashed using **SHA-256** and **Keccak-256**. The document root hash is anchored on-chain.
- **Tamper-Detection Engine:** A built-in verifier recalculates file hashes on disk to detect post-submission byte alteration.
- **Privacy-Preserving Off-Chain Storage:** Sensitive customer PII remains off-chain in MongoDB, preventing public blockchain exposure.
- **Authoritative Blockchain State:** The Ethereum smart contract is the single source of truth; all claim status changes generate real transactions and event logs.
- **Printable Decision Certificate:** Exports a tamper-evident decision certificate displaying transaction hashes, block numbers, and cryptographic proofs.

---

## 2. Technology Stack

- **Smart Contract:** Solidity `^0.8.24` (AccessControl, custom errors, event logging)
- **Blockchain Framework:** Hardhat v2 (Local EVM node, compilation, testing)
- **Web3 Integration:** Ethers.js v6
- **Backend API:** Node.js v22 + Express 4
- **Database:** MongoDB (with automatic in-memory fallback for zero-dependency execution)
- **File Uploads & Crypto:** Multer, SHA-256 (Node crypto), Keccak-256 (Ethers)
- **Frontend Client:** React 18, Vite 5, Lucide-react, responsive CSS

---

## 3. Repository Structure

```text
InsureChain/
├── blockchain/                 # Solidity smart contract & Hardhat suite
│   ├── contracts/              # InsuranceClaimManager.sol
│   ├── scripts/                # deploy.js
│   ├── test/                   # InsuranceClaimManager.test.js (19 tests)
│   └── hardhat.config.js
├── backend/                    # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # Database & contract config
│   │   ├── controllers/        # Auth, Claims, Evidence, Dashboard
│   │   ├── middleware/         # Auth (JWT/demo role), Multer upload
│   │   ├── models/             # User & ClaimMetadata stores
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # Crypto hashing & Ethers blockchain service
│   │   └── server.js
│   ├── tests/                  # api.test.js & e2e-workflow.test.js
│   └── uploads/                # Off-chain evidence repository
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── components/         # Navbar, Stepper, StatusBadge, Modals
│   │   ├── pages/              # Customer, Surveyor, Insurer, Admin dashboards
│   │   ├── services/           # API client & Web3 MetaMask connector
│   │   ├── App.jsx
│   │   └── index.css
│   └── vite.config.js
├── documentation/              # Academic deliverables
│   ├── ACADEMIC_REPORT.md      # Formal 22-section academic case-study
│   ├── ARCHITECTURE.md         # Architecture diagrams & sequence workflows
│   ├── PRESENTATION_OUTLINE.md # 12-slide presentation deck & presenter script
│   └── VIVA_QUESTIONS_ANSWERS.md# Viva Voce questions & model answers
└── README.md
```

---

## 4. Pre-Configured Demonstration Accounts

| Role | Username | Password | Hardhat Address | Private Key |
|---|---|---|---|---|
| **Administrator** | `admin_demo` | `Password123!` | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Policyholder** | `alice_policyholder` | `Password123!` | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Surveyor** | `bob_surveyor` | `Password123!` | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Claims Officer** | `carol_claims_officer` | `Password123!` | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

*Tip: The web interface includes a top navigation **Role Switcher** that allows instant switching between any actor during evaluations without manually re-logging in.*

---

## 5. Quick-Start Guide (Run in 3 Steps)

### Step 1: Start the Local Blockchain & Deploy Contract
Open a terminal in `blockchain/`:
```bash
cd blockchain
npx hardhat node
```
In a second terminal, deploy the smart contract:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
*This deploys the contract to `0x5FbDB2315678afecb367f032d93F642f64180aa3`, grants initial roles, seeds demonstration claims, and exports ABI and config to backend & frontend.*

### Step 2: Start the Backend Service
In a third terminal:
```bash
cd backend
npm start
```
*Runs on `http://localhost:5000`. Checks blockchain connectivity and automatically switches to resilient in-memory storage if a local MongoDB service is not running.*

### Step 3: Start the Frontend Client
In a fourth terminal:
```bash
cd frontend
npm run dev
```
*Open `http://localhost:3000` in your web browser.*

---

## 6. Running Test Suites

### 1. Smart Contract Unit Tests (Hardhat)
```bash
cd blockchain
npm test
```
**Actual Result: 19 Passing Tests (0 Failures)**  
Covers role provisioning, claim registration, duplicate rejection, unauthorized surveyor assignment, valid verification, premature approval blocking, rejection, and premature settlement blocking.

### 2. Backend Cryptographic Verification Tests
```bash
cd backend
npm test
```
**Actual Result: 4 Passing Tests**  
Covers SHA-256 and Keccak-256 hash generation, untouched document verification, and live file tampering detection.

### 3. Full End-to-End Blockchain Lifecycle Test
With Hardhat node running:
```bash
cd backend
node tests/e2e-workflow.test.js
```
**Actual Result: All 7 Lifecycle Steps Successfully Completed On-Chain**  
Executes real transactions for Registration $\rightarrow$ Verification $\rightarrow$ Approval $\rightarrow$ Settlement $\rightarrow$ Event Audit Trail.

---

## 7. Step-by-Step Live Demonstration Walkthrough

1. **Submit Claim as Policyholder (Alice):**
   - In the frontend, ensure the top role is **Policyholder**.
   - Click **Submit Claim**.
   - Enter Policy Reference: `POL-HEALTH-2026-90`
   - Select Category: `Health`
   - Attach a sample medical invoice/receipt file.
   - Click **Submit Claim to Smart Contract**. Notice the on-chain transaction hash and evidence bundle hash.
2. **Assign Surveyor as Claims Officer (Carol):**
   - Switch role to **Claims Officer**.
   - Navigate to the new claim, click **Assign Surveyor**, and assign Bob (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`). Status transitions to `UNDER_REVIEW`.
3. **Verify Evidence as Surveyor (Bob):**
   - Switch role to **Surveyor**.
   - Open **Surveyor Workspace**.
   - Click **Inspect Evidence** $\rightarrow$ **Verify Integrity**. Notice the cryptographic hash recalculation.
   - Click **Submit Report**, enter recommended amount `1.40 ETH`, and submit. Status transitions to `VERIFIED`.
4. **Approve Claim as Claims Officer (Carol):**
   - Switch role to **Claims Officer**.
   - Click **Approve**, enter approved amount `1.40 ETH`, and submit. Status transitions to `APPROVED`.
5. **Record Settlement:**
   - Click **Record Settlement**, enter bank reference `ACH-SETTLE-8899`, and submit. Status transitions to `SETTLED`.
6. **Generate Decision Certificate:**
   - Click **Printable Decision Certificate** to view and print the official certificate with on-chain hashes and block heights.

---

## 8. Academic & Legal Notices

> **CRITICAL DISCLAIMER:**  
> 1. **Document Integrity vs Physical Truth:** A valid cryptographic document hash proves mathematically that a submitted digital document has remained unaltered since submission. It does NOT independently verify that the physical loss or accident described inside the document took place in reality.  
> 2. **Ledger Settlement vs Banking Rails:** Recording a settlement on the blockchain synchronizes the multi-party accounting ledger; it is distinct from fiat commercial bank wire transfers (ACH/Fedwire/SEPA).
