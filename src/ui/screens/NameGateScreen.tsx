import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isValidName } from '../../app/identity';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/**
 * Name gate — the first screen (tester build). One field, one button, then cards.
 * Founder-directed so unique testers can be counted (see identity.ts deviation note).
 */
export function NameGateScreen() {
  const submitName = useApp((s) => s.submitName);
  const [name, setName] = useState('');
  const valid = isValidName(name);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>COUNT TRAINER</Text>
      <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2}>
        ZERO TO{'\n'}CASINO READY.
      </Text>
      <Text style={styles.sub}>What should we call you?</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={theme.colors.textSecondary}
        autoFocus
        returnKeyType="go"
        maxLength={40}
        onSubmitEditing={() => valid && void submitName(name)}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!valid}
        style={[styles.cta, !valid && styles.ctaDisabled]}
        onPress={() => void submitName(name)}
      >
        <Text style={styles.ctaText}>DEAL ME IN →</Text>
      </Pressable>
      <Text style={styles.disclaimer}>
        Educational training tool. No real-money wagering. 17+
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
    paddingBottom: 48,
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
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 48,
  },
  sub: { color: theme.colors.textSecondary, fontSize: 16, marginTop: 14, marginBottom: 14 },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 18,
    marginBottom: 16,
  },
  cta: {
    backgroundColor: theme.semantic.progress,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 2,
  },
  disclaimer: { color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 16 },
});
