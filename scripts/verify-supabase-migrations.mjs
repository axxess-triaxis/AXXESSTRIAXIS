import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const supabaseDir = join(root, "supabase");
const migrationsDir = join(supabaseDir, "migrations");
const configPath = join(supabaseDir, "config.toml");
const supabaseGitignorePath = join(supabaseDir, ".gitignore");
const packageJsonPath = join(root, "package.json");

function readText(path) {
  return readFileSync(path, "utf8");
}

function fail(message) {
  console.error(`[supabase:verify] ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const config = readText(configPath);
const supabaseGitignore = readText(supabaseGitignorePath);
const packageJson = JSON.parse(readText(packageJsonPath));
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

assert(packageJson.devDependencies?.supabase === "2.109.1", "Supabase CLI must be pinned as devDependency supabase@2.109.1.");
assert(config.includes('project_id = "axxess-triaxis"'), "supabase/config.toml project_id must be axxess-triaxis.");
assert(config.includes("[db.migrations]"), "supabase/config.toml must include db.migrations configuration.");
assert(config.includes("./seeds/001_local_enterprise_seed.sql"), "supabase/config.toml must reference the existing AXXESS seed files.");
assert(supabaseGitignore.includes(".branches"), "supabase/.gitignore must ignore local Supabase branch state.");
assert(supabaseGitignore.includes(".temp"), "supabase/.gitignore must ignore local Supabase temp/link state.");
assert(migrations.length > 0, "No Supabase migration files found.");

const migrationNamePattern = /^\d{12,14}_[a-z0-9_]+\.sql$/;
const seenVersions = new Set();
const createdTables = new Set();
const rlsTables = new Set();
const findings = [];
const warnings = [];

for (const file of migrations) {
  const version = file.slice(0, 14);
  assert(migrationNamePattern.test(file), `Migration filename does not follow Supabase timestamp convention: ${file}`);
  assert(!seenVersions.has(version), `Duplicate migration timestamp detected: ${version}`);
  seenVersions.add(version);

  const fullPath = join(migrationsDir, file);
  assert(statSync(fullPath).isFile(), `Migration path is not a file: ${file}`);
  const sql = readText(fullPath);
  const lowerSql = sql.toLowerCase();

  const isStrictMigration = version >= "202607150003";
  if (lowerSql.includes("auth.role()")) {
    const message = `${file}: uses deprecated auth.role() in RLS policy.`;
    (isStrictMigration ? findings : warnings).push(message);
  }
  if (lowerSql.includes("using (true)")) {
    const message = `${file}: contains permissive using (true) RLS predicate.`;
    (isStrictMigration ? findings : warnings).push(message);
  }
  if (/next_public_[a-z0-9_]*service_role/i.test(sql)) findings.push(`${file}: appears to expose service role material through NEXT_PUBLIC.`);

  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-zA-Z0-9_]+)/gi)) {
    createdTables.add(match[1]);
  }
  for (const match of sql.matchAll(/alter\s+table\s+public\.([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security/gi)) {
    rlsTables.add(match[1]);
  }
  if (lowerSql.includes("alter table public.%i enable row level security")) {
    for (const match of sql.matchAll(/'([a-zA-Z0-9_]+)'/g)) {
      if (createdTables.has(match[1])) rlsTables.add(match[1]);
    }
  }
}

for (const table of createdTables) {
  if (!rlsTables.has(table)) findings.push(`public.${table}: table is created but no migration enables row level security.`);
}

const sprint25 = readText(join(migrationsDir, "202607150003_sprint25_token_vault_gmail_rag_gates.sql"));
assert(sprint25.includes("revoke all on public.oauth_token_vault from anon, authenticated"), "Sprint 25 token vault must revoke anon/authenticated access.");
assert(!/grant\s+select[^;]+oauth_token_vault[^;]+authenticated/i.test(sprint25), "Token vault must not grant authenticated select access.");

for (const finding of findings) fail(finding);

if (!process.exitCode) {
  console.log(JSON.stringify({
    status: "passed",
    migrations: migrations.length,
    createdTables: createdTables.size,
    rlsProtectedTables: rlsTables.size,
    supabaseCli: packageJson.devDependencies.supabase,
    warnings,
  }, null, 2));
}
