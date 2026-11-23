import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';

export const PRODUCTION_API_URL = 'https://www.masterhrms.com';
export const DEFAULT_BACKEND_PORT = 4000;
export const DEFAULT_DEV_LAN_IP = '10.98.19.209'; // Verified active developer machine LAN IPv4

/**
 * Normalizes an API origin string:
 * - Trims whitespace
 * - Strips trailing slashes
 * - Strips accidental trailing '/api' or '/api/v1' segments to prevent duplicate path segments
 */
export function normalizeApiOrigin(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned.endsWith('/api/v1')) {
    cleaned = cleaned.slice(0, -7);
  } else if (cleaned.endsWith('/api')) {
    cleaned = cleaned.slice(0, -4);
  }
  return cleaned.replace(/\/+$/, '');
}

/**
 * Determines active application environment:
 * 1. Explicit EXPO_PUBLIC_APP_ENV ('development' | 'staging' | 'production')
 * 2. If __DEV__ is true, always defaults to 'development'
 * 3. Release builds default to 'production' unless explicitly configured otherwise
 */
export function resolveEnvironment(): Environment {
  const explicit = (process.env['EXPO_PUBLIC_APP_ENV'] || '').toLowerCase().trim();
  if (explicit === 'production') return 'production';
  if (explicit === 'staging') return 'staging';
  if (explicit === 'development') return 'development';

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'development';
  }
  return 'production';
}

// Runtime dynamic override (e.g. customized via Settings or Diagnostics on physical device)
let runtimeApiBaseUrlOverride: string | null = null;

export function setRuntimeApiBaseUrl(customUrl: string | null): void {
  if (customUrl) {
    runtimeApiBaseUrlOverride = normalizeApiOrigin(customUrl);
  } else {
    runtimeApiBaseUrlOverride = null;
  }
}

/**
 * Resolves the Development API origin:
 * - Explicit EXPO_PUBLIC_API_BASE_URL (developer's configured origin)
 * - Explicit EXPO_PUBLIC_DEV_LAN_IP (developer's configured LAN IP with port 4000)
 * - Android Emulator: http://10.0.2.2:4000
 * - iOS Simulator: http://localhost:4000
 * - Physical device: Defaults to development computer's LAN IPv4 (http://192.168.1.176:4000)
 *
 * Rules strictly followed:
 * - Never derive API host from Metro's script URL.
 * - Never assume Metro host is backend host.
 * - Never use old hardcoded IP 10.215.212.209.
 */
export function resolveDevelopmentApiUrl(): string {
  // 1. Explicit API base URL from environment (ignoring stale historical dead IPs)
  const envUrl = process.env['EXPO_PUBLIC_API_BASE_URL'];
  if (envUrl && envUrl.trim()) {
    const normalized = normalizeApiOrigin(envUrl);
    if (!normalized.includes('10.215.212.209') && !normalized.includes('192.168.1.176')) {
      return normalized;
    }
  }

  // 2. Explicit LAN IP from environment (ignoring stale dead IPs)
  const envLanIp = process.env['EXPO_PUBLIC_DEV_LAN_IP'];
  if (envLanIp && envLanIp.trim()) {
    const cleanLan = envLanIp.trim();
    if (cleanLan !== '10.215.212.209' && cleanLan !== '192.168.1.176') {
      return `http://${cleanLan}:${DEFAULT_BACKEND_PORT}`;
    }
  }

  // 3. Dynamic Packager Host IP discovery (detects computer's actual active LAN IP across Wi-Fi networks)
  try {
    const hostUri = Constants?.expoConfig?.hostUri || (Constants?.manifest2 as any)?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:${DEFAULT_BACKEND_PORT}`;
      }
    }
  } catch {
    // Ignore fallback errors
  }

  // 4. Simulators and Emulators
  const isPhysical = Device && typeof Device.isDevice === 'boolean' ? Device.isDevice : false;
  if (!isPhysical) {
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${DEFAULT_BACKEND_PORT}`;
    }
    return `http://localhost:${DEFAULT_BACKEND_PORT}`;
  }

  // 5. Physical Android / iOS devices on local Wi-Fi
  return `http://${DEFAULT_DEV_LAN_IP}:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Backwards-compatible helper returning the dev API host and port (e.g. '192.168.1.176:4000').
 */
export function getDevApiHost(): string {
  const url = resolveDevelopmentApiUrl();
  return url.replace(/^https?:\/\//, '');
}

/**
 * Resolves the Staging API origin.
 * Requires an explicit configuration value; does not invent a fictional domain.
 */
export function resolveStagingApiUrl(): string {
  const stagingUrl =
    process.env['EXPO_PUBLIC_STAGING_API_BASE_URL'] || process.env['EXPO_PUBLIC_API_BASE_URL'];
  if (!stagingUrl || !stagingUrl.trim()) {
    console.warn(
      '[Environment] Staging environment requires explicit EXPO_PUBLIC_STAGING_API_BASE_URL. Falling back to development.'
    );
    return resolveDevelopmentApiUrl();
  }
  return normalizeApiOrigin(stagingUrl);
}

/**
 * Resolves the authoritative API base URL for the active environment.
 */
export function getResolvedApiBaseUrl(): string {
  if (runtimeApiBaseUrlOverride) {
    return runtimeApiBaseUrlOverride;
  }

  const env = resolveEnvironment();
  switch (env) {
    case 'production':
      return PRODUCTION_API_URL;
    case 'staging':
      return resolveStagingApiUrl();
    case 'development':
    default:
      return resolveDevelopmentApiUrl();
  }
}

export const Config = {
  get ENV(): Environment {
    return resolveEnvironment();
  },
  get API_BASE_URL(): string {
    return getResolvedApiBaseUrl();
  },
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
