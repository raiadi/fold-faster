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

const EARLY_POOL = [
  { positionName: 'UTG', playerCount: 6, mode: 'A' },
  { positionName: 'UTG', playerCount: 7, mode: 'B' },
  { positionName: 'UTG', playerCount: 9, mode: 'A' },
  { positionName: 'UTG+1', playerCount: 7, mode: 'A' },
  { positionName: 'UTG+1', playerCount: 9, mode: 'B' },
  { positionName: 'UTG+2', playerCount: 9, mode: 'A' },
  { positionName: 'UTG', playerCount: 9, mode: 'B' },
  { positionName: 'UTG+1', playerCount: 9, mode: 'A' },
  { positionName: 'UTG', playerCount: 6, mode: 'B' },
  { positionName: 'UTG+2', playerCount: 9, mode: 'B' },
];

const MIDDLE_POOL = [
  { positionName: 'MP', playerCount: 6, mode: 'A' },
  { positionName: 'MP', playerCount: 7, mode: 'B' },
  { positionName: 'MP', playerCount: 9, mode: 'A' },
  { positionName: 'MP+1', playerCount: 9, mode: 'B' },
  { positionName: 'Hijack', playerCount: 6, mode: 'A' },
  { positionName: 'Hijack', playerCount: 7, mode: 'B' },
  { positionName: 'Hijack', playerCount: 9, mode: 'A' },
  { positionName: 'MP', playerCount: 9, mode: 'B' },
  { positionName: 'MP+1', playerCount: 9, mode: 'A' },
  { positionName: 'Hijack', playerCount: 9, mode: 'B' },
];

const LATE_POOL = [
  { positionName: 'Cutoff', playerCount: 6, mode: 'A' },
  { positionName: 'Cutoff', playerCount: 7, mode: 'B' },
  { positionName: 'Cutoff', playerCount: 9, mode: 'A' },
  { positionName: 'Button', playerCount: 6, mode: 'B' },
  { positionName: 'Button', playerCount: 9, mode: 'A' },
  { positionName: 'Small Blind', playerCount: 7, mode: 'A' },
  { positionName: 'Small Blind', playerCount: 9, mode: 'B' },
  { positionName: 'Big Blind', playerCount: 6, mode: 'A' },
  { positionName: 'Big Blind', playerCount: 9, mode: 'B' },
  { positionName: 'Button', playerCount: 7, mode: 'A' },
];

function rotateWrongOptions(positionName, shift) {
  const base = WRONG_OPTIONS[positionName] || ['UTG', 'MP', 'Hijack', 'Cutoff'];
  const start = shift % base.length;
  return [...base.slice(start), ...base.slice(0, start)].slice(0, 3);
}

function createQuestion(template, sequenceIndex) {
  const { positionName, playerCount, mode } = template;
  const dealerIndex = (sequenceIndex * 2 + playerCount - 1) % playerCount;
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

function buildSection(pool) {
  const questions = [];
  for (let i = 0; i < 20; i += 1) {
    const template = pool[i % pool.length];
    questions.push(createQuestion(template, i));
  }
  return questions;
}

export const POSITIONS_DATA = {
  early: buildSection(EARLY_POOL),
  middle: buildSection(MIDDLE_POOL),
  late: buildSection(LATE_POOL),
};

