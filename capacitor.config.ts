import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.mimySocial',
  appName: 'Mimy',
  webDir: 'dist',
  server: {
    // Allow cleartext traffic for local development
    allowNavigation: ['mimytest.vercel.app'],
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '519194261404-c5j54jrinkd3r1b3acnop4sbdk9jituq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true
    }
  },
  ios: {
    allowsBackForwardNavigationGestures: true,
    contentInset: 'never',
    scrollEnabled: false
  }
};

export default config;
