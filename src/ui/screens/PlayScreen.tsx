import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  availableActions,
  dealerUpcard,
  type Hand,
  type PlayerAction,
  type Seat,
  type TableState,
} from '../../engine/table';
import type { Card } from '../../engine/types';
import { handValue } from '../../engine/hand';
import { basicStrategyAction, resolveAction } from '../../engine/basicStrategy';
import { liveRunningCount, liveTrueCount } from '../../app/play';
import { effectivePremium, showProTag } from '../../app/entitlement';
import { theme } from '../../theme';
import { useApp } from '../appStore';

/**
 * Play mode (brief §4.6.2) — the full blackjack table on felt. Built on the pure
 * table engine. Coach ON overlays the basic-strategy hint + live count. Multi-seat
 * is premium (PRO tag during beta). All controls live in the bottom thumb zone.
 */
export function PlayScreen() {
  const play = useApp((s) => s.play);
  const config = useApp((s) => s.playConfig);
  const record = useApp((s) => s.playRecord);
  const coach = useApp((s) => s.playCoach);
  const playCount = useApp((s) => s.playCount);
  const entitlement = useApp((s) => s.entitlement);
  const dealRound = useApp((s) => s.dealRound);
  const playAct = useApp((s) => s.playAct);
  const togglePlayCoach = useApp((s) => s.togglePlayCoach);
  const setPlayConfig = useApp((s) => s.setPlayConfig);
  const exitPlay = useApp((s) => s.exitPlay);

  const inRound = play !== null && play.phase === 'player';
  const settled = play !== null && play.phase === 'settlement';
  const runningCount = liveRunningCount(playCount, play);
  const trueCount = play !== null ? liveTrueCount(runningCount, play.shoe.decksRemaining) : 0;
  const playerSeat = play?.seats.find((s) => s.isPlayer) ?? null;

  return (
    <View style={styles.container}>
      {/* Header — record + chips (display only) */}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={exitPlay}>
          <Text style={styles.back}>‹ Path</Text>
        </Pressable>
        <Text style={styles.record}>
          {record.wins}W · {record.losses}L · {record.pushes}P
        </Text>
        <Text style={[styles.chips, record.chips >= 0 ? styles.chipsUp : styles.chipsDown]}>
          {record.chips >= 0 ? '+' : ''}
          {record.chips}
        </Text>
      </View>

      {/* Felt — dealer + seats */}
      <ScrollView style={styles.felt} contentContainerStyle={styles.feltContent}>
        <Text style={styles.zoneLabel}>DEALER</Text>
        <CardRow cards={play ? dealerCards(play) : []} />

        {play?.seats.map((seat, i) => (
          <View key={i} style={styles.seatBlock}>
            <Text style={styles.zoneLabel}>
              {seat.isPlayer ? 'YOU' : `SEAT ${i + 1}`}
              {!seat.isPlayer && showProTag(config.numAISeats > 0 ? 'premium' : 'free', entitlement) && (
                <Text style={styles.pro}>  PRO</Text>
              )}
            </Text>
            {seat.hands.map((hand, h) => (
              <HandView key={h} hand={hand} active={inRound && seat.isPlayer && seat.activeHand === h} />
            ))}
          </View>
        ))}

        {coach && play !== null && (
          <View style={styles.coach}>
            <Text style={styles.coachLabel}>COACH</Text>
            <Text style={styles.coachLine}>
              Count: RC {runningCount >= 0 ? '+' : ''}
              {runningCount} · TC {trueCount >= 0 ? '+' : ''}
              {trueCount.toFixed(1)}
            </Text>
            {inRound && playerSeat !== null && (
              <Text style={styles.coachHint}>Book play: {hint(play, playerSeat)}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Controls — bottom thumb zone */}
      <View style={styles.controls}>
        {!inRound ? (
          <Pressable accessibilityRole="button" style={styles.deal} onPress={dealRound}>
            <Text style={styles.dealText}>{settled ? 'DEAL AGAIN →' : 'DEAL →'}</Text>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            {availableActions(play!).map((a) => (
              <Pressable
                key={a}
                accessibilityRole="button"
                style={styles.action}
                onPress={() => playAct(a)}
              >
                <Text style={styles.actionText}>{ACTION_LABEL[a]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.configRow}>
          <Toggle label={`Coach ${coach ? 'ON' : 'OFF'}`} on={coach} onPress={togglePlayCoach} />
          <Toggle
            label={`${config.numAISeats === 0 ? 'Heads-up' : `${config.numAISeats} seats`}`}
            on={config.numAISeats > 0}
            onPress={() => setPlayConfig({ numAISeats: config.numAISeats >= 4 ? 0 : config.numAISeats + 2 })}
          />
          <Toggle
            label={config.blackjackPayout}
            on={config.blackjackPayout === '3:2'}
            onPress={() =>
              setPlayConfig({ blackjackPayout: config.blackjackPayout === '3:2' ? '6:5' : '3:2' })
            }
          />
        </View>
        {effectivePremium(entitlement) && config.numAISeats > 0 && (
          <Text style={styles.betaNote}>Multi-seat is PRO — unlocked in beta</Text>
        )}
      </View>
    </View>
  );
}

const ACTION_LABEL: Record<PlayerAction, string> = {
  hit: 'HIT',
  stand: 'STAND',
  double: 'DOUBLE',
  split: 'SPLIT',
};

function dealerCards(play: TableState): Card[] {
  // hide the hole until revealed
  return play.holeRevealed ? play.dealer : [play.dealer[0] as Card];
}

function hint(play: TableState, seat: Seat): string {
  const hand = seat.hands[seat.activeHand];
  if (hand === undefined) return '—';
  const a = resolveAction(basicStrategyAction(hand.cards, dealerUpcard(play).rank, play.rules), {
    canDouble: hand.cards.length === 2,
    canSurrender: false,
  });
  return { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' }[a];
}

function CardRow({ cards }: { cards: Card[] }) {
  return (
    <View style={styles.cardRow}>
      {cards.length === 0 ? (
        <Text style={styles.empty}>—</Text>
      ) : (
        cards.map((card, i) => (
          <View key={i} style={styles.card}>
            <Text style={[styles.cardText, isRed(card.suit) && styles.cardRed]}>
              {card.rank}
              {card.suit}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function HandView({ hand, active }: { hand: Hand; active: boolean }) {
  const v = handValue(hand.cards);
  return (
    <View style={[styles.hand, active && styles.handActive]}>
      <CardRow cards={hand.cards} />
      <Text style={styles.handTotal}>
        {v.isSoft ? 'soft ' : ''}
        {v.total}
        {hand.outcome !== null && <Text style={outcomeStyle(hand.outcome)}>  {hand.outcome.toUpperCase()}</Text>}
      </Text>
    </View>
  );
}

function outcomeStyle(outcome: string) {
  if (outcome === 'win' || outcome === 'blackjack') return styles.win;
  if (outcome === 'lose') return styles.lose;
  return styles.push;
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={[styles.toggle, on && styles.toggleOn]} onPress={onPress}>
      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{label}</Text>
    </Pressable>
  );
}

function isRed(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  back: { color: theme.colors.textSecondary, fontSize: 14 },
  record: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 15, letterSpacing: 1 },
  chips: { fontFamily: theme.typography.display, fontSize: 16, fontWeight: '700' },
  chipsUp: { color: theme.semantic.win },
  chipsDown: { color: theme.colors.error },
  felt: { flex: 1, marginHorizontal: 12, borderRadius: 18, backgroundColor: theme.colors.surface },
  feltContent: { padding: 16, alignItems: 'center' },
  zoneLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.display,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 10,
    marginBottom: 4,
  },
  pro: { color: theme.colors.accent, fontSize: 9 },
  seatBlock: { alignItems: 'center', width: '100%' },
  cardRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 56 },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  cardText: { color: theme.colors.background, fontFamily: theme.typography.display, fontSize: 20, fontWeight: '800' },
  cardRed: { color: theme.colors.error },
  empty: { color: theme.colors.textSecondary, fontSize: 24 },
  hand: { alignItems: 'center', padding: 6, borderRadius: 10, marginVertical: 2 },
  handActive: { borderColor: theme.semantic.progress, borderWidth: 1 },
  handTotal: { color: theme.colors.text, fontSize: 13, marginTop: 4 },
  win: { color: theme.semantic.win, fontWeight: '700' },
  lose: { color: theme.colors.error, fontWeight: '700' },
  push: { color: theme.colors.accent, fontWeight: '700' },
  coach: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
    width: '100%',
  },
  coachLabel: { color: theme.colors.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  coachLine: { color: theme.colors.text, fontSize: 14, marginTop: 4, fontWeight: '600' },
  coachHint: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  controls: { padding: 16, paddingBottom: 28 },
  deal: {
    backgroundColor: theme.semantic.progress,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dealText: {
    color: theme.colors.background,
    fontFamily: theme.typography.display,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionText: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 15, letterSpacing: 1 },
  configRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  toggle: {
    flex: 1,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleOn: { borderColor: theme.semantic.progress },
  toggleText: { color: theme.colors.textSecondary, fontSize: 12 },
  toggleTextOn: { color: theme.semantic.progress },
  betaNote: { color: theme.colors.accent, fontSize: 10, textAlign: 'center', marginTop: 8 },
});
