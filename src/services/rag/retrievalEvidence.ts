// What retrieval saw for one question, computed only over chunks the asking user may read, so nothing here
// depends on documents they may not.

export type RetrievalEvidence = {
  /** Similarity of the best chunk and, over the other candidates, their mean and standard deviation.
   * Absent when the semantic path did not run. */
  topSimilarity?: number;
  restMean?: number;
  restDeviation?: number;
  candidates: number;
  /** Best share of the question's word weight found in one chunk. Absent when full text did not run. */
  topCoverage?: number;
  /** Word coverage of the chunk the semantic list ranks first. */
  semanticTopCoverage?: number;
};

export function semanticEvidence(
  semantic: Array<{ id: string; similarity: number }>,
  fullText: Array<{ id: string; coverage: number }> | null,
): RetrievalEvidence {
  const [top, ...rest] = semantic.map((hit) => hit.similarity);
  const mean = rest.length ? rest.reduce((sum, value) => sum + value, 0) / rest.length : undefined;
  const deviation = mean === undefined
    ? undefined
    : Math.sqrt(rest.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rest.length);
  return {
    topSimilarity: top,
    restMean: mean,
    restDeviation: deviation,
    candidates: semantic.length,
    ...fullTextEvidence(fullText),
    ...(fullText ? { semanticTopCoverage: fullText.find((hit) => hit.id === semantic[0]?.id)?.coverage ?? 0 } : {}),
  };
}

export function fullTextEvidence(fullText: Array<{ coverage: number }> | null) {
  return fullText ? { topCoverage: fullText.reduce((best, hit) => Math.max(best, hit.coverage), 0) } : {};
}
