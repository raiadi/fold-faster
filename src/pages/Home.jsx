import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getLevelFromXp, getLevelProgressPct } from '../lib/progress';
import { LEAK_LABELS } from '../data/skillCheckScenarios';
import { MODULE_LABELS, MODULE_SCENARIO_COUNT } from '../data/modules';
import { useSubscription, getTodaySessionCount } from '../lib/subscription';
import { getModuleProgress } from '../lib/moduleProgress';

export default function Home() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [topLeaks, setTopLeaks] = useState([]);
  const [moduleCompletions, setModuleCompletions] = useState({});
  const [extraModuleProgress, setExtraModuleProgress] = useState({});
  const [todaySessions, setTodaySessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isPro } = useSubscription();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) navigate('/login', { replace: true });
        return;
      }
      try {
        const { data: prog } = await supabase
          .from('progress')
          .select('xp, streak, last_active, current_module, level')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) setProgress(prog ?? { xp: 0, streak: 0, level: 1, current_module: 'module_1' });

        const { data: leaks } = await supabase
          .from('leaks')
          .select('leak_type, frequency')
          .eq('user_id', user.id);
        if (cancelled) return;
        const byType = {};
        (leaks || []).forEach((l) => {
          byType[l.leak_type] = (byType[l.leak_type] || 0) + (l.frequency || 1);
        });
        const sorted = Object.entries(byType)
          .map(([leak_type, frequency]) => ({ leak_type, frequency }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 2);
        setTopLeaks(sorted);

        const { data: completions } = await supabase
          .from('module_completions')
          .select('module_id, best_correct, completed')
          .eq('user_id', user.id);
        if (cancelled) return;
        const compMap = {};
        (completions || []).forEach((c) => { compMap[c.module_id] = c; });
        setModuleCompletions(compMap);

        const extras = await getModuleProgress(supabase, [10, 11, 12, 20, 30, 31, 32, 40]);
        if (!cancelled) setExtraModuleProgress(extras);

        const count = await getTodaySessionCount(user.id);
        if (!cancelled) setTodaySessions(count);
      } catch {
        if (!cancelled) setProgress({ xp: 0, streak: 0, level: 1, current_module: 'module_1' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">
        <p className="text-white/70">Loading…</p>
      </div>
    );
  }

  const xp = progress?.xp ?? 0;
  const streak = progress?.streak ?? 0;
  const { name: levelName, xpToNext } = getLevelFromXp(xp);
  const levelPct = getLevelProgressPct(xp);
  const positionsComplete =
    Boolean(extraModuleProgress[10]?.completed)
    && Boolean(extraModuleProgress[11]?.completed)
    && Boolean(extraModuleProgress[12]?.completed);
  const handRankingsComplete = Boolean(extraModuleProgress[20]?.completed);
  const rangesComplete =
    Boolean(extraModuleProgress[30]?.completed)
    && Boolean(extraModuleProgress[31]?.completed)
    && Boolean(extraModuleProgress[32]?.completed);
  const gameFlowComplete = Boolean(extraModuleProgress[40]?.completed);
  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col pb-8">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <span className="font-bold text-lg">Fold Faster</span>
        <div className="relative">
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setSettingsOpen((o) => !o)}
            className="p-2 rounded-lg text-white/70 hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {settingsOpen && (
            <div className="absolute right-0 mt-1 w-36 rounded-xl bg-[#1a2530] border border-white/10 shadow-lg z-10">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 rounded-xl"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 space-y-6">
        {/* Streak card */}
        <section className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-2xl font-bold flex items-center gap-2">
            <span aria-hidden>🔥</span>
            <span>{streak} day streak</span>
          </p>
          <p className="text-white/70 text-sm mt-1">Keep it going!</p>
        </section>

        {/* XP progress bar */}
        <section className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="font-semibold text-white">
            Level {levelName} — {xpToNext != null ? `${xpToNext} XP to next level` : 'Max level'}
          </p>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${levelPct}%` }}
            />
          </div>
        </section>

        {/* Today's training CTA */}
        <section>
          {!isPro && todaySessions >= 3 ? (
            <Link
              to="/paywall"
              className="block w-full py-4 rounded-xl bg-white/10 border border-white/20 text-white/70 font-semibold text-center hover:bg-white/15 transition"
            >
              Daily limit reached — Upgrade to continue
            </Link>
          ) : (
            <Link
              to="/skill-check"
              className="block w-full py-4 rounded-xl bg-brand-green text-brand-dark font-semibold text-center hover:opacity-90 active:scale-[0.98] transition"
            >
              Start today's drills
            </Link>
          )}
        </section>

        {/* HIDDEN: reintroduce with Module 5 (Decision Training)
            when leak tracking becomes meaningful again */}
        {/*
        {topLeaks.length > 0 && (
          <section className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="font-semibold text-white mb-3">Your top leaks</h2>
            <ul className="space-y-2">
              {topLeaks.map(({ leak_type, frequency }) => (
                <li key={leak_type} className="text-sm text-white/80">
                  • {LEAK_LABELS[leak_type] || leak_type}
                </li>
              ))}
            </ul>
          </section>
        )}
        */}

        {/* Module cards — Positions, Hand Rankings, Game Flow, Ranges */}
        <section>
          <h2 className="font-semibold text-white mb-3">Training modules</h2>
          <div className="space-y-3">
            <Link
              to="/module/positions"
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white/50">🪑 Positions</span>
                  {positionsComplete && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">
                      ✅
                    </span>
                  )}
                </div>
                <p className="text-white font-medium text-sm truncate">Learn where you&apos;re sitting at the table</p>
              </div>
              <span className="text-white/30 ml-3">›</span>
            </Link>

            <Link
              to="/module/hand-rankings"
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white/50">🃏 Hand Rankings</span>
                  {handRankingsComplete && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">
                      ✅
                    </span>
                  )}
                </div>
                <p className="text-white font-medium text-sm truncate">Learn which hands beat which</p>
              </div>
              <span className="text-white/30 ml-3">›</span>
            </Link>

            <Link
              to="/module/game-flow"
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white/50">🎮 Game Flow</span>
                  {gameFlowComplete && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">
                      ✅
                    </span>
                  )}
                </div>
                <p className="text-white font-medium text-sm truncate">See how a hand unfolds street by street</p>
              </div>
              <span className="text-white/30 ml-3">›</span>
            </Link>

            <Link
              to="/module/ranges"
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white/50">🎯 Ranges</span>
                  {rangesComplete && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">
                      ✅
                    </span>
                  )}
                </div>
                <p className="text-white font-medium text-sm truncate">Know which hands to play from every position</p>
              </div>
              <span className="text-white/30 ml-3">›</span>
            </Link>

            {/* HIDDEN: reintroduce as Advanced Pro content with Module 5 */}
            {/*
            {[1, 2, 3, 4].map((mid) => {
              const comp = moduleCompletions[mid];
              const bestCorrect = comp?.best_correct ?? 0;
              const completed = comp?.completed ?? false;
              const pct = bestCorrect > 0
                ? Math.round((bestCorrect / MODULE_SCENARIO_COUNT) * 100)
                : 0;
              const label = MODULE_LABELS[`module_${mid}`];
              const locked = mid > 1 && !isPro;

              return locked ? (
                <Link
                  key={mid}
                  to="/paywall"
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 opacity-60 hover:opacity-80 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white/50">Module {mid}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium">
                        Pro
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm truncate">{label}</p>
                    <p className="text-white/40 text-xs mt-1">Unlock with Pro</p>
                  </div>
                  <span className="text-white/30 ml-3">🔒</span>
                </Link>
              ) : (
                <Link
                  key={mid}
                  to={`/module/${mid}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white/50">Module {mid}</span>
                      {!isPro && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium">
                          🔒 Pro
                        </span>
                      )}
                      {completed && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium text-sm truncate">{label}</p>
                    {pct > 0 ? (
                      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-green"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-white/40 text-xs mt-1">Not started</p>
                    )}
                  </div>
                  <span className="text-white/30 ml-3">›</span>
                </Link>
              );
            })}
            */}
          </div>
        </section>

        {/* Upgrade banner — only for free users */}
        {!isPro && (
          <section className="rounded-xl border border-brand-green/50 bg-brand-green/10 p-4">
            <p className="font-medium text-white">Unlock your full training path</p>
            <p className="text-white/80 text-sm mt-1">Get all modules and unlimited drills.</p>
            <Link
              to="/paywall"
              className="mt-3 inline-block text-sm font-medium text-brand-green hover:underline"
            >
              Upgrade →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
