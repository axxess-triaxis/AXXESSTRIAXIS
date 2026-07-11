import { detectLanguage, extractKeywords } from "../nlp/localNlp";
import type {
  AiCostPreference,
  AiLatencyPreference,
  AiPromptClassification,
  AiPromptRequest,
  AiReasoningLevel,
  AiSensitivity,
  AiTaskCategory,
} from "./types";

const categoryRules: Array<{ category: AiTaskCategory; terms: string[] }> = [
  { category: "executive_summary", terms: ["executive summary", "briefing", "board", "secretariat", "summary"] },
  { category: "rag_answer", terms: ["source", "citation", "document", "knowledge", "evidence", "rag"] },
  { category: "document_analysis", terms: ["analyze document", "extract", "classify", "document analysis"] },
  { category: "multilingual_translation", terms: ["translate", "assamese", "bengali", "hindi", "bodo", "nepali", "arabic", "french"] },
  { category: "crm_followup", terms: ["stakeholder", "crm", "follow up", "follow-up", "lead"] },
  { category: "workflow_generation", terms: ["workflow", "tasks", "assign", "generate plan", "next steps"] },
  { category: "compliance_review", terms: ["compliance", "policy", "gdpr", "dpdp", "audit", "control"] },
  { category: "risk_assessment", terms: ["risk", "variance", "breach", "exposure", "mitigation"] },
  { category: "meeting_minutes", terms: ["meeting", "minutes", "action owner", "decision log"] },
  { category: "stakeholder_brief", terms: ["stakeholder brief", "donor", "official", "partner brief"] },
  { category: "code_or_structured_generation", terms: ["json", "schema", "sql", "code", "structured"] },
];

const sensitiveTerms = ["restricted", "confidential", "patient", "pii", "salary", "disciplinary", "credential", "private key"];

function inferCategory(prompt: string, explicit?: AiTaskCategory): AiTaskCategory {
  if (explicit) return explicit;
  const normalized = prompt.toLowerCase();
  const match = categoryRules
    .map((rule) => ({ category: rule.category, score: rule.terms.filter((term) => normalized.includes(term)).length }))
    .sort((a, b) => b.score - a.score)[0];
  return match && match.score > 0 ? match.category : "general_chat";
}

function inferSensitivity(prompt: string, requested?: AiSensitivity): AiSensitivity {
  if (requested) return requested;
  const normalized = prompt.toLowerCase();
  if (sensitiveTerms.some((term) => normalized.includes(term))) return "restricted";
  if (["budget", "vendor", "procurement", "contract"].some((term) => normalized.includes(term))) return "confidential";
  if (["internal", "project", "approval"].some((term) => normalized.includes(term))) return "internal";
  return "public";
}

function inferReasoning(category: AiTaskCategory): AiReasoningLevel {
  if (["compliance_review", "risk_assessment", "document_analysis", "workflow_generation"].includes(category)) return "high";
  if (["executive_summary", "rag_answer", "meeting_minutes", "stakeholder_brief"].includes(category)) return "medium";
  return "low";
}

export function classifyAiPrompt(request: AiPromptRequest): AiPromptClassification {
  const category = inferCategory(request.prompt, request.task);
  const sensitivity = inferSensitivity(request.prompt, request.context.sensitivity);
  const requiredReasoning = inferReasoning(category);
  const keywords = extractKeywords(request.prompt, 10);
  const requiresCitation = Boolean(
    request.context.requiresCitation
      || category === "rag_answer"
      || ["cite", "citation", "source", "evidence", "document"].some((term) => request.prompt.toLowerCase().includes(term)),
  );
  const costPreference: AiCostPreference = request.context.costPreference ?? (requiredReasoning === "high" ? "balanced" : "low");
  const latencyPreference: AiLatencyPreference = request.context.latencyPreference ?? (category === "general_chat" ? "instant" : "balanced");
  const humanReviewRequired = sensitivity === "restricted" || ["compliance_review", "risk_assessment"].includes(category);

  return {
    category,
    sensitivity,
    language: detectLanguage(request.prompt),
    requiredReasoning,
    requiresCitation,
    costPreference,
    latencyPreference,
    humanReviewRequired,
    confidence: Math.min(0.95, 0.58 + keywords.length * 0.035 + (category === "general_chat" ? 0 : 0.12)),
    signals: keywords,
  };
}

