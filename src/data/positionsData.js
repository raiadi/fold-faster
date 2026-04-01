const POSITION_OFFSETS = {
  6: {
    Button: 0,
    'Small Blind': 1,
    'Big Blind': 2,
    UTG: 3,
    MP: 4,
    Hijack: 5,
    Cutoff: 5,
  },
  7: {
    Button: 0,
    'Small Blind': 1,
    'Big Blind': 2,
    UTG: 3,
    'UTG+1': 4,
    MP: 5,
    Hijack: 5,
    Cutoff: 6,
  },
  9: {
    Button: 0,
    'Small Blind': 1,
    'Big Blind': 2,
    UTG: 3,
    'UTG+1': 4,
    'UTG+2': 5,
    MP: 6,
    'MP+1': 7,
    Hijack: 7,
    Cutoff: 8,
  },
};

const WRONG_OPTIONS = {
  UTG: ['UTG+1', 'MP', 'Hijack', 'Cutoff'],
  'UTG+1': ['UTG', 'UTG+2', 'MP', 'Hijack'],
  'UTG+2': ['UTG+1', 'MP', 'Hijack', 'Cutoff'],
  MP: ['UTG+1', 'MP+1', 'Hijack', 'Cutoff'],
  'MP+1': ['MP', 'Hijack', 'Cutoff', 'UTG+2'],
  Hijack: ['Cutoff', 'MP', 'UTG+1', 'MP+1'],
  Cutoff: ['Hijack', 'Button', 'MP+1', 'UTG+1'],
  Button: ['Cutoff', 'Small Blind', 'Hijack', 'MP'],
  'Small Blind': ['Button', 'Big Blind', 'Cutoff', 'Hijack'],
  'Big Blind': ['Small Blind', 'UTG', 'Button', 'Cutoff'],
};

function rotateWrongOptions(positionName, shift) {
  const base = WRONG_OPTIONS[positionName] || ['UTG', 'MP', 'Hijack', 'Cutoff'];
  const start = shift % base.length;
  return [...base.slice(start), ...base.slice(0, start)].slice(0, 3);
}

/** Spread dealerIndex across 0..playerCount-1 as i runs 0..49 */
function dealerIndexForQuestion(i, playerCount) {
  const step = playerCount % 2 === 0 ? 3 : 2;
  return (i * step + Math.floor(i / 7) + (i % 3)) % playerCount;
}

function createQuestion(template, sequenceIndex) {
  const { positionName, playerCount, mode } = template;
  const dealerIndex = dealerIndexForQuestion(sequenceIndex, playerCount);
  const targetOffset = POSITION_OFFSETS[playerCount][positionName];
  const targetSeat = (dealerIndex + targetOffset) % playerCount;
  const bigBlindIndex = (dealerIndex + 2) % playerCount;

  return {
    mode,
    playerCount,
    dealerIndex,
    bigBlindIndex,
    targetSeat,
    positionName,
    wrongOptions: rotateWrongOptions(positionName, sequenceIndex),
  };
}

/** Early: UTG, UTG+1, UTG+2 only — valid (position, playerCount) pairs */
const EARLY_TEMPLATES = [
  { positionName: 'UTG', playerCount: 6 },
  { positionName: 'UTG', playerCount: 7 },
  { positionName: 'UTG', playerCount: 9 },
  { positionName: 'UTG+1', playerCount: 7 },
  { positionName: 'UTG+1', playerCount: 9 },
  { positionName: 'UTG+2', playerCount: 9 },
  { positionName: 'UTG', playerCount: 9 },
  { positionName: 'UTG+1', playerCount: 9 },
  { positionName: 'UTG+2', playerCount: 9 },
  { positionName: 'UTG', playerCount: 7 },
];

/** Middle: MP, MP+1, Hijack */
const MIDDLE_TEMPLATES = [
  { positionName: 'MP', playerCount: 6 },
  { positionName: 'MP', playerCount: 7 },
  { positionName: 'MP', playerCount: 9 },
  { positionName: 'MP+1', playerCount: 9 },
  { positionName: 'Hijack', playerCount: 6 },
  { positionName: 'Hijack', playerCount: 7 },
  { positionName: 'Hijack', playerCount: 9 },
  { positionName: 'MP', playerCount: 9 },
  { positionName: 'MP+1', playerCount: 9 },
  { positionName: 'Hijack', playerCount: 9 },
  { positionName: 'MP', playerCount: 7 },
  { positionName: 'Hijack', playerCount: 7 },
];

/** Late: Cutoff, Button, SB, BB */
const LATE_TEMPLATES = [
  { positionName: 'Cutoff', playerCount: 6 },
  { positionName: 'Cutoff', playerCount: 7 },
  { positionName: 'Cutoff', playerCount: 9 },
  { positionName: 'Button', playerCount: 6 },
  { positionName: 'Button', playerCount: 7 },
  { positionName: 'Button', playerCount: 9 },
  { positionName: 'Small Blind', playerCount: 6 },
  { positionName: 'Small Blind', playerCount: 7 },
  { positionName: 'Small Blind', playerCount: 9 },
  { positionName: 'Big Blind', playerCount: 6 },
  { positionName: 'Big Blind', playerCount: 7 },
  { positionName: 'Big Blind', playerCount: 9 },
  { positionName: 'Cutoff', playerCount: 9 },
  { positionName: 'Button', playerCount: 6 },
];

function buildSection(templates) {
  const questions = [];
  for (let i = 0; i < 50; i += 1) {
    const base = templates[i % templates.length];
    const mode = i % 2 === 0 ? 'A' : 'B';
    questions.push(createQuestion({ ...base, mode }, i));
  }
  return questions;
}

export const POSITIONS_DATA = {
  early: buildSection(EARLY_TEMPLATES),
  middle: buildSection(MIDDLE_TEMPLATES),
  late: buildSection(LATE_TEMPLATES),
};
