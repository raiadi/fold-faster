import { Link } from 'react-router-dom';

export default function DailyLimitModal({ onClose }) {
  return (
    <div className="bg-black/80 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-900 rounded-2xl p-6 mx-4 max-w-sm w-full border border-white/10 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-limit-title"
      >
        <p className="text-4xl text-center mb-3" aria-hidden>
          🔒
        </p>
        <h2 id="daily-limit-title" className="text-xl font-bold text-white text-center mb-3">
          Daily limit reached
        </h2>
        <p className="text-white/80 text-sm text-center mb-6">
          Free users get 3 sessions per module per day. Upgrade to Pro for unlimited practice.
        </p>
        <div className="space-y-3">
          <Link
            to="/paywall"
            className="block w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-center hover:opacity-90"
          >
            Upgrade to Pro — £2.99/month
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600"
          >
            Come back tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
