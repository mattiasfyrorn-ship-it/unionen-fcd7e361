import { supabase } from "@/integrations/supabase/client";

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** True if the app is running as an installed PWA (home screen) */
export function isInstalledPWA(): boolean {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  return standalone;
}

/** True if running on iOS Safari but NOT as installed PWA */
export function isIOSSafari(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isIOS && !isInstalledPWA();
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
}

async function getVapidKey(): Promise<string> {
  const { data } = await supabase.functions.invoke('send-push-notification', {
    body: { action: 'get-vapid-key' },
  });
  if (!data?.vapidKey) throw new Error('VAPID key not available');
  return data.vapidKey;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    console.log('[Push] Starting subscribeToPush for user', userId);

    const supported = await isPushSupported();
    console.log('[Push] isPushSupported:', supported);
    if (!supported) {
      console.warn('[Push] Push not supported on this device');
      return false;
    }

    console.log('[Push] Current permission:', Notification.permission);
    const permission = await requestNotificationPermission();
    console.log('[Push] Permission after request:', permission);
    if (permission !== 'granted') {
      console.warn('[Push] Push permission denied');
      return false;
    }

    console.log('[Push] Waiting for service worker ready...');
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Service worker timeout efter 5s')), 5000)
      ),
    ]) as ServiceWorkerRegistration;
    console.log('[Push] Service worker ready, scope:', registration.scope);

    const reg = registration as any;
    let subscription = await reg.pushManager.getSubscription();
    console.log('[Push] Existing subscription:', subscription ? 'yes' : 'no');

    // Check if existing subscription is stale and should be refreshed
    const shouldRefresh = await isSubscriptionStale(userId, subscription);
    console.log('[Push] Should refresh:', shouldRefresh);

    if (subscription && shouldRefresh) {
      console.log('[Push] Refreshing stale push subscription...');
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      console.log('[Push] Creating new subscription...');
      const vapidKey = await getVapidKey();
      console.log('[Push] Got VAPID key');
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log('[Push] New push subscription created');
    }

    // Save to database
    const subscriptionJson = subscription.toJSON();
    console.log('[Push] Saving subscription to backend...');
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription: subscriptionJson as any,
    } as any);

    if (error) {
      console.error('[Push] Failed to save subscription:', error);
      return false;
    }

    console.log('[Push] Subscription saved to database ✓');
    return true;
  } catch (err) {
    if (err instanceof Error) {
      console.error('[Push] Subscription failed:', err.message, err);
    } else {
      console.error('[Push] Subscription failed (unknown error):', err);
    }
    return false;
  }
}

/**
 * Check if the stored subscription is older than STALE_THRESHOLD_MS
 */
async function isSubscriptionStale(userId: string, currentSub: PushSubscription | null): Promise<boolean> {
  if (!currentSub) return false;

  try {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('created_at, subscription')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return true; // No stored subscription, treat as stale

    // Check age
    const createdAt = new Date(data.created_at).getTime();
    const age = Date.now() - createdAt;
    if (age > STALE_THRESHOLD_MS) return true;

    // Check if endpoint changed (e.g. browser gave new endpoint)
    const stored = data.subscription as any;
    if (stored?.endpoint && stored.endpoint !== currentSub.endpoint) return true;

    return false;
  } catch {
    return true; // On error, refresh to be safe
  }
}

/**
 * Silently refresh subscription if push is enabled — call on page load
 */
export async function refreshPushSubscription(userId: string): Promise<void> {
  try {
    const supported = await isPushSupported();
    if (!supported) return;

    if (Notification.permission !== 'granted') return;

    const { data } = await supabase
      .from('push_subscriptions')
      .select('created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return; // Not subscribed

    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > STALE_THRESHOLD_MS) {
      console.log('[Push] Auto-refreshing stale push subscription...');
      await subscribeToPush(userId);
    }
  } catch (err) {
    console.error('[Push] Push refresh failed:', err);
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    console.log('[Push] Unsubscribed and removed from database');
  } catch (err) {
    console.error('[Push] Push unsubscribe failed:', err);
  }
}

export async function sendPushToPartner(
  coupleId: string,
  senderId: string,
  title: string,
  body: string,
  type: 'message' | 'repair'
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        action: 'send',
        couple_id: coupleId,
        sender_id: senderId,
        title,
        body,
        type,
      },
    });

    if (error) {
      console.error('[Push] Edge function error:', error);
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: 'Push-notis kunde inte skickas', description: 'Försök igen senare.', variant: 'destructive' });
      return;
    }

    console.log('[Push] Send result:', data);
    if (data?.sent === 0 && data?.reason) {
      console.warn('[Push] Not delivered, reason:', data.reason);
    }
  } catch (err) {
    console.error('[Push] Failed to send push notification:', err);
    const { toast } = await import('@/hooks/use-toast');
    toast({ title: 'Push-notis kunde inte skickas', description: 'Ett oväntat fel uppstod.', variant: 'destructive' });
  }
}

/**
 * Full reset: unregister SW, clear DB subscriptions, re-register and create fresh subscription.
 */
export async function resetPushSubscription(userId: string): Promise<boolean> {
  try {
    console.log('[Push] === RESET START ===');
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);

    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await (reg as any).pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
        console.log('[Push] Browser subscription unsubscribed');
      }
    } catch (e) {
      console.warn('[Push] Could not unsubscribe existing:', e);
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
      console.log('[Push] Unregistered SW:', reg.scope);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const newReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] New SW registered, scope:', newReg.scope);
    await navigator.serviceWorker.ready;

    const vapidKey = await getVapidKey();
    const subscription = await (newReg as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    console.log('[Push] Fresh subscription created, endpoint:', subscription.endpoint?.slice(0, 60));

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription: subscription.toJSON() as any,
    } as any);

    if (error) {
      console.error('[Push] Failed to save fresh subscription:', error);
      return false;
    }
    console.log('[Push] === RESET COMPLETE ✓ ===');
    return true;
  } catch (err) {
    console.error('[Push] Reset failed:', err);
    return false;
  }
}

/** Send a test push to a specific user via broadcast-push */
export async function sendTestPush(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('broadcast-push', {
      body: {
        user_id: userId,
        title: 'Testnotis 🔔',
        body: 'Push fungerar! 🎉',
      },
    });
    if (error) {
      console.error('[Push] Test push error:', error);
      return false;
    }
    console.log('[Push] Test push result:', data);
    return data?.sent > 0;
  } catch (err) {
    console.error('[Push] Test push failed:', err);
    return false;
  }
}
