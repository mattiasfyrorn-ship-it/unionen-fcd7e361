

## AI-driven insikter från behov & vilja

### Vad byggs

Ett nytt "Insikter"-kort på Närd-sidan som analyserar användarens historiska behov/vilja-svar med AI och visar:
- Återkommande behov och mönster
- Koppling mellan behov och näringsnivåer (scores)
- Koppling mellan behov och klimat (från daily_checks)
- Konkreta rekommendationer

### Åtgärder

#### 1. Ny edge function `supabase/functions/needs-insights/index.ts`
- Hämtar de senaste 30 dagarnas `need_today` och `want_today` från `evaluations`-tabellen för användaren
- Hämtar motsvarande `score`-data (näring) och `climate` från `daily_checks` för samma period
- Skickar all data till Lovable AI (gemini-3-flash-preview) med en systemprompt som ber om:
  - Återkommande behov/vilja-teman
  - Korrelation mellan specifika behov och höga/låga näringspoäng
  - Korrelation med klimat
  - 2-3 konkreta insikter på svenska
- Returnerar AI-svaret som JSON (ej streaming, enkel invoke)

#### 2. Nytt insiktskort i `src/pages/Evaluate.tsx`
- Placeras efter grafen, längst ner på sidan
- Knapp "Visa insikter" (med Lightbulb-ikon) som triggar edge function-anrop
- Visar AI-genererade insikter i en kort med laddningsindikator
- Cachear resultatet i state så det inte anropas vid varje render

#### 3. Datainsamling i edge function
- Query `evaluations` WHERE `user_id` = anroparen, `need_today IS NOT NULL`, senaste 30 dagar
- Query `daily_checks` WHERE `user_id` = anroparen, senaste 30 dagar (för klimat)
- Kräver minst 5 dagars data för att generera insikter, annars returnera meddelande om att mer data behövs

### Filer som skapas/ändras
- `supabase/functions/needs-insights/index.ts` — ny edge function
- `src/pages/Evaluate.tsx` — nytt insiktskort med knapp och AI-svar

### Tekniska detaljer
- Använder `LOVABLE_API_KEY` (redan konfigurerad) och `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` för databasåtkomst i edge function
- Modell: `google/gemini-3-flash-preview` (snabb, billig)
- Ej streaming — använder `supabase.functions.invoke` från klienten

