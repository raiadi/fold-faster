// Fetch the current user's subscription status from Supabase.
// Returns { isPro, loading } where isPro = status IN ('active', 'trialing').
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { if (!cancelled) setLoading(false); return; }

      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setIsPro(['active', 'trialing'].includes(data?.status ?? ''));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isPro, loading };
}

// Count today's sessions for a user (used to enforce the 3/day free limit).
export async function getTodaySessionCount(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());

  return count ?? 0;
}
