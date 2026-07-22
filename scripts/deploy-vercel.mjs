#!/usr/bin/env node
// GitHub-independent Vercel deploy: runs local quality gates, then calls the Vercel CLI directly
// against the project already linked in .vercel/project.json. No git push, no GitHub Actions, no
// Vercel Git integration required -- see docs/VERCEL_DEPLOYMENT.md's "CLI-Based Deployment" section.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const target = argValue("--target", "preview");
const skipChecks = args.includes("--skip-checks");

if (!["preview", "production"].includes(target)) {
  console.error(`[deploy-vercel] Invalid target '${target}'. Use --target=preview|production.`);
  process.exit(1);
}

function run(command, options = {}) {
  console.log(`[deploy-vercel] $ ${command}`);
  execSync(command, { stdio: "inherit", cwd: root, ...options });
}

function ensureLinked() {
  const projectFile = path.join(root, ".vercel", "project.json");
  if (!fs.existsSync(projectFile)) {
    throw new Error(
      "This repo is not linked to a Vercel project yet. Run `npx vercel link` once (interactive, " +
      "one-time) before using this script. See docs/VERCEL_DEPLOYMENT.md.",
    );
  }
  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  console.log(`[deploy-vercel] Linked to ${project.projectName} (org ${project.orgId}).`);
}

function runQualityGates() {
  if (skipChecks) {
    console.log("[deploy-vercel] --skip-checks passed: skipping typecheck/lint/test before deploy.");
    return;
  }
  console.log("[deploy-vercel] Running typecheck/lint/test before deploy (pass --skip-checks to bypass).");
  run("pnpm run typecheck");
  run("pnpm run lint");
  run("pnpm run test");
}

function deploy() {
  const prodFlag = target === "production" ? " --prod" : "";
  // --yes skips Vercel's own interactive confirmation prompts; the project is already linked so
  // there is nothing left to confirm. Output includes the deployment URL on the last line.
  run(`npx vercel deploy${prodFlag} --yes`);
}

try {
  ensureLinked();
  runQualityGates();
  deploy();
  console.log(`[deploy-vercel] ${target} deploy complete.`);
} catch (error) {
  console.error(`[deploy-vercel] Failed: ${error.message}`);
  process.exit(1);
}
