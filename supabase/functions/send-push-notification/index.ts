import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Web Push crypto helpers for Deno
async function generatePushHeaders(subscription: any, vapidPublicKey: string, vapidPrivateKey: string, payload: string) {
  // Use the web-push approach with fetch directly
  const endpoint = subscription.endpoint;

  // Create JWT for VAPID
  const vapidUrl = new URL(endpoint);
  const audience = `${vapidUrl.protocol}//${vapidUrl.host}`;
  
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:noreply@unionen.lovable.app",
  };

  // Base64url encode
  const b64url = (data: Uint8Array) => {
    const b64 = btoa(String.fromCharCode(...data));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  
  const b64urlStr = (str: string) => b64url(new TextEncoder().encode(str));

  const headerB64 = b64urlStr(JSON.stringify(header));
  const claimsB64 = b64urlStr(JSON.stringify(claims));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  // Import VAPID private key
  const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = b64url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    ttl: "86400",
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Return public VAPID key
    if (action === 'get-vapid-key') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      if (!vapidPublicKey) {
        return new Response(JSON.stringify({ error: 'VAPID key not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ vapidKey: vapidPublicKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send push notification
    if (action === 'send') {
      const { couple_id, sender_id, title, body: notifBody, type } = body;

      // Input validation
      if (typeof title !== 'string' || title.length === 0 || title.length > 100) {
        return new Response(JSON.stringify({ error: 'Invalid title' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (typeof notifBody !== 'string' || notifBody.length === 0 || notifBody.length > 500) {
        return new Response(JSON.stringify({ error: 'Invalid body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!['message', 'repair'].includes(type)) {
        return new Response(JSON.stringify({ error: 'Invalid type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Strip control characters from user-supplied content
      const sanitizedTitle = title.replace(/[\x00-\x1F\x7F]/g, '').trim();
      const sanitizedBody = notifBody.replace(/[\x00-\x1F\x7F]/g, '').trim();

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get partner's user_id from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('couple_id', couple_id)
        .neq('user_id', sender_id);

      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const partnerId = profiles[0].user_id;

      // Check notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', partnerId)
        .maybeSingle();

      // Default to enabled if no preferences set
      if (prefs) {
        if (type === 'message' && !prefs.messages_enabled) {
          return new Response(JSON.stringify({ sent: 0, reason: 'disabled' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (type === 'repair' && !prefs.repairs_enabled) {
          return new Response(JSON.stringify({ sent: 0, reason: 'disabled' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Get push subscriptions for partner
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', partnerId);

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ sent: 0, reason: 'no_subscription' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

      if (!vapidPublicKey || !vapidPrivateKey) {
        return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = JSON.stringify({
        title: sanitizedTitle,
        body: sanitizedBody,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { type, url: type === 'message' ? '/messages' : '/repair' },
      });

      let sent = 0;
      for (const sub of subs) {
        try {
          const subscription = sub.subscription;
          const endpoint = subscription.endpoint;

          // Simple push via fetch with VAPID
          const pushHeaders = await generatePushHeaders(subscription, vapidPublicKey, vapidPrivateKey, payload);

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              ...pushHeaders,
              'Content-Type': 'application/octet-stream',
              'Content-Encoding': 'aes128gcm',
            },
            body: new TextEncoder().encode(payload),
          });

          if (res.ok || res.status === 201) {
            sent++;
          } else {
            console.error('Push failed:', res.status, await res.text());
            // Remove invalid subscription
            if (res.status === 404 || res.status === 410) {
              await supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
            }
          }
        } catch (e) {
          console.error('Push error:', e);
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
