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
    const supported = await isPushSupported();
    if (!supported) {
      console.warn('Push not supported on this device');
      return false;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Push permission denied');
      return false;
    }

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Service worker timeout efter 5s')), 5000)
      ),
    ]) as ServiceWorkerRegistration;

    const reg = registration as any;
    let subscription = await reg.pushManager.getSubscription();

    // Check if existing subscription is stale and should be refreshed
    const shouldRefresh = await isSubscriptionStale(userId, subscription);

    if (subscription && shouldRefresh) {
      console.log('Refreshing stale push subscription...');
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      const vapidKey = await getVapidKey();
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log('New push subscription created');
    }

    // Save to database
    const subscriptionJson = subscription.toJSON();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription: subscriptionJson as any,
    } as any);

    console.log('Push subscription saved to database');
    return true;
  } catch (err) {
    if (err instanceof Error) {
      console.error('Push subscription failed:', err.message, err);
    } else {
      console.error('Push subscription failed (unknown error):', err);
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
      console.log('Auto-refreshing stale push subscription...');
      await subscribeToPush(userId);
    }
  } catch (err) {
    console.error('Push refresh failed:', err);
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
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
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
    await supabase.functions.invoke('send-push-notification', {
      body: {
        action: 'send',
        couple_id: coupleId,
        sender_id: senderId,
        title,
        body,
        type,
      },
    });
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}
