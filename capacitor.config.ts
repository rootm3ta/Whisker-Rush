import type { CapacitorConfig } from '@capacitor/cli';

/** Native shells for iOS and Android. Replace appId with your own reverse-domain id before release. */
const config: CapacitorConfig = {
  appId: 'com.whiskerrush.game',
  appName: 'Whisker Rush',
  webDir: 'dist',
  backgroundColor: '#f4ead6',
  ios: {
    contentInset: 'never',
    backgroundColor: '#f4ead6',
  },
  android: {
    backgroundColor: '#f4ead6',
  },
};

export default config;
