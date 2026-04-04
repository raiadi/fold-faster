/** 9-handed reference layout: seat index 0 = top, clockwise (matches PokerTable trigonometry). */
const SEAT_COUNT = 9;
const CONTAINER_W = 340;
const CONTAINER_H = 200;
const CENTER_X = CONTAINER_W / 2;
const CENTER_Y = CONTAINER_H / 2;
const RADIUS = 95;

const SEATS = [
  { short: 'SB', group: 'blinds' },
  { short: 'BB', group: 'blinds' },
  { short: 'UTG', group: 'early' },
  { short: 'UTG+1', group: 'early' },
  { short: 'UTG+2', group: 'early' },
  { short: 'LJ', group: 'middle' },
  { short: 'HJ', group: 'middle' },
  { short: 'CO', group: 'late' },
  { short: 'BTN', group: 'late', dealer: true },
];

const GROUP_BADGE = {
  early: 'bg-red-500 text-white',
  middle: 'bg-yellow-400 text-gray-900',
  late: 'bg-blue-400 text-gray-900',
  blinds: 'bg-gray-400 text-gray-900',
};

const GUIDE_ROWS = [
  { abbr: 'UTG', full: 'Under the Gun', desc: 'First to act preflop. Play very tight.', group: 'early' },
  { abbr: 'UTG+1', full: 'UTG + 1', desc: 'Second to act. Still early — stay tight.', group: 'early' },
  { abbr: 'UTG+2', full: 'UTG + 2', desc: 'Third to act. Still an early position.', group: 'early' },
  { abbr: 'LJ', full: 'Lojack', desc: 'Middle position. Can open up slightly.', group: 'middle' },
  { abbr: 'HJ', full: 'Hijack', desc: 'Middle position. More playable hands.', group: 'middle' },
  { abbr: 'CO', full: 'Cutoff', desc: 'Late position. Wide opening range.', group: 'late' },
  { abbr: 'BTN', full: 'Button (Dealer)', desc: 'Best seat. Last to act on every street.', group: 'late' },
  { abbr: 'SB', full: 'Small Blind', desc: 'Forced bet. Out of position postflop.', group: 'blinds' },
  { abbr: 'BB', full: 'Big Blind', desc: 'Forced bet. Defend selectively.', group: 'blinds' },
];

function seatPositions() {
  return Array.from({ length: SEAT_COUNT }, (_, index) => {
    const angle = (index / SEAT_COUNT) * 2 * Math.PI - Math.PI / 2;
    const x = CENTER_X + RADIUS * Math.cos(angle);
    const y = CENTER_Y + RADIUS * Math.sin(angle);
    return { index, x, y };
  });
}

export default function PositionChartOverlay({ onClose }) {
  const seats = seatPositions();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="position-chart-title"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-[#0f1923] px-4 py-3">
        <h2 id="position-chart-title" className="text-lg font-bold text-white">
          Table Positions
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-2xl leading-none text-white/80 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="mx-auto max-w-md px-4 pb-8 pt-4">
        {/* Section 1 — table */}
        <section className="mb-6">
          <div
            className="relative mx-auto overflow-visible border border-white/15 bg-[#0f3d2a]"
            style={{
              width: CONTAINER_W,
              height: CONTAINER_H,
              borderRadius: 9999,
            }}
          >
            {seats.map(({ index, x, y }) => {
              const meta = SEATS[index];
              const badgeClass = GROUP_BADGE[meta.group];
              return (
                <div
                  key={index}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  <div
                    className={`relative rounded-full px-2 py-1 text-xs font-bold ${badgeClass}`}
                  >
                    {meta.short}
                    {meta.dealer && (
                      <span
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white text-[10px] font-bold text-[#0f1923]"
                        aria-hidden
                      >
                        D
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
              🔴 Early
            </span>
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-gray-900">
              🟡 Middle
            </span>
            <span className="rounded-full bg-blue-400 px-3 py-1 text-xs font-semibold text-gray-900">
              🔵 Late
            </span>
            <span className="rounded-full bg-gray-400 px-3 py-1 text-xs font-semibold text-gray-900">
              ⚪ Blinds
            </span>
          </div>
        </section>

        {/* Section 2 — guide */}
        <section>
          <h3 className="mb-2 font-semibold text-white">Position Guide</h3>
          <dl className="space-y-0">
            {GUIDE_ROWS.map((row) => (
              <div
                key={row.abbr}
                className="flex items-start gap-3 border-b border-gray-800 py-2"
              >
                <dt className="shrink-0">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${GROUP_BADGE[row.group]}`}
                  >
                    {row.abbr}
                  </span>
                </dt>
                <dd className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-white">{row.full}</span>
                  <span className="text-gray-300"> — {row.desc}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Section 3 — callout */}
        <section className="mx-4 mt-4 rounded-xl border border-green-700 bg-green-900/40 p-4">
          <p className="text-sm text-gray-100">
            📍 Positions are relative to the dealer button — they rotate every hand. The later your
            position, the more information you have before acting.
          </p>
        </section>
      </div>
    </div>
  );
}
