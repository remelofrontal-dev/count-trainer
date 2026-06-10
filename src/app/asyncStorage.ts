import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KVStorage } from './storage';

/** Device adapter — AsyncStorage already satisfies the KVStorage shape; typed explicitly. */
export const asyncStorageAdapter: KVStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
