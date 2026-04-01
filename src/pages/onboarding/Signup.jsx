import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { supabase } from '../../lib/supabase';
import { mapSignupError } from '../../lib/authErrors';

const PENDING_PROFILE_KEY = 'fold_faster_pending_profile';

export default function Signup() {
  const { experience, goal } = useOnboarding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setErrorKind(null);
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (data?.user && data.session) {
        const { error: profileError } = await supabase.from('users').upsert(
          {
            id: data.user.id,
            email: data.user.email,
            experience_level: experience,
            goal,
          },
          { onConflict: 'id' },
        );
        if (profileError) {
          setError('Could not save your profile. Please try again.');
          setErrorKind('generic');
          return;
        }
        navigate('/skill-check', { replace: true });
        return;
      }

      if (data?.user && !data.session) {
        localStorage.setItem(
          PENDING_PROFILE_KEY,
          JSON.stringify({
            experience_level: experience,
            goal,
            email: email.trim(),
          }),
        );
        setShowEmailConfirmation(true);
        return;
      }

      setError('Something went wrong. Please try again.');
      setErrorKind('generic');
    } catch (err) {
      const mapped = mapSignupError(err);
      setErrorKind(mapped.kind);
      if (mapped.kind === 'email_exists') {
        setError('');
      } else {
        setError(mapped.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-[#0f1923] flex flex-col px-6 pt-12 pb-8 text-white max-w-md mx-auto w-full">
        <h1 className="text-xl font-bold text-center mb-4">Check your email</h1>
        <p className="text-center text-white/90 leading-relaxed mb-8">
          Check your email to confirm your account before logging in.
        </p>
        <Link
          to="/login"
          state={{ email }}
          className="block w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold text-center hover:opacity-90 transition"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1923] flex flex-col px-6 pt-12 pb-8 text-white">
      <h1 className="text-xl font-bold text-center mb-8">Create your account</h1>
      <form onSubmit={handleSignup} className="space-y-4 flex-1">
        <div>
          <label htmlFor="email" className="block text-sm text-white/80 mb-1">
            Email
          </label>
          <input
            id="email"
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
          <label htmlFor="password" className="block text-sm text-white/80 mb-1">
            Password
          </label>
          <input
            id="password"
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
        {errorKind === 'email_exists' && (
          <p className="text-sm text-red-400">
            An account with this email already exists.{' '}
            <Link
              to="/login"
              state={{ email }}
              className="text-[#22c55e] font-medium hover:underline"
            >
              Log in instead?
            </Link>
          </p>
        )}
        {errorKind !== 'email_exists' && error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold disabled:opacity-50 mt-6 hover:opacity-90 active:scale-[0.98] transition"
        >
          {loading ? 'Creating account…' : 'Start training free'}
        </button>
      </form>
      <p className="text-center text-sm text-white/70 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-[#22c55e] font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
