/**
 * Info / Learn content (brief §4.6 teaching layer + §A2.7–9 trust cards).
 * These are the reference cards reachable any time from the Info tab — rules,
 * how counting works, table quality, "our math", and the mandatory law/honesty
 * cards. Plain language, no marketing (the trust backbone).
 */

export interface InfoCard {
  id: string;
  glyph: string;
  title: string;
  body: string[];
}

export const INFO_CARDS: readonly InfoCard[] = [
  {
    id: 'how-to-play',
    glyph: '♠',
    title: 'How to play blackjack',
    body: [
      'Goal: beat the dealer’s hand without going over 21. Number cards count their face value, face cards (J/Q/K) are 10, and an ace is 1 or 11 — whichever helps.',
      'You’re dealt two cards. Hit to take another, Stand to keep what you have, Double to take exactly one more card for double the bet, or Split a pair into two hands.',
      'The dealer must hit until reaching 17, then stands. Go over 21 and you bust (instant loss). A two-card 21 is blackjack and pays 3:2.',
    ],
  },
  {
    id: 'how-counting-works',
    glyph: '♦',
    title: 'How card counting works',
    body: [
      'Counting tracks whether the remaining cards favor you. In Hi-Lo, low cards 2–6 are +1, 7–9 are 0, and tens and aces are −1.',
      'Keep a running count as cards come out. Divide it by the decks left in the shoe to get the true count.',
      'A high true count means more tens and aces are left — better for you — so you bet more. That edge is the entire game. It is legal and it is just arithmetic.',
    ],
  },
  {
    id: 'table-quality',
    glyph: '♣',
    title: 'Why counters walk past 6:5 tables',
    body: [
      'A 3:2 blackjack pays $15 on a $10 bet. A 6:5 blackjack pays only $12 for the same hand.',
      'That single rule change adds roughly 1.4% to the house edge — more than a card counter’s entire advantage.',
      'No amount of counting overcomes a 6:5 table. Reading the rules before you sit down is itself a skill. Find 3:2.',
    ],
  },
  {
    id: 'our-math',
    glyph: '✓',
    title: 'Our math',
    body: [
      'Every strategy chart in this app is cross-checked against two published sources (Wizard of Odds and Stanford Wong’s Professional Blackjack) and covered by automated tests.',
      'The settlement math — including the 6:5 penalty — is unit-tested. The counting engine is verified at 100% coverage.',
      'Correctness is the point. If you ever find a wrong cell, tell us — that’s a bug, not a judgment call.',
    ],
  },
  {
    id: 'know-the-law',
    glyph: '§',
    title: 'Know the law',
    body: [
      'Counting cards in your head is legal everywhere in the United States. You are only using your brain.',
      'But casinos are private property: they can change rules, shuffle early, or refuse your action (“back you off”). That’s their right, not a crime on your part.',
      'Using ANY device or app to count at a live table is a serious crime — a felony in Nevada. Your phone stays in your pocket at the table. This app is for practice only.',
    ],
  },
  {
    id: 'casino-ready',
    glyph: '◆',
    title: 'What “Casino Ready” means',
    body: [
      'The Casino Ready score measures your execution — speed, accuracy, conversion, and composure under pressure. It is a training metric, not a prediction.',
      'It does not promise winnings. A card counter’s edge is small (around 1%) and variance is real: even perfect play loses plenty of sessions.',
      'Train the skill, manage the risk, and never bet money you can’t afford to lose.',
    ],
  },
];
