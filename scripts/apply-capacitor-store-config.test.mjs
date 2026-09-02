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
});
