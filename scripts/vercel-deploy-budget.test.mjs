// @vitest-environment node
// Dry-run proof for the 2026-11-26 Vercel deploy budget change
// (docs/readiness/VERCEL_DEPLOY_BUDGET_CLOSEOUT_2026_11_26.md). Vercel's free plan allows 100
// deployments a day; on 2026-11-25 the production deploy of 754524ff was refused at that limit.
//
// 1. vercel.json `git.deploymentEnabled` stops Git deployments for Dependabot and docs branches.
//    Vercel matches these keys with minimatch; Node's path.posix.matchesGlob uses the same glob
//    rules for `*` and `**`, so the branch list below is replayed through it. The list is every
//    branch that got a Vercel preview from 2026-11-19 to 2026-11-26 (GitHub deployments API).
// 2. deploy-production.yml no longer builds landing (Git integration does), keeps investor and
//    lite, and has an app job that stays off until vars.VERCEL_APP_DEPLOY_VIA_CLI is 'true'.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const workflow = fs.readFileSync(path.join(root, ".github/workflows/deploy-production.yml"), "utf8").replace(/\r\n/g, "\n");

// Vercel's rule: a branch deploys unless it matches a `false` key and no `true` key.
function deploysOnGit(branch, rules = vercelConfig.git?.deploymentEnabled ?? {}) {
  if (rules === false) return false;
  const matches = Object.entries(rules).filter(([pattern]) => path.posix.matchesGlob(branch, pattern));
  if (matches.length === 0) return true;
  return matches.some(([, enabled]) => enabled === true);
}

const measuredBranches = {
  skipped: [
    "dependabot/npm_and_yarn/motion-14.14.0",
    "dependabot/npm_and_yarn/next-and-react-460f60db27",
    "dependabot/npm_and_yarn/posthog-js-1.450.0",
    "dependabot/npm_and_yarn/react-resizable-panels-4.24.0",
    "dependabot/npm_and_yarn/rollup/rollup-win32-x64-msvc-4.68.4",
    "dependabot/npm_and_yarn/tailwindcss-4.3.5",
    "dependabot/npm_and_yarn/testing-4e69551733",
    "dependabot/npm_and_yarn/vercel/speed-insights-2.1.0",
    "docs/langsmith-live-check",
    "docs/rag-quality-merged-2026-11-25",
    "docs/stack-merge-live-check",
    "docs/stack-status-2026-11-20",
    "docs/staging-project-map",
  ],
  deployed: [
    "main",
    "staging",
    "chore/dependency-batch-2026-11-25",
    "ci/stack-e2e-weekly",
    "copy/github-stats-2026-11-24",
    "copy/website-plain-language",
    "feat/langsmith-tracing",
    "feat/rag-real-retrieval-gate",
    "fix/deps-high-alerts-2026-11-20",
    "fix/sidebar-own-scroll",
    "test/stack-two-org-e2e",
    // Names that only look similar must still deploy.
    "documentation-fix",
    "feat/docs/page",
    "fix/dependabot-config",
  ],
};

/** Top-level job ids and their bodies, without a YAML dependency. */
function jobs(text) {
  const body = text.slice(text.indexOf("\njobs:\n") + "\njobs:\n".length);
  const parts = body.split(/\n(?=  [a-z0-9-]+:\n)/);
  return Object.fromEntries(parts.map((part) => [part.trimStart().split(":")[0], part]));
}

describe("vercel.json Git deployment rules (dry run on last week's branches)", () => {
  it.each(measuredBranches.skipped)("creates no Git deployment for %s", (branch) => {
    expect(deploysOnGit(branch)).toBe(false);
  });

  it.each(measuredBranches.deployed)("still deploys %s", (branch) => {
    expect(deploysOnGit(branch)).toBe(true);
  });

  it("only turns off the two measured branch groups and never main or staging", () => {
    expect(vercelConfig.git.deploymentEnabled).toEqual({ "dependabot/**": false, "docs/**": false });
  });

  it("does not use an ignoreCommand, which Vercel still counts as a full deployment", () => {
    expect(vercelConfig.ignoreCommand).toBeUndefined();
  });
});

describe("deploy-production.yml builds each production site once", () => {
  const byId = jobs(workflow);

  it("has no landing job, since Vercel Git integration already deploys landing", () => {
    expect(Object.keys(byId).sort()).toEqual(["deploy-app", "deploy-investor-demo", "deploy-lite"]);
    expect(workflow).not.toContain("secrets.VERCEL_PROJECT_ID_LANDING");
  });

  it("keeps the app job off until the founder switches the app to CLI deploys", () => {
    expect(byId["deploy-app"]).toContain("if: ${{ vars.VERCEL_APP_DEPLOY_VIA_CLI == 'true' }}");
    expect(byId["deploy-app"]).toContain("VERCEL_PROJECT_ID: prj_zTMRnOsfmUUxnzJkEUDUxNvoEOFt");
  });

  it("still deploys investor and then lite on every merge to main", () => {
    expect(byId["deploy-investor-demo"]).not.toContain("needs:");
    expect(byId["deploy-investor-demo"]).not.toContain("if:");
    expect(byId["deploy-lite"]).toContain("needs: deploy-investor-demo");
    for (const id of Object.keys(byId)) {
      expect(byId[id]).toContain("npx vercel deploy --prebuilt --prod --archive=tgz");
    }
  });
});
