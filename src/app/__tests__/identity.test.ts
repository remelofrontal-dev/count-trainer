import { describe, expect, test } from 'bun:test';
import {
  type TesterProfile,
  httpRegistry,
  isValidName,
  loadProfile,
  localOnlyRegistry,
  normalizeName,
  registryFromEnv,
  saveProfile,
} from '../identity';
import { InMemoryStorage } from '../storage';

describe('name normalization + validation', () => {
  test('trims, collapses whitespace, caps at 40 chars', () => {
    expect(normalizeName('  Remelo  ')).toBe('Remelo');
    expect(normalizeName('John   Doe')).toBe('John Doe');
    expect(normalizeName('x'.repeat(60))).toHaveLength(40);
  });

  test('empty / whitespace-only names are invalid (gate stays meaningful)', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('A')).toBe(true);
  });
});

describe('profile persistence', () => {
  test('round-trips through storage; corrupt/empty → null', async () => {
    const storage = new InMemoryStorage();
    expect(await loadProfile(storage)).toBeNull();
    const profile: TesterProfile = { name: 'Remelo', joinedAtIso: '2026-06-11T00:00:00.000Z' };
    await saveProfile(storage, profile);
    expect(await loadProfile(storage)).toEqual(profile);

    await storage.setItem('count-trainer/tester/v1', '{bad json');
    expect(await loadProfile(storage)).toBeNull();
    await storage.setItem('count-trainer/tester/v1', '{"name":""}');
    expect(await loadProfile(storage)).toBeNull();
  });
});

describe('tester registry', () => {
  test('local-only registry never throws and is a no-op', async () => {
    await expect(
      localOnlyRegistry.register({ name: 'X', joinedAtIso: 'now' }),
    ).resolves.toBeUndefined();
  });

  test('registryFromEnv: local-only when unset, http when a Formspree endpoint is given', () => {
    expect(registryFromEnv({})).toBe(localOnlyRegistry);
    expect(registryFromEnv({ EXPO_PUBLIC_TESTER_ENDPOINT: '' })).toBe(localOnlyRegistry);
    expect(registryFromEnv({ EXPO_PUBLIC_TESTER_ENDPOINT: 'https://formspree.io/f/abc' })).not.toBe(
      localOnlyRegistry,
    );
  });

  test('httpRegistry POSTs the profile and swallows network failure', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const realFetch = globalThis.fetch;
    // success path
    globalThis.fetch = (async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true } as Response;
    }) as unknown as typeof fetch;
    await httpRegistry('https://collector.example/r').register({ name: 'Remelo', joinedAtIso: 'iso' });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toEqual({ name: 'Remelo', joinedAt: 'iso' }); // Formspree-friendly field names

    // failure path must not throw (offline-first)
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(
      httpRegistry('https://collector.example/r').register({ name: 'Y', joinedAtIso: 'iso' }),
    ).resolves.toBeUndefined();
    globalThis.fetch = realFetch;
  });
});
