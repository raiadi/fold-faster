// Calls Claude via Supabase Edge Function (no API key in browser, avoids CORS).
import { supabase } from './supabase';

const EDGE_FUNCTION_NAME = 'skill-check-feedback';

export async function getSkillCheckFeedback({ cards, position, action, decision }) {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { cards, position, action, decision },
  });

  if (error) {
    throw new Error(error.message || 'Could not get feedback');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const text = data?.text ?? '';
  const correct = Boolean(data?.correct);
  return { text, correct };
}
