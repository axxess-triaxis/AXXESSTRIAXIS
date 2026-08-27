import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "apps/mobile-capacitor/scripts/build-ios.mjs"), "utf8");

// 2026-08-27: three live-CI iterations chasing a signing-identity/manual-profile fix for "Your
// team has no devices from which to generate a provisioning profile" all failed or made things
// worse -- the actual root cause was never the signing style or identity string, it was that the
// one distribution certificate in the account had its private key generated locally (via OpenSSL,
// outside any Apple system), so no CI-reachable certificate ever existed for manual signing to
// use. Reverted to plain Automatic signing -- -allowProvisioningUpdates already proved (via 2
// auto-created Development certificates visible in the Developer Portal) that it can create a
// certificate entirely within CI's own ephemeral keychain when nothing forces it toward a
// certificate CI can't use. The real remaining blocker is a registered device (see the original
// error), not the signing style. This is a source-assertion test, not a functional one, because
// build-ios.mjs is a top-level side-effecting script (calls process.exit based on
// process.platform/env at import time) that only runs meaningfully on a macOS runner with a real
// Xcode toolchain -- there is no existing test harness in this repo for scripts of this shape.
describe("build-ios.mjs: iOS archive signing", () => {
  it("uses plain automatic signing for the store-release archive step, no forced identity or profile", () => {
    const archiveBlock = source.slice(source.indexOf("const archiveArgs"), source.indexOf("const archiveResult"));
    expect(archiveBlock).toContain("CODE_SIGN_STYLE=Automatic");
    expect(archiveBlock).not.toContain("CODE_SIGN_IDENTITY");
    expect(archiveBlock).not.toContain("PROVISIONING_PROFILE_SPECIFIER");
  });

  it("does not apply any code-signing override to the unsigned simulator build", () => {
    const unsignedBranch = source.slice(source.indexOf("CODE_SIGNING_ALLOWED=NO") - 200, source.indexOf("CODE_SIGNING_ALLOWED=NO") + 50);
    expect(unsignedBranch).not.toContain("CODE_SIGN_IDENTITY");
    expect(unsignedBranch).not.toContain("PROVISIONING_PROFILE_SPECIFIER");
  });
});
