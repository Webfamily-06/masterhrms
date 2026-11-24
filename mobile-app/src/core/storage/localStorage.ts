import * as SecureStore from 'expo-secure-store';

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * High-performance local storage abstraction for UI preferences
 * (e.g. theme mode, active tab, draft forms) with persistent SecureStore backing.
 */
class LocalStorage {
  private cache = new Map<string, string>();

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  async getItemAsync(key: string): Promise<string | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const persisted = await SecureStore.getItemAsync(sanitizeKey(key));
        if (persisted !== null && persisted !== undefined) {
          this.cache.set(key, persisted);
          return persisted;
        }
      }
    } catch {
      // Ignore in test environments
    }
    return null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    try {
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        void SecureStore.setItemAsync(sanitizeKey(key), value).catch(() => {});
      }
    } catch {
      // Ignore in test environments
    }
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    try {
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        void SecureStore.deleteItemAsync(sanitizeKey(key)).catch(() => {});
      }
    } catch {
      // Ignore in test environments
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const localStorage = new LocalStorage();
