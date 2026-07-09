import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AXXESS TRIAXIS",
  slug: "axxess-triaxis",
  version: "0.9.0",
  orientation: "portrait",
  scheme: "axxess",
  userInterfaceStyle: "automatic",
  owner: "triaxis",
  ios: {
    bundleIdentifier: "com.triaxis.axxess",
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      NSFaceIDUsageDescription: "AXXESS may use device biometrics to protect enterprise sessions when enabled by the user.",
    },
  },
  android: {
    package: "com.triaxis.axxess",
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
    eas: {
      projectId: "replace-with-eas-project-id-after-eas-init",
    },
  },
  plugins: ["expo-router", "expo-secure-store"],
};

export default config;
