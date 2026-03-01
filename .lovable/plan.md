
## Problem: Två service workers krockar och bryter push-notiser

### Rotorsaken

Det finns en fundamental konflikt i hur service workers är uppsatta:

1. VitePWA-pluginen genererar en `sw.js` via Workbox vid build och skriver automatiskt över `public/sw.js`
2. Vår anpassade `public/sw.js` med push-logik försvinner alltså i produktionsbygget
3. Resultatet: `navigator.serviceWorker.ready` pekar på Workbox service worker som saknar push-hantering
4. `reg.pushManager.subscribe(...)` kastar ett fel (t.ex. ogiltig VAPID-nyckel eller problem med workern) och fångas i `catch`-blocket → returnerar `false` → felmeddelandet visas

Dessutom finns ett timeout-problem: `navigator.serviceWorker.ready` kan hänga länge i en vanlig webbläsarflik (inte installerad PWA) om service workern inte aktiveras direkt.

### Lösning: Slå samman till en enda service worker med `injectManifest`

VitePWA stöder ett läge som heter `injectManifest` där vi skriver vår egen service worker och Workbox injicerar sina cache-definitioner i den. På så sätt har vi bara en service worker som gör allt.

#### Konkreta ändringar

**1. `vite.config.ts`** — Byt strategi från `generateSW` (default) till `injectManifest` och peka på vår custom service worker:

```ts
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'public',
  filename: 'sw.js',
  registerType: 'autoUpdate',
  // ...resten är samma
})
```

**2. `public/sw.js`** — Lägg till Workbox-injektionspunkt överst och behåll push/notificationclick-logiken:

```js
// Workbox injicerar sitt precache-manifest här automatiskt vid build
import { precacheAndRoute } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST);

// Push-logiken finns kvar nedan (oförändrad)
self.addEventListener('push', ...);
self.addEventListener('notificationclick', ...);
```

**3. `src/lib/pushNotifications.ts`** — Lägg till timeout på `serviceWorker.ready` (max 5 sekunder) och bättre felhantering som loggar exakt vad som går fel, så att framtida problem är lättare att felsöka:

```ts
const registration = await Promise.race([
  navigator.serviceWorker.ready,
  new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 5000))
]);
```

**4. `src/App.tsx`** — Ta bort den manuella registreringen av `/sw.js` i `PushInitializer` eftersom VitePWA sköter registreringen automatiskt. Dubbel-registrering kan orsaka problem.

### Tekniska detaljer

- `injectManifest`-strategin kräver att service worker-filen innehåller `self.__WB_MANIFEST` — det är platsen Workbox injicerar sitt precache-manifest
- I development-läge fungerar `self.__WB_MANIFEST` inte utan en speciell mock — vi lägger till `if (typeof self.__WB_MANIFEST !== 'undefined')` som guard
- VAPID-nycklarna är korrekt konfigurerade som secrets, så det problemet är inte orsaken
- Ingen databasändring behövs

### Filer som ändras

- `vite.config.ts` — lägg till `strategies: 'injectManifest'`, `srcDir: 'public'`, `filename: 'sw.js'`
- `public/sw.js` — lägg till Workbox precache-anrop överst med `__WB_MANIFEST`-guard
- `src/lib/pushNotifications.ts` — lägg till timeout på `serviceWorker.ready` och förbättrad fellogning
- `src/App.tsx` — ta bort manuell `navigator.serviceWorker.register('/sw.js')` i `PushInitializer`
