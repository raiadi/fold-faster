// Supabase Edge Function: calls Anthropic API so the key never hits the browser.
// Set secret: supabase secrets set ANTHROPIC_API_KEY=your_key
// Deploy: supabase functions deploy skill-check-feedback

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cards, position, action, decision } = await req.json();
    if (!cards || !position || !action || !decision) {
      return new Response(
        JSON.stringify({ error: 'Missing cards, position, action, or decision' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured. Add it in Supabase Dashboard → Project Settings → Edge Functions → Secrets.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const system = `You are a poker training coach for beginners. 
Always respond in plain English. Never use poker jargon without explaining it. 
Keep explanations to 2-3 sentences maximum.`;

    const user = `The player held ${cards} in ${position} position. 
The action was: ${action}. They chose to ${decision}. 
Was this correct? Explain why in 2-3 simple sentences. 
Start with either 'Good fold.' 'Good call.' 'Good raise.' or 
'You should have folded/called/raised here.'`;

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.error?.message || res.statusText || 'Claude request failed';
      return new Response(
        JSON.stringify({ error: message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const correct = /^Good (fold|call|raise)\./i.test(text.trim());

    return new Response(JSON.stringify({ text, correct }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
