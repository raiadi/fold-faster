const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['h', 'd', 'c', 's'];

function rankIndex(rank) {
  return RANKS.indexOf(rank);
}

/** Higher rank first for notation (e.g. AKs not KAs). */
export const RANGES = {
  early: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'KQs'],
  middle: [
    ...['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'KQs'],
    '99', '88', 'AQo', 'AJs', 'ATs', 'KQo', 'KJs', 'QJs', 'JTs', 'T9s',
  ],
  late: [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s',
    'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs',
    'JTs', 'J9s', 'T9s', 'T8s', '98s', '87s', '76s', '65s',
  ],
};

const POSITIONS_BY_SECTION = {
  early: ['UTG', 'UTG+1', 'UTG+2'],
  middle: ['MP', 'MP+1', 'Hijack'],
  late: ['Cutoff', 'Button'],
};

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCard() {
  return { rank: pickRandom(RANKS), suit: pickRandom(SUITS) };
}

/** Two distinct cards (same rank allowed if different suits — pair). */
function randomTwoCards() {
  let c1;
  let c2;
  let guard = 0;
  do {
    c1 = randomCard();
    c2 = randomCard();
    guard += 1;
  } while ((c1.rank === c2.rank && c1.suit === c2.suit) && guard < 500);
  return [c1, c2];
}

/**
 * Build shorthand hand string: pair | suited | offsuit (higher rank first).
 */
export function handStringFromCards(card1, card2) {
  const i1 = rankIndex(card1.rank);
  const i2 = rankIndex(card2.rank);
  const high = i1 >= i2 ? card1 : card2;
  const low = i1 >= i2 ? card2 : card1;
  if (high.rank === low.rank) {
    return `${high.rank}${low.rank}`;
  }
  if (high.suit === low.suit) {
    return `${high.rank}${low.rank}s`;
  }
  return `${high.rank}${low.rank}o`;
}

function cardsFromHandString(handString) {
  if (handString.length === 2) {
    const r = handString[0];
    const suits = shuffle([...SUITS]);
    return [
      { rank: r, suit: suits[0] },
      { rank: r, suit: suits[1] },
    ];
  }
  const r1 = handString[0];
  const r2 = handString[1];
  const kind = handString[2];
  if (kind === 's') {
    const s = pickRandom(SUITS);
    return [
      { rank: r1, suit: s },
      { rank: r2, suit: s },
    ];
  }
  let s1 = pickRandom(SUITS);
  let s2 = pickRandom(SUITS);
  let tries = 0;
  while (s1 === s2 && tries < 20) {
    s2 = pickRandom(SUITS);
    tries += 1;
  }
  return [
    { rank: r1, suit: s1 },
    { rank: r2, suit: s2 },
  ];
}

function randomPlayableQuestion(section) {
  const pool = RANGES[section];
  const handString = pickRandom(pool);
  const [card1, card2] = cardsFromHandString(handString);
  const position = pickRandom(POSITIONS_BY_SECTION[section]);
  return {
    card1,
    card2,
    handString,
    position,
    isPlayable: true,
  };
}

function randomFoldQuestion(section) {
  const rangeSet = new Set(RANGES[section]);
  let guard = 0;
  while (guard < 2000) {
    guard += 1;
    const [c1, c2] = randomTwoCards();
    const handString = handStringFromCards(c1, c2);
    if (!rangeSet.has(handString)) {
      return {
        card1: c1,
        card2: c2,
        handString,
        position: pickRandom(POSITIONS_BY_SECTION[section]),
        isPlayable: false,
      };
    }
  }
  const card1 = { rank: '7', suit: 'h' };
  const card2 = { rank: '2', suit: 'c' };
  const handString = handStringFromCards(card1, card2);
  return {
    card1,
    card2,
    handString,
    position: pickRandom(POSITIONS_BY_SECTION[section]),
    isPlayable: rangeSet.has(handString),
  };
}

/**
 * @param {'early'|'middle'|'late'} section
 * @param {number} [count=15]
 */
export function generateRangesQuestions(section, count = 15) {
  if (!RANGES[section]) return [];
  const playableTarget = Math.floor(count / 2);
  const foldCount = count - playableTarget;
  const out = [];
  for (let i = 0; i < playableTarget; i += 1) {
    out.push(randomPlayableQuestion(section));
  }
  for (let i = 0; i < foldCount; i += 1) {
    out.push(randomFoldQuestion(section));
  }
  return shuffle(out);
}
