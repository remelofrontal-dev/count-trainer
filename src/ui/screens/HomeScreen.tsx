import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LEVELS } from '../../app/levels';
import { gatesPassed } from '../../app/progress';
import { isLevelUnlocked } from '../../app/levels';
import { effectiveStreak, localDay } from '../../app/streak';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/** Home: Casino Ready chip + stat row + vertical skill path (mockup screen 01). */
export function HomeScreen() {
  const progress = useApp((s) => s.progress);
  const startDrill = useApp((s) => s.startDrill);
  const passed = gatesPassed(progress);
  const streak = effectiveStreak(progress.streak, localDay(new Date()));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topbar}>
        <Text style={styles.lbl}>COUNT TRAINER</Text>
        <Text style={styles.pill}>🔥 {streak}-day streak</Text>
      </View>

      <View style={styles.chip}>
        <Text style={styles.score}>{progress.casinoReady}</Text>
        <Text style={styles.of}>/ 100</Text>
      </View>
      <Text style={styles.chipCap}>CASINO READY</Text>

      <View style={styles.statrow}>
        <Stat value={`${progress.totalSessions}`} label="SESSIONS" />
        <Stat value={`${streak}`} label="STREAK" gold />
        <Stat
          value={`${Math.round((progress.levels['card-values']?.bestAccuracy ?? 0) * 100)}%`}
          label="BEST ACC"
        />
      </View>

      <View style={styles.path}>
        {LEVELS.map((level) => {
          const unlocked = isLevelUnlocked(level.id, passed);
          const done = passed.has(level.id);
          const current = unlocked && !done;
          return (
            <Pressable
              key={level.id}
              accessibilityRole="button"
              disabled={!unlocked}
              onPress={() => startDrill(level.id)}
              style={[styles.node, !unlocked && styles.nodeLocked]}
            >
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotNow]}>
                <Text style={[styles.dotText, (done || current) && styles.dotTextActive]}>
                  {done ? '✓' : unlocked ? '▶' : '🔒'}
                </Text>
              </View>
              <View>
                <Text style={[styles.nodeTitle, current && styles.nodeTitleNow]}>{level.title}</Text>
                <Text style={styles.nodeSub}>
                  {done
                    ? `Mastered · ${Math.round((progress.levels[level.id]?.bestAccuracy ?? 0) * 100)}%`
                    : unlocked
                      ? `Gate: ${Math.round(level.gate.minAccuracy * 100)}% at ${(level.gate.maxAvgMsPerCard / 1000).toFixed(1)}s/card`
                      : 'Pass the gate to unlock'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statV, gold === true && styles.statGold]}>{value}</Text>
      <Text style={styles.statK}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 22, paddingTop: 64 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  lbl: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.display,
    fontSize: 12,
    letterSpacing: 4,
  },
  pill: {
    color: theme.colors.accent,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    overflow: 'hidden',
  },
  chip: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: theme.semantic.progress,
    backgroundColor: theme.colors.surface,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: theme.semantic.progress,
    fontFamily: theme.typography.display,
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 66,
  },
  of: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 2 },
  chipCap: {
    color: theme.colors.text,
    fontFamily: theme.typography.display,
    fontSize: 13,
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  statrow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  statV: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 18, fontWeight: '700' },
  statGold: { color: theme.colors.accent },
  statK: { color: theme.colors.textSecondary, fontSize: 9, letterSpacing: 1.5 },
  path: { gap: 4 },
  node: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  nodeLocked: { opacity: 0.42 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: theme.colors.surface, borderColor: theme.semantic.progress },
  dotNow: { borderColor: theme.semantic.progress, borderWidth: 2 },
  dotText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '700' },
  dotTextActive: { color: theme.semantic.progress },
  nodeTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  nodeTitleNow: { color: theme.semantic.progress, fontWeight: '600' },
  nodeSub: { color: theme.colors.textSecondary, fontSize: 11 },
});
