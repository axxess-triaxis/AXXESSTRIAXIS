import type { EmbeddingVector } from "../embeddings/embeddingProvider";

export type VectorRecord = {
  id: string;
  organizationId: string;
  documentId: string;
  text: string;
  vector: EmbeddingVector;
  metadata: Record<string, string | number | boolean | string[] | undefined>;
};

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  query(organizationId: string, vector: EmbeddingVector, limit?: number): Promise<Array<VectorRecord & { score: number }>>;
}

function cosine(a: EmbeddingVector, b: EmbeddingVector) {
  const length = Math.max(a.length, b.length);
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let index = 0; index < length; index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    dot += av * bv;
    left += av * av;
    right += bv * bv;
  }
  return dot / ((Math.sqrt(left) || 1) * (Math.sqrt(right) || 1));
}

export class InMemoryVectorStore implements VectorStore {
  private records = new Map<string, VectorRecord>();

  async upsert(records: VectorRecord[]) {
    for (const record of records) this.records.set(record.id, record);
  }

  async query(organizationId: string, vector: EmbeddingVector, limit = 5) {
    return [...this.records.values()]
      .filter((record) => record.organizationId === organizationId)
      .map((record) => ({ ...record, score: cosine(record.vector, vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

