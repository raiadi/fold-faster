import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { redirectToCheckout } from '../lib/stripe';

const BENEFITS = [
  'All 4 training modules + future modules',
  'Unlimited daily practice sessions',
  'Full leak history and trends',
];

export default function Paywall() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      await redirectToCheckout();
      // redirectToCheckout navigates away — no state to clean up
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-12 pb-10 text-white">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-white/50 text-sm mb-8 hover:text-white/80 self-start"
      >
        ← Back
      </button>

      {/* Headline */}
      <div className="text-center mb-10">
        <p className="text-4xl mb-4">🃏</p>
        <h1 className="text-2xl font-bold text-white mb-2">
          Unlock your full training path
        </h1>
        <p className="text-white/60 text-sm">
          Get every module and unlimited daily sessions.
        </p>
      </div>

      {/* Benefits */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 mb-6 space-y-4">
        {BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-start gap-3">
            <span className="text-brand-green font-bold mt-0.5">✓</span>
            <p className="text-white/90 text-sm">{benefit}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="text-center mb-8">
        <p className="text-white font-semibold text-lg">£8.99 / month — cancel anytime</p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-brand-green text-brand-dark font-bold text-base hover:opacity-90 disabled:opacity-60 transition"
      >
        {loading ? 'Redirecting to Stripe…' : 'Start 7-day free trial'}
      </button>

      {error && (
        <p className="text-red-400 text-sm text-center mt-3">{error}</p>
      )}

      <p className="text-white/40 text-xs text-center mt-4">
        No charge for 7 days. Cancel any time.
      </p>
    </div>
  );
}
