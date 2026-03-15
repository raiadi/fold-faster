// TODO: When calling Anthropic API, use a backend (e.g. Supabase Edge Function) so the API key
// is never exposed in the browser. Do not use VITE_ANTHROPIC_API_KEY from the client in production.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function getSkillCheckFeedback({ cards, position, action, decision }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY');

  const system = `You are a poker training coach for beginners. 
Always respond in plain English. Never use poker jargon without explaining it. 
Keep explanations to 2-3 sentences maximum.`;

  const user = `The player held ${cards} in ${position} position. 
The action was: ${action}. They chose to ${decision}. 
Was this correct? Explain why in 2-3 simple sentences. 
Start with either 'Good fold.' 'Good call.' 'Good raise.' or 
'You should have folded/called/raised here.'`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText || 'Claude request failed');
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const correct = /^Good (fold|call|raise)\./i.test(text.trim());
  return { text, correct };
}
