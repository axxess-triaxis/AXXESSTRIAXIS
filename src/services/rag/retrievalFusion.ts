// Reciprocal rank fusion of the semantic list and the chunk full-text list. Embeddings rank codes and rare
// terms poorly and full text misses paraphrases; ranks can be combined where the two scores, which are on
// unrelated scales, cannot.

const RANK_CONSTANT = 60;

export type FusionInput = {
  /** Best first. */
  semantic: Array<{ id: string; similarity: number }>;
  /** Best first. Coverage is 0 to 1 and scales the full-text vote: one shared common word is a weak vote. */
  fullText: Array<{ id: string; coverage: number }>;
};

/** Chunk id to fused order value; a larger value ranks earlier. */
export function fuseRanks({ semantic, fullText }: FusionInput): Map<string, number> {
  const order = new Map<string, number>();
  semantic.forEach((hit, index) => order.set(hit.id, 1 / (RANK_CONSTANT + index + 1)));
  fullText.forEach((hit, index) => {
    order.set(hit.id, (order.get(hit.id) ?? 0) + hit.coverage / (RANK_CONSTANT + index + 1));
  });
  return order;
}

/**
 * The displayed score stays the similarity, so confidence and review lines keep their meaning. A chunk found
 * only by full text has no similarity here, so it shows its coverage, never above the weakest semantic hit.
 */
export function displayScores({ semantic, fullText }: FusionInput): Map<string, number> {
  const scores = new Map(semantic.map((hit) => [hit.id, hit.similarity]));
  const floor = semantic.reduce((lowest, hit) => Math.min(lowest, hit.similarity), 1);
  for (const hit of fullText) if (!scores.has(hit.id)) scores.set(hit.id, Math.min(hit.coverage, floor));
  return scores;
}
