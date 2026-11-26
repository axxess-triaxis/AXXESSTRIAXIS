#!/usr/bin/env node
// Read-only count of Vercel deployments for this repository, so the before/after numbers in
// docs/readiness/VERCEL_DEPLOY_BUDGET_CLOSEOUT_2026_11_26.md are measured, not inferred.
//
//   node scripts/measure-vercel-deployments.mjs [--days 7] [--until 2026-11-26T04:33:00Z]
//
// Uses the `gh` CLI (already signed in). Two sources:
//   - GitHub deployments created by Vercel's Git integration ("Preview – <project>" and
//     "Production – <project>" environments), counted per project, environment and day;
//   - successful deploy jobs in deploy-production.yml (each one is a Vercel CLI deployment).
// Not covered: manual `vercel deploy` runs and other repositories on the same Vercel account, which
// count toward the same 100-a-day limit but leave no record here.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const days = Number(arg("--days", "7"));
const until = new Date(arg("--until", new Date().toISOString()));
const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
const repo = arg("--repo", "axxess-triaxis/AXXESSTRIAXIS");

function gh(path) {
  const out = execFileSync("gh", ["api", "--paginate", "--slurp", path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out).flat();
}

const inWindow = (iso) => {
  const t = new Date(iso);
  return t >= since && t < until;
};

// Deployments come newest first; stop paging logic is left to --paginate, then filter.
const deployments = gh(`repos/${repo}/deployments?per_page=100`).filter((d) => d.creator?.login === "vercel[bot]" && inWindow(d.created_at));
const table = new Map();
const perDay = new Map();
for (const d of deployments) {
  const [env, project] = d.environment.split(" – ");
  const key = `${project}\t${env.toLowerCase()}`;
  table.set(key, (table.get(key) ?? 0) + 1);
  const day = d.created_at.slice(0, 10);
  perDay.set(day, (perDay.get(day) ?? 0) + 1);
}

const runs = gh(`repos/${repo}/actions/workflows/deploy-production.yml/runs?per_page=100&created=>=${since.toISOString().slice(0, 10)}`)
  .flatMap((page) => page.workflow_runs ?? page)
  .filter((run) => run && inWindow(run.created_at));
const cliJobs = new Map();
for (const run of runs) {
  const jobs = gh(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`).flatMap((page) => page.jobs ?? page);
  for (const job of jobs) {
    if (job.conclusion !== "success" || !/^Deploy /.test(job.name)) continue;
    cliJobs.set(job.name, (cliJobs.get(job.name) ?? 0) + 1);
    const day = run.created_at.slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
}

console.log(`Window: ${since.toISOString()} to ${until.toISOString()} (${days} days), ${repo}\n`);
console.log("Vercel Git integration deployments (GitHub deployments API)");
let gitTotal = 0;
for (const [key, count] of [...table].sort()) {
  console.log(`  ${key}\t${count}`);
  gitTotal += count;
}
console.log(`  total\t${gitTotal}\n`);
console.log(`Vercel CLI deployments (successful deploy-production.yml jobs, ${runs.length} runs)`);
let cliTotal = 0;
for (const [name, count] of [...cliJobs].sort()) {
  console.log(`  ${name}\t${count}`);
  cliTotal += count;
}
console.log(`  total\t${cliTotal}\n`);
console.log("Per day (Git + CLI)");
for (const [day, count] of [...perDay].sort()) console.log(`  ${day}\t${count}`);
console.log(`\nAll: ${gitTotal + cliTotal} (${((gitTotal + cliTotal) / days).toFixed(1)} a day)`);
