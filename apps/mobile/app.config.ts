import type { ExpoConfig } from "expo/config";

const iosBundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ?? "com.triaxis.axxess";
const androidApplicationId = process.env.EXPO_PUBLIC_ANDROID_APPLICATION_ID ?? "com.triaxis.axxess";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: "AXXESS TRIAXIS",
  slug: "axxess-triaxis",
  version: "0.9.0",
  orientation: "portrait",
  scheme: "axxess",
  userInterfaceStyle: "automatic",
  owner: "axxess-triaxis",
  ios: {
    bundleIdentifier: iosBundleIdentifier,
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      NSFaceIDUsageDescription: "AXXESS may use device biometrics to protect enterprise sessions when enabled by the user.",
    },
  },
  android: {
    package: androidApplicationId,
    versionCode: 1,
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
