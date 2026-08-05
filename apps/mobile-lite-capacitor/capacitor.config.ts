// XL-1 (2026-08-05): AXXESS Lite Mobile's own Capacitor config -- a SAFE SCAFFOLD, not a built
// native project. See docs/readiness/AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md for the
// full rationale, the native-project-generation steps this scaffold deliberately does not run,
// and why the identifiers below are NOT final.
//
// NOT FINAL -- founder confirmation required before any of these identifiers are used in a real
// store submission: appId, appName, and the default CAPACITOR_SERVER_URL fallback below are
// placeholders proposed for review, per this sprint's own non-negotiable ("Do not use these final
// identifiers without noting founder confirmation required").
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  server: {
    url: string;
    cleartext: boolean;
    allowNavigation: string[];
  };
  plugins: Record<string, Record<string, unknown>>;
};

// Deliberately points at the /lite route path on the SAME hosted origin X0 Mobile uses by
// default, not a full app.axxess.dev root -- this is what makes this a genuinely different mobile
// product target rather than a copy of apps/mobile-capacitor. Set CAPACITOR_SERVER_URL explicitly
// once the X Lite Web Vercel project (docs/readiness/AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md)
// has a real domain, rather than relying on this placeholder fallback.
const appUrl = process.env.CAPACITOR_SERVER_URL || `${process.env.NEXT_PUBLIC_APP_URL || "https://app.axxess.dev"}/lite`;
const allowedHosts = (process.env.CAPACITOR_ALLOWED_HOSTS || "app.axxess.dev,localhost,127.0.0.1").split(",").map((host) => host.trim()).filter(Boolean);
// NOT FINAL -- proposed only, per this file's header note.
const nativeAppId = process.env.CAPACITOR_LITE_APP_ID || "com.triaxisventures.axxesslite";

const config: CapacitorConfig = {
  appId: nativeAppId,
  appName: "AXXESS Lite",
  webDir: "../../dist",
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: allowedHosts,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#8B1E2D",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#8B1E2D",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
    },
    App: {},
    Browser: {},
    Device: {},
    Filesystem: {},
    Network: {},
    Preferences: {},
    Share: {},
    Haptics: {},
  },
};

export default config;
