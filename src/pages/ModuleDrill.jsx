import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getModuleScenarios } from '../data/moduleScenarios';
import { MODULE_LABELS } from '../data/modules';
import { formatCard } from '../data/skillCheckScenarios';
import { useSubscription } from '../lib/subscription';
import { supabase } from '../lib/supabase';
import { getTodaySessionCount } from '../lib/subscription';

const DECISIONS = ['FOLD', 'CALL', 'RAISE'];

export default function ModuleDrill() {
  const { moduleId } = useParams();
  const mid = parseInt(moduleId, 10);
  const navigate = useNavigate();
  const { isPro, loading: subLoading } = useSubscription();

  const scenarios = getModuleScenarios(mid);
  const moduleLabel = MODULE_LABELS[`module_${mid}`] || `Module ${mid}`;

  const [index, setIndex] = useState(0);
  const [gateChecked, setGateChecked] = useState(false);
  const [results, setResults] = useState([]);
  const [chosen, setChosen] = useState(null); // decision the user picked
  const [revealed, setRevealed] = useState(false);

  // Gate check: run once subscription status is known
  useEffect(() => {
    if (subLoading) return;
    (async () => {
      // Module 2+ requires Pro
      if (mid > 1 && !isPro) {
        navigate('/paywall', { replace: true });
        return;
      }
      // Session limit: free users max 3/day
      if (!isPro) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const count = await getTodaySessionCount(user.id);
          if (count >= 3) {
            navigate('/paywall', { replace: true });
            return;
          }
        }
      }
      setGateChecked(true);
    })();
  }, [subLoading, isPro, mid, navigate]);

  if (subLoading || !gateChecked) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  if (!scenarios.length) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 text-white">
        <p className="text-white/70 mb-4">Module not found.</p>
        <Link to="/home" className="text-brand-green underline">Back to home</Link>
      </div>
    );
  }

  const scenario = scenarios[index];
  const isLast = index === scenarios.length - 1;

  const handleDecision = (choice) => {
    if (revealed) return;
    const correct = choice.toLowerCase() === scenario.correct_answer.toLowerCase();
    setChosen(choice);
    setRevealed(true);
    setResults((r) => [
      ...r,
      {
        scenarioId: scenario.id,
        decision: choice,
        correct,
        leak_type: scenario.leak_type,
      },
    ]);
  };

  const handleNext = () => {
    if (!revealed) return;
    setChosen(null);
    setRevealed(false);
    if (isLast) {
      navigate(`/module/${mid}/results`, {
        state: { results: [...results], moduleId: mid },
      });
      return;
    }
    setIndex((i) => i + 1);
  };

  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-8 pb-10 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <Link to="/home" className="text-white/50 text-sm hover:text-white/80">← Home</Link>
        <span className="text-brand-green text-sm font-medium">
          {correctCount} correct
        </span>
      </div>
      <p className="text-white/50 text-xs mb-5">{moduleLabel} · Scenario {index + 1} of {scenarios.length}</p>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-8">
        <div
          className="h-full rounded-full bg-brand-green transition-all"
          style={{ width: `${((index) / scenarios.length) * 100}%` }}
        />
      </div>

      {/* Cards */}
      <div className="flex justify-center gap-3 mb-6">
        {scenario.cards.map((code) => (
          <div
            key={code}
            className="w-14 h-20 rounded-lg bg-white/10 border-2 border-white/30 flex flex-col items-center justify-center text-lg font-bold"
          >
            <span className="text-white">{formatCard(code)[0]}</span>
            <span className={['h', 'd'].includes(code[1]) ? 'text-red-400' : 'text-white/80'}>
              {formatCard(code).slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Position & action */}
      <div className="space-y-2 mb-8">
        <p className="text-white/80">
          <span className="text-white/50">Position:</span> {scenario.position}
        </p>
        <p className="text-white/80">
          <span className="text-white/50">Action:</span> {scenario.action}
        </p>
      </div>

      {/* Decision buttons */}
      {!revealed && (
        <>
          <p className="text-sm text-white/60 mb-4">What do you do?</p>
          <div className="grid grid-cols-3 gap-3">
            {DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDecision(d)}
                className="py-4 rounded-xl font-semibold border-2 border-white/30 bg-white/5 text-white hover:border-white/50 transition"
              >
                {d}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Feedback panel */}
      {revealed && (
        <>
          {/* Correct / wrong header */}
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 mb-4 ${
              results[results.length - 1]?.correct
                ? 'bg-green-500/15 border-green-500/40 text-green-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            <span className="text-lg">
              {results[results.length - 1]?.correct ? '✓' : '✗'}
            </span>
            <span className="font-semibold text-sm">
              {results[results.length - 1]?.correct
                ? `Correct — ${scenario.correct_answer.toUpperCase()}`
                : `The right play was ${scenario.correct_answer.toUpperCase()}`}
            </span>
          </div>

          {/* Explanation */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <p className="text-white/90 text-sm leading-relaxed">{scenario.explanation}</p>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="w-full py-4 rounded-xl bg-brand-green text-brand-dark font-semibold hover:opacity-90"
          >
            {isLast ? 'See results' : 'Next scenario'}
          </button>
        </>
      )}
    </div>
  );
}
