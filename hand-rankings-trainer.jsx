import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./src/lib/supabase";
import { getModuleProgress, saveModuleProgress } from "./src/lib/moduleProgress";

const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_COLORS = { "♠": "#1a1a2e", "♥": "#c0392b", "♦": "#c0392b", "♣": "#1a1a2e" };
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const VALUE_RANK = Object.fromEntries(VALUES.map((v, i) => [v, i]));

const HAND_TYPES = [
  "High Card", "One Pair", "Two Pair", "Three of a Kind",
  "Straight", "Flush", "Full House", "Four of a Kind",
  "Straight Flush", "Royal Flush"
];
const HAND_RANK = Object.fromEntries(HAND_TYPES.map((h, i) => [h, i]));

// Confusion map: for each hand type, which ones are commonly confused with it
const CONFUSION_MAP = {
  "High Card": ["One Pair", "Two Pair", "Straight"],
  "One Pair": ["High Card", "Two Pair", "Three of a Kind"],
  "Two Pair": ["One Pair", "Full House", "Three of a Kind"],
  "Three of a Kind": ["Two Pair", "One Pair", "Full House"],
  "Straight": ["Flush", "Straight Flush", "High Card"],
  "Flush": ["Straight", "Straight Flush", "High Card"],
  "Full House": ["Two Pair", "Three of a Kind", "Four of a Kind"],
  "Four of a Kind": ["Full House", "Three of a Kind", "Two Pair"],
  "Straight Flush": ["Flush", "Straight", "Royal Flush"],
  "Royal Flush": ["Straight Flush", "Flush", "Straight"],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomSuits(count, same = false) {
  if (same) { const s = pickRandom(SUITS); return Array(count).fill(s); }
  return Array.from({ length: count }, () => pickRandom(SUITS));
}

function ensureMixedSuits(count) {
  let suits;
  do { suits = Array.from({ length: count }, () => pickRandom(SUITS)); }
  while (new Set(suits).size === 1);
  return suits;
}

function generateHand(type) {
  switch (type) {
    case "Royal Flush": {
      const s = pickRandom(SUITS);
      return ["10", "J", "Q", "K", "A"].map(v => ({ value: v, suit: s }));
    }
    case "Straight Flush": {
      const s = pickRandom(SUITS);
      const maxStart = 8; // up to 9-high straight flush (avoid royal)
      const start = Math.floor(Math.random() * maxStart);
      return VALUES.slice(start, start + 5).map(v => ({ value: v, suit: s }));
    }
    case "Four of a Kind": {
      const v = pickRandom(VALUES);
      const allSuits = shuffle(SUITS);
      const kicker = pickRandom(VALUES.filter(x => x !== v));
      const cards = allSuits.map(s => ({ value: v, suit: s }));
      cards.push({ value: kicker, suit: pickRandom(SUITS) });
      return shuffle(cards);
    }
    case "Full House": {
      const v1 = pickRandom(VALUES);
      const v2 = pickRandom(VALUES.filter(x => x !== v1));
      const s1 = shuffle(SUITS).slice(0, 3);
      const s2 = shuffle(SUITS).slice(0, 2);
      return shuffle([
        ...s1.map(s => ({ value: v1, suit: s })),
        ...s2.map(s => ({ value: v2, suit: s }))
      ]);
    }
    case "Flush": {
      const s = pickRandom(SUITS);
      let vals;
      do {
        vals = shuffle(VALUES).slice(0, 5).sort((a, b) => VALUE_RANK[a] - VALUE_RANK[b]);
      } while (isSequential(vals));
      return vals.map(v => ({ value: v, suit: s }));
    }
    case "Straight": {
      const start = Math.floor(Math.random() * 9);
      const vals = VALUES.slice(start, start + 5);
      const suits = ensureMixedSuits(5);
      return vals.map((v, i) => ({ value: v, suit: suits[i] }));
    }
    case "Three of a Kind": {
      const v = pickRandom(VALUES);
      const s3 = shuffle(SUITS).slice(0, 3);
      const others = shuffle(VALUES.filter(x => x !== v)).slice(0, 2);
      return shuffle([
        ...s3.map(s => ({ value: v, suit: s })),
        ...others.map(v2 => ({ value: v2, suit: pickRandom(SUITS) }))
      ]);
    }
    case "Two Pair": {
      const pairVals = shuffle(VALUES).slice(0, 2);
      const kicker = pickRandom(VALUES.filter(x => !pairVals.includes(x)));
      const s1 = shuffle(SUITS).slice(0, 2);
      const s2 = shuffle(SUITS).slice(0, 2);
      return shuffle([
        ...s1.map(s => ({ value: pairVals[0], suit: s })),
        ...s2.map(s => ({ value: pairVals[1], suit: s })),
        { value: kicker, suit: pickRandom(SUITS) }
      ]);
    }
    case "One Pair": {
      const v = pickRandom(VALUES);
      const s2 = shuffle(SUITS).slice(0, 2);
      const others = shuffle(VALUES.filter(x => x !== v)).slice(0, 3);
      return shuffle([
        ...s2.map(s => ({ value: v, suit: s })),
        ...others.map(v2 => ({ value: v2, suit: pickRandom(SUITS) }))
      ]);
    }
    case "High Card": {
      let vals;
      do {
        vals = shuffle(VALUES).slice(0, 5);
      } while (
        isSequential(vals.sort((a, b) => VALUE_RANK[a] - VALUE_RANK[b])) ||
        hasPair(vals)
      );
      const suits = ensureMixedSuits(5);
      return vals.map((v, i) => ({ value: v, suit: suits[i] }));
    }
    default: return [];
  }
}

function isSequential(sortedVals) {
  const ranks = sortedVals.map(v => VALUE_RANK[v]);
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] !== 1) return false;
  }
  return true;
}

function hasPair(vals) {
  return new Set(vals).size < vals.length;
}

function getWrongOptions(correct, count = 3, tier = 1) {
  const confusions = CONFUSION_MAP[correct] || [];
  let pool;
  if (tier >= 2) {
    pool = confusions;
  } else {
    pool = HAND_TYPES.filter(h => h !== correct);
  }
  return shuffle(pool).slice(0, count);
}

// Tier configs
const TIER_CONFIG = {
  1: { label: "Tier 1 — Basics", types: ["One Pair", "Two Pair", "Three of a Kind", "Four of a Kind", "Flush", "Full House"] },
  2: { label: "Tier 2 — Subtle", types: ["Straight", "Flush", "Full House", "Two Pair", "Three of a Kind", "High Card", "Straight Flush"] },
  3: { label: "Tier 3 — Traps", types: ["Straight", "Flush", "Straight Flush", "Royal Flush", "High Card", "Full House", "Two Pair"] },
};

const QUESTIONS_PER_TIER = 6;
const PASS_THRESHOLD = 0.9;
const TOTAL_PHASE1_TIERS = 3;
const PHASE2_QUESTIONS = 8;

// ─── Card Component ───
function Card({ value, suit, small = false }) {
  const color = SUIT_COLORS[suit];
  return (
    <div style={{
      width: small ? 56 : 72,
      height: small ? 84 : 104,
      background: "linear-gradient(145deg, #f5f0e8 0%, #e8e0d0 100%)",
      borderRadius: small ? 8 : 10,
      border: "1.5px solid #c8bfa8",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: small ? "5px 6px" : "7px 8px",
      fontFamily: "'Georgia', serif",
      color,
      boxShadow: "0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
      position: "relative",
      userSelect: "none",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: small ? 15 : 19, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: small ? 18 : 24, textAlign: "center", lineHeight: 1 }}>{suit}</div>
      <div style={{
        fontSize: small ? 15 : 19, fontWeight: 700, lineHeight: 1,
        transform: "rotate(180deg)", alignSelf: "flex-end"
      }}>{value}</div>
    </div>
  );
}

// ─── Hand Display ───
function HandDisplay({ cards, label, small = false, highlight = false, onClick = null }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: onClick ? "pointer" : "default",
        padding: small ? "10px 8px" : "14px 12px",
        borderRadius: 14,
        background: highlight ? "rgba(46, 204, 113, 0.12)" : "rgba(255,255,255,0.04)",
        border: highlight ? "2px solid #2ecc71" : "2px solid transparent",
        transition: "all 0.2s ease",
      }}
    >
      {label && <div style={{
        fontSize: 12, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: 1.5, color: "#8a9ba8", marginBottom: 2
      }}>{label}</div>}
      <div style={{
        display: "flex",
        gap: small ? 4 : 6,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {cards.map((c, i) => <Card key={i} value={c.value} suit={c.suit} small={small} />)}
      </div>
    </div>
  );
}

// ─── Button ───
function OptionButton({ label, onClick, state = "default", disabled = false }) {
  const bg = {
    default: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
    correct: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
    wrong: "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
    dimmed: "linear-gradient(135deg, #1a252f 0%, #22303d 100%)",
  }[state];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: state === "dimmed" ? "#556" : "#ecf0f1",
        border: "none",
        borderRadius: 10,
        padding: "13px 18px",
        fontSize: 15,
        fontWeight: 600,
        fontFamily: "'Trebuchet MS', sans-serif",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled ? (state === "dimmed" ? 0.5 : 1) : 1,
        boxShadow: state === "correct" ? "0 0 20px rgba(46,204,113,0.3)" :
                   state === "wrong" ? "0 0 20px rgba(231,76,60,0.3)" :
                   "0 2px 6px rgba(0,0,0,0.2)",
        width: "100%",
        textAlign: "center",
      }}
    >
      {state === "correct" ? "✓ " : state === "wrong" ? "✗ " : ""}{label}
    </button>
  );
}

// ─── Progress Bar ───
function ProgressBar({ current, total, label }) {
  return (
    <div style={{ width: "100%", marginBottom: 8 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: "#7f8c8d", fontWeight: 600,
        letterSpacing: 1, textTransform: "uppercase", marginBottom: 5
      }}>
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div style={{
        height: 6, background: "rgba(255,255,255,0.08)",
        borderRadius: 3, overflow: "hidden"
      }}>
        <div style={{
          height: "100%",
          width: `${(current / total) * 100}%`,
          background: "linear-gradient(90deg, #2ecc71, #27ae60)",
          borderRadius: 3,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Main App ───
export default function HandRankingsTrainer() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("menu"); // menu, phase1, phase1result, phase2, phase2result, complete
  const [tier, setTier] = useState(1);
  const [questionNum, setQuestionNum] = useState(0);
  const [score, setScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Phase 1 state
  const [currentHand, setCurrentHand] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Phase 2 state
  const [hand1, setHand1] = useState({ cards: [], type: "" });
  const [hand2, setHand2] = useState({ cards: [], type: "" });
  const [p2Selected, setP2Selected] = useState(null);

  // Phase tracking
  const [phase, setPhase] = useState(1);
  const [tierScores, setTierScores] = useState({});
  const [moduleComplete, setModuleComplete] = useState(false);
  const [phase2Saved, setPhase2Saved] = useState(false);

  useEffect(() => {
    (async () => {
      const progressByModule = await getModuleProgress(supabase, [20]);
      setModuleComplete(Boolean(progressByModule[20]?.completed));
    })();
  }, []);

  const generatePhase1Question = useCallback((t) => {
    const tierTypes = TIER_CONFIG[t].types;
    const type = pickRandom(tierTypes);
    const hand = generateHand(type);
    const wrongs = getWrongOptions(type, 3, t);
    const opts = shuffle([type, ...wrongs]);
    setCurrentHand(hand);
    setCorrectAnswer(type);
    setOptions(opts);
    setSelected(null);
    setShowResult(false);
  }, []);

  const generatePhase2Question = useCallback(() => {
    let t1, t2;
    do {
      t1 = pickRandom(HAND_TYPES);
      t2 = pickRandom(HAND_TYPES);
    } while (t1 === t2);
    setHand1({ cards: generateHand(t1), type: t1 });
    setHand2({ cards: generateHand(t2), type: t2 });
    setP2Selected(null);
    setShowResult(false);
  }, []);

  const startPhase1 = () => {
    setPhase(1);
    setTier(1);
    setQuestionNum(0);
    setScore(0);
    setTotalCorrect(0);
    setTotalQuestions(0);
    setTierScores({});
    setPhase2Saved(false);
    setScreen("phase1");
    generatePhase1Question(1);
  };

  const startPhase2 = () => {
    setPhase(2);
    setQuestionNum(0);
    setScore(0);
    setPhase2Saved(false);
    setScreen("phase2");
    generatePhase2Question();
  };

  const handlePhase1Select = (opt) => {
    if (showResult) return;
    setSelected(opt);
    setShowResult(true);
    const isCorrect = opt === correctAnswer;
    if (isCorrect) {
      setScore(s => s + 1);
      setTotalCorrect(c => c + 1);
    }
    setTotalQuestions(q => q + 1);
  };

  const nextPhase1 = () => {
    const nextQ = questionNum + 1;
    if (nextQ >= QUESTIONS_PER_TIER) {
      const tierScore = score / QUESTIONS_PER_TIER;
      const newTierScores = { ...tierScores, [tier]: tierScore };
      setTierScores(newTierScores);

      if (tierScore >= PASS_THRESHOLD && tier < TOTAL_PHASE1_TIERS) {
        setTier(t => t + 1);
        setQuestionNum(0);
        setScore(0);
        generatePhase1Question(tier + 1);
      } else if (tierScore < PASS_THRESHOLD) {
        setScreen("phase1result");
      } else {
        setScreen("phase1result");
      }
    } else {
      setQuestionNum(nextQ);
      generatePhase1Question(tier);
    }
  };

  const handlePhase2Select = (which) => {
    if (showResult) return;
    setP2Selected(which);
    setShowResult(true);
    const winner = HAND_RANK[hand1.type] > HAND_RANK[hand2.type] ? 1 : 2;
    if (which === winner) {
      setScore(s => s + 1);
      setTotalCorrect(c => c + 1);
    }
    setTotalQuestions(q => q + 1);
  };

  const nextPhase2 = () => {
    const nextQ = questionNum + 1;
    if (nextQ >= PHASE2_QUESTIONS) {
      setScreen("phase2result");
    } else {
      setQuestionNum(nextQ);
      generatePhase2Question();
    }
  };

  const p2Winner = HAND_RANK[hand1.type] > HAND_RANK[hand2.type] ? 1 : 2;

  useEffect(() => {
    if (screen !== "phase2result" || phase2Saved || totalQuestions === 0) return;
    (async () => {
      await saveModuleProgress(supabase, 20, totalCorrect, totalQuestions);
      const progressByModule = await getModuleProgress(supabase, [20]);
      setModuleComplete(Boolean(progressByModule[20]?.completed));
      setPhase2Saved(true);
    })();
  }, [phase2Saved, screen, totalCorrect, totalQuestions]);

  // ─── Screens ───

  if (screen === "menu") {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <button onClick={() => navigate("/home")} style={styles.backBtn}>← Back</button>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={styles.icon}>🃏</div>
            <h1 style={styles.title}>Hand Rankings</h1>
            <p style={styles.subtitle}>Learn to identify and compare poker hands</p>
            {moduleComplete && (
              <p style={styles.completeBadge}>✅ Complete</p>
            )}
          </div>

          <div style={styles.moduleCard}>
            <div style={styles.modulePhase}>Phase 1</div>
            <h3 style={styles.moduleTitle}>Identify the Hand</h3>
            <p style={styles.moduleDesc}>Five cards are dealt — name the hand type. Three tiers of difficulty from obvious to tricky.</p>
          </div>

          <div style={styles.moduleCard}>
            <div style={styles.modulePhase}>Phase 2</div>
            <h3 style={styles.moduleTitle}>Which Hand Wins?</h3>
            <p style={styles.moduleDesc}>Two hands go head-to-head. Pick the winner. Fast-paced comparisons to build instinct.</p>
          </div>

          <button onClick={startPhase1} style={styles.primaryBtn}>
            Start Training
          </button>
        </div>
      </div>
    );
  }

  if (screen === "phase1") {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <button onClick={() => navigate("/home")} style={styles.backBtn}>← Back</button>
          <ProgressBar current={questionNum + 1} total={QUESTIONS_PER_TIER} label={TIER_CONFIG[tier].label} />

          <div style={{ textAlign: "center", margin: "8px 0 4px" }}>
            <div style={styles.phaseTag}>Phase 1 — Identify the Hand</div>
          </div>

          <HandDisplay cards={currentHand} />

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 16,
            width: "100%",
          }}>
            {options.map((opt) => {
              let state = "default";
              if (showResult) {
                if (opt === correctAnswer) state = "correct";
                else if (opt === selected) state = "wrong";
                else state = "dimmed";
              }
              return (
                <OptionButton
                  key={opt}
                  label={opt}
                  state={state}
                  disabled={showResult}
                  onClick={() => handlePhase1Select(opt)}
                />
              );
            })}
          </div>

          {showResult && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <div style={{
                fontSize: 15, fontWeight: 600, marginBottom: 12,
                color: selected === correctAnswer ? "#2ecc71" : "#e74c3c"
              }}>
                {selected === correctAnswer ? "Correct!" : `It's a ${correctAnswer}`}
              </div>
              <button onClick={nextPhase1} style={styles.nextBtn}>
                Next →
              </button>
            </div>
          )}

          <div style={styles.scoreRow}>
            <span>Score: {score}/{questionNum + (showResult ? 1 : 0)}</span>
            <span>Tier {tier}/3</span>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "phase1result") {
    const lastTierScore = tierScores[tier] || 0;
    const passed = lastTierScore >= PASS_THRESHOLD;
    const allTiersPassed = tier >= TOTAL_PHASE1_TIERS && passed;

    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <button onClick={() => navigate("/home")} style={styles.backBtn}>← Back</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{allTiersPassed ? "🏆" : passed ? "✅" : "📖"}</div>
            <h2 style={styles.resultTitle}>
              {allTiersPassed ? "Phase 1 Complete!" : passed ? `Tier ${tier} Passed!` : `Tier ${tier} — Keep Practising`}
            </h2>
            <p style={{ color: "#95a5a6", fontSize: 15, marginBottom: 6 }}>
              Score: {Math.round(lastTierScore * 100)}% ({Math.round(lastTierScore * QUESTIONS_PER_TIER)}/{QUESTIONS_PER_TIER})
            </p>
            <p style={{ color: "#7f8c8d", fontSize: 13, marginBottom: 24 }}>
              {allTiersPassed
                ? "You can now identify all hand types. Ready for comparisons?"
                : !passed
                ? `Need ${Math.round(PASS_THRESHOLD * 100)}% to advance. Try again!`
                : "Moving to the next tier..."}
            </p>

            {Object.entries(tierScores).map(([t, s]) => (
              <div key={t} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 16px", background: "rgba(255,255,255,0.05)",
                borderRadius: 8, marginBottom: 6, fontSize: 14, color: "#bdc3c7"
              }}>
                <span>{TIER_CONFIG[t].label}</span>
                <span style={{ color: s >= PASS_THRESHOLD ? "#2ecc71" : "#e74c3c" }}>
                  {Math.round(s * 100)}%
                </span>
              </div>
            ))}

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {!passed && (
                <button onClick={() => {
                  setQuestionNum(0); setScore(0);
                  setScreen("phase1"); generatePhase1Question(tier);
                }} style={styles.primaryBtn}>
                  Retry Tier {tier}
                </button>
              )}
              {allTiersPassed && (
                <button onClick={startPhase2} style={styles.primaryBtn}>
                  Start Phase 2 →
                </button>
              )}
              <button onClick={() => setScreen("menu")} style={styles.secondaryBtn}>
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "phase2") {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <button onClick={() => navigate("/home")} style={styles.backBtn}>← Back</button>
          <ProgressBar current={questionNum + 1} total={PHASE2_QUESTIONS} label="Phase 2 — Which Wins?" />

          <div style={{ textAlign: "center", margin: "4px 0 8px" }}>
            <div style={styles.phaseTag}>Tap the winning hand</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <div onClick={() => handlePhase2Select(1)} style={{ cursor: showResult ? "default" : "pointer" }}>
              <HandDisplay
                cards={hand1.cards}
                label="Hand A"
                small
                highlight={showResult && p2Winner === 1}
                onClick={showResult ? null : () => handlePhase2Select(1)}
              />
            </div>

            <div style={{
              textAlign: "center", fontSize: 13, fontWeight: 700,
              color: "#576574", letterSpacing: 2
            }}>VS</div>

            <div onClick={() => handlePhase2Select(2)} style={{ cursor: showResult ? "default" : "pointer" }}>
              <HandDisplay
                cards={hand2.cards}
                label="Hand B"
                small
                highlight={showResult && p2Winner === 2}
                onClick={showResult ? null : () => handlePhase2Select(2)}
              />
            </div>
          </div>

          {showResult && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <div style={{
                fontSize: 14, marginBottom: 4,
                color: p2Selected === p2Winner ? "#2ecc71" : "#e74c3c",
                fontWeight: 600
              }}>
                {p2Selected === p2Winner ? "Correct!" : "Wrong!"}
              </div>
              <div style={{ fontSize: 13, color: "#95a5a6", marginBottom: 12 }}>
                {hand1.type} vs {hand2.type} → <strong style={{ color: "#ecf0f1" }}>
                  {p2Winner === 1 ? "Hand A" : "Hand B"} wins
                </strong>
              </div>
              <button onClick={nextPhase2} style={styles.nextBtn}>Next →</button>
            </div>
          )}

          <div style={styles.scoreRow}>
            <span>Score: {score}/{questionNum + (showResult ? 1 : 0)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "phase2result") {
    const pct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <button onClick={() => navigate("/home")} style={styles.backBtn}>← Back</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {pct >= 90 ? "🏆" : pct >= 70 ? "👏" : "📖"}
            </div>
            <h2 style={styles.resultTitle}>Module Complete!</h2>
            <p style={{ color: "#2ecc71", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{pct}%</p>
            <p style={{ color: "#95a5a6", fontSize: 14, marginBottom: 24 }}>
              Overall: {totalCorrect}/{totalQuestions} correct across both phases
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={startPhase1} style={styles.primaryBtn}>Play Again</button>
              <button onClick={() => setScreen("menu")} style={styles.secondaryBtn}>Back to Menu</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0d1117 0%, #161b22 40%, #1a2332 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "24px 16px",
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    color: "#ecf0f1",
  },
  inner: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    color: "rgba(255,255,255,0.7)",
    background: "transparent",
    border: "none",
    fontSize: 14,
    padding: "2px 0",
    marginBottom: 12,
    cursor: "pointer",
  },
  icon: { fontSize: 52, marginBottom: 8 },
  title: {
    fontSize: 28, fontWeight: 800, margin: "0 0 6px",
    background: "linear-gradient(135deg, #ecf0f1, #bdc3c7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: "#7f8c8d", margin: 0 },
  completeBadge: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#2ecc71",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  moduleCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "16px 20px",
    marginBottom: 12,
    width: "100%",
  },
  modulePhase: {
    fontSize: 11, fontWeight: 700, color: "#2ecc71",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4,
  },
  moduleTitle: { fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "#ecf0f1" },
  moduleDesc: { fontSize: 13, color: "#7f8c8d", margin: 0, lineHeight: 1.5 },
  primaryBtn: {
    background: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "15px 32px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    fontFamily: "'Trebuchet MS', sans-serif",
    boxShadow: "0 4px 15px rgba(46,204,113,0.3)",
    marginTop: 8,
  },
  secondaryBtn: {
    background: "transparent",
    color: "#7f8c8d",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "13px 32px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    fontFamily: "'Trebuchet MS', sans-serif",
  },
  nextBtn: {
    background: "linear-gradient(135deg, #2c3e50, #34495e)",
    color: "#ecf0f1",
    border: "none",
    borderRadius: 10,
    padding: "11px 28px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Trebuchet MS', sans-serif",
  },
  phaseTag: {
    fontSize: 12, fontWeight: 600, color: "#2ecc71",
    textTransform: "uppercase", letterSpacing: 1.2,
  },
  scoreRow: {
    display: "flex", justifyContent: "space-between", width: "100%",
    marginTop: 16, fontSize: 13, color: "#576574", fontWeight: 600,
  },
  resultTitle: {
    fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "#ecf0f1",
  },
};
