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

  console.log('[daily-reminder] Invoked');

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

    // Get current time in Swedish timezone, rounded to 15-min window
    const now = new Date();
    const svTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
    const hour = svTime.getHours();
    const minute = svTime.getMinutes();
    const windowStart = Math.floor(minute / 15) * 15;
    const windowEnd = windowStart + 14;

    const timeFrom = hour.toString().padStart(2, '0') + ':' + windowStart.toString().padStart(2, '0') + ':00';
    const timeTo = hour.toString().padStart(2, '0') + ':' + windowEnd.toString().padStart(2, '0') + ':59';
    const today = svTime.toISOString().split('T')[0];

    console.log(`Checking window ${timeFrom} - ${timeTo}, date: ${today}`);

    // Find users with daily reminder enabled in this 15-min window
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('daily_reminder_enabled', true)
      .gte('daily_reminder_time', timeFrom)
      .lte('daily_reminder_time', timeTo);

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_users_in_window', window: `${timeFrom}-${timeTo}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${prefs.length} users in window`);

    const payload = JSON.stringify({
      title: 'Relationskontot',
      body: 'Dags att fylla i Relationskontot! ❤️',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { type: 'daily_reminder', url: '/' },
    });

    let totalSent = 0;
    let skippedAlreadyDone = 0;

    for (const pref of prefs) {
      // Deduplication: skip if user already completed today's check
      const { data: existingCheck } = await supabase
        .from('daily_checks')
        .select('id')
        .eq('user_id', pref.user_id)
        .eq('check_date', today)
        .limit(1);

      if (existingCheck && existingCheck.length > 0) {
        skippedAlreadyDone++;
        continue;
      }

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', pref.user_id);

      if (!subs || subs.length === 0) continue;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          totalSent++;
          console.log(`Push sent to user ${pref.user_id}`);
        } catch (e: any) {
          console.error('Push error:', e.statusCode, e.body);
          if (e.statusCode === 404 || e.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('user_id', pref.user_id);
          }
        }
      }
    }

    console.log(`Done: sent=${totalSent}, skipped=${skippedAlreadyDone}`);

    return new Response(JSON.stringify({ sent: totalSent, skipped: skippedAlreadyDone, window: `${timeFrom}-${timeTo}` }), {
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
