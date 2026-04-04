import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyLimitModal from '../components/DailyLimitModal';
import PlayingCard from '../components/PlayingCard';
import RangeChartOverlay from '../components/RangeChartOverlay';
import { generateRangesQuestions } from '../data/rangesData';
import { supabase } from '../lib/supabase';
import { getModuleProgress, saveModuleProgress } from '../lib/moduleProgress';
import { getRemainingRuns, recordRun } from '../lib/runLimits';
import { useSubscription } from '../lib/subscription';

const SUIT_SYMBOL = { h: '♥', d: '♦', c: '♣', s: '♠' };

const SECTION_MODULE_IDS = { early: 30, middle: 31, late: 32 };

const SECTION_CARDS = [
  {
    key: 'early',
    emoji: '🔴',
    title: 'Early Position',
    subtitle: 'UTG, UTG+1, UTG+2 — play very tight',
  },
  {
    key: 'middle',
    emoji: '🟡',
    title: 'Middle Position',
    subtitle: 'MP, MP+1, Hijack — open up slightly',
  },
  {
    key: 'late',
    emoji: '🟢',
    title: 'Late Position',
    subtitle: 'Cutoff, Button — play much wider',
  },
];

function formatHandLine(card1, card2) {
  const s1 = SUIT_SYMBOL[card1.suit] || card1.suit;
  const s2 = SUIT_SYMBOL[card2.suit] || card2.suit;
  return `${card1.rank}${s1} ${card2.rank}${s2}`;
}

function rangesRunKey(sectionKey) {
  return `ranges_${sectionKey}`;
}

export default function RangesModule() {
  const navigate = useNavigate();
  const { isPro, loading: subLoading } = useSubscription();
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const runRecordedRef = useRef(false);
  const [view, setView] = useState('sections');
  const [section, setSection] = useState('early');
  const [moduleProgress, setModuleProgress] = useState({});
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chartOpen, setChartOpen] = useState(false);
  const [quizLocked, setQuizLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const completionSavedRef = useRef(false);

  const refreshProgress = useCallback(async () => {
    const p = await getModuleProgress(supabase, [30, 31, 32]);
    setModuleProgress(p);
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const startQuiz = (key) => {
    runRecordedRef.current = false;
    setSection(key);
    setQuestions(generateRangesQuestions(key, 15));
    setIndex(0);
    setScore(0);
    setQuizLocked(false);
    setFeedback(null);
    completionSavedRef.current = false;
    setView('quiz');
  };

  const tryStartQuiz = (key) => {
    if (!subLoading && !isPro && getRemainingRuns(rangesRunKey(key)) === 0) {
      setLimitModalOpen(true);
      return;
    }
    startQuiz(key);
  };

  const current = questions[index];

  const handleAnswer = (chosePlayable) => {
    if (!current || quizLocked) return;
    const correct = (chosePlayable && current.isPlayable) || (!chosePlayable && !current.isPlayable);
    setQuizLocked(true);
    const nextScore = score + (correct ? 1 : 0);
    if (correct) {
      setFeedback({ tone: 'ok', text: '✓ Correct' });
    } else {
      const pos = current.position;
      const text = current.isPlayable
        ? `This hand is playable from ${pos} — folding here is too tight.`
        : `This hand is a fold from ${pos} — it is not in your opening range here.`;
      setFeedback({ tone: 'bad', text });
    }
    setTimeout(() => {
      setFeedback(null);
      if (index >= 14) {
        setScore(nextScore);
        setView('results');
        return;
      }
      setIndex((i) => i + 1);
      setScore(nextScore);
      setQuizLocked(false);
    }, 1200);
  };

  useEffect(() => {
    if (view !== 'results' || score < 12 || completionSavedRef.current) return;
    completionSavedRef.current = true;
    let cancelled = false;
    (async () => {
      await saveModuleProgress(
        supabase,
        SECTION_MODULE_IDS[section],
        score,
        15,
        { minCorrect: 12 }
      );
      if (!cancelled) await refreshProgress();
    })();
    return () => { cancelled = true; };
  }, [view, score, section, refreshProgress]);

  const sectionOrder = ['early', 'middle', 'late'];
  const nextKey = sectionOrder[sectionOrder.indexOf(section) + 1] || null;

  useEffect(() => {
    if (view !== 'results') return;
    if (runRecordedRef.current) return;
    runRecordedRef.current = true;
    if (!subLoading && !isPro) {
      recordRun(rangesRunKey(section));
    }
  }, [view, section, isPro, subLoading]);

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      <div className="max-w-md mx-auto px-4 py-6 min-h-screen pb-28">
      <button
        type="button"
        onClick={() => navigate('/home')}
        className="text-white/70 text-sm mb-6"
      >
        ← Back
      </button>

      {view === 'sections' && (
        <section>
          <h1 className="text-2xl font-bold text-white mb-1">Ranges</h1>
          <p className="text-white/60 text-sm mb-6">Learn which hands to play from each position</p>
          <div className="space-y-3">
            {SECTION_CARDS.map((card) => {
              const modId = SECTION_MODULE_IDS[card.key];
              const done = Boolean(moduleProgress[modId]?.completed);
              const rem =
                subLoading || isPro ? null : getRemainingRuns(rangesRunKey(card.key));
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => tryStartQuiz(card.key)}
                  className="w-full text-left rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold flex items-center gap-2">
                      {card.emoji} {card.title}
                      {rem === 0 && !isPro && !subLoading && (
                        <span className="text-lg" aria-hidden>🔒</span>
                      )}
                    </p>
                    <span className="text-xs text-white/80 flex flex-col items-end gap-0.5">
                      {rem != null && rem > 0 && rem < 3 && (
                        <span className="text-amber-400">{rem} runs left today</span>
                      )}
                      {done ? '✅ Complete' : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{card.subtitle}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === 'quiz' && current && (
        <section>
          <div className="mb-4">
            <p className="text-sm text-white/70 mb-2">
              Question {index + 1} of 15
            </p>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#22c55e] transition-all"
                style={{ width: `${((index + 1) / 15) * 100}%` }}
              />
            </div>
          </div>
          <div className="mb-4">
            <span className="inline-block bg-gray-700 rounded-full px-3 py-1 text-sm text-white">
              Playing from: {current.position}
            </span>
          </div>
          <div className="flex justify-center gap-3 mb-4">
            <PlayingCard rank={current.card1.rank} suit={current.card1.suit} size="lg" />
            <PlayingCard rank={current.card2.rank} suit={current.card2.suit} size="lg" />
          </div>
          <p className="text-center text-gray-400 text-sm mb-6">
            {formatHandLine(current.card1, current.card2)} — {current.handString}
          </p>
          {feedback && (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-center text-sm font-medium ${
                feedback.tone === 'ok'
                  ? 'bg-green-500/20 text-green-200 border border-green-500/40'
                  : 'bg-red-500/20 text-red-100 border border-red-500/40'
              }`}
            >
              {feedback.text}
            </div>
          )}
          <div className="space-y-3">
            <button
              type="button"
              disabled={quizLocked}
              onClick={() => handleAnswer(true)}
              className="w-full py-4 rounded-xl text-lg font-bold bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white"
            >
              ✅ Playable
            </button>
            <button
              type="button"
              disabled={quizLocked}
              onClick={() => handleAnswer(false)}
              className="w-full py-4 rounded-xl text-lg font-bold bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white"
            >
              ❌ Fold
            </button>
          </div>
        </section>
      )}

      {view === 'results' && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Results</h1>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 text-center">
            <p className="text-3xl font-bold text-[#22c55e] mb-2">
              {score} / 15
            </p>
            {score >= 12 ? (
              <p className="text-green-200 font-medium">
                Section complete! ✅ 🎉
              </p>
            ) : (
              <p className="text-yellow-100 font-medium">
                Keep practising — you need 12/15 to unlock this section
              </p>
            )}
          </div>
          {score >= 12 && nextKey && (
            <button
              type="button"
              onClick={() => tryStartQuiz(nextKey)}
              className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Next section
            </button>
          )}
          {score < 12 && (
            <button
              type="button"
              onClick={() => tryStartQuiz(section)}
              className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              completionSavedRef.current = false;
              setView('sections');
              refreshProgress();
            }}
            className="w-full py-4 rounded-xl border border-white/20 bg-white/5 font-semibold"
          >
            Back to sections
          </button>
        </section>
      )}

      <button
        type="button"
        aria-label="Open range chart"
        onClick={() => setChartOpen(true)}
        className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-[#22c55e] text-2xl shadow-lg flex items-center justify-center hover:opacity-90"
      >
        📊
      </button>
      </div>

      <RangeChartOverlay open={chartOpen} onClose={() => setChartOpen(false)} />
      {limitModalOpen && (
        <DailyLimitModal onClose={() => setLimitModalOpen(false)} />
      )}
    </div>
  );
}
