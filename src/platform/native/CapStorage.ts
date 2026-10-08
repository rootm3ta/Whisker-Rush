import { Preferences } from '@capacitor/preferences';
import type { IStorage } from '../Storage';

/**
 * Capacitor Preferences (UserDefaults / SharedPreferences) behind the sync IStorage:
 * values are preloaded at boot and written through asynchronously.
 */
export class CapStorage implements IStorage {
  private readonly cache = new Map<string, string>();

  async preload(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      const { value } = await Preferences.get({ key });
      if (value !== null) this.cache.set(key, value);
    }
  }

  get(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.cache.set(key, value);
    void Preferences.set({ key, value });
  }
}
