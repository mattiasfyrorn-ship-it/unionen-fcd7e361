import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = 'PLACEHOLDER_VAPID_KEY'; // Will be replaced with actual key from env

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

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const supported = await isPushSupported();
    if (!supported) return false;

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const reg = registration as any;
    
    // Check existing subscription
    let subscription = await reg.pushManager.getSubscription();
    
    if (!subscription) {
      // Fetch VAPID key from edge function
      const { data: vapidData } = await supabase.functions.invoke('send-push-notification', {
        body: { action: 'get-vapid-key' },
      });
      
      const vapidKey = vapidData?.vapidKey || VAPID_PUBLIC_KEY;
      
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    // Save to database
    const subscriptionJson = subscription.toJSON();
    
    // Upsert: delete old ones for this user, insert new
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    await supabase.from('push_subscriptions').insert({
      user_id: userId,
      subscription: subscriptionJson as any,
    } as any);

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
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
