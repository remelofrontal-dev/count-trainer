import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODES, type ModeId } from '../../app/modes';
import { LEVELS } from '../../app/levels';
import { clearedLevels } from '../../app/progress';
import { isLevelUnlocked } from '../../app/levels';
import { showProTag } from '../../app/entitlement';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/**
 * Modes hub (brief §4.6.2) — navigate between every game mode. Live modes are
 * tappable; upcoming ones show "SOON" so the roadmap is visible. Quick Drill
 * expands inline to pick any unlocked skill.
 */
export function ModesScreen() {
  const goHome = useApp((s) => s.goHome);
  const enterPlay = useApp((s) => s.enterPlay);
  const startDrill = useApp((s) => s.startDrill);
  const progress = useApp((s) => s.progress);
  const entitlement = useApp((s) => s.entitlement);
  const [pickQuick, setPickQuick] = useState(false);

  const cleared = clearedLevels(progress);
  const unlocked = LEVELS.filter((l) => isLevelUnlocked(l.id, cleared));

  const open = (id: ModeId) => {
    if (id === 'journey') goHome();
    else if (id === 'play') enterPlay();
    else if (id === 'quick-drill') setPickQuick((v) => !v);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>MODES</Text>
      <Text style={styles.sub}>One engine, every way to train.</Text>

      {MODES.map((mode) => {
        const live = mode.status === 'live';
        const expanded = mode.id === 'quick-drill' && pickQuick;
        return (
          <View key={mode.id}>
            <Pressable
              accessibilityRole="button"
              disabled={!live}
              style={[styles.card, !live && styles.cardSoon]}
              onPress={() => open(mode.id)}
            >
              <Text style={styles.glyph}>{mode.glyph}</Text>
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{mode.title}</Text>
                  {showProTag(mode.tier, entitlement) && <Text style={styles.pro}>PRO</Text>}
                  {!live && <Text style={styles.soon}>SOON</Text>}
                </View>
                <Text style={styles.blurb}>{mode.blurb}</Text>
              </View>
              {live && <Text style={styles.chev}>{expanded ? '▾' : '›'}</Text>}
            </Pressable>

            {expanded && (
              <View style={styles.picker}>
                {unlocked.length === 0 ? (
                  <Text style={styles.pickerEmpty}>Unlock a skill in Journey first.</Text>
                ) : (
                  unlocked.map((l) => (
                    <Pressable
                      key={l.id}
                      accessibilityRole="button"
                      style={styles.pickItem}
                      onPress={() => startDrill(l.id)}
                    >
                      <Text style={styles.pickText}>{l.title}</Text>
                      <Text style={styles.pickGo}>Drill ›</Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 22, paddingTop: 64 },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.display,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sub: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardSoon: { opacity: 0.5 },
  glyph: { color: theme.colors.accent, fontSize: 24, width: 28, textAlign: 'center' },
  cardBody: { flex: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  pro: {
    color: theme.colors.accent,
    fontSize: 9,
    letterSpacing: 1,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  soon: { color: theme.colors.textSecondary, fontSize: 10, letterSpacing: 2 },
  blurb: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  chev: { color: theme.colors.textSecondary, fontSize: 20 },
  picker: { marginTop: -2, marginBottom: 10, marginLeft: 14 },
  pickItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  pickText: { color: theme.colors.text, fontSize: 14 },
  pickGo: { color: theme.semantic.progress, fontSize: 13, fontWeight: '600' },
  pickerEmpty: { color: theme.colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
});
