import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { countValue } from '../../engine/counting';
import { buildDeck, shuffle } from '../../engine/deck';
import type { Card } from '../../engine/types';
import type { Persona } from '../../app/placement';
import { theme } from '../../theme';
import { useApp } from '../appStore';

const CHECK_CARDS = 8;

/**
 * Placement onboarding (§4.6.1): one tap-question, then a short check for the two
 * experienced personas. The check IS the first deal — no forms, no tour.
 * Self-report alone never unlocks gates (the check does), so "Mastered" stays earned.
 */
export function PlacementScreen() {
  const submitPlacement = useApp((s) => s.submitPlacement);
  const [persona, setPersona] = useState<Persona | null>(null);

  if (persona === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.eyebrow}>PLACEMENT</Text>
        <Text style={styles.q}>Where are you starting?</Text>
        <Choice
          title="New to blackjack"
          sub="Start from the very beginning — you'll be counting in minutes."
          onPress={() => void submitPlacement('new', null)}
        />
        <Choice
          title="I know how to play"
          sub="Quick check, then teach me to count."
          onPress={() => setPersona('knows-play')}
        />
        <Choice
          title="I already count"
          sub="Speed check — then sharpen me."
          onPress={() => setPersona('counts')}
        />
      </View>
    );
  }

  return <PlacementCheck persona={persona} onDone={(stats) => void submitPlacement(persona, stats)} />;
}

function Choice({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.choice} onPress={onPress}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceSub}>{sub}</Text>
    </Pressable>
  );
}

/** Inline Hi-Lo speed check: tag CHECK_CARDS cards; report correct + pace. */
function PlacementCheck({
  persona,
  onDone,
}: {
  persona: Persona;
  onDone: (stats: { correct: number; total: number; avgMsPerCard: number }) => void;
}) {
  const cards = useMemo<Card[]>(() => shuffle(buildDeck(), 20260611).slice(0, CHECK_CARDS), []);
  const [index, setIndex] = useState(0);
  const correctRef = useRef(0);
  const lastTapRef = useRef(Date.now());
  const totalMsRef = useRef(0);

  const card = cards[index];

  const answer = (value: number) => {
    if (card === undefined) return;
    const now = Date.now();
    totalMsRef.current += Math.max(0, now - lastTapRef.current);
    lastTapRef.current = now;
    if (value === countValue(card.rank)) correctRef.current += 1;
    const next = index + 1;
    if (next >= cards.length) {
      onDone({
        correct: correctRef.current,
        total: cards.length,
        avgMsPerCard: totalMsRef.current / cards.length,
      });
    } else {
      setIndex(next);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {persona === 'counts' ? 'SPEED CHECK' : 'QUICK CHECK'} · {index + 1}/{CHECK_CARDS}
      </Text>
      <View style={styles.felt}>
        {card !== undefined && (
          <Text style={[styles.card, isRed(card.suit) && styles.cardRed]}>
            {card.rank}
            {card.suit}
          </Text>
        )}
      </View>
      <Text style={styles.prompt}>Tag each card</Text>
      <View style={styles.zones}>
        <Zone label="−1" color={theme.colors.countMinus} onPress={() => answer(-1)} />
        <Zone label="0" color={theme.colors.textSecondary} onPress={() => answer(0)} />
        <Zone label="+1" color={theme.semantic.countPlus} onPress={() => answer(1)} />
      </View>
    </View>
  );
}

function Zone({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={[styles.zone, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.zoneLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function isRed(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: 'center' },
  eyebrow: {
    color: theme.colors.accent,
    fontFamily: theme.typography.display,
    fontSize: 13,
    letterSpacing: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  q: {
    color: theme.colors.text,
    fontFamily: theme.typography.display,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  choice: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  choiceTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  choiceSub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  felt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 20,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  card: {
    color: theme.colors.background,
    backgroundColor: theme.colors.card,
    fontFamily: theme.typography.display,
    fontSize: 44,
    fontWeight: '800',
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardRed: { color: theme.colors.error },
  prompt: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  zones: { flexDirection: 'row', gap: 10 },
  zone: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 22,
    alignItems: 'center',
  },
  zoneLabel: { fontFamily: theme.typography.display, fontSize: 26, fontWeight: '800' },
});
