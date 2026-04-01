// Supabase Edge Function: generic Claude feedback (API key server-side only).
// Secret: supabase secrets set ANTHROPIC_API_KEY=your_key
// Deploy: supabase functions deploy claude-feedback
//
// verify_jwt defaults to true when deployed — Authorization: Bearer <session JWT> required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      scenario,
      userAnswer,
      correctAnswer,
      position,
      context,
    } = body as {
      scenario?: string;
      userAnswer?: string;
      correctAnswer?: string;
      position?: string;
      context?: string;
    };

    if (!scenario || userAnswer == null || String(userAnswer).trim() === '' || !position) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: scenario, userAnswer, position',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'ANTHROPIC_API_KEY not configured. Set it in Supabase Dashboard → Edge Functions → Secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const system = `You are a poker training coach for beginners.
Always respond in plain English. Never use poker jargon without explaining it.
Keep explanations to 2-3 sentences maximum.`;

    const hasReference =
      correctAnswer != null && String(correctAnswer).trim() !== '';

    const userPrompt = `${scenario}

Position: ${position}.
They chose to ${userAnswer}.
${hasReference ? `Reference (correct play): ${correctAnswer}.` : ''}
Was this correct? Explain why in 2-3 simple sentences.
Start with either 'Good fold.' 'Good call.' 'Good raise.' or
'You should have folded/called/raised here.'
${context ? `\n\nAdditional context: ${context}` : ''}`;

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
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.error?.message || res.statusText || 'Claude request failed';
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const feedback = data.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ feedback }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
