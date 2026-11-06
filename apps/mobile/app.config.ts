import type { ExpoConfig } from 'expo/config';

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'OkBite',
  slug: 'okbite',
  scheme: 'okbite',
  version: '1.0.0',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'fingerprint' },
  ...(projectId ? { updates: { url: `https://u.expo.dev/${projectId}` } } : {}),
  icon: './assets/brand/app-icon.png',
  ios: { bundleIdentifier: 'md.okbite.app', supportsTablet: false },
  android: {
    package: 'md.okbite.app',
    adaptiveIcon: {
      foregroundImage: './assets/brand/android-foreground.png',
      backgroundImage: './assets/brand/android-background.png',
      backgroundColor: '#F7F4EC',
    },
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    [
      'expo-camera',
      {
        cameraPermission: 'OkBite folosește camera ca să fotografieze produsul și eticheta lui.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'OkBite deschide galeria ca să alegi o poză a produsului sau a etichetei.',
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/brand/app-icon.png', imageWidth: 180,
        backgroundColor: '#F7F4EC',
        dark: { image: './assets/brand/app-icon.png', backgroundColor: '#F7F4EC' },
      },
    ],
    'expo-sqlite',
    'expo-secure-store',
  ],
  web: { bundler: 'metro', output: 'single', favicon: './assets/brand/app-icon.png' },
  extra: {
    ...(projectId ? { eas: { projectId } } : {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;
