import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.whiskerwars.app',
  appName: 'Whisker Wars',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    backgroundColor: '#0f172a',
    // Enable hardware acceleration for smooth 3D transforms and holographic effects
    webContentsDebuggingEnabled: false,
    allowMixedContent: false
  }
};

export default config;
