import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentCard, expectedAnswer, remainingMs, runningCountSoFar } from '../../app/drill';
import { theme } from '../../theme';
import { useApp } from '../appStore';
import { zoneHints } from '../countZoneHints';
import { DRILL_INTERACTIVE_TOP_FRACTION } from '../layout';

const FLASH_MS = theme.motion.answerFlashMs; // 80ms green/red flash (brief §4.2)

/**
 * Drill screen (mockup screen 02). All interactive controls live below the
 * midline — DRILL_INTERACTIVE_TOP_FRACTION enforces the thumb-zone rule.
 * No confirmation dialogs, ever (brief §7.5).
 */
export function DrillScreen() {
  const drill = useApp((s) => s.drill);
  const answerCurrent = useApp((s) => s.answerCurrent);
  const peekCount = useApp((s) => s.peekCount);
  const tickClock = useApp((s) => s.tickClock);
  const [flash, setFlash] = useState<'none' | 'good' | 'bad'>('none');
  const [peeked, setPeeked] = useState(false);
  const hints = zoneHints();

  useEffect(() => {
    const id = setInterval(tickClock, 250);
    return () => clearInterval(id);
  }, [tickClock]);

  if (drill === null) return null;
  const card = currentCard(drill);
  const hideHints = drill.level.mode === 'running-count';
  const secondsLeft = Math.ceil(remainingMs(drill, Date.now()) / 1000);

  const tap = (value: number) => {
    if (card === undefined) return;
    const correct = value === expectedAnswer(drill, drill.index);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // haptic tick per card
    answerCurrent(value);
    setFlash(correct ? 'good' : 'bad'); // 80ms green/red answer flash
    setTimeout(() => setFlash('none'), FLASH_MS);
  };

  return (
    <View style={styles.container}>
      {/* Top half — display only, nothing interactive (brief §7.5) */}
      <View style={styles.topbar}>
        <Text style={styles.lbl}>{drill.level.title.toUpperCase()}</Text>
        <Text style={styles.timer}>⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${(drill.index / drill.cards.length) * 100}%` }]}
        />
      </View>

      <View style={[styles.felt, flash === 'good' && styles.feltGood, flash === 'bad' && styles.feltBad]}>
        {card !== undefined && (
          <View style={styles.card}>
            <Text style={[styles.cardCorner, isRed(card.suit) && styles.cardRed]}>
              {card.rank}
              {'\n'}
              {card.suit}
            </Text>
          </View>
        )}
        <Text style={styles.peekHint}>
          {peeked ? `COUNT: ${runningCountSoFar(drill) > 0 ? '+' : ''}${runningCountSoFar(drill)}` : 'COUNT HIDDEN — TAP TO PEEK (−5)'}
        </Text>
      </View>

      {/* Bottom interactive zone — starts at DRILL_INTERACTIVE_TOP_FRACTION of screen */}
      <View style={[styles.controls, { flexBasis: `${(1 - DRILL_INTERACTIVE_TOP_FRACTION) * 100}%` }]}>
        <Pressable
          accessibilityRole="button"
          style={styles.peekBtn}
          onPress={() => {
            peekCount();
            setPeeked(true);
            setTimeout(() => setPeeked(false), 1200);
          }}
        >
          <Text style={styles.peekBtnText}>PEEK</Text>
        </Pressable>
        <View style={styles.zones}>
          <Zone value={-1} label="−1" hint={hideHints ? '' : hints.minus} color={theme.colors.countMinus} onPress={tap} />
          <Zone value={0} label="0" hint={hideHints ? '' : hints.zero} color={theme.colors.textSecondary} onPress={tap} />
          <Zone value={1} label="+1" hint={hideHints ? '' : hints.plus} color={theme.semantic.countPlus} onPress={tap} />
        </View>
        <Text style={styles.thumbNote}>HAPTIC TICK PER CARD · NO DIALOGS</Text>
      </View>
    </View>
  );
}

function isRed(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

function Zone({
  value,
  label,
  hint,
  color,
  onPress,
}: {
  value: number;
  label: string;
  hint: string;
  color: string;
  onPress: (value: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.zone, { borderColor: color }]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.zoneLabel, { color }]}>{label}</Text>
      {hint !== '' && <Text style={styles.zoneHint}>{hint}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 18, paddingTop: 60 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  lbl: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.display,
    fontSize: 12,
    letterSpacing: 4,
  },
  timer: { color: theme.colors.accent, fontFamily: theme.typography.display, fontSize: 15, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: theme.colors.surface, marginBottom: 10 },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: theme.colors.accent },
  felt: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feltGood: { borderColor: theme.semantic.progress },
  feltBad: { borderColor: theme.colors.error },
  card: {
    width: 96,
    height: 136,
    borderRadius: 11,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCorner: {
    fontFamily: theme.typography.display,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    color: theme.colors.background,
  },
  cardRed: { color: theme.colors.error },
  peekHint: {
    position: 'absolute',
    bottom: 10,
    color: theme.colors.textSecondary,
    fontSize: 9.5,
    letterSpacing: 2,
  },
  controls: { justifyContent: 'flex-end' },
  peekBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 22 },
  peekBtnText: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 3 },
  zones: { flexDirection: 'row', gap: 10, marginTop: 6 },
  zone: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 20,
    alignItems: 'center',
  },
  zoneLabel: { fontFamily: theme.typography.display, fontSize: 26, fontWeight: '800' },
  zoneHint: { color: theme.colors.textSecondary, fontSize: 9.5, letterSpacing: 1.5, marginTop: 2 },
  thumbNote: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 12,
  },
});
