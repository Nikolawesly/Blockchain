import React from "react";
import { Check, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

export function ClaimLifecycleStepper({ currentStatus }) {
  const mainSteps = [
    { key: "SUBMITTED", label: "1. Submitted" },
    { key: "UNDER_REVIEW", label: "2. Under Review" },
    { key: "VERIFIED", label: "3. Verified" },
    { key: "APPROVED", label: "4. Approved" },
    { key: "SETTLED", label: "5. Settled" },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case "SUBMITTED":
        return 0;
      case "UNDER_REVIEW":
      case "ADDITIONAL_INFO_REQUIRED":
      case "FLAGGED":
        return 1;
      case "VERIFIED":
        return 2;
      case "APPROVED":
        return 3;
      case "SETTLED":
        return 4;
      case "REJECTED":
        return 2; // rejected after review/verification
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isRejected = currentStatus === "REJECTED";
  const isFlagged = currentStatus === "FLAGGED";
  const isInfoReq = currentStatus === "ADDITIONAL_INFO_REQUIRED";

  return (
    <div style={{ margin: "20px 0" }}>
      <div className="stepper">
        <div className="step-connector" />
        {mainSteps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex && !isRejected && !isFlagged && !isInfoReq;
          const isPassedOrCurrent = idx <= currentIndex;

          let circleClass = "step-circle";
          if (isCompleted) circleClass += " completed";
          else if (isCurrent) circleClass += " active";

          return (
            <div key={step.key} className="step-item">
              <div className={circleClass}>
                {isCompleted ? <Check size={16} /> : idx + 1}
              </div>
              <span className={`step-label ${isCurrent ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Exception branch indicator */}
      {isFlagged && (
        <div className="alert alert-warning" style={{ marginTop: 12 }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Discrepancy Flag Active:</strong> Surveyor flagged this claim for suspicious data or damage inconsistencies. Further inspection required before verification can proceed.
          </div>
        </div>
      )}

      {isInfoReq && (
        <div className="alert alert-info" style={{ marginTop: 12 }}>
          <HelpCircle size={18} />
          <div>
            <strong>Additional Information Required:</strong> The surveyor or insurer requested supplementary evidence from the policyholder.
          </div>
        </div>
      )}

      {isRejected && (
        <div className="alert alert-danger" style={{ marginTop: 12 }}>
          <XCircle size={18} />
          <div>
            <strong>Claim Rejected:</strong> This claim was reviewed and rejected by the authorized Claims Officer. The decision and reason are permanently recorded on the blockchain.
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimLifecycleStepper;
