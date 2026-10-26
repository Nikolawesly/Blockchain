// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InsuranceClaimManager
 * @dev Manages the tamper-evident insurance claim lifecycle on-chain.
 * Enforces Role-Based Access Control (RBAC) and strict state transitions.
 * 
 * Life Cycle:
 * SUBMITTED -> UNDER_REVIEW -> VERIFIED -> APPROVED -> SETTLED
 * Additional branches:
 * UNDER_REVIEW / VERIFIED -> FLAGGED
 * FLAGGED -> UNDER_REVIEW
 * VERIFIED / FLAGGED -> REJECTED
 * UNDER_REVIEW / VERIFIED -> ADDITIONAL_INFO_REQUIRED -> UNDER_REVIEW
 */
contract InsuranceClaimManager is AccessControl {
    bytes32 public constant SURVEYOR_ROLE = keccak256("SURVEYOR_ROLE");
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant CUSTOMER_ROLE = keccak256("CUSTOMER_ROLE");

    enum ClaimStatus {
        SUBMITTED,               // 0
        UNDER_REVIEW,            // 1
        VERIFIED,                // 2
        APPROVED,                // 3
        SETTLED,                 // 4
        FLAGGED,                 // 5
        REJECTED,                // 6
        ADDITIONAL_INFO_REQUIRED // 7
    }

    struct Claim {
        bytes32 claimId;
        string claimReference;
        bytes32 policyRefHash;
        string category;
        uint256 requestedAmount;
        uint256 recommendedAmount;
        uint256 approvedAmount;
        ClaimStatus status;
        address claimant;
        address assignedSurveyor;
        address claimsOfficer;
        bytes32 documentRootHash;
        bytes32 surveyorReportHash;
        string decisionReference;
        string rejectionReason;
        string flagReason;
        string settlementReference;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 settledAt;
    }

    // Storage
    mapping(bytes32 => Claim) private claims;
    mapping(string => bytes32) private referenceToId;
    bytes32[] private allClaimIds;

    // Events
    event ClaimRegistered(
        bytes32 indexed claimId,
        string claimReference,
        address indexed claimant,
        uint256 requestedAmount,
        bytes32 documentRootHash,
        uint256 timestamp
    );

    event SurveyorAssigned(
        bytes32 indexed claimId,
        address indexed surveyor,
        address indexed assignedBy,
        uint256 timestamp
    );

    event VerificationSubmitted(
        bytes32 indexed claimId,
        address indexed surveyor,
        uint256 recommendedAmount,
        bytes32 surveyorReportHash,
        bool isVerified,
        uint256 timestamp
    );

    event ClaimFlagged(
        bytes32 indexed claimId,
        address indexed flaggedBy,
        string reason,
        uint256 timestamp
    );

    event ClaimUnflagged(
        bytes32 indexed claimId,
        address indexed unflaggedBy,
        string reason,
        uint256 timestamp
    );

    event AdditionalInfoRequested(
        bytes32 indexed claimId,
        address indexed requestedBy,
        string reason,
        uint256 timestamp
    );

    event AdditionalInfoProvided(
        bytes32 indexed claimId,
        address indexed claimant,
        bytes32 newDocumentHash,
        uint256 timestamp
    );

    event ClaimApproved(
        bytes32 indexed claimId,
        address indexed claimsOfficer,
        uint256 approvedAmount,
        string decisionReference,
        uint256 timestamp
    );

    event ClaimRejected(
        bytes32 indexed claimId,
        address indexed claimsOfficer,
        string reason,
        uint256 timestamp
    );

    event SettlementRecorded(
        bytes32 indexed claimId,
        address indexed claimsOfficer,
        uint256 amount,
        string settlementReference,
        uint256 timestamp
    );

    event ClaimStatusUpdated(
        bytes32 indexed claimId,
        ClaimStatus previousStatus,
        ClaimStatus newStatus,
        address indexed actor,
        uint256 timestamp
    );

    // Custom Errors
    error ClaimAlreadyExists(bytes32 claimId);
    error ClaimDoesNotExist(bytes32 claimId);
    error InvalidClaimReference();
    error InvalidAmount();
    error InvalidDocumentHash();
    error UnauthorizedCaller(address caller);
    error InvalidStateTransition(ClaimStatus currentStatus, ClaimStatus targetStatus);
    error SurveyorNotAssignedToClaim(address caller, address assigned);
    error ClaimNotVerified();
    error ClaimAlreadySettled();

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    // Modifiers
    modifier claimExists(bytes32 claimId) {
        if (claims[claimId].createdAt == 0) {
            revert ClaimDoesNotExist(claimId);
        }
        _;
    }

    /**
     * @notice Registers a new claim on-chain with evidence document root hash.
     * @dev Claimant can be any user with CUSTOMER_ROLE or any caller (customer self-registration).
     */
    function registerClaim(
        string calldata claimReference,
        bytes32 policyRefHash,
        string calldata category,
        uint256 requestedAmount,
        bytes32 documentRootHash
    ) external returns (bytes32) {
        if (bytes(claimReference).length == 0) revert InvalidClaimReference();
        if (requestedAmount == 0) revert InvalidAmount();
        if (documentRootHash == bytes32(0)) revert InvalidDocumentHash();

        bytes32 claimId = keccak256(abi.encodePacked(claimReference));
        if (claims[claimId].createdAt != 0) {
            revert ClaimAlreadyExists(claimId);
        }

        claims[claimId] = Claim({
            claimId: claimId,
            claimReference: claimReference,
            policyRefHash: policyRefHash,
            category: category,
            requestedAmount: requestedAmount,
            recommendedAmount: 0,
            approvedAmount: 0,
            status: ClaimStatus.SUBMITTED,
            claimant: msg.sender,
            assignedSurveyor: address(0),
            claimsOfficer: address(0),
            documentRootHash: documentRootHash,
            surveyorReportHash: bytes32(0),
            decisionReference: "",
            rejectionReason: "",
            flagReason: "",
            settlementReference: "",
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            settledAt: 0
        });

        referenceToId[claimReference] = claimId;
        allClaimIds.push(claimId);

        // Grant customer role to the claimant if not already granted
        if (!hasRole(CUSTOMER_ROLE, msg.sender)) {
            _grantRole(CUSTOMER_ROLE, msg.sender);
        }

        emit ClaimRegistered(
            claimId,
            claimReference,
            msg.sender,
            requestedAmount,
            documentRootHash,
            block.timestamp
        );

        emit ClaimStatusUpdated(
            claimId,
            ClaimStatus.SUBMITTED,
            ClaimStatus.SUBMITTED,
            msg.sender,
            block.timestamp
        );

        return claimId;
    }

    /**
     * @notice Assigns an authorized surveyor to a claim and moves state to UNDER_REVIEW.
     * @dev Restricted to INSURER_ROLE or DEFAULT_ADMIN_ROLE.
     */
    function assignSurveyor(bytes32 claimId, address surveyor) 
        external 
        claimExists(claimId) 
    {
        if (!hasRole(INSURER_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }
        if (!hasRole(SURVEYOR_ROLE, surveyor)) {
            revert UnauthorizedCaller(surveyor);
        }

        Claim storage claim = claims[claimId];

        // Valid prior states: SUBMITTED or UNDER_REVIEW or FLAGGED
        if (
            claim.status != ClaimStatus.SUBMITTED &&
            claim.status != ClaimStatus.UNDER_REVIEW &&
            claim.status != ClaimStatus.FLAGGED
        ) {
            revert InvalidStateTransition(claim.status, ClaimStatus.UNDER_REVIEW);
        }

        ClaimStatus oldStatus = claim.status;
        claim.assignedSurveyor = surveyor;
        claim.status = ClaimStatus.UNDER_REVIEW;
        claim.updatedAt = block.timestamp;

        emit SurveyorAssigned(claimId, surveyor, msg.sender, block.timestamp);
        emit ClaimStatusUpdated(claimId, oldStatus, ClaimStatus.UNDER_REVIEW, msg.sender, block.timestamp);
    }

    /**
     * @notice Submits surveyor report, recommendation, and cryptographic hash of findings.
     * @dev Only the assigned surveyor (or any surveyor if none assigned yet) with SURVEYOR_ROLE.
     */
    function submitVerification(
        bytes32 claimId,
        uint256 recommendedAmount,
        bytes32 surveyorReportHash,
        bool isVerified,
        string calldata findingsSummary
    ) external claimExists(claimId) {
        if (!hasRole(SURVEYOR_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (claim.assignedSurveyor != address(0) && claim.assignedSurveyor != msg.sender) {
            revert SurveyorNotAssignedToClaim(msg.sender, claim.assignedSurveyor);
        }

        if (claim.status != ClaimStatus.UNDER_REVIEW && claim.status != ClaimStatus.FLAGGED) {
            revert InvalidStateTransition(claim.status, isVerified ? ClaimStatus.VERIFIED : ClaimStatus.FLAGGED);
        }

        if (surveyorReportHash == bytes32(0)) {
            revert InvalidDocumentHash();
        }

        ClaimStatus oldStatus = claim.status;
        claim.assignedSurveyor = msg.sender;
        claim.recommendedAmount = recommendedAmount;
        claim.surveyorReportHash = surveyorReportHash;
        claim.updatedAt = block.timestamp;

        if (isVerified) {
            claim.status = ClaimStatus.VERIFIED;
        } else {
            claim.status = ClaimStatus.FLAGGED;
            claim.flagReason = findingsSummary;
        }

        emit VerificationSubmitted(
            claimId,
            msg.sender,
            recommendedAmount,
            surveyorReportHash,
            isVerified,
            block.timestamp
        );

        emit ClaimStatusUpdated(claimId, oldStatus, claim.status, msg.sender, block.timestamp);
    }

    /**
     * @notice Flags a claim for suspicious patterns or discrepancies.
     */
    function flagClaim(bytes32 claimId, string calldata reason)
        external
        claimExists(claimId)
    {
        if (
            !hasRole(SURVEYOR_ROLE, msg.sender) &&
            !hasRole(INSURER_ROLE, msg.sender) &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
        ) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (claim.status == ClaimStatus.SETTLED || claim.status == ClaimStatus.REJECTED) {
            revert InvalidStateTransition(claim.status, ClaimStatus.FLAGGED);
        }

        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.FLAGGED;
        claim.flagReason = reason;
        claim.updatedAt = block.timestamp;

        emit ClaimFlagged(claimId, msg.sender, reason, block.timestamp);
        emit ClaimStatusUpdated(claimId, oldStatus, ClaimStatus.FLAGGED, msg.sender, block.timestamp);
    }

    /**
     * @notice Removes flag after review and returns claim to UNDER_REVIEW.
     */
    function unflagClaim(bytes32 claimId, string calldata reason)
        external
        claimExists(claimId)
    {
        if (!hasRole(INSURER_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (claim.status != ClaimStatus.FLAGGED) {
            revert InvalidStateTransition(claim.status, ClaimStatus.UNDER_REVIEW);
        }

        claim.status = ClaimStatus.UNDER_REVIEW;
        claim.updatedAt = block.timestamp;

        emit ClaimUnflagged(claimId, msg.sender, reason, block.timestamp);
        emit ClaimStatusUpdated(claimId, ClaimStatus.FLAGGED, ClaimStatus.UNDER_REVIEW, msg.sender, block.timestamp);
    }

    /**
     * @notice Requests additional information or evidence from the policyholder.
     */
    function requestAdditionalInfo(bytes32 claimId, string calldata reason)
        external
        claimExists(claimId)
    {
        if (
            !hasRole(SURVEYOR_ROLE, msg.sender) &&
            !hasRole(INSURER_ROLE, msg.sender) &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
        ) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (claim.status != ClaimStatus.UNDER_REVIEW && claim.status != ClaimStatus.FLAGGED) {
            revert InvalidStateTransition(claim.status, ClaimStatus.ADDITIONAL_INFO_REQUIRED);
        }

        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.ADDITIONAL_INFO_REQUIRED;
        claim.flagReason = reason;
        claim.updatedAt = block.timestamp;

        emit AdditionalInfoRequested(claimId, msg.sender, reason, block.timestamp);
        emit ClaimStatusUpdated(claimId, oldStatus, ClaimStatus.ADDITIONAL_INFO_REQUIRED, msg.sender, block.timestamp);
    }

    /**
     * @notice Claimant provides requested additional documentation hash, returning claim to UNDER_REVIEW.
     */
    function provideAdditionalInfo(bytes32 claimId, bytes32 newDocumentHash)
        external
        claimExists(claimId)
    {
        Claim storage claim = claims[claimId];
        if (msg.sender != claim.claimant && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }
        if (claim.status != ClaimStatus.ADDITIONAL_INFO_REQUIRED) {
            revert InvalidStateTransition(claim.status, ClaimStatus.UNDER_REVIEW);
        }
        if (newDocumentHash == bytes32(0)) {
            revert InvalidDocumentHash();
        }

        claim.documentRootHash = newDocumentHash;
        claim.status = ClaimStatus.UNDER_REVIEW;
        claim.updatedAt = block.timestamp;

        emit AdditionalInfoProvided(claimId, msg.sender, newDocumentHash, block.timestamp);
        emit ClaimStatusUpdated(claimId, ClaimStatus.ADDITIONAL_INFO_REQUIRED, ClaimStatus.UNDER_REVIEW, msg.sender, block.timestamp);
    }

    /**
     * @notice Approves a verified claim. Must be called by INSURER_ROLE.
     * @dev Strict requirement: status must be VERIFIED! An unverified claim cannot be approved.
     */
    function approveClaim(
        bytes32 claimId,
        uint256 approvedAmount,
        string calldata decisionReference
    ) external claimExists(claimId) {
        if (!hasRole(INSURER_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (claim.status != ClaimStatus.VERIFIED) {
            revert ClaimNotVerified();
        }
        if (approvedAmount == 0) {
            revert InvalidAmount();
        }

        claim.status = ClaimStatus.APPROVED;
        claim.approvedAmount = approvedAmount;
        claim.claimsOfficer = msg.sender;
        claim.decisionReference = decisionReference;
        claim.updatedAt = block.timestamp;

        emit ClaimApproved(claimId, msg.sender, approvedAmount, decisionReference, block.timestamp);
        emit ClaimStatusUpdated(claimId, ClaimStatus.VERIFIED, ClaimStatus.APPROVED, msg.sender, block.timestamp);
    }

    /**
     * @notice Rejects a claim with an explanatory reason.
     * @dev Only INSURER_ROLE or DEFAULT_ADMIN_ROLE.
     */
    function rejectClaim(bytes32 claimId, string calldata reason)
        external
        claimExists(claimId)
    {
        if (!hasRole(INSURER_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (
            claim.status == ClaimStatus.APPROVED ||
            claim.status == ClaimStatus.SETTLED ||
            claim.status == ClaimStatus.REJECTED
        ) {
            revert InvalidStateTransition(claim.status, ClaimStatus.REJECTED);
        }

        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.REJECTED;
        claim.claimsOfficer = msg.sender;
        claim.rejectionReason = reason;
        claim.updatedAt = block.timestamp;

        emit ClaimRejected(claimId, msg.sender, reason, block.timestamp);
        emit ClaimStatusUpdated(claimId, oldStatus, ClaimStatus.REJECTED, msg.sender, block.timestamp);
    }

    /**
     * @notice Records the financial settlement after claim approval.
     * @dev Note: This records that settlement has been processed off-chain/bank ledger.
     * It does not transfer fiat bank currency directly.
     */
    function recordSettlement(
        bytes32 claimId,
        string calldata settlementReference
    ) external claimExists(claimId) {
        if (!hasRole(INSURER_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        Claim storage claim = claims[claimId];
        if (claim.status != ClaimStatus.APPROVED) {
            revert InvalidStateTransition(claim.status, ClaimStatus.SETTLED);
        }

        claim.status = ClaimStatus.SETTLED;
        claim.settlementReference = settlementReference;
        claim.settledAt = block.timestamp;
        claim.updatedAt = block.timestamp;

        emit SettlementRecorded(
            claimId,
            msg.sender,
            claim.approvedAmount,
            settlementReference,
            block.timestamp
        );

        emit ClaimStatusUpdated(
            claimId,
            ClaimStatus.APPROVED,
            ClaimStatus.SETTLED,
            msg.sender,
            block.timestamp
        );
    }

    // View Functions
    function getClaim(bytes32 claimId) external view claimExists(claimId) returns (Claim memory) {
        return claims[claimId];
    }

    function getClaimByReference(string calldata claimReference) external view returns (Claim memory) {
        bytes32 claimId = referenceToId[claimReference];
        if (claims[claimId].createdAt == 0) {
            revert ClaimDoesNotExist(claimId);
        }
        return claims[claimId];
    }

    function getAllClaimIds() external view returns (bytes32[] memory) {
        return allClaimIds;
    }

    function getClaimCount() external view returns (uint256) {
        return allClaimIds.length;
    }

    function isClaimRegistered(bytes32 claimId) external view returns (bool) {
        return claims[claimId].createdAt != 0;
    }
}
