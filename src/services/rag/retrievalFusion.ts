// Reciprocal rank fusion of the semantic list and the chunk full-text list. Embeddings rank codes and rare
// terms poorly and full text misses paraphrases; ranks can be combined where the two scores, which are on
// unrelated scales, cannot.

const RANK_CONSTANT = 60;
// Full text votes only for a chunk holding more than half of the question's word weight. Measured on golden
// set v1 (CI run 45545952361): with every match voting, MRR fell from 0.9116 to 0.8433, and no paraphrase
// it demoted had a match above 0.45, while questions naming a code had 1.0.
const MIN_COVERAGE = 0.5;

export type FusionInput = {
  /** Best first. */
  semantic: Array<{ id: string; similarity: number }>;
  /** Best first. Coverage is 0 to 1 and scales the full-text vote. */
  fullText: Array<{ id: string; coverage: number }>;
};

function voters(fullText: FusionInput["fullText"]) {
  return fullText.filter((hit) => hit.coverage > MIN_COVERAGE);
}

/** Chunk id to fused order value; a larger value ranks earlier. */
export function fuseRanks({ semantic, fullText }: FusionInput): Map<string, number> {
  const order = new Map<string, number>();
  semantic.forEach((hit, index) => order.set(hit.id, 1 / (RANK_CONSTANT + index + 1)));
  voters(fullText).forEach((hit, index) => {
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
  for (const hit of voters(fullText)) if (!scores.has(hit.id)) scores.set(hit.id, Math.min(hit.coverage, floor));
  return scores;
}
