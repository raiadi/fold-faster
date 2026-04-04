/**
 * Curriculum order and routes (must match App.jsx).
 * A track is complete when every section_id row has completed === true.
 */
const MODULE_ORDER = [
  {
    key: 'positions',
    label: 'Positions',
    route: '/module/positions',
    sectionIds: [10, 11, 12],
  },
  {
    key: 'hand-rankings',
    label: 'Hand Rankings',
    route: '/module/hand-rankings',
    sectionIds: [20],
  },
  {
    key: 'game-flow',
    label: 'Game Flow',
    route: '/module/game-flow',
    sectionIds: [40],
  },
  {
    key: 'ranges',
    label: 'Ranges',
    route: '/module/ranges',
    sectionIds: [30, 31, 32],
  },
];

/** Denominator for best_correct → ratio (approximate caps per section). */
const MAX_SCORE_BY_MODULE_ID = {
  10: 10,
  11: 10,
  12: 10,
  20: 40,
  30: 15,
  31: 15,
  32: 15,
  40: 40,
};

function sectionRatio(lookup, id) {
  const row = lookup[id];
  const max = MAX_SCORE_BY_MODULE_ID[id] ?? 10;
  const best = row?.best_correct ?? 0;
  return max > 0 ? best / max : 0;
}

function trackAverageRatio(mod, lookup) {
  const ratios = mod.sectionIds.map((id) => sectionRatio(lookup, id));
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<{ route: string, label: string, intent: 'continue' | 'review' | 'practice' }>}
 */
export async function getNextModule(supabase, userId) {
  const fallback = {
    route: '/module/positions',
    label: 'Positions',
    intent: 'continue',
  };

  if (!userId) return fallback;

  const { data: completions, error } = await supabase
    .from('module_completions')
    .select('module_id, completed, best_correct')
    .eq('user_id', userId);

  if (error) {
    console.error('getNextModule:', error);
    return fallback;
  }

  const lookup = {};
  (completions || []).forEach((row) => {
    lookup[row.module_id] = row;
  });

  for (const mod of MODULE_ORDER) {
    const hasIncomplete = mod.sectionIds.some((id) => {
      const row = lookup[id];
      return !row || !row.completed;
    });
    if (hasIncomplete) {
      return { route: mod.route, label: mod.label, intent: 'continue' };
    }
  }

  let weakestMod = MODULE_ORDER[0];
  let lowestRatio = Infinity;
  for (const mod of MODULE_ORDER) {
    const avg = trackAverageRatio(mod, lookup);
    if (avg < lowestRatio) {
      lowestRatio = avg;
      weakestMod = mod;
    }
  }

  if (lowestRatio < 0.88) {
    return {
      route: weakestMod.route,
      label: weakestMod.label,
      intent: 'review',
    };
  }

  return {
    route: '/module/ranges',
    label: 'Ranges',
    intent: 'practice',
  };
}
