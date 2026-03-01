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

  // Validate CRON_SECRET
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('x-cron-secret');
  if (!cronSecret || authHeader !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails('mailto:noreply@mail1.fyrorn.se', vapidPublicKey, vapidPrivateKey);

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

    const payload = JSON.stringify({
      title: 'Relationskontot',
      body: 'Dags att fylla i Relationskontot! ❤️',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { type: 'daily_reminder', url: '/daily' },
    });

    let totalSent = 0;

    for (const pref of prefs) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', pref.user_id);

      if (!subs || subs.length === 0) continue;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          totalSent++;
        } catch (e: any) {
          console.error('Push error:', e.statusCode, e.body);
          if (e.statusCode === 404 || e.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('user_id', pref.user_id);
          }
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
