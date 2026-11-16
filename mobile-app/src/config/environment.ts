export type Environment = 'development' | 'staging' | 'production';

// Detect or override environment
const currentEnv: Environment = __DEV__ ? 'development' : 'production';

// Local development machine Wi-Fi IP and backend port 4000
const DEV_API_HOST = '192.168.1.176:4000';

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
