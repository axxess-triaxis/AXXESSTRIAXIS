import { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.axxess.dev';
const allowedHosts = (process.env.CAPACITOR_ALLOWED_HOSTS || 'app.axxess.dev,localhost,127.0.0.1').split(',').map((host) => host.trim()).filter(Boolean);

const config: CapacitorConfig = {
  appId: process.env.ANDROID_APPLICATION_ID || 'com.triaxis.axxess',
  appName: 'AXXESS TRIaxis',
  webDir: '../../dist',
  bundledWebRuntime: false,
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: allowedHosts,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#8B1E2D',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#8B1E2D',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
    App: {},
    Browser: {},
    Device: {},
    Filesystem: {},
    Network: {},
    Preferences: {},
    Share: {},
    Haptics: {},
    SplashScreen: {},
    StatusBar: {},
  },
};

export default config;
