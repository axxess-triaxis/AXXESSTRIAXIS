import type { ExpoConfig } from "expo/config";

const iosBundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ?? "com.triaxis.axxess";
const androidApplicationId = process.env.EXPO_PUBLIC_ANDROID_APPLICATION_ID ?? "com.triaxis.axxess";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? process.env.EAS_PROJECT_ID;
const appVersion = process.env.EXPO_PUBLIC_AXXESS_APP_VERSION ?? process.env.NEXT_PUBLIC_AXXESS_APP_VERSION ?? "0.9.0";
const iosBuildNumber = process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ?? process.env.IOS_BUILD_NUMBER ?? "1";
const androidVersionCodeRaw = process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? process.env.ANDROID_VERSION_CODE ?? "1";
const androidVersionCode = Number.parseInt(androidVersionCodeRaw, 10);

const config: ExpoConfig = {
  name: "AXXESS TRIAXIS",
  slug: "axxess-triaxis",
  version: appVersion,
  orientation: "portrait",
  scheme: "axxess",
  userInterfaceStyle: "automatic",
  owner: "axxess-triaxis",
  ios: {
    bundleIdentifier: iosBundleIdentifier,
    buildNumber: iosBuildNumber,
    supportsTablet: true,
    infoPlist: {
      NSFaceIDUsageDescription: "AXXESS may use device biometrics to protect enterprise sessions when enabled by the user.",
    },
  },
  android: {
    package: androidApplicationId,
    versionCode: Number.isNaN(androidVersionCode) ? 1 : Math.max(1, androidVersionCode),
    permissions: [],
    adaptiveIcon: {
      backgroundColor: "#8B1E2D",
    },
  },
  extra: {
    appUrl: process.env.EXPO_PUBLIC_APP_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    analyticsProvider: process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER ?? "noop",
    iosBundleIdentifier,
    androidApplicationId,
    eas: easProjectId ? { projectId: easProjectId } : undefined,
  },
  plugins: ["expo-router", "expo-secure-store"],
};

export default config;
