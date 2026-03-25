

## Plan: Dagbaserad 90-dagarsresa (ersätter milstolpssystemet)

### Sammanfattning
Byter ut det nuvarande milstolpe-baserade onboardingsystemet mot en dagbaserad 90-dagarsresa där användaren får ett nytt uppdrag varje dag. Varje dag har titel, kort beskrivning, fördjupningstext (visas i dialog) och en direktlänk till rätt funktion.

### Hur vi bestämmer vilken dag användaren är på
Använder `couples.created_at` (eller `profiles.created_at` om solo) som dag 1. Beräknar sedan `dayNumber = differens i dagar + 1`, capped till 90.

### Ändringar

**1. Ny fil: `src/lib/journeyDays.ts`**
- Exporterar en array med 90 dagars innehåll: `{ day, title, description, deepDive, requiresBoth, ctaLabel, ctaPath }`
- Dag 1-30 fylls med innehållet du angett ovan
- Dag 31-90 fylls med platshållarinnehåll (kan fyllas på senare)
- CTA-vägar mappas till befintliga routes:
  - Bjud in partner → `/pairing`
  - Upptäck varandra / Ge uppskattning / Vänd dig mot / Närvaro / Konto → `/daily`
  - Reflektion / Energi → `/evaluate`
  - Samtal / Planera → `/weekly`
  - Påverkan → `/daily`
  - Valfri → `/daily`

**2. Ny hook: `src/hooks/useJourneyDay.ts`**
- Ersätter `useOnboarding` som datakälla för bannern
- Hämtar `couples.created_at` via profil/couple
- Beräknar aktuell dag (1-90)
- Hämtar öppna reparationer (repairs med status `in_progress` för paret)
- Returnerar: `{ loading, dayNumber, totalDays: 90, todayStep, hasOpenRepairs, openRepairCount }`

**3. Uppdatera `src/components/OnboardingBanner.tsx`**
- Använder `useJourneyDay` istället för `useOnboarding`
- Visar dagens uppdrag med titel + kort beskrivning
- "Fördjupning"-knapp som öppnar en `Dialog` med fördjupningstexten
- Direktlänk (CTA-knapp) till rätt sida
- Progressbar visar dag X av 90
- Om öppna reparationer finns: visar reparationsbanner på samma plats (som idag med override)

**4. Ta bort gamla filer** (kan behållas men avkopplas)
- `src/lib/onboardingSteps.ts` — inte längre importerad av bannern
- `src/hooks/useOnboarding.ts` — ersätts av `useJourneyDay`

### Databasändringar
Inga. Dag beräknas från befintlig `couples.created_at`. Inga nya tabeller behövs.

### Dag 1 speciallogik
- Om partnern inte är kopplad: visa "Bjud in din partner" i uppdraget
- Om partnern redan är kopplad: hoppa över inbjudningsdelen, visa resten (notiser etc.)

### Filer som skapas/ändras
- `src/lib/journeyDays.ts` — **ny**, all dagsdata
- `src/hooks/useJourneyDay.ts` — **ny**, hook
- `src/components/OnboardingBanner.tsx` — **omskriven**, ny layout med dialog
- `src/hooks/useOnboarding.ts` — **tas bort eller avkopplas**

