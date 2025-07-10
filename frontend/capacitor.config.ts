import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ess.othain.com',
  appName: 'Othain ESS',
  webDir: 'build',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;