import type { EntityId } from "../../domain";

export type MobileStorePlatform = "android" | "ios";
export type MobileStoreReadinessStatus = "ready" | "needs_metadata" | "provider_gated" | "blocked";
export type MobileReviewerStatus = "ready" | "missing" | "needs_rotation" | "provider_gated";
export type MobileReleaseHealthStatus = "healthy" | "watch" | "blocked";
export type MobileRolloutStatus = "not_started" | "internal_testing" | "testflight" | "staged" | "halted" | "completed";
export type MobileReleaseGateStatus = "pass" | "watch" | "blocked";

export type MobileBuildReadiness = {
  platform: MobileStorePlatform;
  appIdentifier: string;
  latestVersion: string;
  buildNumber: string;
  artifact: string;
  signingStatus: MobileStoreReadinessStatus;
  uploadStatus: MobileStoreReadinessStatus;
  status: MobileStoreReadinessStatus;
  storeTrack: string;
  evidence: string[];
};

export type MobileStoreListing = {
  platform: "apple" | "google";
  title: string;
  subtitle: string;
  description: string;
  supportUrl: string;
  privacyUrl: string;
  screenshotStatus: MobileStoreReadinessStatus;
  privacyStatus: MobileStoreReadinessStatus;
  reviewerNotesStatus: MobileStoreReadinessStatus;
  status: MobileStoreReadinessStatus;
  evidence: string[];
};

export type MobileReviewerAccount = {
  email: string;
  role: string;
  status: MobileReviewerStatus;
  lastVerifiedAt: string;
  passwordRotationDueAt: string;
  checklist: Array<{
    id: string;
    label: string;
    status: MobileReleaseGateStatus;
  }>;
};

export type MobileScreenshotManifestItem = {
  id: string;
  label: string;
  route: string;
  platforms: MobileStorePlatform[];
  deviceClass: "phone" | "tablet";
  status: MobileStoreReadinessStatus;
  evidencePath: string;
};

export type MobileReleaseHealth = {
  status: MobileReleaseHealthStatus;
  crashFreeSessions: number;
  webviewErrorRate: number;
  apiP95Ms: number;
  failedLoginAttempts: number;
  monitors: Array<{
    id: string;
    label: string;
    status: MobileReleaseHealthStatus;
    detail: string;
  }>;
};

export type MobileRolloutStep = {
  id: string;
  platform: MobileStorePlatform;
  track: string;
  status: MobileRolloutStatus;
  rolloutPercent: number;
  countries: string[];
  ownerRole: string;
  evidence: string[];
};

export type MobileReleaseGate = {
  id: string;
  label: string;
  status: MobileReleaseGateStatus;
  route: string;
  evidence: string[];
};

export type MobileStoreLaunchSnapshot = {
  organizationId: EntityId;
  organizationName: string;
  generatedAt: string;
  status: MobileStoreReadinessStatus;
  readinessScore: number;
  appVersion: string;
  buildReadiness: MobileBuildReadiness[];
  storeListings: MobileStoreListing[];
  reviewerAccount: MobileReviewerAccount;
  screenshotManifest: MobileScreenshotManifestItem[];
  releaseHealth: MobileReleaseHealth;
  rolloutPlan: MobileRolloutStep[];
  releaseGates: MobileReleaseGate[];
  nextActions: string[];
};

type RuntimeEnv = Record<string, string | undefined>;

export type BuildMobileStoreLaunchInput = {
  organizationId: EntityId;
  organizationName?: string;
  generatedAt?: string;
  env?: RuntimeEnv;
  crashFreeSessions?: number;
  webviewErrorRate?: number;
  apiP95Ms?: number;
  failedLoginAttempts?: number;
};

const defaultGeneratedAt = "2026-07-18T00:00:00.000Z";
const defaultAppVersion = "0.6.0";
const defaultAppleReviewEmail = "reviewer.mobile@axxess.demo";

function envValue(env: RuntimeEnv, key: string, fallback = "") {
  return (env[key] ?? fallback).trim();
}

function statusScore(status: MobileStoreReadinessStatus | MobileReleaseGateStatus | MobileReviewerStatus | MobileReleaseHealthStatus) {
  if (status === "ready" || status === "pass" || status === "healthy") return 100;
  if (status === "watch" || status === "needs_rotation") return 70;
  if (status === "needs_metadata" || status === "provider_gated") return 50;
  return 20;
}

function plusDays(value: string, days: number) {
  return new Date(new Date(value).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function allPresent(env: RuntimeEnv, keys: string[]) {
  return keys.every((key) => Boolean(envValue(env, key)));
}

function buildBuildReadiness(input: BuildMobileStoreLaunchInput, appVersion: string): MobileBuildReadiness[] {
  const env = input.env ?? process.env;
  const androidSigningReady = allPresent(env, ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]);
  const androidUploadReady = envValue(env, "ANDROID_UPLOAD_TO_PLAY") === "true" && Boolean(envValue(env, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"));
  const iosSigningReady = allPresent(env, ["IOS_BUNDLE_IDENTIFIER", "APPLE_TEAM_ID", "ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY"]);
  const iosUploadReady = envValue(env, "IOS_UPLOAD_TO_TESTFLIGHT") === "true" && iosSigningReady;

  return [
    {
      platform: "android",
      appIdentifier: envValue(env, "ANDROID_APPLICATION_ID", "com.triaxis.axxess"),
      latestVersion: appVersion,
      buildNumber: envValue(env, "ANDROID_VERSION_CODE", envValue(env, "EXPO_PUBLIC_ANDROID_VERSION_CODE", "1")),
      artifact: "apps/mobile-capacitor/android/app/build/outputs/bundle/release/app-release.aab",
      signingStatus: androidSigningReady ? "ready" : "provider_gated",
      uploadStatus: androidUploadReady ? "ready" : "provider_gated",
      status: androidSigningReady ? "ready" : "provider_gated",
      storeTrack: androidUploadReady ? "Google Play internal testing" : "Manual Play Console upload",
      evidence: ["Capacitor Mobile Release", "release-checklist-android.json", "release-manifest.json"],
    },
    {
      platform: "ios",
      appIdentifier: envValue(env, "IOS_BUNDLE_IDENTIFIER", "com.triaxis.axxess"),
      latestVersion: appVersion,
      buildNumber: envValue(env, "IOS_BUILD_NUMBER", envValue(env, "EXPO_PUBLIC_IOS_BUILD_NUMBER", "1")),
      artifact: "apps/mobile-capacitor/ios/App/build/export/App.ipa",
      signingStatus: iosSigningReady ? "ready" : "provider_gated",
      uploadStatus: iosUploadReady ? "ready" : "provider_gated",
      status: iosSigningReady ? "ready" : "provider_gated",
      storeTrack: iosUploadReady ? "TestFlight" : "Manual App Store Connect upload",
      evidence: ["Capacitor Mobile Release", "release-checklist-ios.json", "ExportOptions.plist"],
    },
  ];
}

function buildStoreListings(): MobileStoreListing[] {
  const description = "AXXESS by Triaxis is a governance-native AI operating platform for regulated institutions, combining human review, audit evidence, knowledge workflows, approvals and enterprise release controls.";

  return [
    {
      platform: "apple",
      title: "AXXESS by Triaxis",
      subtitle: "Governed AI for institutions",
      description,
      supportUrl: "https://www.triaxisventures.com/support",
      privacyUrl: "https://www.triaxisventures.com/privacy",
      screenshotStatus: "ready",
      privacyStatus: "needs_metadata",
      reviewerNotesStatus: "ready",
      status: "needs_metadata",
      evidence: ["docs/store/apple-review-notes.md", "docs/store/privacy-labels.md", "docs/store/screenshot-manifest.json"],
    },
    {
      platform: "google",
      title: "AXXESS by Triaxis",
      subtitle: "Governed AI operating platform",
      description,
      supportUrl: "https://www.triaxisventures.com/support",
      privacyUrl: "https://www.triaxisventures.com/privacy",
      screenshotStatus: "ready",
      privacyStatus: "needs_metadata",
      reviewerNotesStatus: "ready",
      status: "needs_metadata",
      evidence: ["docs/store/google-play-notes.md", "docs/store/data-safety.md", "docs/store/screenshot-manifest.json"],
    },
  ];
}

function buildReviewerAccount(input: BuildMobileStoreLaunchInput, generatedAt: string): MobileReviewerAccount {
  const env = input.env ?? process.env;
  const email = envValue(env, "MOBILE_REVIEWER_EMAIL", defaultAppleReviewEmail);
  const hasPassword = Boolean(envValue(env, "MOBILE_REVIEWER_PASSWORD"));
  const status: MobileReviewerStatus = hasPassword || email.endsWith("@axxess.demo") ? "ready" : "missing";

  return {
    email,
    role: "Organization Admin",
    status,
    lastVerifiedAt: generatedAt,
    passwordRotationDueAt: plusDays(generatedAt, 30),
    checklist: [
      { id: "login", label: "Reviewer can log in without provider OAuth", status: status === "ready" ? "pass" : "blocked" },
      { id: "demo-data", label: "Reviewer sees populated investor/pilot data", status: "pass" },
      { id: "delete-account", label: "Account/privacy settings route is visible", status: "pass" },
      { id: "support", label: "Support and privacy URLs are present", status: "watch" },
    ],
  };
}

function buildScreenshotManifest(): MobileScreenshotManifestItem[] {
  return [
    { id: "login", label: "Reviewer login", route: "/auth/login", platforms: ["android", "ios"], deviceClass: "phone", status: "ready", evidencePath: "artifacts/store-screenshots/login.png" },
    { id: "dashboard", label: "Executive dashboard", route: "/dashboard", platforms: ["android", "ios"], deviceClass: "phone", status: "ready", evidencePath: "artifacts/store-screenshots/dashboard.png" },
    { id: "ai-workspace", label: "AI Workspace and Review Inbox", route: "/ai-workspace/review-inbox", platforms: ["android", "ios"], deviceClass: "phone", status: "ready", evidencePath: "artifacts/store-screenshots/ai-review-inbox.png" },
    { id: "knowledge", label: "Knowledge Hub", route: "/knowledge", platforms: ["android", "ios"], deviceClass: "phone", status: "ready", evidencePath: "artifacts/store-screenshots/knowledge.png" },
    { id: "approvals", label: "Approvals and governance", route: "/approvals", platforms: ["android", "ios"], deviceClass: "phone", status: "ready", evidencePath: "artifacts/store-screenshots/approvals.png" },
    { id: "workflow-records", label: "Workflow records", route: "/workflow-records", platforms: ["android", "ios"], deviceClass: "tablet", status: "ready", evidencePath: "artifacts/store-screenshots/workflow-records.png" },
    { id: "mobile-release", label: "Mobile release console", route: "/admin/mobile-release", platforms: ["android", "ios"], deviceClass: "tablet", status: "ready", evidencePath: "artifacts/store-screenshots/mobile-release-console.png" },
  ];
}

function buildReleaseHealth(input: BuildMobileStoreLaunchInput): MobileReleaseHealth {
  const crashFreeSessions = input.crashFreeSessions ?? 99.7;
  const webviewErrorRate = input.webviewErrorRate ?? 0.3;
  const apiP95Ms = input.apiP95Ms ?? 480;
  const failedLoginAttempts = input.failedLoginAttempts ?? 2;
  const status: MobileReleaseHealthStatus = crashFreeSessions >= 99.5 && webviewErrorRate < 1 && apiP95Ms < 800 ? "healthy" : crashFreeSessions >= 98.5 ? "watch" : "blocked";

  return {
    status,
    crashFreeSessions,
    webviewErrorRate,
    apiP95Ms,
    failedLoginAttempts,
    monitors: [
      { id: "crash-free", label: "Crash-free sessions", status: crashFreeSessions >= 99.5 ? "healthy" : "watch", detail: `${crashFreeSessions.toFixed(1)}% crash-free session baseline` },
      { id: "webview-errors", label: "Mobile webview errors", status: webviewErrorRate < 1 ? "healthy" : "watch", detail: `${webviewErrorRate.toFixed(1)}% webview error rate` },
      { id: "api-latency", label: "API p95 latency", status: apiP95Ms < 800 ? "healthy" : "watch", detail: `${apiP95Ms}ms p95 API latency` },
      { id: "auth-failures", label: "Reviewer login failures", status: failedLoginAttempts <= 3 ? "healthy" : "watch", detail: `${failedLoginAttempts} failed login attempts in current window` },
    ],
  };
}

function buildRolloutPlan(): MobileRolloutStep[] {
  return [
    { id: "android-internal", platform: "android", track: "Internal testing", status: "internal_testing", rolloutPercent: 100, countries: ["India", "United States"], ownerRole: "Release Manager", evidence: ["Google Play internal testing artifact", "release-manifest.json"] },
    { id: "ios-testflight-internal", platform: "ios", track: "TestFlight internal", status: "testflight", rolloutPercent: 100, countries: ["India", "United States"], ownerRole: "Release Manager", evidence: ["TestFlight beta information", "App Store Connect build"] },
    { id: "production-staged", platform: "android", track: "Production staged rollout", status: "not_started", rolloutPercent: 5, countries: ["India"], ownerRole: "Founder approval", evidence: ["crash health monitor", "support inbox owner", "rollback plan"] },
  ];
}

function buildReleaseGates(input: {
  buildReadiness: MobileBuildReadiness[];
  storeListings: MobileStoreListing[];
  reviewerAccount: MobileReviewerAccount;
  screenshotManifest: MobileScreenshotManifestItem[];
  releaseHealth: MobileReleaseHealth;
}): MobileReleaseGate[] {
  const buildReady = input.buildReadiness.every((item) => item.signingStatus === "ready");
  const listingReady = input.storeListings.every((item) => item.screenshotStatus === "ready" && item.reviewerNotesStatus === "ready");
  const reviewerReady = input.reviewerAccount.status === "ready";
  const screenshotsReady = input.screenshotManifest.every((item) => item.status === "ready");
  const healthReady = input.releaseHealth.status === "healthy";

  return [
    { id: "signed-artifacts", label: "Signed Android AAB and iOS IPA path", status: buildReady ? "pass" : "watch", route: "/admin/mobile-release", evidence: input.buildReadiness.flatMap((item) => item.evidence) },
    { id: "store-listing", label: "Store listing and review notes", status: listingReady ? "pass" : "watch", route: "/admin/mobile-release", evidence: input.storeListings.flatMap((item) => item.evidence) },
    { id: "reviewer-account", label: "Reviewer account automation", status: reviewerReady ? "pass" : "blocked", route: "/admin/mobile-release", evidence: input.reviewerAccount.checklist.map((item) => item.label) },
    { id: "screenshots", label: "Automated screenshot manifest", status: screenshotsReady ? "pass" : "blocked", route: "/admin/mobile-release", evidence: input.screenshotManifest.map((item) => item.evidencePath) },
    { id: "release-health", label: "Crash and release health", status: healthReady ? "pass" : "watch", route: "/admin/mobile-release", evidence: input.releaseHealth.monitors.map((item) => item.detail) },
  ];
}

function snapshotStatus(gates: MobileReleaseGate[]): MobileStoreReadinessStatus {
  if (gates.some((gate) => gate.status === "blocked")) return "blocked";
  if (gates.every((gate) => gate.status === "pass")) return "ready";
  return "needs_metadata";
}

function snapshotScore(gates: MobileReleaseGate[], buildReadiness: MobileBuildReadiness[], health: MobileReleaseHealth) {
  const gateScore = gates.reduce((sum, gate) => sum + statusScore(gate.status), 0) / gates.length;
  const buildScore = buildReadiness.reduce((sum, item) => sum + statusScore(item.status), 0) / buildReadiness.length;
  return Math.round((gateScore * 0.45) + (buildScore * 0.3) + (statusScore(health.status) * 0.25));
}

export function buildMobileStoreLaunchSnapshot(input: BuildMobileStoreLaunchInput): MobileStoreLaunchSnapshot {
  const generatedAt = input.generatedAt ?? defaultGeneratedAt;
  const env = input.env ?? process.env;
  const appVersion = envValue(env, "RELEASE_APP_VERSION", envValue(env, "NEXT_PUBLIC_AXXESS_APP_VERSION", defaultAppVersion));
  const buildReadiness = buildBuildReadiness({ ...input, env }, appVersion);
  const storeListings = buildStoreListings();
  const reviewerAccount = buildReviewerAccount({ ...input, env }, generatedAt);
  const screenshotManifest = buildScreenshotManifest();
  const releaseHealth = buildReleaseHealth(input);
  const rolloutPlan = buildRolloutPlan();
  const releaseGates = buildReleaseGates({ buildReadiness, storeListings, reviewerAccount, screenshotManifest, releaseHealth });
  const status = snapshotStatus(releaseGates);
  const readinessScore = snapshotScore(releaseGates, buildReadiness, releaseHealth);

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName ?? "North East Health Mission",
    generatedAt,
    status,
    readinessScore,
    appVersion,
    buildReadiness,
    storeListings,
    reviewerAccount,
    screenshotManifest,
    releaseHealth,
    rolloutPlan,
    releaseGates,
    nextActions: [
      "Complete App Store privacy labels and Google Play Data Safety declarations before external review.",
      "Enable TestFlight or Play upload flags only after signing secrets are confirmed in production-mobile.",
      "Attach generated screenshots and reviewer notes to the store submission pack.",
      "Monitor crash-free sessions and webview error rate during internal testing before staged rollout.",
    ],
  };
}
