import { useStore } from 'zustand';
import { asyncStorageAdapter } from '../app/asyncStorage';
import { registryFromEnv } from '../app/identity';
import { type AppState, createAppStore, defaultDeps } from '../app/store';

/** Singleton store wired to device storage + the configured tester roster sink. */
export const appStore = createAppStore({
  ...defaultDeps(asyncStorageAdapter),
  registry: registryFromEnv(),
});

export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
