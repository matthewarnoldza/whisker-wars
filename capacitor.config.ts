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
    backgroundColor: '#0f172a'
  }
};

export default config;
