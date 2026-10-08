/** Key/value persistence. Web uses localStorage; Capacitor Preferences later. */
export interface IStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export class LocalStorageAdapter implements IStorage {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* Private mode or quota: progress stays in memory for this session. */
    }
  }
}

export class MemoryStorage implements IStorage {
  private readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}
