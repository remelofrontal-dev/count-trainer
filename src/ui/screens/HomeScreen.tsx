import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GATES_ADVISORY, LEVELS, type LevelDef, levelById, prereqLevel } from '../../app/levels';
import { type LevelSignal, levelSignal, notReadyPct } from '../../app/progress';
import { effectivePremium, showProTag } from '../../app/entitlement';
import { effectiveStreak, localDay } from '../../app/streak';
import { theme } from '../../theme';
import { useApp } from '../appStore';
import { DevMenu } from '../DevMenu';

/** Home: Casino Ready chip + stat row + vertical skill path (mockup screen 01). */
export function HomeScreen() {
  const progress = useApp((s) => s.progress);
  const startDrill = useApp((s) => s.startDrill);
  const markAdvisoryNote = useApp((s) => s.markAdvisoryNote);
  const devBlockingGates = useApp((s) => s.devBlockingGates);
  const profileName = useApp((s) => s.profile?.name ?? '');
  const entitlement = useApp((s) => s.entitlement);
  const enterPlay = useApp((s) => s.enterPlay);
  const enterBasics = useApp((s) => s.enterBasics);
  const streak = effectiveStreak(progress.streak, localDay(new Date()));
  const advisory = GATES_ADVISORY && !devBlockingGates;

  // Hidden Developer Menu — tap the title 5× (testers won't stumble on it).
  const [titleTaps, setTitleTaps] = useState(0);
  const [devOpen, setDevOpen] = useState(false);
  // Soft pre-entry note (advisory gates): which level is being warned-into, if any.
  const [pendingNote, setPendingNote] = useState<LevelDef | null>(null);

  const tapLevel = (level: LevelDef) => {
    const signal = levelSignal(level.id, progress);
    if (!advisory && signal === 'not-ready') return; // blocking mode: locked
    // Advisory: first entry into a not-ready level shows ONE soft note, never blocks.
    if (advisory && signal === 'not-ready' && !progress.advisoryNotesShown.includes(level.id)) {
      setPendingNote(level);
      return;
    }
    startDrill(level.id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topbar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const n = titleTaps + 1;
            setTitleTaps(n);
            if (n >= 5) {
              setDevOpen(true);
              setTitleTaps(0);
            }
          }}
        >
          <Text style={styles.lbl}>COUNT TRAINER</Text>
        </Pressable>
        <Text style={styles.pill}>🔥 {streak}-day streak</Text>
      </View>
      {profileName !== '' && <Text style={styles.hello}>Hey {profileName} 👋</Text>}

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

      <Pressable accessibilityRole="button" style={styles.playBtn} onPress={enterPlay}>
        <Text style={styles.playText}>♠ PLAY BLACKJACK</Text>
        <Text style={styles.playSub}>Full table · count for real · coach optional</Text>
      </Pressable>

      <View style={styles.path}>
        <Pressable accessibilityRole="button" onPress={enterBasics} style={styles.node}>
          <View style={[styles.dot, progress.basicsComplete && styles.dotDone, !progress.basicsComplete && styles.dotNow]}>
            <Text style={[styles.dotText, styles.dotTextActive]}>{progress.basicsComplete ? '✓' : '0'}</Text>
          </View>
          <View>
            <Text style={[styles.nodeTitle, !progress.basicsComplete && styles.nodeTitleNow]}>Blackjack basics</Text>
            <Text style={styles.nodeSub}>
              {progress.basicsComplete ? 'Done · replay anytime' : 'New here? Start with the 2-minute intro'}
            </Text>
          </View>
        </Pressable>
        {LEVELS.map((level) => {
          const signal = levelSignal(level.id, progress);
          // In blocking mode a not-ready level is locked; in advisory it's tappable.
          const locked = !advisory && signal === 'not-ready';
          const glyph = NODE_GLYPH[signal];
          return (
            <Pressable
              key={level.id}
              accessibilityRole="button"
              disabled={locked}
              onPress={() => tapLevel(level)}
              style={[styles.node, locked && styles.nodeLocked]}
            >
              <View
                style={[
                  styles.dot,
                  signal === 'mastered' && styles.dotDone,
                  signal === 'recommended' && styles.dotNow,
                  signal === 'ready' && styles.dotReady,
                ]}
              >
                <Text style={[styles.dotText, signal !== 'not-ready' && styles.dotTextActive]}>
                  {locked ? '🔒' : glyph}
                </Text>
              </View>
              <View>
                <View style={styles.nodeTitleRow}>
                  <Text style={[styles.nodeTitle, signal === 'recommended' && styles.nodeTitleNow]}>
                    {level.title}
                  </Text>
                  {showProTag(level.tier, entitlement) && <Text style={styles.nodePro}>PRO</Text>}
                  {signal === 'ready' && <Text style={styles.readyTag}>Ready ✓</Text>}
                </View>
                <Text style={styles.nodeSub}>{nodeSub(level, signal, progress, locked)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {effectivePremium(entitlement) && (
        <Text style={styles.premiumBadge}>
          {entitlement.purchasedPremium ? '★ PREMIUM ACTIVE' : '★ BETA — ALL ACCESS'}
        </Text>
      )}

      {pendingNote !== null && (
        <View style={styles.noteOverlay}>
          <View style={styles.noteCard}>
            <Text style={styles.noteHead}>Heads up</Text>
            <Text style={styles.noteBody}>
              Most people master {prereqTitle(pendingNote)} first. You can jump straight into{' '}
              {pendingNote.title.toLowerCase()} anyway — it's your call.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.noteJump}
              onPress={() => {
                const lvl = pendingNote;
                setPendingNote(null);
                void markAdvisoryNote(lvl.id);
                startDrill(lvl.id);
              }}
            >
              <Text style={styles.noteJumpText}>JUMP IN ANYWAY →</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const prereq = prereqLevel(pendingNote.id);
                setPendingNote(null);
                if (prereq !== undefined) startDrill(prereq.id);
              }}
            >
              <Text style={styles.noteAlt}>Take me to {prereqTitle(pendingNote)}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {devOpen && <DevMenu onClose={() => setDevOpen(false)} />}
    </ScrollView>
  );
}

const NODE_GLYPH: Record<LevelSignal, string> = {
  mastered: '✓',
  'tested-out': '✦',
  recommended: '▶',
  ready: '◦',
  'not-ready': '◦',
};

function prereqTitle(level: LevelDef): string {
  return prereqLevel(level.id)?.title ?? 'the basics';
}

function nodeSub(
  level: LevelDef,
  signal: LevelSignal,
  progress: Parameters<typeof levelSignal>[1],
  locked: boolean,
): string {
  switch (signal) {
    case 'mastered':
      return `Mastered · ${Math.round((progress.levels[level.id]?.bestAccuracy ?? 0) * 100)}%`;
    case 'tested-out':
      return 'Tested out ✓ — replay anytime';
    case 'recommended':
      return `Recommended next · gate ${Math.round(level.gate.minAccuracy * 100)}% at ${(level.gate.maxAvgMsPerCard / 1000).toFixed(1)}s/card`;
    case 'ready':
      return `Gate ${Math.round(level.gate.minAccuracy * 100)}% at ${(level.gate.maxAvgMsPerCard / 1000).toFixed(1)}s/card`;
    case 'not-ready':
      return locked
        ? 'Pass the gate to unlock'
        : `Not ready yet — ${notReadyPct(level.id, progress)}% there · jump in anytime`;
  }
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
  topbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hello: { color: theme.colors.text, fontSize: 15, marginBottom: 14 },
  premiumBadge: {
    color: theme.colors.accent,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 18,
  },
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
  playBtn: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  playText: {
    color: theme.colors.accent,
    fontFamily: theme.typography.display,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  playSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
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
  dotReady: { borderColor: theme.colors.accent },
  dotText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '700' },
  dotTextActive: { color: theme.semantic.progress },
  nodeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nodeTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  nodeTitleNow: { color: theme.semantic.progress, fontWeight: '600' },
  readyTag: { color: theme.colors.accent, fontSize: 10, letterSpacing: 1 },
  nodePro: {
    color: theme.colors.accent,
    fontSize: 9,
    letterSpacing: 1,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  nodeSub: { color: theme.colors.textSecondary, fontSize: 11 },
  noteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: 28,
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
  },
  noteHead: { color: theme.colors.accent, fontFamily: theme.typography.display, fontSize: 16, letterSpacing: 2 },
  noteBody: { color: theme.colors.text, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 18 },
  noteJump: { backgroundColor: theme.semantic.progress, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  noteJumpText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  noteAlt: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 14 },
});
