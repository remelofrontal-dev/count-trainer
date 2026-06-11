import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  currentQuestion,
  expectedAnswer,
  normalize,
  remainingMs,
  runningCountSoFar,
} from '../../app/drill';
import { isPair } from '../../engine/hand';
import { cardValueHint } from '../../engine/cardName';
import type { Card } from '../../engine/types';
import { theme } from '../../theme';
import { useApp } from '../appStore';
import { zoneHints } from '../countZoneHints';
import { DRILL_INTERACTIVE_TOP_FRACTION } from '../layout';

const FLASH_MS = theme.motion.answerFlashMs; // 80ms green/red flash (brief §4.2)
const TC_CHOICES = [-3, -2, -1, 0, 1, 2, 3, 4, 5];

/**
 * Drill screen (mockup screen 02). All interactive controls live below the
 * midline. No confirmation dialogs (brief §7.5). Renders four question kinds:
 * count zones, strategy actions, and a true-count pad.
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
  const q = currentQuestion(drill);
  const mode = drill.level.mode;
  const isCount = mode === 'card-tag' || mode === 'running-count';
  const secondsLeft = Math.ceil(remainingMs(drill, Date.now()) / 1000);

  const submit = (value: number | string) => {
    if (q === undefined) return;
    const correct = normalize(value) === expectedAnswer(drill, drill.index);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    answerCurrent(value);
    setFlash(correct ? 'good' : 'bad');
    setTimeout(() => setFlash('none'), FLASH_MS);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.lbl}>{drill.level.title.toUpperCase()}</Text>
        <Text style={styles.timer}>
          ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(drill.index / drill.questions.length) * 100}%` }]} />
      </View>

      <View style={[styles.felt, flash === 'good' && styles.feltGood, flash === 'bad' && styles.feltBad]}>
        {q?.card !== undefined && <BigCard card={q.card} />}
        {/* Beginner bridge: blackjack value helper, Card Values level only (not above) */}
        {q?.card !== undefined && drill.level.id === 'card-values' && (
          <Text style={styles.valueHint}>{cardValueHint(q.card)}</Text>
        )}

        {mode === 'strategy' && q?.hand !== undefined && q.dealerUp !== undefined && (
          <View style={styles.strategyFelt}>
            <Text style={styles.vsLabel}>YOUR HAND</Text>
            <View style={styles.handRow}>
              {q.hand.map((c, i) => (
                <MiniCard key={i} card={c} />
              ))}
            </View>
            <Text style={styles.vsLabel}>DEALER SHOWS</Text>
            <MiniCard card={q.dealerUp} />
          </View>
        )}

        {mode === 'true-count' && q?.runningCount !== undefined && (
          <View style={styles.tcFelt}>
            <Text style={styles.tcBig}>
              RC {q.runningCount >= 0 ? '+' : ''}
              {q.runningCount}
            </Text>
            <Text style={styles.tcSub}>{q.decksRemaining?.toFixed(1)} decks remaining</Text>
            <Text style={styles.tcAsk}>What's the true count?</Text>
          </View>
        )}

        {isCount && (
          <Text style={styles.peekHint}>
            {peeked
              ? `COUNT: ${runningCountSoFar(drill) > 0 ? '+' : ''}${runningCountSoFar(drill)}`
              : 'COUNT HIDDEN — TAP TO PEEK (−5)'}
          </Text>
        )}
      </View>

      <View style={[styles.controls, { flexBasis: `${(1 - DRILL_INTERACTIVE_TOP_FRACTION) * 100}%` }]}>
        {isCount && (
          <>
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
              <Zone label="−1" hint={mode === 'running-count' ? '' : hints.minus} color={theme.colors.countMinus} onPress={() => submit(-1)} />
              <Zone label="0" hint={mode === 'running-count' ? '' : hints.zero} color={theme.colors.textSecondary} onPress={() => submit(0)} />
              <Zone label="+1" hint={mode === 'running-count' ? '' : hints.plus} color={theme.semantic.countPlus} onPress={() => submit(1)} />
            </View>
          </>
        )}

        {mode === 'strategy' && (
          <View style={styles.actionGrid}>
            <ActionBtn label="HIT" onPress={() => submit('H')} />
            <ActionBtn label="STAND" onPress={() => submit('S')} />
            <ActionBtn label="DOUBLE" onPress={() => submit('D')} />
            {q?.hand !== undefined && isPair(q.hand) && <ActionBtn label="SPLIT" onPress={() => submit('P')} />}
          </View>
        )}

        {mode === 'true-count' && (
          <View style={styles.tcPad}>
            {TC_CHOICES.map((n) => (
              <Pressable key={n} accessibilityRole="button" style={styles.tcBtn} onPress={() => submit(n)}>
                <Text style={styles.tcBtnText}>
                  {n > 0 ? '+' : ''}
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.thumbNote}>NO DIALOGS · TAP TO ANSWER</Text>
      </View>
    </View>
  );
}

function isRed(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

function BigCard({ card }: { card: Card }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardCorner, isRed(card.suit) && styles.cardRed]}>
        {card.rank}
        {'\n'}
        {card.suit}
      </Text>
    </View>
  );
}

function MiniCard({ card }: { card: Card }) {
  return (
    <View style={styles.miniCard}>
      <Text style={[styles.miniCardText, isRed(card.suit) && styles.cardRed]}>
        {card.rank}
        {card.suit}
      </Text>
    </View>
  );
}

function Zone({ label, hint, color, onPress }: { label: string; hint: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={[styles.zone, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.zoneLabel, { color }]}>{label}</Text>
      {hint !== '' && <Text style={styles.zoneHint}>{hint}</Text>}
    </Pressable>
  );
}

function ActionBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 18, paddingTop: 60 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  lbl: { color: theme.colors.textSecondary, fontFamily: theme.typography.display, fontSize: 12, letterSpacing: 4 },
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
  card: { width: 96, height: 136, borderRadius: 11, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  cardCorner: { fontFamily: theme.typography.display, fontSize: 30, fontWeight: '800', textAlign: 'center', color: theme.colors.background },
  cardRed: { color: theme.colors.error },
  valueHint: { color: theme.colors.textSecondary, fontSize: 12, letterSpacing: 1, marginTop: 10 },
  strategyFelt: { alignItems: 'center', gap: 6 },
  vsLabel: { color: theme.colors.textSecondary, fontSize: 10, letterSpacing: 3, marginTop: 6 },
  handRow: { flexDirection: 'row', gap: 8 },
  miniCard: { backgroundColor: theme.colors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14, minWidth: 44, alignItems: 'center' },
  miniCardText: { color: theme.colors.background, fontFamily: theme.typography.display, fontSize: 22, fontWeight: '800' },
  tcFelt: { alignItems: 'center' },
  tcBig: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 52, fontWeight: '800' },
  tcSub: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  tcAsk: { color: theme.colors.accent, fontSize: 13, marginTop: 14, letterSpacing: 1 },
  peekHint: { position: 'absolute', bottom: 10, color: theme.colors.textSecondary, fontSize: 9.5, letterSpacing: 2 },
  controls: { justifyContent: 'flex-end' },
  peekBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 22 },
  peekBtnText: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 3 },
  zones: { flexDirection: 'row', gap: 10, marginTop: 6 },
  zone: { flex: 1, borderRadius: 18, borderWidth: 1, backgroundColor: theme.colors.surface, paddingVertical: 20, alignItems: 'center' },
  zoneLabel: { fontFamily: theme.typography.display, fontSize: 26, fontWeight: '800' },
  zoneHint: { color: theme.colors.textSecondary, fontSize: 9.5, letterSpacing: 1.5, marginTop: 2 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  action: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionText: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 18, letterSpacing: 1 },
  tcPad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tcBtn: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    width: 56,
    alignItems: 'center',
  },
  tcBtnText: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 20, fontWeight: '700' },
  thumbNote: { color: theme.colors.textSecondary, fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 12 },
});
