import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { supabase } from '../../lib/supabase';

export default function Signup() {
  const { experience, goal } = useOnboarding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (data?.user) {
        const { error: profileError } = await supabase.from('users').upsert(
          {
            id: data.user.id,
            email: data.user.email,
            experience_level: experience,
            goal,
          },
          { onConflict: 'id' }
        );
        if (profileError) throw profileError;
      }
      navigate('/skill-check', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-12 pb-8 text-white">
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
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-brand-green"
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
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-brand-green"
            placeholder="At least 6 characters"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-brand-green text-brand-dark font-semibold disabled:opacity-50 mt-6 hover:opacity-90 active:scale-[0.98] transition"
        >
          {loading ? 'Creating account…' : 'Start training free'}
        </button>
      </form>
      <p className="text-center text-sm text-white/70 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-green font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
