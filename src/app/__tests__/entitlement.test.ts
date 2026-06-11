import { describe, expect, test } from 'bun:test';
import { FREE, loadEntitlement, saveEntitlement } from '../entitlement';
import { InMemoryStorage } from '../storage';

describe('entitlement', () => {
  test('defaults to free; round-trips; corrupt → free', async () => {
    const storage = new InMemoryStorage();
    expect(await loadEntitlement(storage)).toEqual(FREE);

    await saveEntitlement(storage, { isPremium: true });
    expect(await loadEntitlement(storage)).toEqual({ isPremium: true });

    await storage.setItem('count-trainer/entitlement/v1', 'not json');
    expect(await loadEntitlement(storage)).toEqual(FREE);

    // any non-true value reads as free
    await storage.setItem('count-trainer/entitlement/v1', '{"isPremium":"yes"}');
    expect(await loadEntitlement(storage)).toEqual(FREE);
  });
});
