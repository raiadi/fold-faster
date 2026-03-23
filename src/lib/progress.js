// Level tiers: Bronze 0–500 XP, Silver 501–1500, Gold 1501+
export const LEVELS = [
  { name: 'Bronze', minXp: 0, maxXp: 500 },
  { name: 'Silver', minXp: 501, maxXp: 1500 },
  { name: 'Gold', minXp: 1501, maxXp: null },
];

export function getLevelFromXp(xp) {
  const n = Number(xp) || 0;
  if (n >= 1501) return { level: 3, name: 'Gold', xpToNext: null, xpInTier: n - 1501 };
  if (n >= 501) return { level: 2, name: 'Silver', xpToNext: Math.max(0, 1501 - n), xpInTier: n - 501 };
  return { level: 1, name: 'Bronze', xpToNext: Math.max(0, 501 - n), xpInTier: n };
}

/** 0–100% progress within current level tier */
export function getLevelProgressPct(xp) {
  const n = Number(xp) || 0;
  if (n >= 1501) return 100;
  if (n >= 501) return Math.min(100, ((n - 501) / 1000) * 100);
  return Math.min(100, (n / 500) * 100);
}

export function computeNewStreak(lastActiveIso, currentStreak) {
  if (!lastActiveIso) return 1;
  const last = new Date(lastActiveIso);
  const now = new Date();
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(last, now)) return currentStreak; // already did today
  if (sameDay(last, yesterday)) return (currentStreak || 0) + 1;
  return 1; // 2+ days ago, reset
}

export const XP_SESSION = 50;
export const XP_ALL_CORRECT_BONUS = 25;
export const XP_STREAK_7_MILESTONE = 100;
