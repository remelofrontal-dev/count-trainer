import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './appStore';
import type { Screen } from '../app/store';

/**
 * Persistent bottom navigation for the hub screens (brief thumb-zone philosophy).
 * Shown on Home and Modes; hidden during focused flows (drill, results, play round).
 */
export function NavBar({ active }: { active: Screen }) {
  const goHome = useApp((s) => s.goHome);
  const goModes = useApp((s) => s.goModes);
  const goInfo = useApp((s) => s.goInfo);
  const enterPlay = useApp((s) => s.enterPlay);

  return (
    <View style={styles.bar}>
      <Tab glyph="♦" label="Path" on={active === 'home'} onPress={goHome} />
      <Tab glyph="◆" label="Modes" on={active === 'modes'} onPress={goModes} />
      <Tab glyph="♠" label="Play" on={active === 'play'} onPress={enterPlay} />
      <Tab glyph="ℹ" label="Info" on={active === 'info'} onPress={goInfo} />
    </View>
  );
}

function Tab({
  glyph,
  label,
  on,
  onPress,
}: {
  glyph: string;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.tab} onPress={onPress}>
      <Text style={[styles.glyph, on && styles.on]}>{glyph}</Text>
      <Text style={[styles.label, on && styles.on]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingBottom: 22,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  glyph: { color: theme.colors.textSecondary, fontSize: 18 },
  label: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.display,
    fontSize: 11,
    letterSpacing: 2,
  },
  on: { color: theme.semantic.progress },
});
