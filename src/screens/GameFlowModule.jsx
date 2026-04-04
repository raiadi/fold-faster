import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyLimitModal from '../components/DailyLimitModal';
import PlayingCard from '../components/PlayingCard';
import { GAME_FLOW_QUESTIONS } from '../data/gameFlowData';
import { supabase } from '../lib/supabase';
import { saveModuleProgress } from '../lib/moduleProgress';
import { getRemainingRuns, recordRun } from '../lib/runLimits';
import { useSubscription } from '../lib/subscription';

const STREET_ORDER = ['Preflop', 'Flop', 'Turn', 'River'];
const TOTAL_QUIZ_QUESTIONS = 40;
const PASS_SCORE = 36;
const MODULE_ID = 40;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GameFlowReferenceOverlay({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-flow-ref-title"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-[#0f1923] px-4 py-3">
        <h2 id="game-flow-ref-title" className="text-lg font-bold text-white">
          Game flow
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-2xl leading-none text-white/80 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="mx-auto max-w-md px-4 pb-10 pt-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-white/90">
            <thead>
              <tr className="border-b border-gray-800 bg-white/5">
                <th className="px-3 py-2 font-semibold">Street</th>
                <th className="px-3 py-2 font-semibold">Cards revealed</th>
                <th className="px-3 py-2 font-semibold">Players act?</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="px-3 py-2">Preflop</td>
                <td className="px-3 py-2 text-white/75">None (hole cards dealt)</td>
                <td className="px-3 py-2 text-[#22c55e]">Yes</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="px-3 py-2">Flop</td>
                <td className="px-3 py-2 text-white/75">3 community cards</td>
                <td className="px-3 py-2 text-[#22c55e]">Yes</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="px-3 py-2">Turn</td>
                <td className="px-3 py-2 text-white/75">1 more (4 total)</td>
                <td className="px-3 py-2 text-[#22c55e]">Yes</td>
              </tr>
              <tr>
                <td className="px-3 py-2">River</td>
                <td className="px-3 py-2 text-white/75">1 more (5 total)</td>
                <td className="px-3 py-2 text-[#22c55e]">Yes — final bets</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
          The player with the best 5-card hand using any combination of their 2 hole cards and the 5
          community cards wins.
        </p>
      </div>
    </div>
  );
}

export default function GameFlowModule() {
  const navigate = useNavigate();
  const { isPro, loading: subLoading } = useSubscription();
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const runLimitRecordedRef = useRef(false);
  const [view, setView] = useState('intro');
  const [quizHands, setQuizHands] = useState([]);
  const [handIndex, setHandIndex] = useState(0);
  const [streetIndex, setStreetIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongByStreet, setWrongByStreet] = useState({
    Preflop: 0,
    Flop: 0,
    Turn: 0,
    River: 0,
  });
  const [showResult, setShowResult] = useState(false);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevBoardLenRef = useRef(0);
  const flipFromRef = useRef(0);
  const resultSavedRef = useRef(false);

  const currentHand = quizHands[handIndex];
  const currentStreet = currentHand?.streets?.[streetIndex];

  useEffect(() => {
    prevBoardLenRef.current = 0;
    flipFromRef.current = 0;
  }, [handIndex]);

  useEffect(() => {
    const len = currentStreet?.communityCards?.length ?? 0;
    const prev = prevBoardLenRef.current;
    if (len > prev) {
      flipFromRef.current = prev;
      setIsFlipping(true);
      const t = setTimeout(() => {
        setIsFlipping(false);
        prevBoardLenRef.current = len;
      }, 300);
      return () => clearTimeout(t);
    }
    prevBoardLenRef.current = len;
  }, [handIndex, streetIndex, currentStreet]);

  const startQuiz = useCallback(() => {
    runLimitRecordedRef.current = false;
    setQuizHands(shuffle(GAME_FLOW_QUESTIONS).slice(0, 10));
    setHandIndex(0);
    setStreetIndex(0);
    setScore(0);
    setWrongByStreet({ Preflop: 0, Flop: 0, Turn: 0, River: 0 });
    setShowResult(false);
    setAnswerLocked(false);
    setSelectedOption(null);
    resultSavedRef.current = false;
    prevBoardLenRef.current = 0;
    flipFromRef.current = 0;
    setView('quiz');
  }, []);

  const tryStartQuiz = useCallback(() => {
    if (!subLoading && !isPro && getRemainingRuns('game_flow') === 0) {
      setLimitModalOpen(true);
      return;
    }
    startQuiz();
  }, [isPro, startQuiz, subLoading]);

  const questionNumber = handIndex * 4 + streetIndex + 1;
  const progressPct = useMemo(
    () => Math.min(100, (questionNumber / TOTAL_QUIZ_QUESTIONS) * 100),
    [questionNumber],
  );

  const handleAnswer = (opt) => {
    if (!currentStreet || answerLocked) return;
    setAnswerLocked(true);
    setSelectedOption(opt);
    const ok = opt === currentStreet.correctAnswer;
    const streetName = currentStreet.name;

    setTimeout(() => {
      setShowResult(true);
      if (ok) setScore((s) => s + 1);
      else {
        setWrongByStreet((w) => ({ ...w, [streetName]: (w[streetName] || 0) + 1 }));
      }
    }, 1000);

    setTimeout(() => {
      setShowResult(false);
      setSelectedOption(null);
      setAnswerLocked(false);

      if (streetIndex < 3) {
        setStreetIndex((i) => i + 1);
        return;
      }

      if (handIndex < 9) {
        setHandIndex((h) => h + 1);
        setStreetIndex(0);
        prevBoardLenRef.current = 0;
        flipFromRef.current = 0;
        return;
      }

      setView('results');
    }, 2200);
  };

  useEffect(() => {
    if (view !== 'results' || resultSavedRef.current) return;
    (async () => {
      if (score >= PASS_SCORE) {
        await saveModuleProgress(supabase, MODULE_ID, score, TOTAL_QUIZ_QUESTIONS);
      }
      resultSavedRef.current = true;
    })();
  }, [view, score]);

  useEffect(() => {
    if (view !== 'results') return;
    if (runLimitRecordedRef.current) return;
    runLimitRecordedRef.current = true;
    if (!subLoading && !isPro) {
      recordRun('game_flow');
    }
  }, [view, isPro, subLoading]);

  const boardSlots = () =>
    [0, 1, 2, 3, 4].map((slotIndex) => {
      const cards = currentStreet?.communityCards ?? [];
      const len = cards.length;
      if (slotIndex >= len) {
        return <PlayingCard key={`empty-${slotIndex}`} faceDown size="md" rank="A" suit="s" />;
      }
      const showBack = isFlipping && slotIndex >= flipFromRef.current;
      if (showBack) {
        return <PlayingCard key={`flip-${slotIndex}`} faceDown size="md" rank="A" suit="s" />;
      }
      const c = cards[slotIndex];
      return <PlayingCard key={`up-${slotIndex}`} rank={c.rank} suit={c.suit} size="md" />;
    });

  const streetBadge = currentStreet?.name ?? 'Preflop';

  return (
    <>
      <div className="min-h-screen bg-[#0f1923] text-white">
        <div className="max-w-md mx-auto px-4 py-6 min-h-screen pb-28">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="text-white/70 text-sm mb-6"
        >
          ← Back
        </button>

        {view === 'intro' && (
          <section className="flex flex-col items-center text-center min-h-[70vh] justify-center">
            <h1 className="text-2xl font-bold mb-2">Game Flow</h1>
            <p className="text-white/80 mb-6">Learn how a hand of poker unfolds</p>
            <div className="flex flex-wrap items-center justify-center gap-1 mb-8 text-xs font-semibold text-[#22c55e]">
              <span className="rounded-full border border-[#22c55e]/50 bg-[#22c55e]/15 px-3 py-1">Preflop</span>
              <span className="text-white/50">→</span>
              <span className="rounded-full border border-[#22c55e]/50 bg-[#22c55e]/15 px-3 py-1">Flop</span>
              <span className="text-white/50">→</span>
              <span className="rounded-full border border-[#22c55e]/50 bg-[#22c55e]/15 px-3 py-1">Turn</span>
              <span className="text-white/50">→</span>
              <span className="rounded-full border border-[#22c55e]/50 bg-[#22c55e]/15 px-3 py-1">River</span>
            </div>
            <p className="text-sm text-white/90 px-6 mb-10">
              Every hand follows the same 4 stages. You&apos;ll see a hand play out step by step and answer
              questions about what&apos;s happening.
            </p>
            {(() => {
              const rem =
                subLoading || isPro ? null : getRemainingRuns('game_flow');
              return (
                <>
                  {rem != null && rem > 0 && rem < 3 && (
                    <p className="text-amber-400 text-xs mb-2">{rem} runs left today</p>
                  )}
                  {rem === 0 && !isPro && !subLoading && (
                    <p className="text-2xl mb-2 text-center" aria-hidden>
                      🔒
                    </p>
                  )}
                </>
              );
            })()}
            <button
              type="button"
              onClick={tryStartQuiz}
              className="w-full max-w-xs py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Start
            </button>
          </section>
        )}

        {view === 'quiz' && currentHand && currentStreet && (
          <section>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-white/70 mb-2">
                <span>
                  Hand {handIndex + 1} of 10
                </span>
                <span>
                  Q {questionNumber} / 40
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#22c55e] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center items-center gap-3 mb-1">
              {STREET_ORDER.map((name, i) => {
                const past = i < streetIndex;
                const current = i === streetIndex;
                return (
                  <span key={name} className="flex flex-col items-center gap-1">
                    <span
                      className={
                        current
                          ? 'h-2.5 w-2.5 rounded-full bg-[#22c55e]'
                          : past
                            ? 'h-2.5 w-2.5 rounded-full bg-gray-500'
                            : 'h-2.5 w-2.5 rounded-full border border-white/30 bg-transparent'
                      }
                      title={name}
                    />
                    <span className="text-[10px] text-white/50">{name}</span>
                  </span>
                );
              })}
            </div>

            <p className="text-center text-gray-400 text-xs mb-2">Your Hand</p>
            <div className="flex justify-center gap-2 mb-6">
              {currentHand.holeCards.map((c, i) => (
                <PlayingCard key={i} rank={c.rank} suit={c.suit} size="md" />
              ))}
            </div>

            <p className="text-center text-gray-400 text-xs mb-2">Board</p>
            <div className="flex justify-center gap-1 mb-4 flex-nowrap overflow-x-auto pb-1">
              {boardSlots()}
            </div>

            <div className="flex justify-center mb-4">
              <span className="rounded-full bg-[#22c55e]/20 border border-[#22c55e]/50 px-4 py-1.5 text-sm font-semibold text-[#22c55e]">
                🃏 {streetBadge}
              </span>
            </div>

            <p className="text-center font-semibold text-white px-4 mb-4">{currentStreet.question}</p>

            <div className="space-y-2 mb-4">
              {currentStreet.options.map((opt) => {
                let cls = 'bg-gray-700 text-white';
                if (showResult) {
                  if (opt === currentStreet.correctAnswer) cls = 'bg-green-600 text-white';
                  else if (opt === selectedOption && opt !== currentStreet.correctAnswer) {
                    cls = 'bg-red-600 text-white';
                  } else cls = 'bg-gray-800 text-white/50';
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={answerLocked}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full rounded-xl py-3 px-3 text-left text-sm font-medium transition ${cls}`}
                  >
                    {opt}
                    {showResult && opt === selectedOption && (
                      <span className="block text-xs mt-1">
                        {opt === currentStreet.correctAnswer ? '✓ Correct' : '✗ Wrong'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {showResult && (
              <p className="text-center text-sm text-white/80 px-2">{currentStreet.explanation}</p>
            )}
          </section>
        )}

        {view === 'results' && (
          <section className="space-y-6">
            <h1 className="text-2xl font-bold text-center">Results</h1>
            <p className="text-center text-3xl font-bold text-[#22c55e]">
              {score} / {TOTAL_QUIZ_QUESTIONS}
            </p>

            {score >= PASS_SCORE ? (
              <>
                <p className="text-center text-lg font-semibold text-green-300">Module Complete! 🎉</p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                  <p className="text-white/70 mb-2">Mistakes by street:</p>
                  <ul className="space-y-1 text-gray-300">
                    {STREET_ORDER.map((s) => (
                      <li key={s} className="flex justify-between">
                        <span>{s}</span>
                        <span>{wrongByStreet[s] ?? 0} wrong</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-white/80 px-2">
                  Good effort! You need {PASS_SCORE}/{TOTAL_QUIZ_QUESTIONS} to complete this module.
                </p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                  <p className="text-white/70 mb-2">Score breakdown by street:</p>
                  <ul className="space-y-1 text-gray-300">
                    {STREET_ORDER.map((s) => {
                      const wrong = wrongByStreet[s] ?? 0;
                      const correct = 10 - wrong;
                      return (
                        <li key={s} className="flex justify-between">
                          <span>{s}</span>
                          <span>
                            {correct}/10 correct
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={tryStartQuiz}
                  className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
                >
                  Try Again
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full py-4 rounded-xl border border-white/20 bg-white/5 font-semibold"
            >
              Back to Home
            </button>
          </section>
        )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowChart(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-xl shadow-lg"
        aria-label="Open game flow reference"
      >
        📊
      </button>
      {showChart && <GameFlowReferenceOverlay onClose={() => setShowChart(false)} />}
      {limitModalOpen && (
        <DailyLimitModal onClose={() => setLimitModalOpen(false)} />
      )}
    </>
  );
}
