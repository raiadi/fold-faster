import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const timeoutRef = useRef(null);
  const subRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const finish = (ok) => {
      if (cancelled) return;
      if (ok) {
        setSessionReady(true);
      } else {
        setError(
          'This reset link is invalid or has expired. Request a new one from the login page.',
        );
      }
      setLoading(false);
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        finish(true);
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (cancelled || !nextSession) return;
        finish(true);
      });
      subRef.current = subscription;

      timeoutRef.current = setTimeout(async () => {
        if (cancelled) return;
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (s2) finish(true);
        else finish(false);
      }, 5000);
    })();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1600);
    } catch (err) {
      setError(err?.message || 'Could not update password. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1923] flex items-center justify-center text-white px-6">
        <p className="text-white/70">Loading…</p>
      </div>
    );
  }

  if (!sessionReady && error) {
    return (
      <div className="min-h-screen bg-[#0f1923] flex flex-col items-center justify-center px-6 text-white max-w-md mx-auto">
        <p className="text-red-400 text-center mb-6">{error}</p>
        <a href="/login" className="text-[#22c55e] font-medium hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0f1923] flex items-center justify-center px-6 text-white text-center">
        <p className="text-lg font-medium text-[#22c55e]">Password updated! Logging you in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1923] flex flex-col px-6 pt-12 pb-8 text-white max-w-md mx-auto w-full">
      <h1 className="text-xl font-bold text-center mb-2">Choose a new password</h1>
      <p className="text-center text-white/70 text-sm mb-8">
        Enter and confirm your new password below.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm text-white/80 mb-1">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#22c55e]"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm text-white/80 mb-1">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#22c55e]"
            placeholder="Repeat password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold disabled:opacity-50 mt-4 hover:opacity-90 transition"
        >
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
