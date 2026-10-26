import React from "react";
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  AlertTriangle, 
  XCircle, 
  HelpCircle 
} from "lucide-react";

export function ClaimStatusBadge({ status }) {
  const statusConfig = {
    SUBMITTED: {
      label: "Submitted",
      className: "status-SUBMITTED",
      icon: Clock,
    },
    UNDER_REVIEW: {
      label: "Under Review",
      className: "status-UNDER_REVIEW",
      icon: Search,
    },
    VERIFIED: {
      label: "Surveyor Verified",
      className: "status-VERIFIED",
      icon: CheckCircle2,
    },
    APPROVED: {
      label: "Claim Approved",
      className: "status-APPROVED",
      icon: ShieldCheck,
    },
    SETTLED: {
      label: "Settled on Ledger",
      className: "status-SETTLED",
      icon: CreditCard,
    },
    FLAGGED: {
      label: "Flagged Suspicious",
      className: "status-FLAGGED",
      icon: AlertTriangle,
    },
    REJECTED: {
      label: "Claim Rejected",
      className: "status-REJECTED",
      icon: XCircle,
    },
    ADDITIONAL_INFO_REQUIRED: {
      label: "Info Required",
      className: "status-ADDITIONAL_INFO_REQUIRED",
      icon: HelpCircle,
    },
  };

  const config = statusConfig[status] || {
    label: status || "Unknown",
    className: "status-SUBMITTED",
    icon: Clock,
  };

  const IconComponent = config.icon;

  return (
    <span className={`status-badge ${config.className}`}>
      <IconComponent size={13} />
      <span>{config.label}</span>
    </span>
  );
}

export default ClaimStatusBadge;
