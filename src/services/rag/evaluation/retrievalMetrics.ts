// Ranking metrics with binary relevance. `ranked` is a list of document keys, best first, with
// repeated documents already collapsed to their first position (a document can be cited once per
// chunk). Every function returns a value from 0 to 1.

export function dedupeRanked(ranked: string[]) {
  return [...new Set(ranked)];
}

export function recallAtK(ranked: string[], relevant: string[], k = 5) {
  if (relevant.length === 0) throw new Error("Recall needs at least one relevant document.");
  const top = new Set(dedupeRanked(ranked).slice(0, k));
  return relevant.filter((key) => top.has(key)).length / relevant.length;
}

export function reciprocalRank(ranked: string[], relevant: string[]) {
  const index = dedupeRanked(ranked).findIndex((key) => relevant.includes(key));
  return index === -1 ? 0 : 1 / (index + 1);
}

export function ndcgAtK(ranked: string[], relevant: string[], k = 5) {
  if (relevant.length === 0) throw new Error("nDCG needs at least one relevant document.");
  const gain = dedupeRanked(ranked)
    .slice(0, k)
    .reduce((sum, key, index) => sum + (relevant.includes(key) ? 1 / Math.log2(index + 2) : 0), 0);
  const ideal = Array.from({ length: Math.min(k, relevant.length) }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0);
  return gain / ideal;
}

export function mean(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
