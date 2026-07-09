import type { DataClassification } from "../privacy/privacyEngine";

export type ComplianceJurisdiction = "EU_GDPR" | "EU_AI_ACT" | "UAE_ADGM_DIFC" | "SAUDI_PDPL" | "SINGAPORE_AI_GOV" | "INDIA_DPDP";
export type ComplianceControlCategory = "privacy" | "security" | "ai_governance" | "audit" | "residency" | "human_review";

export type ComplianceControl = {
  id: string;
  jurisdiction: ComplianceJurisdiction;
  category: ComplianceControlCategory;
  title: string;
  requiredEvidence: string[];
  appliesTo: DataClassification[];
};

export type ComplianceDecision = {
  jurisdictions: ComplianceJurisdiction[];
  controls: ComplianceControl[];
  humanReviewRequired: boolean;
  dataResidencyRequired: boolean;
};

export const complianceControls: ComplianceControl[] = [
  {
    id: "gdpr-data-subject-rights",
    jurisdiction: "EU_GDPR",
    category: "privacy",
    title: "Data subject access, export, correction, and erasure workflow",
    requiredEvidence: ["privacy_request", "export_manifest", "erasure_certificate", "audit_log"],
    appliesTo: ["personal", "sensitive_personal"],
  },
  {
    id: "eu-ai-human-oversight",
    jurisdiction: "EU_AI_ACT",
    category: "ai_governance",
    title: "Human oversight for high-impact AI outputs",
    requiredEvidence: ["prompt_version", "source_citations", "confidence_score", "human_review_status"],
    appliesTo: ["confidential", "restricted", "personal", "sensitive_personal"],
  },
  {
    id: "uae-financial-zone-recordkeeping",
    jurisdiction: "UAE_ADGM_DIFC",
    category: "audit",
    title: "Financial-zone audit evidence and data-processing records",
    requiredEvidence: ["processing_purpose", "role_assignment", "immutable_audit_chain"],
    appliesTo: ["confidential", "restricted", "personal", "sensitive_personal"],
  },
  {
    id: "saudi-pdpl-purpose-limitation",
    jurisdiction: "SAUDI_PDPL",
    category: "privacy",
    title: "Purpose limitation and consent traceability",
    requiredEvidence: ["consent_record", "processing_purpose", "retention_policy"],
    appliesTo: ["personal", "sensitive_personal"],
  },
  {
    id: "singapore-ai-accountability",
    jurisdiction: "SINGAPORE_AI_GOV",
    category: "human_review",
    title: "Accountability, explainability, and human review path",
    requiredEvidence: ["ai_use_case_register", "review_owner", "source_citations"],
    appliesTo: ["internal", "confidential", "restricted", "personal", "sensitive_personal"],
  },
  {
    id: "india-dpdp-consent-retention",
    jurisdiction: "INDIA_DPDP",
    category: "privacy",
    title: "Consent, notice, retention, and breach-response evidence",
    requiredEvidence: ["consent_record", "notice_version", "retention_policy", "breach_log"],
    appliesTo: ["personal", "sensitive_personal"],
  },
];

export function resolveComplianceDecision(params: {
  jurisdictions: ComplianceJurisdiction[];
  dataClassifications: DataClassification[];
  highImpactAiUse?: boolean;
  residencySensitive?: boolean;
}): ComplianceDecision {
  const controls = complianceControls.filter(
    (control) =>
      params.jurisdictions.includes(control.jurisdiction) &&
      control.appliesTo.some((classification) => params.dataClassifications.includes(classification)),
  );

  return {
    jurisdictions: params.jurisdictions,
    controls,
    humanReviewRequired:
      Boolean(params.highImpactAiUse) || controls.some((control) => control.category === "human_review" || control.id === "eu-ai-human-oversight"),
    dataResidencyRequired: Boolean(params.residencySensitive) || params.jurisdictions.some((jurisdiction) => jurisdiction === "SAUDI_PDPL" || jurisdiction === "INDIA_DPDP"),
  };
}
