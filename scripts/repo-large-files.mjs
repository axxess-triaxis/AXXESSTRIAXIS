#!/usr/bin/env node
// Codebase De-Bloat Sprint 1 (2026-08-11): lists tracked text files over a LOC threshold (default
// 500, matching the founder's spec). Binary files are excluded -- see repo-size-lib.mjs's comment.
// Usage: node scripts/repo-large-files.mjs [threshold]

import { join } from "node:path";
import { countLines, isBinaryPath, listTrackedFiles, repoRoot } from "./repo-size-lib.mjs";

const threshold = Number(process.argv[2]) || 500;

const files = listTrackedFiles();
const large = [];

for (const relPath of files) {
  if (isBinaryPath(relPath)) continue;
  const loc = countLines(join(repoRoot, relPath));
  if (loc === null) continue;
  if (loc > threshold) large.push({ relPath, loc });
}

large.sort((a, b) => b.loc - a.loc);

console.log(`Tracked text files over ${threshold} LOC (binaries excluded): ${large.length}`);
for (const { relPath, loc } of large) {
  console.log(`  ${String(loc).padStart(8)}  ${relPath}`);
}

if (large.length === 0) {
  console.log("  (none)");
}
