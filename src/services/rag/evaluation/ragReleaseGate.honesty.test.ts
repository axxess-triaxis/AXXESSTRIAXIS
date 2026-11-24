// @vitest-environment node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// 2026-11-24: until this date scripts/rag-release-gate.mjs scored observations it built from its own
// fixtures, so it printed "passed" and exited 0 with every retrieval module deleted. These tests run
// the script where retrieval cannot work; a gate that measures retrieval must fail in all of them.

const SCRIPT = path.resolve(process.cwd(), "scripts/rag-release-gate.mjs");
const directories: string[] = [];

function environmentWithoutBackend() {
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (/SUPABASE|EMBED_FUNCTION|RAG_GATE/.test(name)) delete env[name];
  return env;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("RAG release gate script", () => {
  it("does not pass when no retrieval code exists at all", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "rag-gate-"));
    directories.push(directory);
    const copy = path.join(directory, "rag-release-gate.mjs");
    copyFileSync(SCRIPT, copy);

    const run = spawnSync(process.execPath, [copy], { cwd: directory, env: environmentWithoutBackend(), encoding: "utf8" });

    expect(run.status).not.toBe(0);
    expect(run.stdout).not.toContain("\"status\": \"passed\"");
  });

  it("does not pass when there is no database to retrieve from", () => {
    const run = spawnSync(process.execPath, [SCRIPT], { cwd: process.cwd(), env: environmentWithoutBackend(), encoding: "utf8" });

    expect(run.status).not.toBe(0);
    expect(run.stdout).not.toContain("\"status\": \"passed\"");
  });
});
