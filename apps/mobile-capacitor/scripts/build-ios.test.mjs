import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "apps/mobile-capacitor/scripts/build-ios.mjs"), "utf8");

// 2026-08-27: live CI failure on a brand-new Apple Developer account -- xcodebuild archive with
// CODE_SIGN_STYLE=Automatic but no explicit CODE_SIGN_IDENTITY resolved to requesting an "iOS App
// Development" profile instead of an App Store Distribution one, failing with "Your team has no
// devices from which to generate a provisioning profile." (Development profiles require registered
// device UDIDs; Distribution profiles do not.) This is a source-assertion test, not a functional
// one, because build-ios.mjs is a top-level side-effecting script (calls process.exit based on
// process.platform/env at import time) that only runs meaningfully on a macOS runner with a real
// Xcode toolchain -- there is no existing test harness in this repo for scripts of this shape.
describe("build-ios.mjs: iOS archive signing", () => {
  it("explicitly requests Apple Distribution signing for the store-release archive step", () => {
    const archiveBlock = source.slice(source.indexOf("const archiveArgs"), source.indexOf("const archiveResult"));
    expect(archiveBlock).toContain("CODE_SIGN_STYLE=Automatic");
    expect(archiveBlock).toContain("CODE_SIGN_IDENTITY=Apple Distribution");
    // Must come from the signed (hasSigning) branch, before the "archive" action string, not the
    // unsigned Debug/simulator branch below it (which has no code-signing settings at all).
    const signedBranch = archiveBlock.slice(0, archiveBlock.indexOf('"archive",'));
    expect(signedBranch).toContain("CODE_SIGN_IDENTITY=Apple Distribution");
  });

  it("does not apply any code-signing identity override to the unsigned simulator build", () => {
    const unsignedBranch = source.slice(source.indexOf("CODE_SIGNING_ALLOWED=NO") - 200, source.indexOf("CODE_SIGNING_ALLOWED=NO") + 50);
    expect(unsignedBranch).not.toContain("CODE_SIGN_IDENTITY");
  });
});
