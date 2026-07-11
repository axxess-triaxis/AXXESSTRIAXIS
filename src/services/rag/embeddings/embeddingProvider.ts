import { tokenize } from "../../nlp/localNlp";

export type EmbeddingVector = number[];

export interface EmbeddingProvider {
  readonly name: string;
  readonly configured: boolean;
  embed(text: string): Promise<EmbeddingVector>;
}

export const deterministicEmbeddingProvider: EmbeddingProvider = {
  name: "local-hash-embedding",
  configured: true,
  async embed(text) {
    const vector = Array.from({ length: 16 }, () => 0);
    for (const token of tokenize(text)) {
      let hash = 0;
      for (const char of token) hash = (hash * 31 + char.charCodeAt(0)) % 997;
      vector[hash % vector.length] += 1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => Number((value / magnitude).toFixed(6)));
  },
};

