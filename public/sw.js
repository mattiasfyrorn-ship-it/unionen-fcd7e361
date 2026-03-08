import { precacheAndRoute } from 'workbox-precaching';

// Workbox injicerar precache-manifestet här automatiskt vid build (exakt ett förekomst krävs)
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
      tag: data.data?.type || 'default',
      renotify: true,
      requireInteraction: data.requireInteraction !== false, // default true for banner style
      silent: false, // ensure sound/vibration
      actions: [
        { action: 'open', title: 'Öppna' },
        { action: 'dismiss', title: 'Stäng' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Hamnen', options)
    );
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Hamnen', {
        body: text,
        requireInteraction: true,
        silent: false,
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
