import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "apps/mobile-capacitor/scripts/build-ios.mjs"), "utf8");

// 2026-08-27, two live CI iterations on a brand-new Apple Developer account:
// (1) CODE_SIGN_STYLE=Automatic with no explicit identity resolved to requesting an "iOS App
//     Development" profile instead of App Store Distribution, failing with "Your team has no
//     devices from which to generate a provisioning profile" (Development profiles require
//     registered device UDIDs; Distribution profiles do not).
// (2) CODE_SIGN_STYLE=Automatic + CODE_SIGN_IDENTITY=Apple Distribution (the first attempted fix)
//     failed differently: "App has conflicting provisioning settings... automatically signed for
//     development, but a conflicting code signing identity Apple Distribution has been manually
//     specified" -- Automatic signing on this account is Development-anchored in a way a bare
//     identity override can't redirect.
// Landed on: CODE_SIGN_STYLE=Manual with an explicit named App Store distribution profile
// (PROVISIONING_PROFILE_SPECIFIER), matching Apple's own suggested fix for error (2). This is a
// source-assertion test, not a functional one, because build-ios.mjs is a top-level
// side-effecting script (calls process.exit based on process.platform/env at import time) that
// only runs meaningfully on a macOS runner with a real Xcode toolchain -- there is no existing
// test harness in this repo for scripts of this shape.
describe("build-ios.mjs: iOS archive signing", () => {
  it("uses manual signing with an explicit distribution identity and named profile for the store-release archive step", () => {
    const archiveBlock = source.slice(source.indexOf("const archiveArgs"), source.indexOf("const archiveResult"));
    expect(archiveBlock).toContain("CODE_SIGN_STYLE=Manual");
    expect(archiveBlock).toContain("CODE_SIGN_IDENTITY=Apple Distribution");
    expect(archiveBlock).toContain("PROVISIONING_PROFILE_SPECIFIER=");
    expect(archiveBlock).not.toContain("CODE_SIGN_STYLE=Automatic");
    // Must come from the signed (hasSigning) branch, before the "archive" action string, not the
    // unsigned Debug/simulator branch below it (which has no code-signing settings at all).
    const signedBranch = archiveBlock.slice(0, archiveBlock.indexOf('"archive",'));
    expect(signedBranch).toContain("CODE_SIGN_IDENTITY=Apple Distribution");
    expect(signedBranch).toContain("PROVISIONING_PROFILE_SPECIFIER=");
  });

  it("defaults the provisioning profile specifier and allows an env var override", () => {
    expect(source).toContain('process.env.IOS_PROVISIONING_PROFILE_SPECIFIER || "AXXESS TRIaxis"');
  });

  it("does not apply any code-signing identity override to the unsigned simulator build", () => {
    const unsignedBranch = source.slice(source.indexOf("CODE_SIGNING_ALLOWED=NO") - 200, source.indexOf("CODE_SIGNING_ALLOWED=NO") + 50);
    expect(unsignedBranch).not.toContain("CODE_SIGN_IDENTITY");
  });
});
