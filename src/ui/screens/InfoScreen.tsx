import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INFO_CARDS } from '../../app/info';
import { theme } from '../../theme';

/**
 * Info / Learn hub — reference cards reachable any time (founder request: make the
 * information cards available from the nav). Tap a card to expand it.
 */
export function InfoScreen() {
  const [open, setOpen] = useState<string | null>('how-to-play');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>INFO & RULES</Text>
      <Text style={styles.sub}>Everything worth knowing, in plain language.</Text>

      {INFO_CARDS.map((card) => {
        const expanded = open === card.id;
        return (
          <Pressable
            key={card.id}
            accessibilityRole="button"
            style={styles.card}
            onPress={() => setOpen(expanded ? null : card.id)}
          >
            <View style={styles.head}>
              <Text style={styles.glyph}>{card.glyph}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.chev}>{expanded ? '▾' : '›'}</Text>
            </View>
            {expanded &&
              card.body.map((para, i) => (
                <Text key={i} style={styles.para}>
                  {para}
                </Text>
              ))}
          </Pressable>
        );
      })}

      <Text style={styles.footer}>Educational training tool. No real-money wagering. 17+</Text>
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
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: { color: theme.colors.accent, fontSize: 20, width: 24, textAlign: 'center' },
  cardTitle: { flex: 1, color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  chev: { color: theme.colors.textSecondary, fontSize: 18 },
  para: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 10 },
  footer: { color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 16 },
});
