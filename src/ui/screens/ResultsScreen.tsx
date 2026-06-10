import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/** Results (mockup screen 03): headline %, ledger, ONE dominant CTA. */
export function ResultsScreen() {
  const result = useApp((s) => s.lastResult);
  const gateJustPassed = useApp((s) => s.lastGateJustPassed);
  const promptAccount = useApp((s) => s.promptAccount);
  const oneMoreRound = useApp((s) => s.oneMoreRound);
  const goHome = useApp((s) => s.goHome);
  const casinoReady = useApp((s) => s.progress.casinoReady);

  if (result === null) return null;

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.lbl}>SESSION RESULTS</Text>
        <Text style={styles.pill}>{gateJustPassed ? '🔓 GATE PASSED' : `READY ${casinoReady}`}</Text>
      </View>

      <View style={styles.pb}>
        {gateJustPassed && <Text style={styles.crown}>★ MASTERY GATE UNLOCKED</Text>}
        <Text style={styles.big}>{Math.round(result.accuracy * 100)}%</Text>
        <Text style={styles.ctx}>
          accuracy at {(result.avgMsPerCard / 1000).toFixed(1)} sec / card
        </Text>
      </View>

      <View style={styles.ledger}>
        <Row k="Cards" v={`${result.cardsAnswered}`} />
        <Row k="Misses" v={`${result.misses}`} bad={result.misses > 0} />
        <Row k="Peeks" v={`−${result.peeks * 5} pts`} bad={result.peeks > 0} />
        <Row k="Session score" v={`${result.score}`} gold />
      </View>

      {promptAccount && (
        <View style={styles.account}>
          <Text style={styles.accountText}>
            Nice first round. Create a free account to keep your streak and score safe.
          </Text>
        </View>
      )}

      <Pressable accessibilityRole="button" style={styles.cta} onPress={() => oneMoreRound()}>
        <Text style={styles.ctaText}>ONE MORE ROUND →</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={goHome}>
        <Text style={styles.ghost}>Back to path</Text>
      </Pressable>
    </View>
  );
}

function Row({ k, v, gold, bad }: { k: string; v: string; gold?: boolean; bad?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={[styles.rowV, gold === true && styles.gold, bad === true && styles.bad]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 22, paddingTop: 64 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
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
  pb: { alignItems: 'center', marginVertical: 14 },
  crown: { color: theme.colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '600' },
  big: {
    color: theme.semantic.win,
    fontFamily: theme.typography.display,
    fontSize: 74,
    fontWeight: '800',
    lineHeight: 78,
  },
  ctx: { color: theme.colors.textSecondary, fontSize: 13 },
  ledger: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowK: { color: theme.colors.textSecondary, fontSize: 13 },
  rowV: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  gold: { color: theme.colors.accent },
  bad: { color: theme.colors.error },
  account: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 12,
  },
  accountText: { color: theme.colors.text, fontSize: 13 },
  cta: {
    marginTop: 14,
    backgroundColor: theme.semantic.progress,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  ghost: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
