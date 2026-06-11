import { describe, expect, test } from 'bun:test';
import { INFO_CARDS } from '../info';

describe('info content', () => {
  test('covers the brief’s required teaching + trust topics', () => {
    const ids = INFO_CARDS.map((c) => c.id);
    for (const required of ['how-to-play', 'how-counting-works', 'table-quality', 'our-math', 'know-the-law', 'casino-ready']) {
      expect(ids).toContain(required);
    }
  });

  test('the mandatory "Know the Law" card names the device-counting crime', () => {
    const law = INFO_CARDS.find((c) => c.id === 'know-the-law')!;
    expect(law.body.join(' ')).toMatch(/felony/i);
    expect(law.body.join(' ')).toMatch(/legal/i);
  });

  test('every card has a title and non-empty body', () => {
    for (const card of INFO_CARDS) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.body.length).toBeGreaterThan(0);
      expect(card.body.every((p) => p.length > 0)).toBe(true);
    }
  });
});
