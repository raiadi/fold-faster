import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';

const OPTIONS = [
  { id: 'know_rules_lose', label: 'I know the rules but always lose' },
  { id: 'played_few_times', label: "I've played a few times" },
  { id: 'play_regularly', label: 'I play regularly but want to improve' },
];

export default function Experience() {
  const { experience, setExperience } = useOnboarding();
  const [selected, setSelected] = useState(experience);
  const navigate = useNavigate();

  const handleNext = () => {
    setExperience(selected);
    navigate('/onboarding/goal');
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-12 pb-8 text-white">
      <h1 className="text-xl font-bold text-center mb-2">Where are you right now?</h1>
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
