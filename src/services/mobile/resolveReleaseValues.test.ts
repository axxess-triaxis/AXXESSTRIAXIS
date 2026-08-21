import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "resolve-release-values.mjs");

describe("resolve-release-values workflow dispatch parsing", () => {
  it("normalizes shorthand manual release inputs used by release-checklist", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-release-values-"));
    const githubEnvPath = path.join(tmpDir, "github.env");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "workflow_dispatch",
        INPUT_APP_VERSION: "0.80",
        INPUT_IOS_BUILD_NUMBER: "0.80",
        INPUT_ANDROID_VERSION_CODE: "0.80",
        GITHUB_ENV: githubEnvPath,
      },
    });

    expect(result.status).toBe(0);

    const githubEnv = fs.readFileSync(githubEnvPath, "utf8");
    expect(githubEnv).toContain("RELEASE_APP_VERSION=0.80.0");
    expect(githubEnv).toContain("IOS_BUILD_NUMBER=80");
    expect(githubEnv).toContain("ANDROID_VERSION_CODE=80");
  });

  it("keeps integer build numbers and fully qualified app versions unchanged", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-release-values-"));
    const githubEnvPath = path.join(tmpDir, "github.env");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "workflow_dispatch",
        INPUT_APP_VERSION: "1.2.3",
        INPUT_IOS_BUILD_NUMBER: "42",
        INPUT_ANDROID_VERSION_CODE: "42",
        GITHUB_ENV: githubEnvPath,
      },
    });

    expect(result.status).toBe(0);

    const githubEnv = fs.readFileSync(githubEnvPath, "utf8");
    expect(githubEnv).toContain("RELEASE_APP_VERSION=1.2.3");
    expect(githubEnv).toContain("IOS_BUILD_NUMBER=42");
    expect(githubEnv).toContain("ANDROID_VERSION_CODE=42");
  });

  it("fails on non-numeric build numbers", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-release-values-"));
    const githubEnvPath = path.join(tmpDir, "github.env");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "workflow_dispatch",
        INPUT_APP_VERSION: "0.80",
        INPUT_IOS_BUILD_NUMBER: "abc",
        INPUT_ANDROID_VERSION_CODE: "0.80",
        GITHUB_ENV: githubEnvPath,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("invalid iOS build number 'abc'");
  });

  it("fails iOS dotted build shorthand when minor segment resolves to zero", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-release-values-"));
    const githubEnvPath = path.join(tmpDir, "github.env");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "workflow_dispatch",
        INPUT_APP_VERSION: "1.0",
        INPUT_IOS_BUILD_NUMBER: "1.0",
        INPUT_ANDROID_VERSION_CODE: "5",
        GITHUB_ENV: githubEnvPath,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("invalid iOS build number '1.0'");
  });

  it("fails Android dotted build shorthand when minor segment resolves to zero", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-release-values-"));
    const githubEnvPath = path.join(tmpDir, "github.env");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "workflow_dispatch",
        INPUT_APP_VERSION: "1.0",
        INPUT_IOS_BUILD_NUMBER: "5",
        INPUT_ANDROID_VERSION_CODE: "2.0",
        GITHUB_ENV: githubEnvPath,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("invalid Android version code '2.0'");
  });
});
