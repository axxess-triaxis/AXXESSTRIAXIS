import { describe, expect, it } from "vitest";
import { buildMobileStoreLaunchSnapshot } from "./mobileStoreLaunch";

const organizationId = "00000000-0000-4000-8000-000000000032";

describe("mobile store launch snapshot", () => {
  it("builds an immediate store-launch snapshot for investor and operator review", () => {
    const snapshot = buildMobileStoreLaunchSnapshot({
      organizationId,
      organizationName: "North East Health Mission",
      generatedAt: "2026-07-18T08:00:00.000Z",
      env: {},
    });

    expect(snapshot.organizationName).toBe("North East Health Mission");
    expect(snapshot.buildReadiness.map((item) => item.platform)).toEqual(["android", "ios"]);
    expect(snapshot.storeListings.map((item) => item.platform)).toEqual(["apple", "google"]);
    expect(snapshot.reviewerAccount.status).toBe("ready");
    expect(snapshot.screenshotManifest).toHaveLength(7);
    expect(snapshot.screenshotManifest.some((item) => item.route === "/admin/mobile-release")).toBe(true);
    expect(snapshot.releaseGates.map((gate) => gate.id)).toEqual([
      "signed-artifacts",
      "store-listing",
      "reviewer-account",
      "screenshots",
      "release-health",
    ]);
  });

  it("marks signing as provider gated until required store credentials are available", () => {
    const snapshot = buildMobileStoreLaunchSnapshot({
      organizationId,
      env: {
        MOBILE_REVIEWER_EMAIL: "reviewer@triaxisventures.com",
        MOBILE_REVIEWER_PASSWORD: "configured",
      },
    });

    expect(snapshot.buildReadiness.every((item) => item.signingStatus === "provider_gated")).toBe(true);
    expect(snapshot.status).toBe("needs_metadata");
    expect(snapshot.readinessScore).toBeGreaterThanOrEqual(60);
  });

  it("moves signed artifact gates to pass when Android and iOS signing env is present", () => {
    const snapshot = buildMobileStoreLaunchSnapshot({
      organizationId,
      env: {
        ANDROID_APPLICATION_ID: "com.triaxis.axxess",
        ANDROID_KEYSTORE_BASE64: "base64",
        ANDROID_KEYSTORE_PASSWORD: "password",
        ANDROID_KEY_ALIAS: "axxess",
        ANDROID_KEY_PASSWORD: "password",
        IOS_BUNDLE_IDENTIFIER: "com.triaxis.axxess",
        APPLE_TEAM_ID: "TEAMID",
        ASC_KEY_ID: "KEYID",
        ASC_ISSUER_ID: "ISSUERID",
        ASC_PRIVATE_KEY: "PRIVATEKEY",
      },
    });

    expect(snapshot.buildReadiness.every((item) => item.signingStatus === "ready")).toBe(true);
    expect(snapshot.releaseGates.find((gate) => gate.id === "signed-artifacts")?.status).toBe("pass");
  });
});
