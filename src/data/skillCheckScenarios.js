// 8 skill-check scenarios: cards (rank + s/h/d/c), position, action, leak_type for wrong-answer tracking
const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' };

export function formatCard(code) {
  if (!code || code.length < 2) return code;
  const suit = SUITS[code[1].toLowerCase()] || code[1];
  return code[0] + suit;
}

export const SKILL_CHECK_SCENARIOS = [
  {
    id: '1',
    cards: ['As', 'Kh'],
    position: 'Late',
    action: 'Folded to you',
    leak_type: 'hand_selection',
  },
  {
    id: '2',
    cards: ['7h', '2d'],
    position: 'Early',
    action: 'Player raised 3x',
    leak_type: 'folding_too_much',
  },
  {
    id: '3',
    cards: ['Qd', 'Qc'],
    position: 'Middle',
    action: 'One player called',
    leak_type: 'aggression',
  },
  {
    id: '4',
    cards: ['Jc', 'Tc'],
    position: 'Button',
    action: 'Folded to you',
    leak_type: 'position_awareness',
  },
  {
    id: '5',
    cards: ['9s', '8s'],
    position: 'Blind',
    action: 'Player raised 2x',
    leak_type: 'calling_too_much',
  },
  {
    id: '6',
    cards: ['Kd', '2h'],
    position: 'Early',
    action: 'Folded to you',
    leak_type: 'hand_selection',
  },
  {
    id: '7',
    cards: ['Ah', '5c'],
    position: 'Late',
    action: 'Player raised 2.5x',
    leak_type: 'position_awareness',
  },
  {
    id: '8',
    cards: ['6d', '6c'],
    position: 'Middle',
    action: 'Two players called',
    leak_type: 'aggression',
  },
];

export const LEAK_LABELS = {
  hand_selection: 'Which hands to play',
  folding_too_much: 'Folding too often',
  aggression: 'When to raise',
  position_awareness: 'Using position',
  calling_too_much: 'Calling too often',
};
