#!/usr/bin/env node
// Codebase De-Bloat Sprint 1 (2026-08-11): fails (non-zero exit) if any tracked file lives under a
// generated/build/cache directory that should always be gitignored. Confirmed via this session's
// audit that no such gate existed anywhere across this repo's 15 GitHub Actions workflows -- nothing
// currently tracks these paths, but nothing would catch a future accidental `git add -f` either.

import { listTrackedFiles } from "./repo-size-lib.mjs";

const forbiddenPathSegments = [
  "/.next/", "/dist/", "/out/", "/coverage/", "/.turbo/", "/node_modules/",
];
const forbiddenPrefixes = [".next/", "dist/", "out/", "coverage/", ".turbo/", "node_modules/"];
const forbiddenSuffixes = [".tsbuildinfo"];

const files = listTrackedFiles();
const violations = [];

for (const relPath of files) {
  const padded = `/${relPath}/`;
  if (forbiddenPathSegments.some((segment) => padded.includes(segment))) {
    violations.push(relPath);
    continue;
  }
  if (forbiddenPrefixes.some((prefix) => relPath.startsWith(prefix))) {
    violations.push(relPath);
    continue;
  }
  if (forbiddenSuffixes.some((suffix) => relPath.endsWith(suffix))) {
    violations.push(relPath);
  }
}

if (violations.length > 0) {
  console.error(`repo:bloat:guard failed -- ${violations.length} tracked file(s) live under a generated/build/cache path that must be gitignored, not committed:`);
  for (const path of violations) console.error(`  - ${path}`);
  console.error("\nRemove these from git tracking (git rm --cached <path>) and confirm .gitignore covers the pattern.");
  process.exit(1);
}

console.log(`repo:bloat:guard passed -- 0 of ${files.length} tracked files under a forbidden generated/build/cache path.`);
