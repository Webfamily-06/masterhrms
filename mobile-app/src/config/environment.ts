import { NativeModules, Platform } from 'react-native';

export type Environment = 'development' | 'staging' | 'production';

// Detect or override environment
const currentEnv: Environment = __DEV__ ? 'development' : 'production';

/**
 * Dynamically resolves the development host machine IP address.
 * Works seamlessly across:
 * - Physical mobile devices running Expo Go on the local Wi-Fi
 * - Android Emulators (10.0.2.2)
 * - iOS Simulators (localhost)
 */
const getDevApiHost = (): string => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) {
        const host = match[1];
        if (host === 'localhost' || host === '127.0.0.1') {
          return Platform.OS === 'android' ? '10.0.2.2:4000' : 'localhost:4000';
        }
        return `${host}:4000`;
      }
    }
  } catch {
    // Ignore and fallback
  }

  // Active host machine Wi-Fi IP and backend port 4000
  return '192.168.1.176:4000';
};

const DEV_API_HOST = getDevApiHost();

const API_BASE_URLS: Record<Environment, string> = {
  // Use host machine Wi-Fi IP so physical devices on Wi-Fi (Expo Go) and emulators can reach the backend
  development: `http://${DEV_API_HOST}`,
  staging: 'https://staging-api.masterhrms.com',
  production: 'https://api.masterhrms.com',
};

export const Config = {
  ENV: currentEnv,
  API_BASE_URL: API_BASE_URLS[currentEnv],
  API_TIMEOUT_MS: 30000,
  APP_NAME: 'MasterHRMS',
  APP_VERSION: '1.0.0',
  BUNDLE_ID: 'com.masterhrms.app',
  // Session & Security Settings
  TOKEN_REFRESH_THRESHOLD_SECONDS: 120, // 2 minutes before JWT expiration
  INACTIVITY_TIMEOUT_MINUTES: 15,
  // Pusher Realtime & Push Broadcasts
  PUSHER: {
    APP_ID: 'your_pusher_app_id',
    KEY: 'your_pusher_key',
    CLUSTER: 'ap2',
    ENABLED: true,
  },
  // Native Mobile Firebase Configuration (Android & iOS Only)
  FIREBASE: {
    PROJECT_ID: 'masterhrms-ab50b',
    STORAGE_BUCKET: 'masterhrms-ab50b.firebasestorage.app',
    MESSAGING_SENDER_ID: '102052771234',
    ANDROID: {
      PACKAGE_NAME: 'com.masterhrms.app',
      APP_ID: '1:102052771234:android:6fa54a57eca2c314f62efb',
      API_KEY: 'AIzaSyDM4Dz9IiRjv2H_R_Xc_O86QtN8snnPHWY',
    },
    IOS: {
      BUNDLE_ID: 'com.masterhrms.app',
      APP_ID: '1:102052771234:ios:fdd34a4dd2e31a01f62efb',
      API_KEY: 'AIzaSyBhWHyTvq6CsafXNzISGnlSStPypdifzKg',
      GCM_SENDER_ID: '102052771234',
    },
  },
};
