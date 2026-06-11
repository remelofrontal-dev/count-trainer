import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { coachVisibility } from '../app/play';
import { jargonDefinition } from '../app/jargon';
import type { ProgressState } from '../app/progress';
import { theme } from '../theme';

/**
 * Play-mode Table Briefing (brief §A2 / handoff §2a2) — first-entry cards that
 * introduce the terms BEFORE they appear live, and re-openable via the "?" link.
 * Level-aware: only introduces the count concepts the player has reached.
 */
export function PlayBriefing({ progress, onClose }: { progress: ProgressState; onClose: () => void }) {
  const vis = coachVisibility(progress);

  const cards: { title: string; lines: string[] }[] = [
    {
      title: 'The table',
      lines: [
        'Beat the dealer’s hand without going over 21. Hit, Stand, Double, or Split your hand.',
        jargonDefinition('record'),
        jargonDefinition('push'),
        jargonDefinition('chips'),
      ],
    },
    {
      title: 'The coach',
      lines: [
        'Turn Coach ON for live help, OFF to test yourself.',
        jargonDefinition('book'),
      ],
    },
  ];
  if (vis.runningCount) cards.push({ title: 'The count', lines: [jargonDefinition('runningCount')] });
  if (vis.trueCount) cards.push({ title: 'True count', lines: [jargonDefinition('trueCount')] });

  const [i, setI] = useState(0);
  const card = cards[i]!;
  const last = i === cards.length - 1;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.step}>
            {i + 1} / {cards.length}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{card.title}</Text>
        {card.lines.map((l, k) => (
          <Text key={k} style={styles.line}>
            {l}
          </Text>
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.cta}
          onPress={() => (last ? onClose() : setI(i + 1))}
        >
          <Text style={styles.ctaText}>{last ? 'DEAL ME IN →' : 'NEXT →'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 26,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  step: { color: theme.colors.textSecondary, fontFamily: theme.typography.display, fontSize: 12, letterSpacing: 1 },
  skip: { color: theme.colors.textSecondary, fontSize: 13 },
  title: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  line: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  cta: { backgroundColor: theme.semantic.progress, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  ctaText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
