#!/usr/bin/env node
// Mirrors local branches/tags to the GitLab `origin` remote, safely.
//
// Why this exists: the original GitHub remote (now named `github` in this repo, see
// docs/GITLAB_MIRROR.md) got its account suspended mid-project, breaking any workflow that
// depended on GitHub being reachable. GitLab (`origin`) is now the writable remote.
//
// Safety model: never force-pushes. For each branch, only pushes when the push would be a
// fast-forward on the remote (or the branch doesn't exist there yet). If a branch has diverged --
// e.g. because a second agent (Codex) pushed commits to GitLab that aren't in the local/github
// history -- this script skips it and reports the conflict instead of overwriting anything.
// Resolving a genuine divergence is a decision for a human, not a default script behavior.
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sourceRemote = argValue("--source", "github");
const targetRemote = argValue("--target", "origin");
const onlyBranch = argValue("--branch", undefined);

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function sh(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function shLines(command) {
  const out = sh(command);
  return out ? out.split("\n") : [];
}

function remoteExists(name) {
  return shLines("git remote").includes(name);
}

function isAncestor(ancestor, descendant) {
  try {
    execSync(`git merge-base --is-ancestor ${ancestor} ${descendant}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function refExists(ref) {
  try {
    execSync(`git rev-parse --verify ${ref}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!remoteExists(sourceRemote)) throw new Error(`Source remote '${sourceRemote}' does not exist. See docs/GITLAB_MIRROR.md.`);
  if (!remoteExists(targetRemote)) throw new Error(`Target remote '${targetRemote}' does not exist. See docs/GITLAB_MIRROR.md.`);

  console.log(`[gitlab-mirror] Fetching ${sourceRemote} and ${targetRemote}...`);
  sh(`git fetch ${sourceRemote} --prune`);
  sh(`git fetch ${targetRemote} --prune`);

  const localBranches = onlyBranch ? [onlyBranch] : shLines("git for-each-ref --format=%(refname:short) refs/heads/");
  const pushed = [];
  const skippedUpToDate = [];
  const skippedDiverged = [];
  const created = [];

  for (const branch of localBranches) {
    const sourceRef = `${sourceRemote}/${branch}`;
    const targetRef = `${targetRemote}/${branch}`;
    // Prefer the source remote's view of the branch if it has one (the canonical upstream);
    // otherwise fall back to whatever the local branch itself points at.
    const effectiveSource = refExists(sourceRef) ? sourceRef : branch;

    if (!refExists(targetRef)) {
      created.push(branch);
      if (!dryRun) sh(`git push ${targetRemote} ${effectiveSource}:refs/heads/${branch}`);
      continue;
    }

    if (isAncestor(targetRef, effectiveSource)) {
      if (sh(`git rev-parse ${targetRef}`) === sh(`git rev-parse ${effectiveSource}`)) {
        skippedUpToDate.push(branch);
        continue;
      }
      pushed.push(branch);
      if (!dryRun) sh(`git push ${targetRemote} ${effectiveSource}:refs/heads/${branch}`);
      continue;
    }

    skippedDiverged.push(branch);
  }

  console.log("");
  console.log(`[gitlab-mirror] ${dryRun ? "(dry run) " : ""}Summary:`);
  if (created.length) console.log(`  Created on ${targetRemote}: ${created.join(", ")}`);
  if (pushed.length) console.log(`  Fast-forwarded on ${targetRemote}: ${pushed.join(", ")}`);
  if (skippedUpToDate.length) console.log(`  Already up to date: ${skippedUpToDate.join(", ")}`);
  if (skippedDiverged.length) {
    console.log(`  SKIPPED (diverged, needs manual reconciliation): ${skippedDiverged.join(", ")}`);
    console.log(`  For each: compare 'git log ${targetRemote}/<branch>..${sourceRemote}/<branch>' and`);
    console.log(`  'git log ${sourceRemote}/<branch>..${targetRemote}/<branch>' before deciding how to merge them.`);
  }

  console.log("");
  console.log(`[gitlab-mirror] ${dryRun ? "Would push" : "Pushing"} tags...`);
  if (!dryRun) {
    try {
      sh(`git push ${targetRemote} --tags`);
    } catch (error) {
      console.log(`[gitlab-mirror] Tag push reported an issue (often just "already up to date" for some tags): ${error.message.split("\n")[0]}`);
    }
  }

  if (skippedDiverged.length > 0) {
    console.log("");
    console.log("[gitlab-mirror] Exiting with a non-zero code because one or more branches diverged and were skipped -- this is a signal to look, not a crash.");
    process.exit(2);
  }
}

try {
  main();
} catch (error) {
  console.error(`[gitlab-mirror] Failed: ${error.message}`);
  process.exit(1);
}
