import { describe, expect, it } from "vitest";
import {
  REQUIRED_CHECKS,
  checkInvestorPartition,
  deploymentSha,
  envNames,
  evaluateChecks,
  isOnMain,
  planSync,
} from "./investor-sync-lib.mjs";

const landing = (sha, readyState = "READY") => ({ id: "dpl_landing", readyState, meta: { githubCommitSha: sha } });
const investor = (sha) => ({ id: "dpl_investor", readyState: "READY", meta: { githubCommitSha: sha } });
const green = (name, started_at = "2026-10-29T10:00:00Z") => ({ name, status: "completed", conclusion: "success", started_at });

describe("EOD investor sync decision logic", () => {
  it("reads the commit from Vercel deployment metadata, falling back to the sync's own marker", () => {
    expect(deploymentSha({ meta: { githubCommitSha: "abc" } })).toBe("abc");
    expect(deploymentSha({ meta: { eodSyncSourceSha: "def" } })).toBe("def");
    expect(deploymentSha({ meta: {} })).toBeNull();
  });

  it("does nothing when both domains already serve the same commit", () => {
    expect(planSync(landing("abc"), investor("abc")).action).toBe("in-sync");
  });

  it("deploys when investor serves a different commit", () => {
    const decision = planSync(landing("new"), investor("old"));
    expect(decision).toMatchObject({ action: "deploy", landingSha: "new", investorSha: "old" });
  });

  it("fails rather than guessing when landing has no commit metadata or is not READY", () => {
    expect(planSync({ id: "x", readyState: "READY", meta: {} }, investor("old")).action).toBe("fail");
    expect(planSync(landing("new", "ERROR"), investor("old")).action).toBe("fail");
  });

  it("only accepts commits that are on main", () => {
    expect(isOnMain("identical")).toBe(true);
    expect(isOnMain("behind")).toBe(true);
    expect(isOnMain("ahead")).toBe(false);
    expect(isOnMain("diverged")).toBe(false);
  });

  it("requires every named check to have succeeded, with no bypass for missing or failed ones", () => {
    expect(evaluateChecks(REQUIRED_CHECKS.map((name) => green(name))).ok).toBe(true);

    const missing = evaluateChecks(REQUIRED_CHECKS.slice(1).map((name) => green(name)));
    expect(missing).toEqual({ ok: false, problems: ["Build, Lint, Type Check: missing"] });

    const failed = evaluateChecks([...REQUIRED_CHECKS.slice(1).map((name) => green(name)), { ...green(REQUIRED_CHECKS[0]), conclusion: "failure" }]);
    expect(failed.problems).toEqual(["Build, Lint, Type Check: failure"]);

    const running = evaluateChecks([...REQUIRED_CHECKS.slice(1).map((name) => green(name)), { name: REQUIRED_CHECKS[0], status: "in_progress", conclusion: null }]);
    expect(running.problems).toEqual(["Build, Lint, Type Check: in_progress"]);
  });

  it("judges a re-run by its latest attempt", () => {
    const others = REQUIRED_CHECKS.slice(1).map((name) => green(name));
    const failedThenPassed = [
      { ...green(REQUIRED_CHECKS[0], "2026-10-29T09:00:00Z"), conclusion: "failure" },
      green(REQUIRED_CHECKS[0], "2026-10-29T11:00:00Z"),
    ];
    expect(evaluateChecks([...others, ...failedThenPassed]).ok).toBe(true);
    const passedThenFailed = [
      green(REQUIRED_CHECKS[0], "2026-10-29T09:00:00Z"),
      { ...green(REQUIRED_CHECKS[0], "2026-10-29T11:00:00Z"), conclusion: "failure" },
    ];
    expect(evaluateChecks([...others, ...passedThenFailed]).ok).toBe(false);
  });
});

describe("investor demo/live partition guard", () => {
  const demoEnv = [
    "# Created by Vercel CLI",
    'NEXT_PUBLIC_AXXESS_DEMO_MODE="true"',
    'NEXT_PUBLIC_APP_URL="https://investor.triaxisventures.com"',
    'NEXT_PUBLIC_ANALYTICS_DISABLED="true"',
    'SENTRY_AUTH_TOKEN="redacted"',
    'VERCEL_OIDC_TOKEN="redacted"',
  ].join("\n");

  it("passes the investor env as it is configured today", () => {
    expect(checkInvestorPartition(demoEnv)).toEqual({ ok: true, problems: [] });
  });

  it("fails if demo mode is off or missing", () => {
    expect(checkInvestorPartition(demoEnv.replace('MODE="true"', 'MODE="false"')).ok).toBe(false);
    expect(checkInvestorPartition('NEXT_PUBLIC_APP_URL="x"').problems).toContain('NEXT_PUBLIC_AXXESS_DEMO_MODE is not "true"');
  });

  it("fails if any live credential name has been copied onto the investor project", () => {
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "POSTGRES_URL", "OPENAI_API_KEY", "GOOGLE_CLIENT_SECRET", "AXXESS_TOKEN_VAULT_KEY"]) {
      const result = checkInvestorPartition(`${demoEnv}\n${name}="x"`);
      expect(result.ok, name).toBe(false);
      expect(result.problems.join(" "), name).toContain(name);
    }
  });

  it("reads names without needing values", () => {
    expect(envNames('A="1"\nexport B=2\n# C=3\n\nD=')).toEqual(["A", "B", "D"]);
  });
});
