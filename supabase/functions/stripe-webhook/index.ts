// Supabase Edge Function: handles Stripe webhook events and updates the subscriptions table.
// Required secrets:
//   STRIPE_WEBHOOK_SECRET — from Stripe Dashboard → Webhooks (whsec_...)
//   STRIPE_SECRET_KEY     — your Stripe secret key
//
// Register the webhook endpoint in Stripe Dashboard:
//   https://<your-supabase-project>.supabase.co/functions/v1/stripe-webhook
//
// Events to enable:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed
//   checkout.session.completed
//
// Deploy: supabase functions deploy stripe-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Minimal Stripe webhook signature verification using Web Crypto
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts = sigHeader.split(',');
    const tPart = parts.find((p) => p.startsWith('t='));
    const v1Part = parts.find((p) => p.startsWith('v1='));
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.slice(2);
    const expectedSig = v1Part.slice(3);
    const signed = `${timestamp}.${payload}`;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBytes = await crypto.subtle.sign('HMAC', keyMaterial, new TextEncoder().encode(signed));
    const computedSig = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSig === expectedSig;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const sigHeader = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();

  if (webhookSecret) {
    const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!valid) {
      return new Response('Invalid signature', { status: 400 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Use service role to bypass RLS — webhook writes on behalf of the system
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const eventType = event.type as string;
  const obj = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;

  try {
    if (eventType === 'checkout.session.completed') {
      // A checkout completed — create/update the subscription row so the user
      // immediately gets access even before the subscription.created event fires.
      const userId = (obj.client_reference_id as string) || (obj.metadata as Record<string, string>)?.user_id;
      const customerId = obj.customer as string;
      const subscriptionId = obj.subscription as string;

      console.log('checkout.session.completed:', { userId, customerId, subscriptionId });
      if (userId && customerId) {
        const { error: upsertError } = await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            status: 'trialing',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
            plan: 'monthly',
          },
          { onConflict: 'user_id' }
        );
        if (upsertError) console.error('Upsert error:', JSON.stringify(upsertError));
        else console.log('Subscription upserted successfully for user:', userId);
      } else {
        console.warn('Missing userId or customerId, skipping upsert');
      }
    } else if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      const customerId = obj.customer as string;
      const subscriptionId = obj.id as string;
      const status = obj.status as string; // 'trialing' | 'active' | 'past_due' | 'canceled' etc.

      // Map Stripe status to our status values
      const mappedStatus = ['active', 'trialing', 'past_due'].includes(status) ? status : 'cancelled';

      // Look up user_id from stripe_customer_id
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (existing?.user_id) {
        await supabase.from('subscriptions').upsert(
          {
            user_id: existing.user_id,
            status: mappedStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: 'monthly',
          },
          { onConflict: 'user_id' }
        );
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const customerId = obj.customer as string;

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (existing?.user_id) {
        await supabase.from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', existing.user_id);
      }
    } else if (eventType === 'invoice.payment_failed') {
      const customerId = obj.customer as string;

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (existing?.user_id) {
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('user_id', existing.user_id);
      }
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
    // Still return 200 so Stripe doesn't retry — log the error separately
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
