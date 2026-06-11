import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { useApp } from './appStore';

/**
 * Developer Menu (brief §4.4 Track A) — mock entitlement + progress overrides so
 * the founder can demo free/premium journeys without billing. Opened by tapping
 * the Home title 5× (hidden from testers). Premium gating routes through the same
 * `isPremium` flag RevenueCat will set in Track B.
 */
export function DevMenu({ onClose }: { onClose: () => void }) {
  const isPremium = useApp((s) => s.entitlement.isPremium);
  const devSetPremium = useApp((s) => s.devSetPremium);
  const devUnlockAll = useApp((s) => s.devUnlockAll);
  const devResetProgress = useApp((s) => s.devResetProgress);
  const devSetCasinoReady = useApp((s) => s.devSetCasinoReady);
  const devSetStreak = useApp((s) => s.devSetStreak);

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.sheet}>
        <Text style={styles.title}>DEVELOPER MENU</Text>

        <Row
          label={`Premium: ${isPremium ? 'ON' : 'OFF'}`}
          action={isPremium ? 'Turn off' : 'Turn on'}
          onPress={() => void devSetPremium(!isPremium)}
        />
        <Row label="Unlock all levels" action="Unlock" onPress={() => void devUnlockAll()} />
        <Row label="Casino Ready → 88" action="Set" onPress={() => void devSetCasinoReady(88)} />
        <Row label="Streak → 12" action="Set" onPress={() => void devSetStreak(12)} />
        <Row label="Reset all progress" action="Reset" danger onPress={() => void devResetProgress()} />

        <Pressable accessibilityRole="button" style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  action,
  onPress,
  danger,
}: {
  label: string;
  action: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Pressable accessibilityRole="button" style={styles.rowBtn} onPress={onPress}>
        <Text style={[styles.rowBtnText, danger === true && styles.danger]}>{action}</Text>
      </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  title: {
    color: theme.colors.accent,
    fontFamily: theme.typography.display,
    fontSize: 16,
    letterSpacing: 3,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  rowLabel: { color: theme.colors.text, fontSize: 14 },
  rowBtn: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rowBtnText: { color: theme.semantic.progress, fontSize: 13, fontWeight: '600' },
  danger: { color: theme.colors.error },
  close: { marginTop: 18, alignItems: 'center', paddingVertical: 12 },
  closeText: { color: theme.colors.textSecondary, fontSize: 13, letterSpacing: 2 },
});
