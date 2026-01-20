import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.mimySocial',
  appName: 'Mimy',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '519194261404-c5j54jrinkd3r1b3acnop4sbdk9jituq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
