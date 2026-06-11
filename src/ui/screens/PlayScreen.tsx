import { useState } from 'react';
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
import { coachVisibility, liveRunningCount, liveTrueCount, nextSeatConfig, seatLabel } from '../../app/play';
import { type Term, jargonDefinition, jargonText } from '../../app/jargon';
import type { ProgressState } from '../../app/progress';
import { effectivePremium, showProTag } from '../../app/entitlement';
import { theme } from '../../theme';
import { useApp } from '../appStore';
import { PlayBriefing } from '../PlayBriefing';

/**
 * Play mode (brief §4.6.2) — a real blackjack table layout: dealer on a separate
 * level up top, player seats in a horizontal row below (like a live table when a
 * single hand is in play). Coach ON shows the live count + book play.
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
  const progress = useApp((s) => s.progress);
  const briefingSeen = useApp((s) => s.progress.playBriefingSeen);
  const markPlayBriefingSeen = useApp((s) => s.markPlayBriefingSeen);

  const [explainOpen, setExplainOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(!briefingSeen);
  const [peeked, setPeeked] = useState(false);

  const inRound = play !== null && play.phase === 'player';
  const settled = play !== null && play.phase === 'settlement';
  const runningCount = liveRunningCount(playCount, play);
  const trueCount = play !== null ? liveTrueCount(runningCount, play.shoe.decksRemaining) : 0;
  const playerSeat = play?.seats.find((s) => s.isPlayer) ?? null;
  const multiSeat = (play?.seats.length ?? 1) > 1;
  const vis = coachVisibility(progress);

  // Which terms are currently on screen — drives the tap-to-explain sheet.
  const visibleTerms: Term[] = ['record', 'chips', 'push'];
  if (coach) {
    visibleTerms.push('book');
    if (vis.runningCount) visibleTerms.push('runningCount');
    if (vis.trueCount) visibleTerms.push('trueCount');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={exitPlay}>
          <Text style={styles.back}>‹ Path</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setExplainOpen(true)} style={styles.headerCenter}>
          <Text style={styles.record}>
            {record.wins}W · {record.losses}L · {record.pushes}P
          </Text>
          <Text style={styles.recordHint}>tap to explain ⓘ</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setExplainOpen(true)}>
          <Text style={styles.chipsLabel}>CHIPS</Text>
          <Text style={[styles.chips, record.chips >= 0 ? styles.chipsUp : styles.chipsDown]}>
            {record.chips >= 0 ? '+' : ''}
            {record.chips}
          </Text>
        </Pressable>
      </View>

      {/* Felt: dealer up top on its own level, players in a row below */}
      <View style={styles.felt}>
        <View style={styles.dealerArea}>
          <Text style={styles.zoneLabel}>DEALER</Text>
          <CardRow cards={play ? dealerCards(play) : []} size="md" />
        </View>

        <View style={styles.tableLine} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.seatsRow, !multiSeat && styles.seatsRowSingle]}
        >
          {play === null ? (
            <Text style={styles.empty}>Tap deal to start</Text>
          ) : (
            play.seats.map((seat, i) => (
              <Seat
                key={i}
                seat={seat}
                index={i}
                inRound={inRound}
                showPro={!seat.isPlayer && showProTag('premium', entitlement) && multiSeat}
                compact={multiSeat}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Level-aware coach strip — only shows concepts the player has reached */}
      {coach && play !== null && (
        <Pressable accessibilityRole="button" style={styles.coach} onPress={() => setExplainOpen(true)}>
          <Text style={styles.coachText}>
            {coachLine({ progress, vis, inRound, play, playerSeat, runningCount, trueCount })}
          </Text>
          <Text style={styles.coachHint}>tap to explain ⓘ</Text>
        </Pressable>
      )}
      {/* Coach OFF: count hidden (exam mode), with a peek eye */}
      {!coach && play !== null && (vis.runningCount || vis.trueCount) && (
        <Pressable accessibilityRole="button" style={styles.coachOff} onPress={() => setPeeked((p) => !p)}>
          <Text style={styles.coachOffText}>
            {peeked
              ? coachLine({ progress, vis, inRound: false, play, playerSeat, runningCount, trueCount })
              : '👁 count hidden — tap to peek'}
          </Text>
        </Pressable>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!inRound ? (
          <Pressable accessibilityRole="button" style={styles.deal} onPress={dealRound}>
            <Text style={styles.dealText}>{settled ? 'DEAL AGAIN →' : 'DEAL →'}</Text>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            {availableActions(play).map((a) => (
              <Pressable key={a} accessibilityRole="button" style={styles.action} onPress={() => playAct(a)}>
                <Text style={styles.actionText}>{ACTION_LABEL[a]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.configRow}>
          <Toggle label={`Coach ${coach ? 'ON' : 'OFF'}`} on={coach} onPress={togglePlayCoach} />
          <Toggle
            label={seatLabel(config.numAISeats)}
            on={config.numAISeats > 0}
            onPress={() => setPlayConfig({ numAISeats: nextSeatConfig(config.numAISeats) })}
          />
          <Toggle
            label={config.blackjackPayout}
            on={config.blackjackPayout === '3:2'}
            onPress={() => setPlayConfig({ blackjackPayout: config.blackjackPayout === '3:2' ? '6:5' : '3:2' })}
          />
        </View>
        {effectivePremium(entitlement) && config.numAISeats > 0 && (
          <Text style={styles.betaNote}>Multi-seat is PRO — unlocked in beta</Text>
        )}
        <Pressable accessibilityRole="button" onPress={() => setBriefingOpen(true)}>
          <Text style={styles.howTo}>? How Play mode works</Text>
        </Pressable>
      </View>

      {explainOpen && <ExplainSheet terms={visibleTerms} onClose={() => setExplainOpen(false)} />}
      {briefingOpen && (
        <PlayBriefing
          progress={progress}
          onClose={() => {
            setBriefingOpen(false);
            if (!briefingSeen) void markPlayBriefingSeen();
          }}
        />
      )}
    </View>
  );
}

interface CoachLineArgs {
  progress: ProgressState;
  vis: ReturnType<typeof coachVisibility>;
  inRound: boolean;
  play: TableState | null;
  playerSeat: Seat | null;
  runningCount: number;
  trueCount: number;
}

/** Build the level-aware coach line: Book (always when in a hand), then RC, then TC. */
function coachLine(a: CoachLineArgs): string {
  const parts: string[] = [];
  if (a.inRound && a.play !== null && a.playerSeat !== null) {
    parts.push(`${jargonText('book', a.progress)}: ${hint(a.play, a.playerSeat)}`);
  }
  if (a.vis.runningCount) {
    parts.push(`${jargonText('runningCount', a.progress)} ${a.runningCount >= 0 ? '+' : ''}${a.runningCount}`);
  }
  if (a.vis.trueCount) {
    parts.push(`${jargonText('trueCount', a.progress)} ${a.trueCount >= 0 ? '+' : ''}${a.trueCount.toFixed(1)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Deal to begin';
}

function ExplainSheet({ terms, onClose }: { terms: Term[]; onClose: () => void }) {
  const unique = [...new Set(terms)];
  return (
    <View style={styles.sheetOverlay}>
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>WHAT THESE MEAN</Text>
        {unique.map((t) => (
          <Text key={t} style={styles.sheetDef}>
            {jargonDefinition(t)}
          </Text>
        ))}
        <Pressable accessibilityRole="button" style={styles.sheetClose} onPress={onClose}>
          <Text style={styles.sheetCloseText}>GOT IT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ACTION_LABEL: Record<PlayerAction, string> = { hit: 'HIT', stand: 'STAND', double: 'DOUBLE', split: 'SPLIT' };

function dealerCards(play: TableState): Card[] {
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

function Seat({
  seat,
  index,
  inRound,
  showPro,
  compact,
}: {
  seat: Seat;
  index: number;
  inRound: boolean;
  showPro: boolean;
  compact: boolean;
}) {
  return (
    <View style={styles.seat}>
      {seat.hands.map((hand, h) => (
        <HandView
          key={h}
          hand={hand}
          active={inRound && seat.isPlayer && seat.activeHand === h}
          size={compact ? 'sm' : 'md'}
        />
      ))}
      <Text style={[styles.seatLabel, seat.isPlayer && styles.seatLabelYou]}>
        {seat.isPlayer ? 'YOU' : `SEAT ${index + 1}`}
        {showPro ? '  PRO' : ''}
      </Text>
    </View>
  );
}

function HandView({ hand, active, size }: { hand: Hand; active: boolean; size: 'sm' | 'md' }) {
  const v = handValue(hand.cards);
  return (
    <View style={[styles.hand, active && styles.handActive]}>
      <CardRow cards={hand.cards} size={size} />
      <Text style={styles.handTotal}>
        {v.isSoft ? 'soft ' : ''}
        {v.total}
        {hand.outcome !== null && <Text style={outcomeStyle(hand.outcome)}>  {hand.outcome.toUpperCase()}</Text>}
      </Text>
    </View>
  );
}

function CardRow({ cards, size }: { cards: Card[]; size: 'sm' | 'md' }) {
  return (
    <View style={styles.cardRow}>
      {cards.length === 0 ? (
        <Text style={styles.empty}>—</Text>
      ) : (
        cards.map((card, i) => (
          <View key={i} style={size === 'sm' ? styles.cardSm : styles.cardMd}>
            <Text
              style={[size === 'sm' ? styles.cardSmText : styles.cardMdText, isRed(card.suit) && styles.cardRed]}
            >
              {card.rank}
              {card.suit}
            </Text>
          </View>
        ))
      )}
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
  headerCenter: { alignItems: 'center' },
  record: { color: theme.colors.text, fontFamily: theme.typography.display, fontSize: 15, letterSpacing: 1 },
  recordHint: { color: theme.colors.textSecondary, fontSize: 8, letterSpacing: 1 },
  chipsLabel: { color: theme.colors.textSecondary, fontSize: 8, letterSpacing: 2, textAlign: 'right' },
  chips: { fontFamily: theme.typography.display, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  chipsUp: { color: theme.semantic.win },
  chipsDown: { color: theme.colors.error },
  felt: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  dealerArea: { alignItems: 'center' },
  tableLine: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 28,
    marginVertical: 8,
  },
  zoneLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.display,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 6,
  },
  seatsRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, gap: 16 },
  seatsRowSingle: { flex: 1, justifyContent: 'center' },
  seat: { alignItems: 'center', gap: 4 },
  seatLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.display,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },
  seatLabelYou: { color: theme.semantic.progress },
  cardRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  cardMd: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  cardMdText: { color: theme.colors.background, fontFamily: theme.typography.display, fontSize: 20, fontWeight: '800' },
  cardSm: {
    backgroundColor: theme.colors.card,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minWidth: 28,
    alignItems: 'center',
  },
  cardSmText: { color: theme.colors.background, fontFamily: theme.typography.display, fontSize: 14, fontWeight: '800' },
  cardRed: { color: theme.colors.error },
  empty: { color: theme.colors.textSecondary, fontSize: 18 },
  hand: { alignItems: 'center', padding: 4, borderRadius: 10 },
  handActive: { borderColor: theme.semantic.progress, borderWidth: 1 },
  handTotal: { color: theme.colors.text, fontSize: 12, marginTop: 3 },
  win: { color: theme.semantic.win, fontWeight: '700' },
  lose: { color: theme.colors.error, fontWeight: '700' },
  push: { color: theme.colors.accent, fontWeight: '700' },
  coach: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  coachText: { color: theme.colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  coachHint: { color: theme.colors.textSecondary, fontSize: 8, letterSpacing: 1, textAlign: 'center', marginTop: 2 },
  coachOff: {
    marginHorizontal: 12,
    marginTop: 8,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  coachOffText: { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' },
  howTo: { color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 10, letterSpacing: 1 },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.accent,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 34,
  },
  sheetTitle: { color: theme.colors.accent, fontFamily: theme.typography.display, fontSize: 13, letterSpacing: 3, marginBottom: 12 },
  sheetDef: { color: theme.colors.text, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  sheetClose: { marginTop: 4, alignItems: 'center', paddingVertical: 12 },
  sheetCloseText: { color: theme.semantic.progress, fontFamily: theme.typography.display, fontSize: 15, letterSpacing: 2 },
  controls: { padding: 16, paddingBottom: 24 },
  deal: { backgroundColor: theme.semantic.progress, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
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
    backgroundColor: theme.colors.background,
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
