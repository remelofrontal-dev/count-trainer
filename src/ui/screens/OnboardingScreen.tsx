import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/** Dealing within 60 seconds of first launch: one headline, one tap (brief §4.2). */
export function OnboardingScreen() {
  const startDrill = useApp((s) => s.startDrill);
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>COUNT TRAINER</Text>
      <Text style={styles.title}>ZERO TO{'\n'}CASINO READY.</Text>
      <Text style={styles.sub}>
        One guided path. Master card counting the way you'd learn a language — one gate at a time.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={styles.cta}
        onPress={() => startDrill('card-values')}
      >
        <Text style={styles.ctaText}>DEAL ME IN →</Text>
      </Pressable>
      <Text style={styles.disclaimer}>
        Educational training tool. No real or fictional betting. 17+
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'flex-end',
    padding: 28,
    paddingBottom: 56,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontFamily: theme.typography.display,
    fontSize: 13,
    letterSpacing: 4,
    marginBottom: 12,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.display,
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 52,
  },
  sub: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 16,
    marginTop: 14,
    marginBottom: 32,
  },
  cta: {
    backgroundColor: theme.semantic.progress,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 2,
  },
  disclaimer: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
});
