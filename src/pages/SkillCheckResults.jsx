import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LEAK_LABELS } from '../data/skillCheckScenarios';
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
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export default function SkillCheckResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state?.results || [];
  const [saved, setSaved] = useState(false);

  const correctCount = results.filter((r) => r.correct).length;
  const total = results.length;
  const topLeak = getTopLeak(results);

  useEffect(() => {
    if (results.length === 0) {
      navigate('/skill-check', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || saved) return;
      try {
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

        const nowIso = new Date().toISOString();
        const { data: existing } = await supabase
          .from('progress')
          .select('xp, streak, last_active, current_module')
          .eq('user_id', user.id)
          .maybeSingle();

        const prevXp = existing?.xp ?? 0;
        const prevStreak = existing?.streak ?? 0;
        const lastActive = existing?.last_active ?? null;
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
            last_active: nowIso,
            current_module: existing?.current_module ?? 'module_1',
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
  }, [results.length, total, correctCount, topLeak, saved, navigate]);

  if (results.length === 0) return null;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col px-6 pt-12 pb-10 text-white">
      <h1 className="text-2xl font-bold text-center mb-2">Skill check complete</h1>
      <p className="text-white/70 text-center mb-8">Here’s your baseline.</p>

      <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
        <p className="text-3xl font-bold text-brand-green mb-1">
          {correctCount}/{total} correct
        </p>
        <p className="text-white/70 text-sm">baseline score</p>
      </div>

      {topLeak && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <p className="text-white/60 text-sm mb-1">Top area to work on</p>
          <p className="text-lg font-semibold text-white">
            {LEAK_LABELS[topLeak] || topLeak}
          </p>
          <p className="text-white/60 text-sm mt-1">
            You missed a few in this category. We’ll focus your drills here.
          </p>
        </div>
      )}

      {!topLeak && (
        <p className="text-white/70 text-center mb-8">
          Great job — no clear leak stood out. We’ll keep mixing in variety.
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate('/home', { replace: true })}
        className="w-full py-4 rounded-xl bg-brand-green text-brand-dark font-semibold hover:opacity-90 mt-auto"
      >
        Start your training path
      </button>
    </div>
  );
}
