import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "scripts/apply-capacitor-store-config.mjs"), "utf8");

// 2026-08-27: signingStyle changed from "automatic" to "manual" alongside build-ios.mjs's own
// archive-step change (CODE_SIGN_STYLE=Manual + PROVISIONING_PROFILE_SPECIFIER) -- the two must
// stay in lockstep, since mixing automatic and manual signing across the archive and export steps
// of the same release is exactly the class of ambiguity that caused the live CI failures this
// pass fixed. This is a source-assertion test, not a functional one, because `applyIos()` runs at
// module import time and writes real files -- there is no existing test harness in this repo for
// scripts of this shape (see build-ios.test.mjs's identical reasoning).
describe("apply-capacitor-store-config.mjs: ExportOptions.plist signing", () => {
  it("uses manual signing with an explicit named provisioning profile, not automatic", () => {
    const exportOptionsBlock = source.slice(source.indexOf("exportOptionsPlist,"), source.indexOf("applyAndroid();"));
    expect(exportOptionsBlock).toContain("<string>manual</string>");
    expect(exportOptionsBlock).not.toContain("<string>automatic</string>");
    expect(exportOptionsBlock).toContain("provisioningProfileSpecifier");
    expect(exportOptionsBlock).toContain("<key>provisioningProfiles</key>");
  });

  it("defaults the profile name to the same one build-ios.mjs's archive step references", () => {
    expect(source).toContain('"AXXESS TRIaxis"');
    expect(source).toContain("IOS_PROVISIONING_PROFILE_SPECIFIER");
  });
});
