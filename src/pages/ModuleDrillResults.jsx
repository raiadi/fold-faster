import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MODULE_LABELS, MODULE_COMPLETE_AT, MODULE_SCENARIO_COUNT } from '../data/modules';
import { MODULE_LEAK_LABELS } from '../data/moduleScenarios';
import {
  computeNewStreak,
  getLevelFromXp,
  XP_SESSION,
  XP_ALL_CORRECT_BONUS,
  XP_STREAK_7_MILESTONE,
} from '../lib/progress';

function getTopLeak(results) {
  const wrongByType = {};
  results.forEach((r) => {
    if (!r.correct && r.leak_type) {
      wrongByType[r.leak_type] = (wrongByType[r.leak_type] || 0) + 1;
    }
  });
  const entries = Object.entries(wrongByType);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export default function ModuleDrillResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state?.results || [];
  const moduleId = location.state?.moduleId;

  const [saved, setSaved] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [nextModuleUnlocked, setNextModuleUnlocked] = useState(false);

  const correctCount = results.filter((r) => r.correct).length;
  const total = results.length;
  const passed = correctCount >= MODULE_COMPLETE_AT;
  const topLeak = getTopLeak(results);
  const moduleLabel = MODULE_LABELS[`module_${moduleId}`] || `Module ${moduleId}`;

  useEffect(() => {
    if (!results.length || !moduleId) {
      navigate('/home', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || saved) return;

      try {
        // 1. Upsert module_completions — keep best score
        const { data: existing } = await supabase
          .from('module_completions')
          .select('best_correct, completed')
          .eq('user_id', user.id)
          .eq('module_id', moduleId)
          .maybeSingle();

        const alreadyCompleted = existing?.completed ?? false;
        const bestCorrect = Math.max(correctCount, existing?.best_correct ?? 0);
        const nowComplete = bestCorrect >= MODULE_COMPLETE_AT;

        await supabase.from('module_completions').upsert(
          {
            user_id: user.id,
            module_id: moduleId,
            best_correct: bestCorrect,
            total_scenarios: MODULE_SCENARIO_COUNT,
            completed: nowComplete,
            completed_at: nowComplete && !alreadyCompleted ? new Date().toISOString() : (existing?.completed_at ?? null),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,module_id' }
        );

        if (!cancelled) {
          setJustCompleted(nowComplete && !alreadyCompleted);
        }

        // 2. If just completed, advance current_module in progress
        const nextModule = moduleId < 4 ? moduleId + 1 : moduleId;
        if (nowComplete && !alreadyCompleted && moduleId < 4) {
          const { data: prog } = await supabase
            .from('progress')
            .select('current_module')
            .eq('user_id', user.id)
            .maybeSingle();

          const currentModuleNum = parseInt((prog?.current_module || 'module_1').replace('module_', ''), 10);
          if (currentModuleNum <= moduleId) {
            await supabase.from('progress').upsert(
              { user_id: user.id, current_module: `module_${nextModule}` },
              { onConflict: 'user_id' }
            );
            if (!cancelled) setNextModuleUnlocked(true);
          }
        }

        // 3. Save session + XP + streak
        await supabase.from('sessions').insert({
          user_id: user.id,
          scenarios_completed: total,
          correct_count: correctCount,
        });

        if (topLeak) {
          await supabase.from('leaks').insert({
            user_id: user.id,
            leak_type: topLeak,
            frequency: 1,
            last_seen: new Date().toISOString(),
          });
        }

        const { data: progRow } = await supabase
          .from('progress')
          .select('xp, streak, last_active')
          .eq('user_id', user.id)
          .maybeSingle();

        const prevXp = progRow?.xp ?? 0;
        const prevStreak = progRow?.streak ?? 0;
        const lastActive = progRow?.last_active ?? null;
        const newStreak = computeNewStreak(lastActive, prevStreak);

        let xpEarned = XP_SESSION;
        if (correctCount === total) xpEarned += XP_ALL_CORRECT_BONUS;
        if (newStreak === 7 && (prevStreak === 6 || !lastActive)) xpEarned += XP_STREAK_7_MILESTONE;
        const newXp = prevXp + xpEarned;
        const { level } = getLevelFromXp(newXp);

        await supabase.from('progress').upsert(
          {
            user_id: user.id,
            xp: newXp,
            streak: newStreak,
            last_active: new Date().toISOString(),
            level,
          },
          { onConflict: 'user_id' }
        );

        if (!cancelled) setSaved(true);
      } catch {
        if (!cancelled) setSaved(true);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!results.length) return null;

  const scorePct = Math.round((correctCount / total) * 100);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-12 pb-10 text-white">
      <h1 className="text-2xl font-bold text-center mb-1">{moduleLabel}</h1>
      <p className="text-white/60 text-center text-sm mb-8">
        {passed ? 'Module complete!' : 'Keep practising to pass'}
      </p>

      {/* Score card */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-4 text-center">
        <p className="text-4xl font-bold text-brand-green mb-1">
          {correctCount}/{total}
        </p>
        <p className="text-white/60 text-sm">{scorePct}% correct</p>
      </div>

      {/* Pass / fail badge */}
      {passed ? (
        <div className="rounded-xl border border-brand-green/50 bg-brand-green/10 p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-semibold text-white">
              {justCompleted ? 'Module unlocked!' : 'Module complete'}
            </p>
            <p className="text-white/70 text-sm mt-0.5">
              You got {correctCount}/{MODULE_COMPLETE_AT}+ correct.
              {nextModuleUnlocked && moduleId < 4
                ? ` Module ${moduleId + 1} is now available.`
                : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/20 bg-white/5 p-4 mb-4">
          <p className="font-semibold text-white">Not quite — keep going</p>
          <p className="text-white/60 text-sm mt-1">
            You need {MODULE_COMPLETE_AT}/{total} to complete this module. Try again!
          </p>
        </div>
      )}

      {/* Top leak */}
      {topLeak && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6">
          <p className="text-white/50 text-xs mb-1">Area to work on</p>
          <p className="font-semibold text-white">{MODULE_LEAK_LABELS[topLeak] || topLeak}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 mt-auto">
        {!passed && (
          <button
            type="button"
            onClick={() => navigate(`/module/${moduleId}`)}
            className="w-full py-4 rounded-xl bg-brand-green text-brand-dark font-semibold hover:opacity-90"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className={`w-full py-4 rounded-xl font-semibold hover:opacity-90 ${
            passed
              ? 'bg-brand-green text-brand-dark'
              : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
