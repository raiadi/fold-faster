/**
 * Soft daily run limits per module (localStorage). Not a security boundary.
 */

export const FREE_RUN_LIMIT = 3;

export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function storageKey(moduleKey, dateStr) {
  return `runs_${moduleKey}_${dateStr}`;
}

function cleanupStaleRunKeys() {
  if (typeof localStorage === 'undefined') return;
  const today = getTodayKey();
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('runs_')) continue;
    const m = k.match(/^runs_(.+)_(\d{4}-\d{2}-\d{2})$/);
    if (m && m[2] !== today) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * @param {string} moduleKey e.g. 'positions_early', 'hand_rankings'
 * @returns {number} runs remaining today (0–3)
 */
export function getRemainingRuns(moduleKey) {
  if (typeof localStorage === 'undefined') return FREE_RUN_LIMIT;
  cleanupStaleRunKeys();
  const key = storageKey(moduleKey, getTodayKey());
  const raw = localStorage.getItem(key);
  if (raw === null) return FREE_RUN_LIMIT;
  const used = Math.min(FREE_RUN_LIMIT, Math.max(0, parseInt(raw, 10) || 0));
  return Math.max(0, FREE_RUN_LIMIT - used);
}

/**
 * Call when a full module/session completes (not on start).
 */
export function recordRun(moduleKey) {
  if (typeof localStorage === 'undefined') return;
  const today = getTodayKey();
  const key = storageKey(moduleKey, today);
  const prev = Math.max(0, parseInt(localStorage.getItem(key) || '0', 10) || 0);
  localStorage.setItem(key, String(Math.min(FREE_RUN_LIMIT, prev + 1)));
  cleanupStaleRunKeys();
}
