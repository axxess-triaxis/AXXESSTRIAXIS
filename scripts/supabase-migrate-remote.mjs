#!/usr/bin/env node
// GitHub-independent Supabase migration apply: pushes local migrations directly to the linked
// remote Supabase project via the Supabase CLI. No GitHub Actions step required -- see
// docs/SUPABASE_CLI.md's "Linked Project Workflow" section.
//
// Safety model: always runs a dry run first and prints it. Only actually applies migrations
// (`supabase db push --linked`, no --dry-run) when called with --yes, so this can never be
// accidentally destructive when run without arguments.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes("--yes");

function run(command) {
  console.log(`[supabase-migrate-remote] $ ${command}`);
  execSync(command, { stdio: "inherit", cwd: root });
}

function ensureLinked() {
  const projectRefFile = path.join(root, "supabase", ".temp", "project-ref");
  if (!fs.existsSync(projectRefFile)) {
    throw new Error(
      "This checkout is not linked to a remote Supabase project yet. Run " +
      "`pnpm run supabase:link -- --project-ref <your-project-ref>` once (needs " +
      "SUPABASE_ACCESS_TOKEN or an interactive login) before using this script. " +
      "See docs/SUPABASE_CLI.md.",
    );
  }
  const projectRef = fs.readFileSync(projectRefFile, "utf8").trim();
  console.log(`[supabase-migrate-remote] Linked to remote project ref: ${projectRef}`);
}

try {
  ensureLinked();
  console.log("[supabase-migrate-remote] Running dry run (always, regardless of --yes)...");
  run("supabase db push --linked --dry-run");

  if (!apply) {
    console.log(
      "[supabase-migrate-remote] Dry run complete. Re-run with --yes to actually apply these " +
      "migrations to the remote project.",
    );
    process.exit(0);
  }

  console.log("[supabase-migrate-remote] --yes passed: applying migrations to the remote project.");
  run("supabase db push --linked");
  console.log("[supabase-migrate-remote] Migrations applied.");
} catch (error) {
  console.error(`[supabase-migrate-remote] Failed: ${error.message}`);
  process.exit(1);
}
