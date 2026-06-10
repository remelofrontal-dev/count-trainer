import { useStore } from 'zustand';
import { asyncStorageAdapter } from '../app/asyncStorage';
import { type AppState, createAppStore, defaultDeps } from '../app/store';

/** Singleton store wired to device storage. Tests build their own via createAppStore. */
export const appStore = createAppStore(defaultDeps(asyncStorageAdapter));

export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
