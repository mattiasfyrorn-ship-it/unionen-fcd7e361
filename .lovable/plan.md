

## Plan: Ändra cron till var 15:e minut + fixa tidsfiltrering

### Problem
1. Cron-jobbet körs bara på hel timme (`0 * * * *`) — om en användare sätter påminnelse till 10:30 kommer den först vid 11:00.
2. Tidsfiltret i edge-funktionen matchar bara inom en hel timme (`HH:00:00` till `HH:59:59`), vilket inte fungerar för 15-minutersintervall.

### Ändringar

**1. Uppdatera cron-schemat till var 15:e minut**
Kör SQL direkt (ej migration) för att ändra schemat:
```sql
SELECT cron.unschedule('daily-reminder-hourly');

SELECT cron.schedule(
  'daily-reminder-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ucgarzkamhrcihmcfsul.supabase.co/functions/v1/daily-reminder',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

**2. Uppdatera tidsfiltret i edge-funktionen** (`supabase/functions/daily-reminder/index.ts`)

Ändra filtret så att det matchar ett 15-minutersfönster istället för en hel timme:
- Beräkna aktuell tid i svensk tidszon (timme + minut)
- Runda ner till närmaste 15-minutersblock (t.ex. 10:37 → 10:30)
- Filtrera `daily_reminder_time` inom det 15-minutersfönstret (t.ex. 10:30:00 – 10:44:59)

**3. Lägg till deduplicering** — kontrollera om användaren redan har gjort dagens check (`daily_checks`-tabellen) innan push skickas, så man inte får påminnelse i onödan.

### Tekniska detaljer

**Filer som ändras:**
- `supabase/functions/daily-reminder/index.ts` — nytt 15-min tidsfilter + deduplicering mot daily_checks

**SQL (körs direkt, ej migration):**
- Ta bort gammalt cron-jobb, skapa nytt med `*/15 * * * *`

