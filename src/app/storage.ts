/**
 * Storage abstraction — offline-first (brief §4.3).
 * The app talks to this interface; adapters provide AsyncStorage (device)
 * and InMemory (tests). The AsyncStorage adapter lives in asyncStorage.ts so
 * the test graph never imports react-native.
 */

export interface KVStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class InMemoryStorage implements KVStorage {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}
