
## Fixa Närd: dagbaserad lagring, prickar per dag, och rätt standardvärden

### Problemanalys

Det finns ett grundläggande designproblem: databasen lagrar data per **vecka** (`week_start` + `area` = unik rad), men gränssnittet låter användaren välja **enskilda dagar**. Det ger tre fel:

1. **Prickar saknas** — `markedDates` innehåller bara måndagsdatum (veckostart), men varje dag i veckopickern jämförs mot sitt eget datum. Onsdag "2026-02-19" matchar aldrig mot "2026-02-17" (måndag).
2. **Alla dagar delar data** — Det unika indexet `(user_id, week_start, area)` gör att tisdag och måndag skriver över varandra.
3. **Standardvärden visas felaktigt** — När en dag laddas utan data borde formuläret återgå till 5 och tomma fält, men problemet beror på att dagbytet inte triggar en ren laddning för rätt dag.

### Lösning: byt till dagbaserad lagring

#### Steg 1 — Databasmigration

Lägg till en `check_date`-kolumn (DATE) och byt ut det unika indexet:

```sql
-- Lägg till check_date med week_start som default för befintlig data
ALTER TABLE evaluations ADD COLUMN check_date date;
UPDATE evaluations SET check_date = week_start WHERE check_date IS NULL;
ALTER TABLE evaluations ALTER COLUMN check_date SET NOT NULL;

-- Ta bort gammalt unikt index
ALTER TABLE evaluations DROP CONSTRAINT evaluations_user_id_week_start_area_key;

-- Skapa nytt unikt index per dag
CREATE UNIQUE INDEX evaluations_user_id_check_date_area_key 
  ON evaluations (user_id, check_date, area);
```

`week_start` behålls i tabellen (används av grafen för veckogruppering) men är inte längre unikhetsnyckel.

#### Steg 2 — `Evaluate.tsx`: ladda och spara per dag

- `loadForDay`: hämta rader där `check_date = format(selectedDate, "yyyy-MM-dd")` istället för `week_start`
- `handleSubmit`: sätt `check_date = format(selectedDate, "yyyy-MM-dd")` i varje rad, och upsert med `onConflict: "user_id,check_date,area"`
- `resetForm()` anropas alltid vid dagbyte → standardvärden 5 och tomma fält visas korrekt för dagar utan data

#### Steg 3 — `loadMarkedDates`: markera per dag

```typescript
const { data } = await supabase
  .from("evaluations")
  .select("check_date")
  .eq("user_id", user.id);

const uniqueDays = [...new Set(data.map((d) => d.check_date))];
setMarkedDates(uniqueDays);
```

Nu matchar `"2026-02-19"` mot `"2026-02-19"` i WeekDayPicker och pricken syns.

#### Steg 4 — Grafen: gruppera på `week_start` för att behålla veckovy

Grafen ska fortfarande visa summor per vecka. Eftersom `week_start` finns kvar i tabellen fungerar det utan ändringar. Alternativt beräknar frontend `week_start` från `check_date` om `week_start` tas bort senare.

### Tekniska detaljer

**Migration:**
- Befintlig data får `check_date = week_start` (veckans måndag) — rimlig bakåtkompatibilitet
- Det gamla unika indexet tas bort och ersätts med ett nytt på `(user_id, check_date, area)`
- `week_start` används fortfarande i grafen

**Frontend-ändringar i `Evaluate.tsx`:**
- `checkDate = format(selectedDate, "yyyy-MM-dd")` (ny variabel, ersätter `weekStart` i laddning/sparning)
- `weekStart` behålls bara för grafen (gruppering)
- `loadForDay` triggas på `checkDate`-ändringar (inte `weekStart`)
- `loadMarkedDates` hämtar `check_date` istället för `week_start`

**Inga ändringar i `WeekDayPicker.tsx`** — den fungerar redan korrekt, problemet låg i datan.

### Påverkan på befintlig data

Befintlig data migreras automatiskt: `check_date` sätts till `week_start` (måndag) för alla gamla rader. Det betyder att gamla inlägg fortfarande visas på sin veckas måndag — inget data förloras.
