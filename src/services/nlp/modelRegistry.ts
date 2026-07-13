export type NlpModelStatus = "implemented-local" | "adapter-ready" | "provider-gated" | "roadmap";

export type NlpModelRegistryEntry = {
  id: string;
  name: string;
  intendedUse: string[];
  languageCoverage: string[];
  providerMode: "local-deterministic" | "external-endpoint" | "managed-provider";
  status: NlpModelStatus;
};

export const openSourceNlpModelRegistry: NlpModelRegistryEntry[] = [
  { id: "indicbert-v2", name: "IndicBERT / IndicBERT v2", intendedUse: ["classification", "entity extraction"], languageCoverage: ["Hindi", "Assamese", "Bengali", "Bodo", "Nepali"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "muril", name: "MuRIL", intendedUse: ["classification", "semantic matching"], languageCoverage: ["Hindi", "Bengali", "Assamese"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "indictrans2", name: "AI4Bharat IndicTrans2", intendedUse: ["translation"], languageCoverage: ["English", "Hindi", "Assamese", "Bengali", "Bodo", "Nepali"], providerMode: "external-endpoint", status: "provider-gated" },
  { id: "labse", name: "LaBSE", intendedUse: ["embeddings", "cross-lingual retrieval"], languageCoverage: ["English", "Hindi", "Bengali", "Arabic", "French"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "xlm-roberta", name: "XLM-RoBERTa", intendedUse: ["classification", "entity extraction"], languageCoverage: ["English", "Hindi", "Bengali", "Arabic", "French"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "multilingual-e5", name: "multilingual-e5", intendedUse: ["embeddings", "RAG retrieval"], languageCoverage: ["English", "Hindi", "Bengali", "Arabic", "French"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "bge-m3", name: "bge-m3", intendedUse: ["embeddings", "hybrid retrieval"], languageCoverage: ["English", "Hindi", "Bengali", "Arabic", "French"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "paraphrase-multilingual", name: "sentence-transformers paraphrase-multilingual", intendedUse: ["embeddings", "similarity"], languageCoverage: ["English", "Hindi", "Bengali", "French"], providerMode: "external-endpoint", status: "adapter-ready" },
  { id: "fasttext-language-id", name: "fastText language ID", intendedUse: ["language detection"], languageCoverage: ["English", "Hindi", "Assamese", "Bengali", "Bodo", "Nepali", "Arabic", "French"], providerMode: "local-deterministic", status: "implemented-local" },
  { id: "nllb", name: "NLLB translation model", intendedUse: ["translation"], languageCoverage: ["English", "Hindi", "Bengali", "Arabic", "French"], providerMode: "external-endpoint", status: "roadmap" },
];

export const languageCoverage = [
  { language: "English", status: "implemented-local", note: "Local NLP and all adapter contracts." },
  { language: "Hindi", status: "adapter-ready", note: "Script detection plus Indic adapter targets." },
  { language: "Assamese", status: "adapter-ready", note: "Script detection and IndicTrans2 target coverage." },
  { language: "Bengali", status: "adapter-ready", note: "Script detection and multilingual embedding targets." },
  { language: "Bodo", status: "roadmap", note: "Listed for adapter onboarding; no local model bundled." },
  { language: "Nepali", status: "roadmap", note: "Listed for adapter onboarding; no local model bundled." },
  { language: "Arabic", status: "provider-gated", note: "Falcon/Jais/NLLB adapter path." },
  { language: "French", status: "provider-gated", note: "NLLB and multilingual embedding adapter path." },
];

export function modelsForCapability(capability: string) {
  return openSourceNlpModelRegistry.filter((entry) => entry.intendedUse.includes(capability));
}

