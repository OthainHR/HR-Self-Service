import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ess.othain',
  appName: 'Othain ESS',
  webDir: 'build',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;