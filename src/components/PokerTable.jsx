const DEFAULT_CONTAINER_WIDTH = 340;
const DEFAULT_CONTAINER_HEIGHT = 200;

export default function PokerTable({
  playerCount = 6,
  dealerIndex = 0,
  bigBlindIndex = 1,
  highlightedSeat = null,
  onSeatClick,
  answeredSeat = null,
  correctSeat = null,
  showResult = false,
}) {
  const seatCount = [6, 7, 9].includes(playerCount) ? playerCount : 6;

  const centerX = DEFAULT_CONTAINER_WIDTH / 2;
  const centerY = DEFAULT_CONTAINER_HEIGHT / 2;
  const radius = 95;

  const seats = Array.from({ length: seatCount }, (_, index) => {
    const angle = (index / seatCount) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { index, x, y };
  });

  const isClickable = highlightedSeat === null && typeof onSeatClick === 'function';

  return (
    <div className="w-full max-w-[340px] mx-auto">
      <div
        className="relative w-full h-[200px] bg-green-900 rounded-full border border-white/15"
        style={{ backgroundColor: '#0f3d2a' }}
      >
        {seats.map(({ index, x, y }) => {
          const isBigBlind = index === bigBlindIndex;
          const isHighlighted = highlightedSeat === index;
          const isCorrect = showResult && correctSeat === index;
          const isWrong =
            showResult && answeredSeat === index && correctSeat !== null && answeredSeat !== correctSeat;

          const seatClasses = [
            'absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full',
            'flex items-center justify-center text-xs text-white font-semibold',
            'bg-gray-700 border border-gray-500 transition',
            isBigBlind ? 'border-2 border-white' : '',
            isHighlighted ? 'ring-2 ring-green-400 scale-110' : '',
            isCorrect ? 'bg-green-600 border-green-400' : '',
            isWrong ? 'bg-red-600 border-red-400' : '',
            isClickable ? 'cursor-pointer hover:scale-105 active:scale-95 hover:border-white/80' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={index}
              type="button"
              className={seatClasses}
              style={{ left: `${x}px`, top: `${y}px` }}
              onClick={() => {
                if (isClickable) onSeatClick(index);
              }}
            >
              {isBigBlind ? 'BB' : index + 1}

              {index === dealerIndex && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-[10px] text-brand-dark font-bold flex items-center justify-center border border-white/80">
                  D
                </span>
              )}

              {showResult && isCorrect && (
                <span className="absolute -top-2 -right-2 text-[10px] w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center">
                  ✓
                </span>
              )}

              {showResult && isWrong && (
                <span className="absolute -top-2 -right-2 text-[10px] w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center">
                  X
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
