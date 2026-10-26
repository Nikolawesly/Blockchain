# InsureChain: BCT Course Presentation Deck & Script

---

## Slide Deck Outline (12 Slides)

| Slide # | Slide Title | Key Visuals & Bullet Points |
|---|---|---|
| **Slide 1** | **InsureChain: Blockchain Insurance Claim Management System** | Title, Course Title (Blockchain Technology), Student Names, Date, Tech Stack Icons |
| **Slide 2** | **The Problem: Centralized Insurance Claim Vulnerabilities** | Asymmetric information, opaque delays, retroactive document modification risk, lack of multi-party auditability |
| **Slide 3** | **Project Objectives** | Tamper-evident lifecycle, RBAC enforcement, cryptographic document hashing, verifiable claim certificates |
| **Slide 4** | **Proposed System Architecture** | Layered architecture diagram (React UI, Node.js API, MongoDB metadata, Hardhat EVM smart contract) |
| **Slide 5** | **Consortium User Roles & Permissions** | 4 Roles: Policyholder, Independent Surveyor, Claims Officer, Administrator with on-chain role enforcement |
| **Slide 6** | **Deterministic Claim Lifecycle State Machine** | State transition diagram: `SUBMITTED -> UNDER_REVIEW -> VERIFIED -> APPROVED -> SETTLED` (+ Flagged/Rejected branches) |
| **Slide 7** | **Surveyor Verification & Fraud Prevention** | Human physical loss inspection vs digital evidence review; SHA-256 / Keccak-256 hash checks; tamper detection demo |
| **Slide 8** | **Live Demonstration: End-to-End Workflow** | Step-by-step demo from customer claim submission to ledger settlement |
| **Slide 9** | **Blockchain Audit Trail & Event Logs** | Real-time Solidity event logs (`ClaimRegistered`, `VerificationSubmitted`, `ClaimApproved`, `SettlementRecorded`) |
| **Slide 10** | **Academic Limitations & Non-Claims** | GIGO principle; blockchain does not prove physical truth of loss; separation of ledger settlement from fiat wire transfers |
| **Slide 11** | **UN Sustainable Development Goals (SDGs)** | Mapping to SDG 9 (Infrastructure & Resilient Tech) and SDG 16 (Transparent, Accountable Institutions) |
| **Slide 12** | **Conclusion & Q&A** | Summary of contributions, future work (decentralized identity / oracle feeds), open for questions |

---

## Comprehensive Presenter Script

### Slide 1: Introduction
> *"Respected evaluator and fellow peers, good morning. Today, we are proud to present **InsureChain**, our end-to-end Blockchain-Based Insurance Claim Management and Verification System, developed as part of our Blockchain Technology course assignment. Our project addresses one of the most critical trust bottlenecks in modern financial systems: how to create a transparent, tamper-evident, and auditable insurance claim lifecycle using smart contracts and cryptographic proofs."*

### Slide 2: The Problem Statement
> *"In traditional insurance systems, policyholders submit claims into private corporate databases owned solely by the insurance company. This architecture introduces severe structural flaws: policyholders face arbitrary delays with zero visibility into status; claims officers have unilateral control over records; and documents stored in conventional file servers can be altered or disputed without cryptographic proof. Our objective is to replace blind trust with mathematical verification."*

### Slide 3: Proposed Architecture
> *"To solve this without sacrificing customer privacy, we designed a hybrid architecture. The blockchain layer—running on an Ethereum Virtual Machine using Solidity and Hardhat—serves as the authoritative source of truth. It tracks the state machine, role authorizations, and document root hashes. The off-chain layer, powered by Node.js, Express, and MongoDB, safely holds large medical invoices, vehicle damage photographs, and user credentials. Crucially, Personally Identifiable Information is never exposed on the public blockchain."*

### Slide 4: Roles and State Machine
> *"InsureChain enforces Role-Based Access Control on-chain across four distinct actors: Policyholders, Independent Surveyors, Claims Officers, and System Administrators. A claim follows a strict, non-reversible lifecycle: from `SUBMITTED`, to `UNDER_REVIEW`, to `VERIFIED`, to `APPROVED`, and finally `SETTLED`. The smart contract strictly forbids unauthorized state jumps: for example, a claims officer mathematically cannot approve a claim until an authorized surveyor has submitted a signed verification report."*

### Slide 5: Cryptographic Integrity & Anti-Tamper Verification
> *"When supporting evidence is uploaded, our engine calculates its cryptographic hash using both SHA-256 and Keccak-256. If a malicious insider or hacker modifies even one character in a stored hospital invoice or repair estimate, recalculating the hash produces an instant mismatch. Our application includes a live Document Integrity Verifier that demonstrates this tampering detection in real-time."*

### Slide 6: Live Demonstration Walkthrough
> *[Live Demonstration starts]*  
> *"Let us now demonstrate the live application:*  
> *1. As **Alice (Policyholder)**, we submit a motor vehicle damage claim with supporting invoices and photos. An on-chain transaction is mined, committing the claim ID and evidence hash.*  
> *2. Switching to **Carol (Claims Officer)**, we assign certified loss assessor **Bob (Surveyor)** to the claim, transitioning status to `UNDER_REVIEW`.*  
> *3. As **Bob (Surveyor)**, we inspect the digital evidence, verify that the hashes match the smart contract, and submit our official verification report and recommended settlement amount, transitioning status to `VERIFIED`.*  
> *4. As **Carol (Claims Officer)**, we review the surveyor's findings and execute the on-chain approval.*  
> *5. Finally, we record the financial settlement on the ledger, generating an official, printable Tamper-Evident Claim Decision Certificate with complete cryptographic proofs."*

### Slide 7: Crucial Technical Distinctions
> *"As computer scientists, we must be intellectually honest about the boundaries of blockchain technology. First, a valid document hash proves that the digital file has not been altered since upload; it does not prove that the underlying car crash actually occurred. Second, recording a settlement on the blockchain synchronizes our accounting ledger; it is distinct from fiat central bank wire transfers. Acknowledging these boundaries is essential for real-world enterprise adoption."*

### Slide 8: Conclusion & UN SDG Alignment
> *"InsureChain aligns directly with **UN SDG 9 (Industry, Innovation, and Infrastructure)** by modernizing financial services with resilient decentralized tech, and **UN SDG 16 (Peace, Justice, and Strong Institutions)** by promoting transparent, accountable institutional processes. Thank you, and we welcome your questions."*
