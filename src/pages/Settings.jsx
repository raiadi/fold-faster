import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../lib/subscription';

const CATEGORIES = [
  { label: '💡 Idea', value: 'Idea' },
  { label: '🐛 Bug', value: 'Bug' },
  { label: '💬 Other', value: 'Other' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function Settings() {
  const navigate = useNavigate();
  const { isPro, isLoading: subscriptionLoading } = useSubscription();

  const [email, setEmail] = useState(null);
  const [category, setCategory] = useState('Idea');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleSubmitFeedback = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setErrorText(null);
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorText('Something went wrong. Try again.');
        return;
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        category,
        message: trimmed,
      });

      if (error) {
        setErrorText('Something went wrong. Try again.');
        return;
      }

      setMessage('');
      setCategory('Idea');
      setSuccessVisible(true);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setSuccessVisible(false);
        successTimeoutRef.current = null;
      }, 3000);
    } catch {
      setErrorText('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
        }
      );
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setErrorText(json.error || 'Could not open subscription portal. Try again.');
      }
    } catch {
      setErrorText('Could not open subscription portal. Try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      <div className="max-w-md mx-auto px-4 py-6 pb-12">
        {/* Header */}
        <header className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="text-white/60 hover:text-white transition text-sm"
            aria-label="Back to home"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold">Settings</h1>
        </header>

        {/* Account */}
        <section className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-3">
            Account
          </p>
          <p className="text-sm text-white/70 mb-3">{email ?? '—'}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-300 transition"
          >
            Log out
          </button>
        </section>

        <div className="h-px bg-white/10 mb-8" />

        {/* Send Feedback */}
        <section className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-3">
            Send Feedback
          </p>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap mb-4">
            {CATEGORIES.map((c) => {
              const selected = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? 'bg-[#22c55e] text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div className="relative mb-3">
            <textarea
              className="w-full min-h-[100px] rounded-xl bg-white/5 border border-white/10 p-3 pb-7 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30"
              placeholder="Tell us what's on your mind…"
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="absolute bottom-2 right-3 text-xs text-white/30">
              {message.length} / 500
            </span>
          </div>

          {successVisible && (
            <p className="text-sm text-[#22c55e] mb-3">Thanks for your feedback! 🙏</p>
          )}
          {errorText && (
            <p className="text-sm text-red-400 mb-3">{errorText}</p>
          )}

          <button
            type="button"
            onClick={handleSubmitFeedback}
            disabled={submitting || !message.trim()}
            className="w-full py-4 rounded-xl bg-[#22c55e] text-white font-semibold text-center transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send Feedback'}
          </button>
        </section>

        <div className="h-px bg-white/10 mb-8" />

        {/* Subscription */}
        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-3">
            Subscription
          </p>

          {subscriptionLoading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : isPro ? (
            <div>
              <p className="text-sm text-[#22c55e] mb-4">Current plan: Pro ✓</p>
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full py-3 rounded-xl border border-white/20 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-50"
              >
                {portalLoading ? 'Opening…' : 'Manage Subscription'}
              </button>
              <p className="text-xs text-white/40 mt-2 text-center">
                Cancel or update your plan via the Stripe portal.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-white/70 mb-4">Current plan: Free</p>
              <button
                type="button"
                onClick={() => navigate('/paywall')}
                className="w-full py-3 rounded-xl bg-[#22c55e] text-white font-semibold text-center hover:opacity-95 active:scale-[0.98] transition"
              >
                Upgrade to Pro →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
