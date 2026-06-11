/**
 * Level 0 — Blackjack Basics (brief §4.4 A2 / §4.6 teaching layer).
 * Show-then-do: one explanation, then an immediate tap to apply it. Never a wall
 * of text. This is the beginner on-ramp the "New to blackjack" placement leads to.
 */

export interface Practice {
  prompt: string;
  options: { label: string; correct: boolean }[];
}

export interface LessonStep {
  title: string;
  teach: string;
  practice: Practice;
}

export const LESSONS: readonly LessonStep[] = [
  {
    title: 'The goal',
    teach: 'Beat the dealer’s hand without going over 21. Go over and you “bust” — an instant loss.',
    practice: {
      prompt: 'You have 19, the dealer has 17. Who wins?',
      options: [
        { label: 'You', correct: true },
        { label: 'Dealer', correct: false },
      ],
    },
  },
  {
    title: 'Card values',
    teach: 'Number cards are worth their number. J, Q and K are all worth 10. An Ace is 1 or 11 — whichever helps you.',
    practice: {
      prompt: 'What is a King worth?',
      options: [
        { label: '13', correct: false },
        { label: '10', correct: true },
        { label: '11', correct: false },
      ],
    },
  },
  {
    title: 'Adding it up',
    teach: 'Your hand total is just the sum of your cards. With an Ace, use 11 unless that would bust you — then it’s 1.',
    practice: {
      prompt: 'You hold a 10 and a 7. What’s your total?',
      options: [
        { label: '16', correct: false },
        { label: '17', correct: true },
        { label: '18', correct: false },
      ],
    },
  },
  {
    title: 'Your moves',
    teach: 'Hit = take another card. Stand = keep what you have. Double = one more card for double the bet. Split = turn a pair into two hands.',
    practice: {
      prompt: 'You want exactly one more card. Which move?',
      options: [
        { label: 'Hit', correct: true },
        { label: 'Stand', correct: false },
        { label: 'Split', correct: false },
      ],
    },
  },
  {
    title: 'The dealer',
    teach: 'The dealer has no choices: they must keep taking cards until they reach 17, then they stop. That predictability is what you exploit.',
    practice: {
      prompt: 'The dealer is showing 16. Must they take a card?',
      options: [
        { label: 'Yes', correct: true },
        { label: 'No', correct: false },
      ],
    },
  },
  {
    title: 'Blackjack!',
    teach: 'An Ace plus any ten-value card as your first two cards is a “blackjack” — the best hand. It pays 3:2 (a $10 bet wins $15).',
    practice: {
      prompt: 'Your first two cards are A and K. Is that a blackjack?',
      options: [
        { label: 'Yes', correct: true },
        { label: 'No', correct: false },
      ],
    },
  },
];
