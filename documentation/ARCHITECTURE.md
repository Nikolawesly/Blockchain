# InsureChain System Architecture & Engineering Specification

## 1. High-Level Architecture Overview

InsureChain implements a layered, privacy-preserving hybrid decentralized application (dApp) architecture. The blockchain provides an immutable, tamper-evident ledger for claim states, role authorizations, and cryptographic document hashes, while an off-chain storage layer safeguards private documents and user credentials.

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client Layer (React 18 + Vite)"]
        UI["Responsive Web UI"]
        RoleSel["Role-Based Workspace\n(Customer, Surveyor, Insurer, Admin)"]
        MetaMask["MetaMask / Web3 Provider\n(Ethers.js v6)"]
    end

    subgraph APILayer["Backend Application Layer (Node.js + Express)"]
        Router["REST API Router & Controllers"]
        AuthMid["JWT Auth & Role Guard"]
        CryptoEng["Crypto Hashing Engine\n(SHA-256 & Keccak-256)"]
        BCService["Ethers.js Blockchain Service\n(Signers, RPC Client, Event Filter)"]
        StorageMid["Multer Off-Chain Upload Handler"]
    end

    subgraph DataLayer["Storage & Ledger Layer"]
        Hardhat["Local Hardhat EVM Blockchain\n(Chain ID: 31337)"]
        SC["InsuranceClaimManager.sol\n(AccessControl, State Machine, Events)"]
        MongoDB["MongoDB / Resilient Store\n(Metadata, Users, Paths)"]
        OffchainFiles["Off-Chain File Repository\n(Encrypted Bills, Damage Photos)"]
    end

    UI --> Router
    MetaMask -.->|"Direct Signing (Optional)"| Hardhat
    Router --> AuthMid
    AuthMid --> CryptoEng
    CryptoEng --> BCService
    Router --> StorageMid
    StorageMid --> OffchainFiles
    BCService --> SC
    SC --- Hardhat
    Router --> MongoDB
```

---

## 2. Claim Lifecycle State Machine

The smart contract implements a non-reversible, deterministic state machine with strict role checks at every transition:

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED : Policyholder registers claim with Doc Root Hash
    SUBMITTED --> UNDER_REVIEW : Claims Officer / Admin assigns Surveyor
    UNDER_REVIEW --> VERIFIED : Surveyor verifies physical/digital evidence
    UNDER_REVIEW --> FLAGGED : Discrepancy detected during inspection
    UNDER_REVIEW --> ADDITIONAL_INFO_REQUIRED : Surveyor requests more documents
    ADDITIONAL_INFO_REQUIRED --> UNDER_REVIEW : Policyholder uploads additional doc hash
    FLAGGED --> UNDER_REVIEW : Discrepancy resolved after re-inspection
    FLAGGED --> REJECTED : Insurer rejects fraudulent/invalid claim
    VERIFIED --> APPROVED : Claims Officer approves verified claim & locks amount
    VERIFIED --> REJECTED : Claims Officer rejects with policy clause reason
    APPROVED --> SETTLED : Claims Officer records settlement reference
    SETTLED --> [*] : Lifecycle Completed on Ledger
    REJECTED --> [*] : Lifecycle Terminated
```

---

## 3. Sequence Workflow: End-to-End Claim Execution

```mermaid
sequenceDiagram
    autonumber
    actor C as Policyholder (Alice)
    participant B as Backend API
    actor S as Surveyor (Bob)
    actor I as Claims Officer (Carol)
    participant SC as Smart Contract (EVM)
    participant DB as Off-Chain Storage

    Note over C,DB: Phase 1: Claim Registration
    C->>B: Submit Claim (Policy No, Incident Details, Invoices/Photos)
    B->>B: Calculate SHA-256 & Keccak-256 Hashes
    B->>DB: Store Private Files & Metadata Off-chain
    B->>SC: registerClaim(claimRef, policyRefHash, category, amount, docRootHash)
    SC-->>B: Event ClaimRegistered emitted (Tx Hash)
    B-->>C: Registration Confirmed with Hash Proofs

    Note over I,SC: Phase 2: Surveyor Assignment
    I->>B: assignSurveyor(claimId, surveyorWallet)
    B->>SC: assignSurveyor(claimId, surveyorAddress)
    SC-->>SC: Status: SUBMITTED -> UNDER_REVIEW

    Note over S,SC: Phase 3: Evidence Inspection & Verification
    S->>B: Re-calculate File Hash vs Smart Contract
    B-->>S: Cryptographic Integrity Parity: 100% Match
    S->>B: submitVerification(recAmount, findings, reportFile, isVerified=true)
    B->>SC: submitVerification(claimId, recAmount, reportHash, true)
    SC-->>SC: Status: UNDER_REVIEW -> VERIFIED

    Note over I,SC: Phase 4: Decision & Approval
    I->>B: approveClaim(approvedAmount, decisionRef)
    B->>SC: approveClaim(claimId, approvedAmount, decisionRef)
    SC-->>SC: Check: Status == VERIFIED (Guaranteed)
    SC-->>SC: Status: VERIFIED -> APPROVED

    Note over I,SC: Phase 5: Settlement Recording
    I->>B: recordSettlement(settlementRef)
    B->>SC: recordSettlement(claimId, settlementRef)
    SC-->>SC: Status: APPROVED -> SETTLED
    SC-->>B: Event SettlementRecorded emitted
    B-->>C: Settlement Certificate Ready for Download
```
