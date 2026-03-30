import { Link } from 'react-router-dom';
import CardIcon from '../../components/CardIcon';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 text-white">
      <CardIcon className="w-20 h-20 mb-8 text-brand-green" />
      <h1 className="text-2xl font-bold text-center mb-3 max-w-sm">
        Stop making costly poker mistakes
      </h1>
      <p className="text-white/80 text-center text-sm mb-10 max-w-xs">
        Daily drills for beginner Hold'em players. 5 minutes a day.
      </p>
      <Link
        to="/onboarding/experience"
        className="w-full max-w-xs py-4 rounded-xl bg-brand-green text-brand-dark font-semibold text-center hover:opacity-90 active:scale-[0.98] transition"
      >
        Start free
      </Link>
      <Link
        to="/login"
        className="mt-4 text-sm text-white/60 hover:text-white/90 transition"
      >
        Already have an account? Log in
      </Link>
    </div>
  );
}
