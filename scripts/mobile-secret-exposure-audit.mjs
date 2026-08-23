import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// MN-5 (2026-08-23): a real, runnable check for the exact secret-name list the sprint prompt
// names -- scans X0 Mobile's own source tree (the surface that ships to the Capacitor WebView)
// for any literal reference to a server-only secret, or any raw process.env read at all (mobile
// screens should never read env directly -- every real value they need comes through a repository
// call or an API route, per src/features/mobile's own architecture). Mirrors
// scripts/mobile-boundary-guard.mjs's structure (same comment-stripping, same file-collection
// approach) so it reads like a sibling check, not a new pattern.
//
// Scope note: this is a source-pattern scan of src/features/mobile, not a built-bundle scan. A
// prior read-only audit (this sprint) already traced every one of the secrets below to a
// server-only file (an /api/*/route.ts handler or a src/services/* module only ever imported by
// one) with zero client-reachable hits anywhere in src/ -- see
// docs/readiness/ANDROID_BETA_0_9_SECURITY_HARDENING_BASELINE_2026_08_23.md, section 4.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = join(repoRoot, "src", "features", "mobile");

const forbiddenSecretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "AXXESS_TOKEN_VAULT_KEY",
  "CLIENT_SECRET",
  "SMTP_PASSWORD",
  "SMTP_USER",
  "STRIPE_SECRET_KEY",
  "PADDLE_API_KEY",
  "VERCEL_TOKEN",
  "GITHUB_TOKEN",
];

function stripComments(source) {
  return source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function collectSourceFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry) && !/\.(test|spec)\.(tsx?|jsx?)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const failures = [];
const files = collectSourceFiles(mobileRoot);

if (files.length < 8) {
  failures.push(`Mobile secret exposure scan saw only ${files.length} files under src/features/mobile; expected a non-trivial surface.`);
}

for (const filePath of files) {
  const rel = relative(repoRoot, filePath).replaceAll("\\", "/");
  const raw = readFileSync(filePath, "utf8");
  const source = stripComments(raw);

  for (const secretName of forbiddenSecretNames) {
    if (source.includes(secretName)) {
      failures.push(`${rel}: references forbidden secret name "${secretName}" -- X0 Mobile source must never name a server-only secret, even to read process.env.${secretName}.`);
    }
  }

  const envReads = source.match(/process\.env\.[A-Z0-9_]+/g);
  if (envReads) {
    for (const read of new Set(envReads)) {
      failures.push(`${rel}: reads "${read}" directly -- X0 Mobile source must never read process.env itself; real values come through a repository call or an API route.`);
    }
  }
}

if (failures.length > 0) {
  console.error("Mobile secret exposure audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Mobile secret exposure audit passed across ${files.length} files -- no forbidden secret references, no direct process.env reads.`);
