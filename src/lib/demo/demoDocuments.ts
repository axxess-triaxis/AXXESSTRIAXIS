export const demoDocumentCards = [
  {
    title: "Dibrugarh Oxygen Risk Register",
    description: "District oxygen resilience exposure, biomedical maintenance variance, escalation thresholds, and owner history.",
    status: "Indexed",
    tags: ["oxygen", "risk", "district"],
  },
  {
    title: "Cachar Maternal Referral Review Note",
    description: "Referral handoff gaps, night transfer SLA exceptions, and corrective actions from the July mission review.",
    status: "Ready",
    tags: ["maternal", "SLA", "review"],
  },
  {
    title: "MSME Credit Triage SOP",
    description: "Workflow rules for MSME credit intake, eligibility review, exception handling, and audit-ready decisions.",
    status: "Chunked",
    tags: ["MSME", "workflow", "SOP"],
  },
  {
    title: "Cross-border Compliance Checklist",
    description: "DIFC/ADGM pilot checklist covering provider access, data residency, consent, and human approval evidence.",
    status: "Classified",
    tags: ["compliance", "ADGM", "pilot"],
  },
];

export const ragIndexStages = [
  { title: "Uploaded", description: "Documents enter a tenant-scoped repository with ownership and classification.", status: "Complete" },
  { title: "Classified", description: "Policy, SOP, review note, risk register, and briefing documents receive metadata.", status: "Complete" },
  { title: "Chunked", description: "RAG-ready passages are created with document, department, and permission metadata.", status: "Complete" },
  { title: "Indexed", description: "Retrieval vectors are provider-gated and fall back to deterministic local search.", status: "Ready" },
  { title: "Human review", description: "Sensitive answers and external recommendations are flagged before action.", status: "Required" },
];
