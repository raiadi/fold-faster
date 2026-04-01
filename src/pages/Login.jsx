import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mapLoginError } from '../lib/authErrors';

const PENDING_PROFILE_KEY = 'fold_faster_pending_profile';

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.email) setEmail(location.state.email);
  }, [location.state?.email]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      const pending = localStorage.getItem(PENDING_PROFILE_KEY);
      if (pending) {
        try {
          const p = JSON.parse(pending);
          if (p.email?.toLowerCase() === email.trim().toLowerCase()) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('users').upsert(
                {
                  id: user.id,
                  email: user.email,
                  experience_level: p.experience_level,
                  goal: p.goal,
                },
                { onConflict: 'id' },
              );
            }
            localStorage.removeItem(PENDING_PROFILE_KEY);
          }
        } catch {
          /* non-blocking */
        }
      }

      navigate('/home', { replace: true });
    } catch (err) {
      setError(mapLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1923] flex flex-col px-6 pt-12 pb-8 text-white">
      <h1 className="text-xl font-bold text-center mb-8">Log in</h1>
      <form onSubmit={handleLogin} className="space-y-4 flex-1">
        <div>
          <label htmlFor="login-email" className="block text-sm text-white/80 mb-1">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#22c55e]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm text-white/80 mb-1">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#22c55e]"
            placeholder="Your password"
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              state={{ email }}
              className="text-sm text-[#22c55e] font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold disabled:opacity-50 mt-6 hover:opacity-90 active:scale-[0.98] transition"
        >
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <p className="text-center text-sm text-white/70 mt-6">
        Don&apos;t have an account?{' '}
        <Link to="/" className="text-[#22c55e] font-medium hover:underline">
          Start free
        </Link>
      </p>
    </div>
  );
}
