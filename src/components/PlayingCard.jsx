const SUITS = {
  h: { symbol: '♥', color: 'text-red-600' },
  d: { symbol: '♦', color: 'text-red-600' },
  c: { symbol: '♣', color: 'text-gray-900' },
  s: { symbol: '♠', color: 'text-gray-900' },
};

const SIZE_STYLES = {
  sm: {
    box: 'w-10 h-14',
    corner: 'text-xs leading-none',
    center: 'text-lg',
  },
  md: {
    box: 'w-14 h-20',
    corner: 'text-sm leading-none',
    center: 'text-2xl',
  },
  lg: {
    box: 'w-20 h-28',
    corner: 'text-base leading-none',
    center: 'text-4xl',
  },
};

export default function PlayingCard({
  rank,
  suit,
  size = 'md',
  faceDown = false,
}) {
  const sizeKey = SIZE_STYLES[size] ? size : 'md';
  const s = SUITS[suit] || SUITS.s;
  const { box, corner, center } = SIZE_STYLES[sizeKey];

  if (faceDown) {
    return (
      <div
        className={`${box} rounded-lg border-2 border-green-950 shadow-md shrink-0 overflow-hidden`}
        style={{
          background:
            'repeating-linear-gradient(135deg, #166534 0px, #166534 6px, #14532d 6px, #14532d 12px)',
        }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`${box} relative rounded-lg border border-gray-200 bg-white shadow-md shrink-0 flex flex-col`}
    >
      <div className={`absolute left-1 top-1 flex flex-col items-center ${corner} ${s.color} font-bold`}>
        <span>{rank}</span>
        <span>{s.symbol}</span>
      </div>
      <div className={`flex-1 flex items-center justify-center ${center} ${s.color}`}>
        {s.symbol}
      </div>
      <div
        className={`absolute right-1 bottom-1 flex flex-col items-center ${corner} ${s.color} font-bold`}
        style={{ transform: 'rotate(180deg)' }}
      >
        <span>{rank}</span>
        <span>{s.symbol}</span>
      </div>
    </div>
  );
}
