/**
 * High-performance non-sensitive local storage abstraction for UI preferences
 * (e.g. active tab, draft forms, theme mode).
 */
class LocalStorage {
  private cache = new Map<string, string>();

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const localStorage = new LocalStorage();
