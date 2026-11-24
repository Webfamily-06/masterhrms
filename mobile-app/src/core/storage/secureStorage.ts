import * as SecureStore from 'expo-secure-store';
import * as Keychain from './keychainAdapter';

export interface SecureStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<boolean>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

const fallbackMemory = new Map<string, string>();

function sanitizeSecureStoreKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Enterprise Secure Storage implementation using Expo SecureStore (iOS Keychain / Android EncryptedSharedPreferences)
 * with fallback to react-native-keychain and in-memory test map.
 * Works natively in both Expo Go and custom development / standalone builds.
 */
class KeychainSecureStorage implements SecureStorageInterface {
  async getItem(key: string): Promise<string | null> {
    const safeKey = sanitizeSecureStoreKey(key);
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const val = await SecureStore.getItemAsync(safeKey);
        if (val !== null && val !== undefined) {
          return val;
        }
      }
    } catch {
      // Fallback to Keychain / memory
    }

    try {
      const result = await Keychain.getGenericPassword({ service: key });
      if (result && typeof result === 'object' && 'password' in result) {
        return result.password;
      }
    } catch {
      // Fallback to memory
    }

    return fallbackMemory.get(safeKey) ?? null;
  }

  async setItem(key: string, value: string): Promise<boolean> {
    const safeKey = sanitizeSecureStoreKey(key);
    fallbackMemory.set(safeKey, value);

    try {
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(safeKey, value);
        return true;
      }
    } catch {
      // Fallback to Keychain
    }

    try {
      await Keychain.setGenericPassword(key, value, {
        service: key,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      return true;
    } catch {
      return true;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    const safeKey = sanitizeSecureStoreKey(key);
    fallbackMemory.delete(safeKey);

    try {
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(safeKey);
      }
    } catch {
      // Ignore
    }

    try {
      await Keychain.resetGenericPassword({ service: key });
    } catch {
      // Ignore
    }

    return true;
  }

  async clear(): Promise<boolean> {
    // Only clear active session tokens; preserve biometric enrollment & theme preferences across sign-outs
    const sessionKeys = [
      'masterhrms_refresh_token',
      'masterhrms_session_id',
      'masterhrms_tenant_id',
      'masterhrms_tenant_slug',
    ];
    try {
      await Promise.all(sessionKeys.map((k) => this.removeItem(k)));
      return true;
    } catch {
      return false;
    }
  }
}

export const secureStorage = new KeychainSecureStorage();
