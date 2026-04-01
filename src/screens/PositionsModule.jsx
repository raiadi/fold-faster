import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyLimitModal from '../components/DailyLimitModal';
import PokerTable from '../components/PokerTable';
import PositionChartOverlay from '../components/PositionChartOverlay';
import { POSITIONS_DATA } from '../data/positionsData';
import { supabase } from '../lib/supabase';
import { getModuleProgress, saveModuleProgress } from '../lib/moduleProgress';
import { getRemainingRuns, recordRun } from '../lib/runLimits';
import { useSubscription } from '../lib/subscription';

const CONFIDENCE_KEY = 'positions_confidence_done';
const SECTION_MODULE_IDS = {
  early: 10,
  middle: 11,
  late: 12,
};

const SECTION_META = {
  early: {
    emoji: '🔴',
    title: 'Early',
    positions: 'UTG, UTG+1, UTG+2',
  },
  middle: {
    emoji: '🟡',
    title: 'Middle',
    positions: 'MP, MP+1, Hijack',
  },
  late: {
    emoji: '🟢',
    title: 'Late',
    positions: 'Cutoff, Button, SB, BB',
  },
};

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuiz(section) {
  return shuffle(POSITIONS_DATA[section] || []).slice(0, 10);
}

function positionsRunKey(section) {
  return `positions_${section}`;
}

export default function PositionsModule() {
  const navigate = useNavigate();
  const { isPro, loading: subLoading } = useSubscription();
  const runRecordedRef = useRef(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [view, setView] = useState('confidence');
  const [activeSection, setActiveSection] = useState('early');
  const [sectionCompletion, setSectionCompletion] = useState({
    early: false,
    middle: false,
    late: false,
  });

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answeredSeat, setAnsweredSeat] = useState(null);
  const [correctSeat, setCorrectSeat] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [lastScore, setLastScore] = useState(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [showPosChart, setShowPosChart] = useState(false);

  const refreshSectionCompletion = async () => {
    const progressByModule = await getModuleProgress(supabase, [10, 11, 12]);
    setSectionCompletion({
      early: Boolean(progressByModule[10]?.completed),
      middle: Boolean(progressByModule[11]?.completed),
      late: Boolean(progressByModule[12]?.completed),
    });
  };

  useEffect(() => {
    const confidenceDone = localStorage.getItem(CONFIDENCE_KEY) === 'true';
    setView(confidenceDone ? 'sections' : 'confidence');

    (async () => {
      await refreshSectionCompletion();
    })();
  }, []);

  const currentQuestion = questions[index];
  const progressText = `Question ${Math.min(index + 1, 10)} of 10`;

  const modeBOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.mode !== 'B') return [];
    return shuffle([currentQuestion.positionName, ...currentQuestion.wrongOptions]).slice(0, 4);
  }, [currentQuestion]);

  const startSectionQuiz = (section) => {
    runRecordedRef.current = false;
    setActiveSection(section);
    setQuestions(buildQuiz(section));
    setIndex(0);
    setScore(0);
    setShowResult(false);
    setAnsweredSeat(null);
    setCorrectSeat(null);
    setSelectedOption('');
    setLastScore(null);
    setResultSaved(false);
    setView('quiz');
  };

  const tryStartSection = (section) => {
    if (!subLoading && !isPro && getRemainingRuns(positionsRunKey(section)) === 0) {
      setLimitModalOpen(true);
      return;
    }
    startSectionQuiz(section);
  };

  const goNextQuestionOrResults = (nextScore) => {
    const isLast = index >= 9;
    if (isLast) {
      setLastScore(nextScore);
      setView('results');
      return;
    }
    setIndex((prev) => prev + 1);
    setShowResult(false);
    setAnsweredSeat(null);
    setCorrectSeat(null);
    setSelectedOption('');
  };

  const handleModeAAnswer = (seatIndex) => {
    if (!currentQuestion || showResult || currentQuestion.mode !== 'A') return;
    const isCorrect = seatIndex === currentQuestion.targetSeat;
    const nextScore = isCorrect ? score + 1 : score;

    setAnsweredSeat(seatIndex);
    setCorrectSeat(currentQuestion.targetSeat);
    setShowResult(true);
    if (isCorrect) setScore(nextScore);

    setTimeout(() => {
      goNextQuestionOrResults(nextScore);
    }, 1500);
  };

  const handleModeBAnswer = (option) => {
    if (!currentQuestion || showResult || currentQuestion.mode !== 'B') return;
    const isCorrect = option === currentQuestion.positionName;
    const nextScore = isCorrect ? score + 1 : score;

    setSelectedOption(option);
    setAnsweredSeat(currentQuestion.targetSeat);
    setCorrectSeat(currentQuestion.targetSeat);
    setShowResult(true);
    if (isCorrect) setScore(nextScore);

    setTimeout(() => {
      goNextQuestionOrResults(nextScore);
    }, 1500);
  };

  useEffect(() => {
    if (view !== 'results' || resultSaved || lastScore === null) return;

    (async () => {
      if (lastScore >= 9) {
        const moduleId = SECTION_MODULE_IDS[activeSection];
        await saveModuleProgress(supabase, moduleId, lastScore, 10);
      }
      await refreshSectionCompletion();
      setResultSaved(true);
    })();
  }, [activeSection, lastScore, resultSaved, view]);

  useEffect(() => {
    if (view !== 'results' || lastScore === null) return;
    if (runRecordedRef.current) return;
    runRecordedRef.current = true;
    if (!subLoading && !isPro) {
      recordRun(positionsRunKey(activeSection));
    }
  }, [view, lastScore, activeSection, isPro, subLoading]);

  const sectionOrder = ['early', 'middle', 'late'];
  const nextSection = sectionOrder[sectionOrder.indexOf(activeSection) + 1] || null;

  return (
    <>
    <div className="min-h-screen bg-[#0f1923] text-white px-4 pt-6 pb-8">
      <button
        type="button"
        onClick={() => navigate('/home')}
        className="text-white/70 text-sm mb-6"
      >
        ← Back
      </button>

      {view === 'confidence' && (
        <section className="min-h-[70vh] flex flex-col justify-center">
          <h1 className="text-2xl font-bold mb-3">Do you know all the position names in poker?</h1>
          <p className="text-white/70 mb-8">Select No if less than 100% sure</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(CONFIDENCE_KEY, 'true');
                setView('sections');
              }}
              className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Yes, test me
            </button>
            <button
              type="button"
              onClick={() => setView('reference')}
              className="w-full py-4 rounded-xl border border-white/20 bg-white/5 font-semibold"
            >
              No, show me first
            </button>
          </div>
        </section>
      )}

      {view === 'reference' && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Position reference</h1>
          <div className="overflow-hidden rounded-xl border border-white/15 bg-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/10">
                <tr>
                  <th className="text-left px-3 py-2">Position</th>
                  <th className="text-left px-3 py-2">Also known as</th>
                  <th className="text-left px-3 py-2">Typical player count</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['UTG', 'Under the Gun', '6, 7, 9-handed'],
                  ['UTG+1', '—', '7, 9-handed'],
                  ['UTG+2', '—', '9-handed only'],
                  ['MP', 'Middle Position', '6, 7, 9-handed'],
                  ['Hijack', 'HJ', '6, 7, 9-handed'],
                  ['Cutoff', 'CO', '6, 7, 9-handed'],
                  ['Button', 'BTN / Dealer', 'all'],
                  ['Small Blind', 'SB', 'all'],
                  ['Big Blind', 'BB', 'all'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-white/10">
                    <td className="px-3 py-2">{row[0]}</td>
                    <td className="px-3 py-2 text-white/80">{row[1]}</td>
                    <td className="px-3 py-2 text-white/70">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/75">
            Key tip: Positions are named relative to the dealer button — they move every hand.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(CONFIDENCE_KEY, 'true');
              setView('sections');
            }}
            className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
          >
            Got it, start drilling
          </button>
        </section>
      )}

      {view === 'sections' && (
        <section>
          <h1 className="text-2xl font-bold mb-5">Positions</h1>
          <div className="space-y-3">
            {sectionOrder.map((section) => {
              const meta = SECTION_META[section];
              const done = sectionCompletion[section];
              const rem =
                subLoading || isPro ? null : getRemainingRuns(positionsRunKey(section));
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => tryStartSection(section)}
                  className="w-full text-left rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold flex items-center gap-2">
                      {meta.emoji} {meta.title}
                      {rem === 0 && !isPro && !subLoading && (
                        <span className="text-lg" aria-hidden>🔒</span>
                      )}
                    </p>
                    <span className="text-xs font-medium text-white/80 flex flex-col items-end gap-0.5">
                      {rem != null && rem > 0 && rem < 3 && (
                        <span className="text-amber-400">{rem} runs left today</span>
                      )}
                      {done ? '✅ Complete' : '0/10'}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{meta.positions}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === 'quiz' && currentQuestion && (
        <section>
          <div className="mb-4">
            <p className="text-sm text-white/70 mb-2">{progressText}</p>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#22c55e] transition-all"
                style={{ width: `${((index + 1) / 10) * 100}%` }}
              />
            </div>
          </div>

          <PokerTable
            playerCount={currentQuestion.playerCount}
            dealerIndex={currentQuestion.dealerIndex}
            bigBlindIndex={currentQuestion.bigBlindIndex}
            highlightedSeat={currentQuestion.mode === 'B' ? currentQuestion.targetSeat : null}
            onSeatClick={handleModeAAnswer}
            answeredSeat={answeredSeat}
            correctSeat={correctSeat}
            showResult={showResult}
          />

          <div className="mt-6">
            {currentQuestion.mode === 'A' ? (
              <p className="text-lg font-semibold">
                Tap the <span className="text-[#22c55e]">{currentQuestion.positionName}</span> seat
              </p>
            ) : (
              <>
                <p className="text-lg font-semibold mb-3">
                  A position is highlighted — what position is this?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {modeBOptions.map((option) => {
                    const isCorrect = showResult && option === currentQuestion.positionName;
                    const isWrong = showResult && selectedOption === option && option !== currentQuestion.positionName;
                    const btnClass = isCorrect
                      ? 'bg-green-600 border-green-400'
                      : isWrong
                        ? 'bg-red-600 border-red-400'
                        : 'bg-white/5 border-white/20';
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={showResult}
                        onClick={() => handleModeBAnswer(option)}
                        className={`py-3 px-2 rounded-xl border text-sm font-medium transition ${btnClass}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {view === 'results' && lastScore !== null && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Results</h1>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5">
            <p className="text-3xl font-bold text-[#22c55e] mb-2">{lastScore} / 10</p>
            {lastScore >= 9 ? (
              <p className="text-green-300 font-medium">Section complete! ✅</p>
            ) : (
              <p className="text-yellow-200 font-medium">Almost! Try again</p>
            )}
          </div>

          {lastScore >= 9 && nextSection && (
            <button
              type="button"
              onClick={() => tryStartSection(nextSection)}
              className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Next section
            </button>
          )}

          {lastScore < 9 && (
            <button
              type="button"
              onClick={() => tryStartSection(activeSection)}
              className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Retry
            </button>
          )}

          <button
            type="button"
            onClick={() => setView('sections')}
            className="w-full py-4 rounded-xl border border-white/20 bg-white/5 font-semibold"
          >
            Back to sections
          </button>
        </section>
      )}
    </div>

    <button
      type="button"
      onClick={() => setShowPosChart(true)}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-xl shadow-lg"
      aria-label="Open table positions chart"
    >
      📊
    </button>
    {showPosChart && (
      <PositionChartOverlay onClose={() => setShowPosChart(false)} />
    )}
    {limitModalOpen && (
      <DailyLimitModal onClose={() => setLimitModalOpen(false)} />
    )}
    </>
  );
}

