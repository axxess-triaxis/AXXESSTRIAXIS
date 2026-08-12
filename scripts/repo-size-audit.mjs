#!/usr/bin/env node
// Codebase De-Bloat Sprint 1 (2026-08-11): reports real tracked text LOC by top-level directory and
// file type, with binary files (PNG/PDF/ZIP/etc.) excluded from the LOC sum and reported separately.
// See docs/readiness/CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md for the incident this
// script exists to prevent from recurring: a naive `wc -l` sum over this repo reported 336,653
// "lines," when the real text LOC is ~162,700 -- the other 173,921 were binary-file byte noise.

import { statSync } from "node:fs";
import { join } from "node:path";
import { binaryExtensions, countLines, extensionOf, isBinaryPath, listTrackedFiles, repoRoot, topLevelDir } from "./repo-size-lib.mjs";

const files = listTrackedFiles();

const dirTotals = new Map(); // dir -> { loc, files }
const extTotals = new Map(); // ext -> { loc, files }
let totalLoc = 0;
let totalFiles = 0;
let binaryFiles = 0;
let binaryBytes = 0;
let unreadableFiles = 0;

for (const relPath of files) {
  if (isBinaryPath(relPath)) {
    binaryFiles += 1;
    try {
      binaryBytes += statSync(join(repoRoot, relPath)).size;
    } catch {
      // file listed by git but missing on disk (rare, e.g. mid-rebase) -- skip byte accounting only.
    }
    continue;
  }

  const loc = countLines(join(repoRoot, relPath));
  if (loc === null) {
    unreadableFiles += 1;
    continue;
  }

  totalLoc += loc;
  totalFiles += 1;

  const dir = topLevelDir(relPath);
  const dirEntry = dirTotals.get(dir) ?? { loc: 0, files: 0 };
  dirEntry.loc += loc;
  dirEntry.files += 1;
  dirTotals.set(dir, dirEntry);

  const ext = extensionOf(relPath);
  const extEntry = extTotals.get(ext) ?? { loc: 0, files: 0 };
  extEntry.loc += loc;
  extEntry.files += 1;
  extTotals.set(ext, extEntry);
}

function printTable(title, entries) {
  console.log(`\n${title}`);
  const sorted = [...entries.entries()].sort((a, b) => b[1].loc - a[1].loc);
  for (const [key, { loc, files: fileCount }] of sorted) {
    console.log(`  ${String(loc).padStart(8)} LOC  ${String(fileCount).padStart(5)} files  ${key}`);
  }
}

console.log(`Repo size audit (real text LOC, binaries excluded)`);
console.log(`Tracked files: ${files.length} total (${totalFiles} text, ${binaryFiles} binary, ${unreadableFiles} unreadable-as-text)`);
console.log(`Real text LOC: ${totalLoc}`);
console.log(`Binary file storage: ${(binaryBytes / (1024 * 1024)).toFixed(1)} MB across ${binaryFiles} files (excluded from LOC entirely -- extensions: ${[...binaryExtensions].join(", ")})`);

printTable("By top-level directory:", dirTotals);
printTable("By file extension:", extTotals);

console.log(`\nRun with --large-files to also list files over 500 real text LOC: pnpm run repo:large-files`);
