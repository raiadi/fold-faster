import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SKILL_CHECK_SCENARIOS,
  formatCard,
  LEAK_LABELS,
} from '../data/skillCheckScenarios';
import { getSkillCheckFeedback } from '../lib/claude';

const DECISIONS = ['FOLD', 'CALL', 'RAISE'];

export default function SkillCheck() {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const scenario = SKILL_CHECK_SCENARIOS[index];
  const cardsStr = scenario.cards.map(formatCard).join(' ');
  const isLast = index === SKILL_CHECK_SCENARIOS.length - 1;

  const handleDecision = async (choice) => {
    if (loading || feedback) return;
    setDecision(choice);
    setLoading(true);
    setError('');
    try {
      const { text, correct } = await getSkillCheckFeedback({
        cards: cardsStr,
        position: scenario.position,
        action: scenario.action,
        decision: choice,
      });
      setFeedback({ text, correct });
      setResults((r) => [
        ...r,
        {
          scenarioId: scenario.id,
          decision: choice,
          correct,
          leak_type: scenario.leak_type,
        },
      ]);
    } catch (err) {
      const msg = err.message || '';
      const isNetworkOrCors = /load failed|failed to fetch|network error|cors/i.test(msg) || msg === '';
      setError(
        isNetworkOrCors
          ? "Couldn't reach the feedback service. Check your connection or try again."
          : msg || 'Could not get feedback'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!feedback) return;
    setFeedback(null);
    setDecision(null);
    if (isLast) {
      navigate('/skill-check/results', { state: { results } });
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-8 pb-10 text-white">
      <div className="flex justify-between items-center mb-6">
        <span className="text-white/60 text-sm">
          Scenario {index + 1} of {SKILL_CHECK_SCENARIOS.length}
        </span>
        <span className="text-brand-green text-sm font-medium">
          {results.filter((r) => r.correct).length} correct
        </span>
      </div>

      {/* Cards */}
      <div className="flex justify-center gap-3 mb-6">
        {scenario.cards.map((code) => (
          <div
            key={code}
            className="w-14 h-20 rounded-lg bg-white/10 border-2 border-white/30 flex flex-col items-center justify-center text-lg font-bold"
          >
            <span className="text-white">{formatCard(code)[0]}</span>
            <span className="text-brand-green">{formatCard(code).slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Position & action */}
      <div className="space-y-2 mb-8">
        <p className="text-white/80">
          <span className="text-white/60">Position:</span> {scenario.position}
        </p>
        <p className="text-white/80">
          <span className="text-white/60">Action:</span> {scenario.action}
        </p>
      </div>

      {!feedback ? (
        <>
          <p className="text-sm text-white/60 mb-4">What do you do?</p>
          <div className="grid grid-cols-3 gap-3">
            {DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDecision(d)}
                disabled={loading}
                className={`py-4 rounded-xl font-semibold border-2 transition ${
                  decision === d
                    ? 'border-brand-green bg-brand-green/20 text-brand-green'
                    : 'border-white/30 bg-white/5 text-white hover:border-white/50'
                } disabled:opacity-50`}
              >
                {d}
              </button>
            ))}
          </div>
          {loading && (
            <p className="text-center text-white/60 mt-4">Getting feedback…</p>
          )}
          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}
        </>
      ) : (
        <>
          <div
            className={`p-4 rounded-xl border-2 mb-6 ${
              feedback.correct
                ? 'bg-green-500/20 border-green-500/50 text-green-100'
                : 'bg-red-500/20 border-red-500/50 text-red-100'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{feedback.text}</p>
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

export { LEAK_LABELS };
