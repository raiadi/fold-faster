import { RANGES } from '../data/rangesData';

/** High to low, matching standard range-matrix layout */
const MATRIX_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

const cellStyle = {
  width: 'calc(100vw / 14)',
  aspectRatio: '1',
  overflow: 'hidden',
  fontSize: 'clamp(7px, 2.2vw, 10px)',
};

function handStringForCell(i, j) {
  const R = MATRIX_RANKS;
  if (i === j) return `${R[i]}${R[j]}`;
  if (i < j) return `${R[i]}${R[j]}s`;
  return `${R[j]}${R[i]}o`;
}

function tierClassForHand(handString) {
  if (RANGES.early.includes(handString)) return 'bg-green-200 text-green-900';
  if (RANGES.middle.includes(handString)) return 'bg-yellow-200 text-yellow-900';
  if (RANGES.late.includes(handString)) return 'bg-blue-200 text-blue-900';
  return 'bg-red-100 text-red-400';
}

const BASE =
  'flex items-center justify-center font-mono font-semibold border border-gray-600 box-border min-w-0 leading-none';

const HEADER_BASE = `${BASE} bg-gray-800 text-gray-400`;

/**
 * Full-screen 13×13 poker hand matrix + row/column rank headers.
 * Grid width uses 100vw / 14 per column so there is no horizontal scroll on mobile.
 */
export default function RangeChartOverlay({ open, onClose }) {
  if (!open) return null;

  const gridStyle = {
    width: '100vw',
    display: 'grid',
    gridTemplateColumns: 'repeat(14, calc(100vw / 14))',
  };

  const cells = [];

  cells.push(
    <div
      key="corner"
      aria-hidden
      className={HEADER_BASE}
      style={{
        ...cellStyle,
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 20,
      }}
    />
  );

  for (let c = 0; c < 13; c += 1) {
    cells.push(
      <div
        key={`col-${c}`}
        className={HEADER_BASE}
        style={{
          ...cellStyle,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {MATRIX_RANKS[c]}
      </div>
    );
  }

  for (let i = 0; i < 13; i += 1) {
    cells.push(
      <div
        key={`rowh-${i}`}
        className={HEADER_BASE}
        style={{
          ...cellStyle,
          position: 'sticky',
          left: 0,
          zIndex: 10,
        }}
      >
        {MATRIX_RANKS[i]}
      </div>
    );
    for (let j = 0; j < 13; j += 1) {
      const label = handStringForCell(i, j);
      const tierClass = tierClassForHand(label);
      const isPair = i === j;
      const isSuited = i < j;
      const opacityClass = isPair ? '' : isSuited ? ' opacity-90' : ' opacity-75';
      const pairClass = isPair ? ' font-bold' : '';

      cells.push(
        <div
          key={`cell-${i}-${j}`}
          className={`${BASE} ${tierClass}${opacityClass}${pairClass}`}
          style={cellStyle}
          title={label}
        >
          {label}
        </div>
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 h-full min-h-0 w-[100vw] max-w-[100vw] overflow-x-hidden overflow-y-hidden flex flex-col bg-gray-950 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="range-chart-title"
    >
      <header className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 id="range-chart-title" className="text-lg font-bold text-white">
          Hand Ranges
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 text-2xl leading-none px-2 py-1 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="flex shrink-0 flex-wrap gap-2 justify-center py-2 border-b border-gray-800 px-2">
        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-200 text-green-900">
          🟢 Early
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-yellow-200 text-yellow-900">
          🟡 Middle
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-200 text-blue-900">
          🔵 Late
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-500">
          🔴 Fold
        </span>
      </div>

      <div className="flex-1 min-h-0 w-[100vw] max-w-[100vw] overflow-x-hidden overflow-y-auto">
        <div className="w-[100vw] border border-gray-600 box-border" style={gridStyle}>
          {cells}
        </div>
      </div>
    </div>
  );
}
