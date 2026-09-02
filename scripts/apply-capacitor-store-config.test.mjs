import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "scripts/apply-capacitor-store-config.mjs"), "utf8");
const mobilePackageJson = JSON.parse(readFileSync(join(process.cwd(), "apps/mobile-capacitor/package.json"), "utf8"));

// 2026-08-30: a fresh `cap add ios` scaffold's AppIcon.appiconset ships Capacitor's own generic
// default template icon -- confirmed by direct inspection, not assumption -- and nothing in this
// pipeline ever replaced it with the real AXXESS logo already sitting at resources/icon.png. A
// prior audit doc claimed plain `cap sync`/`cap build` handles this on their own; that claim was
// never verified and is false. This is a source-assertion test, not a functional one, because
// apply-capacitor-store-config.mjs runs all its logic unconditionally at import time (real
// filesystem writes, a real child-process spawn) -- there is no existing harness in this repo for
// scripts of this shape (see build-ios.test.mjs for the same pattern).
describe("apply-capacitor-store-config.mjs: iOS app icon generation", () => {
  it("declares @capacitor/assets as a devDependency -- plain cap sync/cap build never generated icons on their own", () => {
    expect(mobilePackageJson.devDependencies).toHaveProperty("@capacitor/assets");
  });

  it("guards on the Xcode project and icon source existing before attempting generation", () => {
    const fnBlock = source.slice(source.indexOf("function generateIosAppIcon"), source.indexOf("function applyAndroid"));
    expect(fnBlock).toContain("xcodeprojMarker");
    expect(fnBlock).toContain('"icon.png"');
    expect(fnBlock).toContain("fs.existsSync(xcodeprojMarker)");
    expect(fnBlock).toContain("fs.existsSync(iconSource)");
  });

  it("snapshots and restores Capacitor's own scaffolded splash screen -- this fix is scoped to the icon only", () => {
    const fnBlock = source.slice(source.indexOf("function generateIosAppIcon"), source.indexOf("function applyAndroid"));
    expect(fnBlock).toContain("splashBackupDir");
    expect(fnBlock).toContain("fs.cpSync(splashImagesetDir, splashBackupDir");
    expect(fnBlock).toContain("fs.renameSync(splashBackupDir, splashImagesetDir)");
  });

  it("invokes the package's real JS entry point directly via node, not the .bin shim (Windows EINVAL/shell-injection footgun)", () => {
    const fnBlock = source.slice(source.indexOf("function generateIosAppIcon"), source.indexOf("function applyAndroid"));
    expect(fnBlock).toContain("capacitorAssetsEntry");
    expect(fnBlock).toContain("process.execPath");
    expect(fnBlock).not.toContain('".bin"');
    expect(fnBlock).not.toContain("shell: true");
  });

  it("is actually called, after applyIos(), not just defined", () => {
    const tail = source.slice(source.lastIndexOf("applyAndroid();"));
    expect(tail).toMatch(/applyAndroid\(\);\s*applyIos\(\);\s*generateIosAppIcon\(\);/);
  });

  // 2026-09-02: a real release run (0.7.0 build 2) proved this the hard way -- generation failed
  // (sharp's darwin-arm64 binary missing from the lockfile) and the original catch block only
  // warned and returned, so the release continued and shipped Capacitor's default icon anyway,
  // which still got uploaded to Apple's Beta App Review. A failure here must be fatal.
  it("throws on generation failure instead of warning and continuing to ship a broken icon", () => {
    const fnBlock = source.slice(source.indexOf("function generateIosAppIcon"), source.indexOf("function applyAndroid"));
    const catchBlock = fnBlock.slice(fnBlock.indexOf("} catch (error) {"));
    expect(catchBlock).toContain("throw new Error(");
    expect(catchBlock).not.toMatch(/console\.warn\([^)]*\);\s*return;/);
  });
});

// 2026-09-02: the iOS release job runs on a macOS (darwin-arm64) GitHub Actions runner. Nothing in
// this repo needed a native npm binary there until this generation step started requiring sharp
// (via @capacitor/assets) -- confirmed live: a real release run failed with "Could not load the
// sharp module using the darwin-arm64 runtime" because pnpm-workspace.yaml's supportedArchitectures
// never listed darwin, so the lockfile never recorded that binary.
describe("pnpm-workspace.yaml: darwin architecture support", () => {
  it("lists darwin alongside win32/linux so sharp's darwin-arm64 binary is resolvable for the macOS iOS release runner", () => {
    const workspaceYaml = readFileSync(join(process.cwd(), "pnpm-workspace.yaml"), "utf8");
    const architecturesBlock = workspaceYaml.slice(
      workspaceYaml.indexOf("supportedArchitectures:"),
      workspaceYaml.indexOf("minimumReleaseAge:"),
    );
    expect(architecturesBlock).toMatch(/os:[\s\S]*- win32[\s\S]*- linux[\s\S]*- darwin/);
  });

  it("has sharp's darwin-arm64 optional binary actually resolved in the lockfile, not just architectures listed", () => {
    const lockfile = readFileSync(join(process.cwd(), "pnpm-lock.yaml"), "utf8");
    expect(lockfile).toContain("@img/sharp-darwin-arm64@");
  });
});
