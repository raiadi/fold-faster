import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';

const OPTIONS = [
  { id: 'learn_hands', label: 'Learn which hands to play' },
  { id: 'understand_position', label: 'Understand position' },
  { id: 'stop_bad_calls', label: 'Stop making bad calls' },
  { id: 'build_confidence', label: 'Build confidence before real games' },
];

export default function Goal() {
  const { goal, setGoal } = useOnboarding();
  const [selected, setSelected] = useState(goal);
  const navigate = useNavigate();

  const handleNext = () => {
    setGoal(selected);
    navigate('/onboarding/signup');
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-12 pb-8 text-white">
      <h1 className="text-xl font-bold text-center mb-2">What's your main goal?</h1>
      <p className="text-white/70 text-sm text-center mb-8">Pick one.</p>
      <div className="space-y-3 flex-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`w-full p-4 rounded-xl text-left border-2 transition ${
              selected === opt.id
                ? 'border-brand-green bg-brand-green/10 text-white'
                : 'border-white/20 bg-white/5 text-white/90 hover:border-white/40'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        onClick={handleNext}
        disabled={!selected}
        className="w-full py-4 rounded-xl bg-brand-green text-brand-dark font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-6 hover:opacity-90 active:scale-[0.98] transition"
      >
        Continue
      </button>
    </div>
  );
}
