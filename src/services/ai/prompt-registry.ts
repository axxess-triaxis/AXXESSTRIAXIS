import type { AiTaskCategory } from "./types";

export type AiPromptTemplate = {
  id: string;
  category: AiTaskCategory;
  title: string;
  template: string;
  humanReviewRequired: boolean;
  status: "approved" | "draft" | "retired";
};

export const aiPromptRegistry: AiPromptTemplate[] = [
  {
    id: "exec-portfolio-brief",
    category: "executive_summary",
    title: "Executive portfolio briefing",
    template: "Summarize portfolio health, top risks, required approvals, and evidence gaps for {organization}.",
    humanReviewRequired: true,
    status: "approved",
  },
  {
    id: "rag-cited-answer",
    category: "rag_answer",
    title: "Cited RAG answer",
    template: "Answer using only authorized sources. Include citations, confidence, and review flag.",
    humanReviewRequired: false,
    status: "approved",
  },
  {
    id: "restricted-compliance-review",
    category: "compliance_review",
    title: "Restricted compliance review",
    template: "Review policy evidence for compliance gaps. Do not expose private content. Require human review.",
    humanReviewRequired: true,
    status: "approved",
  },
];

export function getPromptTemplateForCategory(category: AiTaskCategory) {
  return aiPromptRegistry.find((template) => template.category === category && template.status === "approved")
    ?? aiPromptRegistry.find((template) => template.category === "executive_summary")!;
}

