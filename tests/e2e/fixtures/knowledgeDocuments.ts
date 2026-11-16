// Fictional Knowledge Hub documents for the seeded org Alpha (founder decision 2026-11-16: "Add test
// docs; possibly test RAG"). Each carries one distinctive fact so a RAG answer can be checked against
// it. They are ingested through POST /api/documents/ingest, the real pipeline (document, version,
// chunks, hash and gte-small embeddings, audit), never inserted with SQL, so retrieval has chunks.
export const E2E_KNOWLEDGE_TAG = "e2e-seed";

export type KnowledgeFixture = {
  title: string;
  fileName: string;
  classification: "internal" | "confidential" | "restricted";
  // A phrase from bodyText that a correct RAG answer or citation excerpt should contain.
  fact: RegExp;
  question: string;
  bodyText: string;
};

export const knowledgeDocuments: KnowledgeFixture[] = [
  {
    title: "Alpha Risk Register 2026",
    fileName: "alpha-risk-register-2026.md",
    classification: "internal",
    fact: /every 30 days/i,
    question: "How often is the Alpha risk register reviewed?",
    bodyText: [
      "# Alpha Risk Register 2026",
      "",
      "The risk register is owned by the Head of Operational Risk and is reviewed every 30 days by the risk committee.",
      "Top risks: vendor concentration in cloud hosting, delayed regulatory filings, and key-person dependency in finance.",
      "Each risk has an owner, a likelihood score from 1 to 5, an impact score from 1 to 5, and a mitigation plan with a due date.",
      "Risks scoring 16 or more are escalated to the executive committee within five working days.",
    ].join("\n"),
  },
  {
    title: "Alpha Data Governance Policy",
    fileName: "alpha-data-governance-policy.md",
    classification: "restricted",
    fact: /seven years/i,
    question: "What is the Alpha data retention period for customer records?",
    bodyText: [
      "# Alpha Data Governance Policy",
      "",
      "Customer records are retained for seven years after the end of the customer relationship, then securely deleted.",
      "Personal data is classified as confidential or restricted and may only leave the tenant with a recorded lawful basis.",
      "Access reviews run every quarter. The data protection officer approves every exception in writing.",
    ].join("\n"),
  },
  {
    title: "Alpha Platform Architecture Overview",
    fileName: "alpha-platform-architecture-overview.md",
    classification: "internal",
    fact: /orion-events/i,
    question: "Which event bus does the Alpha platform use?",
    bodyText: [
      "# Alpha Platform Architecture Overview",
      "",
      "Services publish domain events to an Amazon EventBridge bus named orion-events.",
      "The web tier runs on Next.js; data lives in Postgres with row-level security per tenant.",
      "Every deploy runs typecheck, lint, unit tests and a browser smoke test before it reaches production.",
    ].join("\n"),
  },
];
