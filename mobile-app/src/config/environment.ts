import { NativeModules } from 'react-native';

export type Environment = 'development' | 'staging' | 'production';

// Detect or override environment
const currentEnv: Environment = __DEV__ ? 'development' : 'production';

/**
 * Dynamically resolves the development host machine IP address.
 * Works seamlessly across:
 * - Physical mobile devices running Expo Go on the local Wi-Fi
 * - Android Emulators
 * - iOS Simulators
 */
const getDevApiHost = (): string => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `${match[1]}:4000`;
      }
    }
  } catch {
    // Ignore and fallback
  }

  // Active host machine Wi-Fi IP and backend port 4000
  return '10.113.181.209:4000';
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
};
