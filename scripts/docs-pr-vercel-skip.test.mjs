// @vitest-environment node
// Merge When Ready exception for docs-only PRs (CLAUDE.md, adopted 2026-11-26,
// docs/readiness/DOCS_PR_VERCEL_STATUS_CLOSEOUT_2026_11_26.md).
// vercel.json stops Git deployments for `docs/**` branches, but Vercel's consolidated commit status
// is still posted and stays pending forever (seen on #582, #592, #597). It may count as the usual
// skip only when the branch deploys nothing, every changed file is documentation, no per-project
// Vercel status exists, and the summary status is that exact pending one.
import { describe, expect, it } from "vitest";
import { SUMMARY_CONTEXT, SUMMARY_PENDING_DESCRIPTION, checkDocsPrVercelSkip } from "./docs-pr-vercel-skip.mjs";

const pendingSummary = { context: SUMMARY_CONTEXT, state: "pending", description: SUMMARY_PENDING_DESCRIPTION };
const base = {
  branch: "docs/agent-prs-deploy-records",
  files: ["docs/readiness/DEPLOY.md", "README.md"],
  statuses: [pendingSummary],
};

describe("checkDocsPrVercelSkip", () => {
  it("allows the real #597 shape: docs branch, docs files, only the pending summary", () => {
    expect(checkDocsPrVercelSkip(base)).toEqual({ ok: true, problems: [] });
  });

  it("names the exact status Vercel posts", () => {
    expect(SUMMARY_CONTEXT).toBe("Vercel Deployments – AXXESS TRIaxis powered by Triaxis Ventures");
    expect(SUMMARY_PENDING_DESCRIPTION).toBe("Required and affected projects deploying");
  });

  it("is not needed when there is no Vercel status at all", () => {
    expect(checkDocsPrVercelSkip({ ...base, statuses: [] })).toEqual({ ok: true, problems: [] });
  });

  it("refuses a branch that is not disabled in vercel.json", () => {
    const r = checkDocsPrVercelSkip({ ...base, branch: "feat/docs-page" });
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/deploys on Git/);
  });

  it("refuses a dependabot branch (the exception is for docs PRs only)", () => {
    const r = checkDocsPrVercelSkip({ ...base, branch: "dependabot/npm_and_yarn/next-16.0.0", files: ["package.json"] });
    expect(r.ok).toBe(false);
  });

  it.each([["src/app/page.tsx"], ["vercel.json"], [".github/workflows/ci.yml"], ["docs/site/app.ts"], ["scripts/x.mjs"]])(
    "refuses a docs branch that changes %s",
    (file) => {
      const r = checkDocsPrVercelSkip({ ...base, files: ["docs/a.md", file] });
      expect(r.ok).toBe(false);
      expect(r.problems.join(" ")).toContain(file);
    },
  );

  it("allows .md files outside docs/ and any file under docs/", () => {
    expect(checkDocsPrVercelSkip({ ...base, files: ["CONTRIBUTING.md", "apps/mobile/README.md", "docs/img/a.png"] }).ok).toBe(true);
  });

  it("refuses an empty file list", () => {
    expect(checkDocsPrVercelSkip({ ...base, files: [] }).ok).toBe(false);
  });

  it("refuses when any per-project Vercel status exists (a deployment ran)", () => {
    const r = checkDocsPrVercelSkip({
      ...base,
      statuses: [pendingSummary, { context: "Vercel – axxesstriaxis", state: "success", description: "Deployment has completed" }],
    });
    expect(r.ok).toBe(false);
  });

  it.each([
    ["failure", SUMMARY_PENDING_DESCRIPTION],
    ["error", SUMMARY_PENDING_DESCRIPTION],
    ["pending", "Some projects failed"],
  ])("refuses the summary status when state=%s description=%s", (state, description) => {
    expect(checkDocsPrVercelSkip({ ...base, statuses: [{ context: SUMMARY_CONTEXT, state, description }] }).ok).toBe(false);
  });

  it("uses the latest summary status (GitHub lists newest first)", () => {
    const failedLater = { context: SUMMARY_CONTEXT, state: "failure", description: "x" };
    expect(checkDocsPrVercelSkip({ ...base, statuses: [failedLater, pendingSummary] }).ok).toBe(false);
    expect(checkDocsPrVercelSkip({ ...base, statuses: [pendingSummary, failedLater] }).ok).toBe(true);
  });

  it("treats a successful summary as fine", () => {
    const ok = { context: SUMMARY_CONTEXT, state: "success", description: "All required and affected projects deployed" };
    expect(checkDocsPrVercelSkip({ ...base, statuses: [ok] }).ok).toBe(true);
  });
});
