import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (location.state?.email) setEmail(location.state.email);
  }, [location.state?.email]);

  const resetRedirect = () => {
    const base =
      import.meta.env.VITE_SITE_URL?.replace(/\/$/, '') || window.location.origin;
    return `${base}/reset-password`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: resetRedirect() },
      );
      if (authError) throw authError;
      setSent(true);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('no user')) {
        setError('No account found with that email');
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1923] flex flex-col px-6 pt-12 pb-8 text-white max-w-md mx-auto w-full">
      <h1 className="text-xl font-bold text-center mb-2">Reset your password</h1>
      <p className="text-center text-white/70 text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link
      </p>

      {sent ? (
        <div className="space-y-6">
          <p className="text-center text-white/90 rounded-xl border border-white/15 bg-white/5 p-4">
            Check your email for a reset link
          </p>
          <Link
            to="/login"
            className="block w-full py-3 rounded-xl border border-white/20 text-center text-white font-medium hover:bg-white/5"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div>
            <label htmlFor="forgot-email" className="block text-sm text-white/80 mb-1">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#22c55e]"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold disabled:opacity-50 mt-4 hover:opacity-90 active:scale-[0.98] transition"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 text-sm text-[#22c55e] font-medium hover:underline"
          >
            Back to login
          </button>
        </form>
      )}
    </div>
  );
}
