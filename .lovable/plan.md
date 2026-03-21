

## Fix: Push-notiser levereras inte på iOS

### Problem
Backend rapporterar `sent: 1` men notisen visas aldrig på enheten. Apple accepterar payload utan fel men levererar inte till appen. Trolig orsak: inaktuell/korrupt push-prenumeration som Apple inte längre mappar till enheten.

### Åtgärder

#### 1. Lägg till "Återställ push"-funktion i `src/lib/pushNotifications.ts`
Ny funktion `resetPushSubscription(userId)` som:
- Tar bort alla sparade prenumerationer i databasen för användaren
- Avregistrerar befintlig browser-subscription via `subscription.unsubscribe()`
- Avregistrerar service workern helt (`registration.unregister()`)
- Väntar på att en ny service worker registreras (via PWA-pluginen)
- Skapar en helt ny push-subscription med nytt VAPID-anrop
- Sparar den nya prenumerationen i databasen

#### 2. Lägg till "Återställ push"-knapp i `src/pages/Account.tsx`
- Ny knapp "Återställ push" (med `RotateCcw`-ikon) bredvid "Skicka test-push"
- Anropar `resetPushSubscription`, sedan `sendTestPush` automatiskt
- Visar toast med resultat

#### 3. Förbättra loggning i `broadcast-push` edge function
- Logga Apple-svarets `statusCode` och `headers` vid varje push-försök (både success och fail)
- Logga subscription-endpoint så vi kan verifiera att rätt token används
- Detta ger synlighet i om Apple faktiskt tar emot eller avvisar

#### 4. Förbättra loggning i `send-push-notification` edge function
- Samma detaljerade loggning av web-push-svar

### Filer som ändras
- `src/lib/pushNotifications.ts` — ny `resetPushSubscription`-funktion
- `src/pages/Account.tsx` — ny knapp + import
- `supabase/functions/broadcast-push/index.ts` — detaljerad loggning
- `supabase/functions/send-push-notification/index.ts` — detaljerad loggning

