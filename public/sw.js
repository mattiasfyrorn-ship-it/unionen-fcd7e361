// Workbox injicerar sitt precache-manifest här automatiskt vid build
// Guard för development-läge där __WB_MANIFEST inte är definierat
if (typeof self.__WB_MANIFEST !== 'undefined') {
  // eslint-disable-next-line no-undef
  const { precacheAndRoute } = workbox.precaching;
  precacheAndRoute(self.__WB_MANIFEST);
}

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
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Unionen', options)
    );
  } catch (e) {
    // Try as text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Unionen', { body: text })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

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
