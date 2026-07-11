import { extractKeywords, summarizeText } from "../../nlp/localNlp";
import type { AiProviderAdapter } from "../types";

export const localAiProvider: AiProviderAdapter = {
  config: {
    name: "local",
    displayName: "Local Deterministic Fallback",
    configured: true,
    mode: "local",
    status: "configured",
    capabilities: ["general_chat", "rag_answer", "executive_summary", "document_analysis", "meeting_minutes", "workflow_generation", "compliance_review", "risk_assessment", "stakeholder_brief", "crm_followup", "multilingual_translation", "code_or_structured_generation"],
    languages: ["english", "hindi", "assamese", "bengali", "mixed"],
    costTier: "low",
    latencyTier: "low",
  },
  async complete(request, classification) {
    const keywords = extractKeywords(request.prompt, 6);
    const summary = summarizeText(request.prompt, 2);
    return {
      text: [
        `AXXESS routed this ${classification.category.replace(/_/g, " ")} request to the deterministic local provider.`,
        summary ? `Working summary: ${summary}` : "Working summary: no external provider was configured, so the response is based on local classification only.",
        `Priority signals: ${keywords.join(", ") || "general institutional context"}.`,
      ].join(" "),
      confidence: classification.category === "general_chat" ? 0.66 : 0.72,
      latencyMs: 42,
    };
  },
};

