import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PokerTable from '../components/PokerTable';
import { POSITIONS_DATA } from '../data/positionsData';

const CONFIDENCE_KEY = 'positions_confidence_done';
const SECTION_KEYS = {
  early: 'positions_early_complete',
  middle: 'positions_middle_complete',
  late: 'positions_late_complete',
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

export default function PositionsModule() {
  const navigate = useNavigate();
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

  useEffect(() => {
    const confidenceDone = localStorage.getItem(CONFIDENCE_KEY) === 'true';
    const completionState = {
      early: localStorage.getItem(SECTION_KEYS.early) === 'true',
      middle: localStorage.getItem(SECTION_KEYS.middle) === 'true',
      late: localStorage.getItem(SECTION_KEYS.late) === 'true',
    };
    setSectionCompletion(completionState);
    setView(confidenceDone ? 'sections' : 'confidence');
  }, []);

  const currentQuestion = questions[index];
  const progressText = `Question ${Math.min(index + 1, 10)} of 10`;

  const modeBOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.mode !== 'B') return [];
    return shuffle([currentQuestion.positionName, ...currentQuestion.wrongOptions]).slice(0, 4);
  }, [currentQuestion]);

  const startSectionQuiz = (section) => {
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

    if (lastScore >= 9) {
      localStorage.setItem(SECTION_KEYS[activeSection], 'true');
      setSectionCompletion((prev) => ({ ...prev, [activeSection]: true }));
    }
    setResultSaved(true);
  }, [activeSection, lastScore, resultSaved, view]);

  const sectionOrder = ['early', 'middle', 'late'];
  const nextSection = sectionOrder[sectionOrder.indexOf(activeSection) + 1] || null;

  return (
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
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => startSectionQuiz(section)}
                  className="w-full text-left rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{meta.emoji} {meta.title}</p>
                    <span className="text-xs font-medium text-white/80">
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
                  <span className="text-[#22c55e]">{currentQuestion.positionName}</span> is highlighted — what
                  position is this?
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
              onClick={() => startSectionQuiz(nextSection)}
              className="w-full py-4 rounded-xl bg-[#22c55e] text-[#0f1923] font-semibold"
            >
              Next section
            </button>
          )}

          {lastScore < 9 && (
            <button
              type="button"
              onClick={() => startSectionQuiz(activeSection)}
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
  );
}

