#!/usr/bin/env node
// Checks the one Merge When Ready exception for docs-only PRs (CLAUDE.md, "Merge When Ready",
// condition 2; adopted 2026-11-26, docs/readiness/DOCS_PR_VERCEL_STATUS_CLOSEOUT_2026_11_26.md).
//
// vercel.json `git.deploymentEnabled` stops Git deployments for `docs/**` branches (PR #590), but
// Vercel's opt-in consolidated commit status is still posted on them and never resolves. This
// script says whether that pending status may count as the usual skip for one PR. It does not
// check the PR's other checks; Merge When Ready still needs every other check passed.
//
// Usage: node scripts/docs-pr-vercel-skip.mjs <pr-number> [--repo owner/name]
// Exit 0 and {"ok":true} when the exception applies (or there is no Vercel summary status);
// exit 1 with the problems otherwise. Read-only: it calls `gh api` GET endpoints only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUMMARY_CONTEXT = "Vercel Deployments – AXXESS TRIaxis powered by Triaxis Ventures";
export const SUMMARY_PENDING_DESCRIPTION = "Required and affected projects deploying";
const PROJECT_STATUS_PREFIX = "Vercel – ";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readDeploymentRules() {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  return config.git?.deploymentEnabled ?? {};
}

// Vercel's rule: a branch deploys unless it matches a `false` key and no `true` key (minimatch globs;
// path.posix.matchesGlob follows the same rules for `*` and `**`).
export function deploysOnGit(branch, rules = readDeploymentRules()) {
  if (rules === false) return false;
  const matches = Object.entries(rules).filter(([pattern]) => path.posix.matchesGlob(branch, pattern));
  if (matches.length === 0) return true;
  return matches.some(([, enabled]) => enabled === true);
}

// Code or config is never "docs", even under docs/ (nothing under docs/ is code today: .md, images, .txt,
// .json, .tsv, .pdf only).
const CODE_EXTENSION = /\.(m?[jt]sx?|c[jt]s|sql|sh|ps1|py|ya?ml|toml)$/i;

export function isDocsFile(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith(".md")) return true;
  return file.startsWith("docs/") && !CODE_EXTENSION.test(file);
}

/**
 * @param {{branch: string, files: string[], statuses: {context: string, state: string, description?: string}[], rules?: object}} pr
 *   statuses as GitHub lists them (newest first).
 */
export function checkDocsPrVercelSkip({ branch, files, statuses, rules }) {
  const summary = statuses.find((s) => s.context === SUMMARY_CONTEXT);
  if (!summary || summary.state === "success") return { ok: true, problems: [] };

  const problems = [];
  if (!branch.startsWith("docs/")) problems.push(`branch ${branch} is not a docs/** branch`);
  if (deploysOnGit(branch, rules)) problems.push(`branch ${branch} deploys on Git per vercel.json`);
  if (files.length === 0) problems.push("no changed files listed");
  const nonDocs = files.filter((f) => !isDocsFile(f));
  if (nonDocs.length > 0) problems.push(`non-docs files changed: ${nonDocs.join(", ")}`);
  const projectStatuses = [...new Set(statuses.filter((s) => s.context.startsWith(PROJECT_STATUS_PREFIX)).map((s) => s.context))];
  if (projectStatuses.length > 0) problems.push(`a Vercel deployment ran: ${projectStatuses.join(", ")}`);
  if (summary.state !== "pending" || summary.description !== SUMMARY_PENDING_DESCRIPTION) {
    problems.push(`${SUMMARY_CONTEXT} is ${summary.state} ("${summary.description ?? ""}"), not the known never-ending pending`);
  }
  return { ok: problems.length === 0, problems };
}

function gh(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
}

function main(argv) {
  const pr = argv.find((a) => /^\d+$/.test(a));
  const repoIdx = argv.indexOf("--repo");
  const repo = repoIdx >= 0 ? argv[repoIdx + 1] : "axxess-triaxis/AXXESSTRIAXIS";
  if (!pr) {
    console.error("usage: node scripts/docs-pr-vercel-skip.mjs <pr-number> [--repo owner/name]");
    process.exit(2);
  }
  const info = gh(["api", `repos/${repo}/pulls/${pr}`]);
  const files = gh(["api", "--paginate", "--slurp", `repos/${repo}/pulls/${pr}/files?per_page=100`]).flat().map((f) => f.filename);
  const statuses = gh(["api", "--paginate", "--slurp", `repos/${repo}/commits/${info.head.sha}/statuses?per_page=100`]).flat();
  const result = checkDocsPrVercelSkip({ branch: info.head.ref, files, statuses });
  console.log(JSON.stringify({ pr: Number(pr), head: info.head.sha, branch: info.head.ref, ...result }));
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
