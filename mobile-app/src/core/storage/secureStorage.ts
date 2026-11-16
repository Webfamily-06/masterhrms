import * as Keychain from './keychainAdapter';

export interface SecureStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<boolean>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

/**
 * Enterprise Secure Storage implementation using iOS Keychain and Android Keystore.
 * Never stores tokens or sensitive credentials in plain AsyncStorage or SQLite.
 */
class KeychainSecureStorage implements SecureStorageInterface {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await Keychain.getGenericPassword({ service: key });
      if (result && typeof result === 'object' && 'password' in result) {
        return result.password;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: key,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      return true;
    } catch {
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: key });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<boolean> {
    // Service-scoped resets for known keys
    const knownKeys = [
      'masterhrms_refresh_token',
      'masterhrms_session_id',
      'masterhrms_tenant_id',
      'masterhrms_tenant_slug',
      'masterhrms_biometric_enabled',
    ];
    try {
      await Promise.all(knownKeys.map((k) => this.removeItem(k)));
      return true;
    } catch {
      return false;
    }
  }
}

export const secureStorage = new KeychainSecureStorage();
