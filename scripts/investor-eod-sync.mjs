#!/usr/bin/env node
// I/O wrapper for the EOD investor sync. Decision logic lives in scripts/investor-sync-lib.mjs.
//
//   node scripts/investor-eod-sync.mjs plan              -> decide in-sync / deploy / fail, write GITHUB_OUTPUT
//   node scripts/investor-eod-sync.mjs guard-env <file>  -> partition guard on the pulled investor env
//   node scripts/investor-eod-sync.mjs verify <sha>      -> post-deploy: investor domain serves <sha> and answers 200
//
// Env: VERCEL_TOKEN, VERCEL_ORG_ID (team id), GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name).
import fs from "node:fs";
import {
  INVESTOR_HOST,
  LANDING_HOST,
  checkInvestorPartition,
  deploymentSha,
  evaluateChecks,
  isOnMain,
  planSync,
} from "./investor-sync-lib.mjs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[investor-sync] ${name} is not set.`);
    process.exit(1);
  }
  return value;
}

function output(key, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

function summary(markdown) {
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function vercelDeployment(host) {
  const token = requireEnv("VERCEL_TOKEN");
  const team = requireEnv("VERCEL_ORG_ID");
  return getJson(`https://api.vercel.com/v13/deployments/${host}?teamId=${encodeURIComponent(team)}`, {
    Authorization: `Bearer ${token}`,
  });
}

function githubHeaders() {
  return { Authorization: `Bearer ${requireEnv("GITHUB_TOKEN")}`, Accept: "application/vnd.github+json" };
}

async function checkRunsFor(sha) {
  const repo = requireEnv("GITHUB_REPOSITORY");
  const runs = [];
  for (let page = 1; page <= 10; page += 1) {
    const body = await getJson(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs?per_page=100&page=${page}`, githubHeaders());
    runs.push(...body.check_runs);
    if (body.check_runs.length < 100) break;
  }
  return runs;
}

async function compareWithMain(sha) {
  const repo = requireEnv("GITHUB_REPOSITORY");
  const body = await getJson(`https://api.github.com/repos/${repo}/compare/main...${sha}`, githubHeaders());
  return body.status;
}

async function activeMergeDeploys() {
  const repo = requireEnv("GITHUB_REPOSITORY");
  const counts = await Promise.all(
    ["queued", "in_progress", "waiting", "pending"].map(async (status) => {
      const body = await getJson(`https://api.github.com/repos/${repo}/actions/workflows/deploy-production.yml/runs?status=${status}&per_page=1`, githubHeaders());
      return body.total_count;
    }),
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

async function plan() {
  const [landing, investor] = await Promise.all([vercelDeployment(LANDING_HOST), vercelDeployment(INVESTOR_HOST)]);
  const decision = planSync(landing, investor);
  summary(`### EOD investor sync\n\n| Domain | Deployment | Commit |\n|---|---|---|\n| ${LANDING_HOST} | ${landing.id} | ${decision.landingSha ?? "none"} |\n| ${INVESTOR_HOST} | ${investor.id} | ${decision.investorSha ?? "none"} |\n\n**Decision:** ${decision.action} -- ${decision.reason}`);
  output("landing_sha", decision.landingSha ?? "");
  output("investor_sha", decision.investorSha ?? "");

  if (decision.action === "fail") process.exit(1);
  if (decision.action === "in-sync") {
    output("action", "in-sync");
    return;
  }

  // Avoid racing the merge pipeline: it may be about to put investor on an even newer commit, and a
  // sync landing after it would move investor backwards.
  const active = await activeMergeDeploys();
  if (active > 0) {
    summary(`Standing down: ${active} deploy-production run(s) queued or in progress; that pipeline deploys investor itself.`);
    output("action", "busy");
    return;
  }

  const compareStatus = await compareWithMain(decision.landingSha);
  if (!isOnMain(compareStatus)) {
    summary(`Not deploying: ${decision.landingSha} is not on main (compare status: ${compareStatus}).`);
    process.exit(1);
  }
  const checks = evaluateChecks(await checkRunsFor(decision.landingSha));
  if (!checks.ok) {
    summary(`Not deploying: required checks did not pass on ${decision.landingSha}:\n${checks.problems.map((p) => `- ${p}`).join("\n")}`);
    process.exit(1);
  }
  summary(`Gates passed on ${decision.landingSha}: on main, required checks green.`);
  output("action", "deploy");
}

function guardEnv(file) {
  const result = checkInvestorPartition(fs.readFileSync(file, "utf8"));
  if (!result.ok) {
    summary(`Partition guard FAILED, not deploying:\n${result.problems.map((p) => `- ${p}`).join("\n")}`);
    process.exit(1);
  }
  summary("Partition guard passed: demo mode forced on, no live credential names in the investor env.");
}

async function verify(sha) {
  const investor = await vercelDeployment(INVESTOR_HOST);
  const served = deploymentSha(investor);
  const response = await fetch(`https://${INVESTOR_HOST}/`, { redirect: "follow" });
  const ok = served === sha && investor.readyState === "READY" && response.status === 200;
  summary(`Post-deploy check: ${INVESTOR_HOST} -> ${investor.id}, commit ${served}, ${investor.readyState}, GET / ${response.status}. ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

const [command, arg] = process.argv.slice(2);
try {
  if (command === "plan") await plan();
  else if (command === "guard-env" && arg) guardEnv(arg);
  else if (command === "verify" && arg) await verify(arg);
  else {
    console.error("Usage: investor-eod-sync.mjs plan | guard-env <file> | verify <sha>");
    process.exit(1);
  }
} catch (error) {
  console.error(`[investor-sync] ${error.message}`);
  process.exit(1);
}
