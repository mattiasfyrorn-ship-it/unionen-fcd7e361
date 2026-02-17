import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current hour in Swedish time (CET/CEST)
    const now = new Date();
    const svTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
    const currentHour = svTime.getHours().toString().padStart(2, '0') + ':00';

    // Find users with daily reminder enabled at this hour
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('daily_reminder_enabled', true)
      .gte('daily_reminder_time', currentHour + ':00')
      .lt('daily_reminder_time', currentHour.replace(/:00$/, ':59') + ':59');

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_users_at_this_hour' }), {
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

    let totalSent = 0;

    for (const pref of prefs) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', pref.user_id);

      if (!subs || subs.length === 0) continue;

      const payload = JSON.stringify({
        title: 'Relationskontot',
        body: 'Dags att fylla i Relationskontot! ❤️',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { type: 'daily_reminder', url: '/daily' },
      });

      for (const sub of subs) {
        try {
          const endpoint = sub.subscription.endpoint;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
            },
            body: new TextEncoder().encode(payload),
          });

          if (res.ok || res.status === 201) {
            totalSent++;
          } else if (res.status === 404 || res.status === 410) {
            await supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
          }
        } catch (e) {
          console.error('Push error:', e);
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
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
