import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // Return public VAPID key
    if (action === 'get-vapid-key') {
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
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (typeof notifBody !== 'string' || notifBody.length === 0 || notifBody.length > 500) {
        return new Response(JSON.stringify({ error: 'Invalid body' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!['message', 'repair'].includes(type)) {
        return new Response(JSON.stringify({ error: 'Invalid type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!vapidPublicKey || !vapidPrivateKey) {
        return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Configure web-push
      webpush.setVapidDetails('mailto:noreply@mail1.fyrorn.se', vapidPublicKey, vapidPrivateKey);

      // Sanitize user input
      const sanitizedTitle = title.replace(/[\x00-\x1F\x7F]/g, '').trim();
      const sanitizedBody = notifBody.replace(/[\x00-\x1F\x7F]/g, '').trim();

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get partner's user_id
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
          await webpush.sendNotification(sub.subscription, payload);
          sent++;
        } catch (e: any) {
          console.error('Push error:', e.statusCode, e.body);
          // Remove invalid subscriptions (gone or not found)
          if (e.statusCode === 404 || e.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('user_id', partnerId);
          }
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
