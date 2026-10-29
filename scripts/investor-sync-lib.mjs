// Pure decision logic for the EOD investor sync (.github/workflows/eod-investor-sync.yml). Kept free
// of network and filesystem access so every gate the workflow relies on is unit-tested directly in
// scripts/investor-sync-lib.test.mjs. The I/O wrapper is scripts/investor-eod-sync.mjs.

export const LANDING_HOST = "landing.triaxisventures.com";
export const INVESTOR_HOST = "investor.triaxisventures.com";

// Check runs that must have succeeded on the exact commit before investor may be moved to it.
// "Deploy landing..." proves the commit actually reached landing through the normal merge pipeline,
// not a manual CLI deploy from an unreviewed branch.
export const REQUIRED_CHECKS = [
  "Build, Lint, Type Check",
  "Secret Scan",
  "pnpm Critical Vulnerability Gate",
  "Deploy landing.triaxisventures.com",
];

// Investor is the demo/live partition boundary: its Vercel env must force demo mode and must never
// hold a credential that could reach live-tenant data or a paid provider. Names only -- values are
// never read or printed by this check.
const FORBIDDEN_ENV_PATTERNS = [
  /^SUPABASE_/,
  /^NEXT_PUBLIC_SUPABASE_/,
  /^POSTGRES_/,
  /^DATABASE_URL$/,
  /SERVICE_ROLE/,
  /_SECRET$/,
  /_SECRET_KEY$/,
  /_CLIENT_SECRET$/,
  /_API_KEY$/,
  /^AXXESS_TOKEN_VAULT_KEY$/,
  /^EMBED_FUNCTION_SECRET$/,
];

/** The commit a Vercel deployment was built from, or null if it carries no commit metadata. */
export function deploymentSha(deployment) {
  const meta = deployment?.meta ?? {};
  return meta.githubCommitSha || meta.eodSyncSourceSha || null;
}

/** Decide whether investor needs to move, from the two deployments currently behind each domain. */
export function planSync(landing, investor) {
  const landingSha = deploymentSha(landing);
  const investorSha = deploymentSha(investor);
  if (!landingSha) {
    return { action: "fail", reason: `Landing deployment ${landing?.id ?? "?"} has no commit SHA in its metadata.`, landingSha, investorSha };
  }
  if (landing.readyState !== "READY") {
    return { action: "fail", reason: `Landing deployment ${landing.id} is ${landing.readyState}, not READY.`, landingSha, investorSha };
  }
  if (landingSha === investorSha) {
    return { action: "in-sync", reason: `Both domains serve ${landingSha}.`, landingSha, investorSha };
  }
  return { action: "deploy", reason: `Investor serves ${investorSha ?? "an unknown commit"}, landing serves ${landingSha}.`, landingSha, investorSha };
}

/**
 * Evaluate GitHub check runs for one commit against REQUIRED_CHECKS. Uses the most recent run per
 * name, so a later successful re-run counts and a later failed re-run blocks.
 */
export function evaluateChecks(checkRuns, required = REQUIRED_CHECKS) {
  const latest = new Map();
  for (const run of checkRuns) {
    const prior = latest.get(run.name);
    if (!prior || new Date(run.started_at ?? 0) > new Date(prior.started_at ?? 0)) latest.set(run.name, run);
  }
  const problems = [];
  for (const name of required) {
    const run = latest.get(name);
    if (!run) problems.push(`${name}: missing`);
    else if (run.status !== "completed") problems.push(`${name}: ${run.status}`);
    else if (run.conclusion !== "success") problems.push(`${name}: ${run.conclusion}`);
  }
  return { ok: problems.length === 0, problems };
}

/** A commit is eligible only if it is on main: GitHub compare main...sha is "identical" or "behind". */
export function isOnMain(compareStatus) {
  return compareStatus === "identical" || compareStatus === "behind";
}

/** Parse the variable names (never values) out of a dotenv file such as .vercel/.env.production.local. */
export function envNames(dotenvText) {
  const names = [];
  for (const line of dotenvText.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

/** Read one value from a dotenv file, used only for the non-secret demo-mode flag. */
export function envValue(dotenvText, name) {
  for (const line of dotenvText.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match && match[1] === name) return match[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return undefined;
}

/** The partition guard: demo mode forced on, and no live credential names present. */
export function checkInvestorPartition(dotenvText) {
  const problems = [];
  if (envValue(dotenvText, "NEXT_PUBLIC_AXXESS_DEMO_MODE") !== "true") {
    problems.push("NEXT_PUBLIC_AXXESS_DEMO_MODE is not \"true\"");
  }
  const forbidden = envNames(dotenvText).filter((name) => FORBIDDEN_ENV_PATTERNS.some((pattern) => pattern.test(name)));
  if (forbidden.length > 0) problems.push(`live credential names present: ${forbidden.join(", ")}`);
  return { ok: problems.length === 0, problems };
}
