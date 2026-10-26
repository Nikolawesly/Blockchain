# InsureChain: Oral Examination & Viva Voce Q&A Guide

This guide prepares students to confidently answer technical, architectural, and conceptual questions during the Blockchain Technology (BCT) course evaluation.

---

### Question 1: Why is blockchain needed in insurance claim management?
**Answer:**  
In conventional insurance architectures, claims are processed in centralized corporate databases controlled entirely by the insurer. This creates an asymmetric information gap, susceptibility to internal database tampering, opaque delays, and lack of verifiable audit trails.  
Blockchain introduces:
1. **Tamper-Evident Chronology:** Once a claim transition, evidence hash, or approval is committed, it cannot be deleted or retroactively altered by either party.
2. **Deterministic State Enforcement:** Business rules (e.g., an unverified claim cannot be approved; a customer cannot approve their own claim) are enforced mathematically via smart contract code rather than trust.
3. **Multi-Party Consensus & Accountability:** Policyholders, independent surveyors, and insurance companies interact on a shared ledger where all actions are cryptographically signed and non-repudiable.

---

### Question 2: Why is MongoDB (or off-chain storage) still required if we have a blockchain?
**Answer:**  
Blockchains are designed for consensus on state transitions, not large-scale data storage.  
1. **Cost and Scalability:** Storing high-resolution collision photographs, medical scans (CT/MRI), hospital discharge invoices, or police reports on-chain is computationally prohibitive and inflates ledger size.
2. **Data Privacy & Legal Compliance (GDPR / HIPAA):** Public or consortium blockchains are immutable. Storing identifiable Personally Identifiable Information (PII) on a public ledger violates privacy laws (the "Right to be Forgotten").  
**Solution in InsureChain:** Large binary files and PII are stored off-chain in private storage / MongoDB, while only the **cryptographic hashes (SHA-256 / Keccak-256)** and anonymized policy reference hashes are committed on-chain.

---

### Question 3: What are the roles of Solidity and Hardhat in this project?
**Answer:**  
- **Solidity** is the statically-typed, Turing-complete smart contract programming language compiled to EVM (Ethereum Virtual Machine) bytecode. It defines our data structures, the `ClaimStatus` enum, role-based modifiers, custom errors, and events in `InsuranceClaimManager.sol`.
- **Hardhat** is the industry-standard Ethereum development environment. It provides a local EVM network node for deterministic development, automated compilation with optimization, a mocha/chai testing framework, contract deployment scripts, and artifact generation.

---

### Question 4: What is the role of ethers.js?
**Answer:**  
`ethers.js` is the client-side and backend library that bridges traditional JavaScript/Node.js/React applications with the Ethereum blockchain. It handles:
- JSON-RPC communication over HTTP/WebSockets to the Hardhat node (`http://127.0.0.1:8545`).
- Cryptographic wallet management and private key signing.
- Encoding function calls and arguments into EVM calldata according to the contract's Application Binary Interface (ABI).
- Parsing transaction receipts, gas metrics, and event log decoding via `contract.queryFilter`.

---

### Question 5: How does Role-Based Access Control (RBAC) work in InsureChain?
**Answer:**  
InsureChain utilizes OpenZeppelin's `AccessControl` standard. Privileged operations are guarded by cryptographic roles:
- `DEFAULT_ADMIN_ROLE`: System administrator who provisions initial roles and consortium settings.
- `SURVEYOR_ROLE`: Authorized loss assessors who can submit verification findings and flag claims.
- `INSURER_ROLE`: Claims officers who can approve/reject claims and record settlements.
- `CUSTOMER_ROLE`: Policyholders who can register claims and provide additional evidence.  
**Critical Principle:** Access control is enforced **inside the smart contract code** via `hasRole()` checks. Frontend button visibility is merely a user-experience enhancement and is never relied upon as security.

---

### Question 6: Who actually verifies whether the insurance claim is genuine?
**Answer:**  
Verification is performed by an **authorized human surveyor** based on physical loss inspection and digital evidence review.  
**Crucial Clarification:** The blockchain does not possess sensors or autonomous omniscience to know if a car crashed or if a patient had surgery. The blockchain records the surveyor's identity, findings, recommended amount, report hash, and timestamp. The blockchain guarantees the **authenticity and immutability of the record**, not the independent physical truth of the event.

---

### Question 7: What happens if a surveyor submits a false or fraudulent inspection report?
**Answer:**  
This illustrates the classical **"Garbage-In, Garbage-Out" (GIGO)** and Oracle problem in blockchain technology. If a corrupted surveyor signs a false verification, the blockchain will faithfully and permanently record that false report.  
However, blockchain provides critical forensic advantages:
1. **Non-Repudiation:** The fraudulent report is signed with the surveyor's cryptographic private key; the surveyor cannot deny submitting it.
2. **Permanent Audit Trail:** The claim history cannot be deleted or covered up by internal collusion.
3. **Post-Audit Accountability:** Regulators or forensic auditors can cross-reference the surveyor's recorded report hash with external hospital/police records to legally prosecute malpractice.

---

### Question 8: How do cryptographic document hashes detect tampering?
**Answer:**  
Cryptographic hash functions (such as SHA-256 and Keccak-256) possess the **avalanche effect**: changing even a single byte (such as modifying an invoice from \$500 to \$5,000) causes an unpredictable, catastrophic change in the resulting 256-bit hash output.  
When an evidence document is uploaded, InsureChain calculates its hash and commits it to the smart contract. At any later time, the system can recalculate the hash of the file in storage and compare it to the smart contract hash. If the hashes match, the document is 100% mathematically authentic. If the hashes differ, malicious tampering or data corruption is immediately exposed.

---

### Question 9: Does blockchain alone guarantee that an insurance claim is authentic and fraud-free?
**Answer:**  
**No.** It is technically inaccurate to claim that blockchain eliminates all insurance fraud.  
Blockchain solves **process and recordkeeping vulnerabilities**:
- It prevents unauthorized state overwrites.
- It prevents retroactive invoice tampering.
- It prevents claims officers from silently altering decision reasons.  
It **does not** solve upstream physical fraud (e.g., staged car crashes, fabricated damage prior to taking photographs). Combating physical fraud requires certified human assessors, cryptographic metadata verification (EXIF timestamp/GPS checks), and legal penalties.

---

### Question 10: Which component is the authoritative source of truth for claim status?
**Answer:**  
The **smart contract on the blockchain** is the sole authoritative source of truth.  
While MongoDB caches application data, user profiles, and file paths to provide high-speed querying, MongoDB cannot independently set or overwrite the status of a claim. Whenever the backend or frontend displays a claim's status, it resolves the state directly from the Ethereum smart contract.

---

### Question 11: What happens if an unauthorized actor attempts an invalid state transition or a transaction fails?
**Answer:**  
The EVM executes transactions atomically. If a requirement fails (e.g., calling `approveClaim()` while the status is `UNDER_REVIEW` instead of `VERIFIED`, or calling `recordSettlement()` from a non-insurer address):
1. The EVM halts execution immediately.
2. The smart contract reverts the call using custom errors like `ClaimNotVerified()` or `UnauthorizedCaller()`.
3. All state changes within that transaction are rolled back as if they never happened.
4. An error is returned to the client with the revert reason.

---

### Question 12: Why is a recorded settlement on the blockchain distinct from a real bank transfer?
**Answer:**  
In enterprise insurance systems, actual financial disbursement occurs through banking rails (such as Fedwire, ACH, SEPA, or SWIFT).  
InsureChain's `recordSettlement()` function synchronizes the **governance ledger entry**, recording the bank transfer reference, amount, officer address, and timestamp. It certifies that settlement was authorized and recorded according to consortium rules; it does not claim to execute native central-bank fiat wire transfers directly on the EVM.
