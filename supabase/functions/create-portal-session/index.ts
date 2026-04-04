// Supabase Edge Function: creates a Stripe Billing Portal session.
// Required secrets (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY  — your Stripe secret key (sk_live_... or sk_test_...)
//   SITE_URL           — your deployed site URL, e.g. https://fold-faster.vercel.app
//
// Deploy: supabase functions deploy create-portal-session --no-verify-jwt
// Note: JWT is verified manually below; --no-verify-jwt disables Supabase's
// automatic rejection so we can return a proper JSON error on auth failure.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY secret.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Look up the user's Stripe customer ID
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError || !sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Create Stripe Billing Portal session
    const body = new URLSearchParams({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/settings`,
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json().catch(() => ({}));
      console.error('Stripe portal error:', JSON.stringify(err));
      const message = err.error?.message || stripeRes.statusText || 'Stripe error';
      return new Response(
        JSON.stringify({ error: message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const session = await stripeRes.json();
    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
