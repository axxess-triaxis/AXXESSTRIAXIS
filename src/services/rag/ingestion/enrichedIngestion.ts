import type { Document } from "../../../domain";
import { enrichWithOpenNlp, type OpenNlpEnricher } from "../../nlp/openNlpClient";
import { buildRagIngestionRecord, chunkInstitutionalText, type RagIngestionRecord } from "./ingestionPipeline";

// Server-side only. Kept out of ingestionPipeline.ts so client bundles (Knowledge Hub) never pull in the OpenNLP client.

// Packs whole sentences into chunks of at most maxWords; a single over-long sentence stays whole.
export function chunkBySentences(sentences: string[], maxWords = 140) {
  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
    const count = sentence.split(/\s+/).length;
    if (current.length && words + count > maxWords) {
      chunks.push(current.join(" "));
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += count;
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks.length ? chunks : chunkInstitutionalText("");
}

const slug = (value: string) => value.toLowerCase().trim().replace(/\s+/g, "-");

export type EnrichedRagIngestion = {
  record: RagIngestionRecord;
  chunks: string[];
  nlpSource: "opennlp" | "local";
};

// OpenNLP sentence chunking and entity tags. When OpenNLP is off or fails, the result is identical to
// buildRagIngestionRecord + chunkInstitutionalText, which is what tenantRagWorkflow used before.
export async function buildRagIngestionRecordEnriched(
  document: Document,
  extractedText: string,
  enrich: OpenNlpEnricher = (text) => enrichWithOpenNlp(text),
): Promise<EnrichedRagIngestion> {
  const record = buildRagIngestionRecord(document, extractedText);
  const enrichment = await enrich(extractedText).catch(() => null);
  if (!enrichment) {
    return { record, chunks: chunkInstitutionalText(extractedText), nlpSource: "local" };
  }
  const chunks = chunkBySentences(enrichment.sentences);
  const entityTags = [...enrichment.entities.organizations, ...enrichment.entities.locations].map(slug);
  return {
    record: { ...record, chunkCount: chunks.length, tags: [...new Set([...record.tags, ...entityTags])].slice(0, 10) },
    chunks,
    nlpSource: "opennlp",
  };
}
