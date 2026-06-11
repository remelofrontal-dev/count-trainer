import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LESSONS } from '../../app/lessons';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/**
 * Level 0 — Blackjack Basics. Show-then-do: read one idea, tap to apply it, advance.
 * Beginners land here from placement; anyone can replay it from the path.
 */
export function BasicsScreen() {
  const completeBasics = useApp((s) => s.completeBasics);
  const goHome = useApp((s) => s.goHome);
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);

  const lesson = LESSONS[step]!;
  const isLast = step === LESSONS.length - 1;

  const choose = (i: number) => {
    if (lesson.practice.options[i]!.correct) {
      setAnswered(true);
      setWrong(null);
    } else {
      setWrong(i); // gentle: mark wrong, let them try again (it's learning, no penalty)
    }
  };

  const next = () => {
    if (isLast) {
      void completeBasics();
    } else {
      setStep(step + 1);
      setAnswered(false);
      setWrong(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={goHome}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
        <Text style={styles.progress}>
          {step + 1} / {LESSONS.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / LESSONS.length) * 100}%` }]} />
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>BLACKJACK BASICS</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.teach}>{lesson.teach}</Text>

        <View style={styles.practice}>
          <Text style={styles.prompt}>{lesson.practice.prompt}</Text>
          {lesson.practice.options.map((opt, i) => {
            const correctPicked = answered && opt.correct;
            const wrongPicked = wrong === i;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                disabled={answered}
                style={[styles.option, correctPicked && styles.optionCorrect, wrongPicked && styles.optionWrong]}
                onPress={() => choose(i)}
              >
                <Text style={[styles.optionText, correctPicked && styles.optionTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
          {wrong !== null && <Text style={styles.tryAgain}>Not quite — try again.</Text>}
          {answered && <Text style={styles.nice}>Nice. ✓</Text>}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!answered}
        style={[styles.cta, !answered && styles.ctaDisabled]}
        onPress={next}
      >
        <Text style={styles.ctaText}>{isLast ? 'START COUNTING →' : 'CONTINUE →'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 22, paddingTop: 60 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { color: theme.colors.textSecondary, fontSize: 14 },
  progress: { color: theme.colors.textSecondary, fontFamily: theme.typography.display, fontSize: 13, letterSpacing: 1 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: theme.colors.surface, marginTop: 10 },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: theme.semantic.progress },
  body: { flex: 1, justifyContent: 'center' },
  eyebrow: { color: theme.colors.accent, fontFamily: theme.typography.display, fontSize: 12, letterSpacing: 3 },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.display,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
  },
  teach: { color: theme.colors.text, fontSize: 17, lineHeight: 25, marginTop: 14 },
  practice: {
    marginTop: 28,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  prompt: { color: theme.colors.text, fontSize: 15, fontWeight: '600', marginBottom: 14 },
  option: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  optionCorrect: { borderColor: theme.semantic.progress, backgroundColor: theme.colors.background },
  optionWrong: { borderColor: theme.colors.error },
  optionText: { color: theme.colors.text, fontSize: 16 },
  optionTextOn: { color: theme.semantic.progress, fontWeight: '700' },
  tryAgain: { color: theme.colors.error, fontSize: 13, marginTop: 4 },
  nice: { color: theme.semantic.progress, fontSize: 13, marginTop: 4, fontWeight: '600' },
  cta: { backgroundColor: theme.semantic.progress, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
