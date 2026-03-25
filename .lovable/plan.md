

## Plan: Ändra daglig påminnelse-URL till Översikt

### Problem
Dagliga påminnelsenotiser skickar användaren till `/daily` (Relationskontot). Användaren vill istället hamna på `/` (Översikt) så de ser det dagliga uppdraget.

### Ändring

**`supabase/functions/daily-reminder/index.ts`** — Ändra `url: '/daily'` till `url: '/'` i push-payloaden (rad ~69).

En enda rad, en fil. Inga andra ändringar behövs — Service Worker läser redan `data.url` och navigerar dit.

