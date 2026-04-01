import { getLevelFromXp } from './progress';

function getCompletionThreshold(totalQuestions) {
  return Math.ceil(totalQuestions * 0.9);
}

export async function saveModuleProgress(supabase, moduleId, score, totalQuestions, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const userId = session.user.id;
  const threshold = options.minCorrect != null
    ? options.minCorrect
    : getCompletionThreshold(totalQuestions);
  const completedByScore = score >= threshold;

  const { data: existing } = await supabase
    .from('module_completions')
    .select('best_correct, completed')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .maybeSingle();

  const prevBest = existing?.best_correct ?? 0;
  const bestCorrect = Math.max(prevBest, score);
  const completed = completedByScore || Boolean(existing?.completed);

  await supabase.from('module_completions').upsert(
    {
      user_id: userId,
      module_id: moduleId,
      best_correct: bestCorrect,
      completed,
    },
    {
      onConflict: 'user_id,module_id',
      ignoreDuplicates: false,
    }
  );

  const justCompleted = !existing?.completed && completedByScore;
  if (!justCompleted) return;

  // Match existing XP upsert pattern used in module result flows.
  const { data: progRow } = await supabase
    .from('progress')
    .select('xp, streak, last_active')
    .eq('user_id', userId)
    .maybeSingle();

  const prevXp = progRow?.xp ?? 0;
  const newXp = prevXp + 50;
  const { level } = getLevelFromXp(newXp);

  await supabase.from('progress').upsert(
    {
      user_id: userId,
      xp: newXp,
      streak: progRow?.streak ?? 0,
      last_active: progRow?.last_active ?? null,
      level,
    },
    { onConflict: 'user_id' }
  );
}

export async function getModuleProgress(supabase, moduleIds = []) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user || !Array.isArray(moduleIds) || moduleIds.length === 0) return {};

  const { data } = await supabase
    .from('module_completions')
    .select('module_id, completed, best_correct')
    .eq('user_id', session.user.id)
    .in('module_id', moduleIds);

  const byModuleId = {};
  (data || []).forEach((row) => {
    byModuleId[row.module_id] = {
      completed: Boolean(row.completed),
      best_correct: row.best_correct ?? 0,
    };
  });
  return byModuleId;
}

