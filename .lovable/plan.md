

## Badge-räknare på app-ikonen (iOS 16.4+ & Android)

Du hade rätt — `navigator.setAppBadge()` fungerar på iOS 16.4+ för installerade PWA:er. Här är planen:

### Vad byggs

En badge-räknare som visar antal olästa meddelanden på app-ikonen på hemskärmen.

### Åtgärder

#### 1. Ny hjälpfil `src/lib/appBadge.ts`
- Funktion `updateAppBadge(count)` som anropar `navigator.setAppBadge(count)` eller `navigator.clearAppBadge()` om count = 0
- Kontrollerar att API:t finns innan anrop (graceful fallback)

#### 2. Uppdatera Service Worker (`public/sw.js`)
- I `push`-eventet: efter `showNotification`, anropa `self.navigator.setAppBadge(1)` för att visa badge vid inkommande push (även när appen inte är öppen)

#### 3. Uppdatera `src/pages/Messages.tsx`
- Efter att olästa meddelanden markeras som lästa: anropa `clearAppBadge()` 
- Det nollställer badge-räknaren när användaren öppnar meddelandesidan

#### 4. Uppdatera `src/App.tsx` (PushInitializer)
- Vid app-start: räkna olästa meddelanden från databasen och sätt badge med `setAppBadge(count)`
- Prenumerera på realtime-inserts i `messages` för att uppdatera badge löpande

### Filer som skapas/ändras
- `src/lib/appBadge.ts` — ny fil
- `public/sw.js` — badge vid push
- `src/pages/Messages.tsx` — clearBadge vid läsning
- `src/App.tsx` — badge-räkning vid start + realtime

### Begränsningar
- Kräver iOS 16.4+ och installerad PWA
- Android Chrome stöder det fullt ut
- Desktop-webbläsare: stöds i Chrome/Edge

