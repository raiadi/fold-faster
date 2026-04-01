// Claude feedback via Supabase Edge Function only — no API key in the browser.
// supabase.functions.invoke sends Authorization: Bearer <session.access_token> automatically.
import { supabase } from './supabase';

const EDGE_FUNCTION_NAME = 'claude-feedback';

/**
 * Skill check: maps scenario fields to the generic claude-feedback contract.
 * @returns {{ text: string, correct: boolean }}
 */
export async function getSkillCheckFeedback({ cards, position, action, decision }) {
  const scenario = `Hole cards: ${cards}. ${action}.`;

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: {
      scenario,
      userAnswer: decision,
      correctAnswer: '',
      position,
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not get feedback');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const text = data?.feedback ?? '';
  const correct = /^Good (fold|call|raise)\./i.test(text.trim());
  return { text, correct };
}

/**
 * Generic feedback (e.g. future module drills). All fields except context are required by the edge function.
 * @param {{ scenario: string, userAnswer: string, correctAnswer?: string, position: string, context?: string }} payload
 * @returns {{ feedback: string }}
 */
export async function getClaudeFeedback(payload) {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Could not get feedback');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return { feedback: data?.feedback ?? '' };
}
