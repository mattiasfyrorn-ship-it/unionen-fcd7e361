

# V2 -- Tillagg och forandringar

## Oversikt

Sex funktionsomraden: Nard-tillagg, Daglig Check-tillagg, Dashboard-omstrukturering, Veckosamtal-tillagg, Korrelationsinsikter och Kvartalsvy.

---

## 1. Databasandringar

### Nya kolumner

**`daily_checks`**
- `climate` (integer, nullable) -- Klimat 1-5

**`evaluations`**
- `need_today` (text, nullable) -- "Vad behover jag idag?"
- `want_today` (text, nullable) -- "Vad vill jag idag?"

**`weekly_entries`**
- `partner_learning` (text, nullable) -- "Vad larde jag mig om min partner idag?"

**`profiles`**
- `share_development` (boolean, default false) -- "Dela min utveckling med partner"

### Ny tabell: `quarterly_goals`

Kolumner:
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, NOT NULL)
- `couple_id` (uuid, NOT NULL)
- `quarter_start` (date, NOT NULL) -- t.ex. 2026-01-01 for Q1
- `relationship_goal` (text)
- `experience_goal` (text)
- `practical_goal` (text)
- `relationship_done` (boolean, default false)
- `experience_done` (boolean, default false)
- `practical_done` (boolean, default false)
- `created_at` (timestamptz, default now())

RLS-policies:
- INSERT: `auth.uid() = user_id`
- SELECT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`

### Migrering (SQL)

```sql
ALTER TABLE daily_checks ADD COLUMN climate integer;
ALTER TABLE evaluations ADD COLUMN need_today text;
ALTER TABLE evaluations ADD COLUMN want_today text;
ALTER TABLE weekly_entries ADD COLUMN partner_learning text;
ALTER TABLE profiles ADD COLUMN share_development boolean DEFAULT false;

CREATE TABLE quarterly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  quarter_start date NOT NULL,
  relationship_goal text,
  experience_goal text,
  practical_goal text,
  relationship_done boolean DEFAULT false,
  experience_done boolean DEFAULT false,
  practical_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quarterly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own goals" ON quarterly_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Read own goals" ON quarterly_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own goals" ON quarterly_goals
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 2. Nard (Evaluate.tsx) -- Tillagg

### Nya textfalt
Under de 4 slider-korten, lagg till ett nytt kort med tva textfalt:
- "Vad behover jag idag?" (max 120 tecken)
- "Vad vill jag idag?" (max 120 tecken)

Sparas i `evaluations`-tabellen via nya kolumner `need_today` och `want_today`. Lagrs pa den forsta arean (t.ex. "health") eller som separata falt i payload. Enklast: spara i ett av upsert-objekten (t.ex. health-raden) eller skapa en separat rad med area="self". Bast: lagg till som tva extra falt pa alla rader, eller skapa en separat "self"-rad.

**Beslut:** Spara `need_today` och `want_today` pa "health"-raden (forsta arean) for enkelhet. De ar samma for alla omraden den veckan.

### Linjegraf
Under sliderkorten och textfalten, lagg till en linjegraf (Recharts LineChart) som visar "Total naring" (summa av 4 omraden, max 40) over tid.

Toggle med tre knappar: Vecka / Manad / Ar (ToggleGroup). Standard: Vecka.

Data hamntas fran `evaluations`-tabellen -- gruppera per `week_start`, summera scores.
- Vecka: senaste 7 veckorna
- Manad: senaste 12 veckorna
- Ar: senaste 52 veckorna

---

## 3. Daglig Check (DailyCheck.tsx) -- Tillagg

### Ny sista fraga: Klimat
Nytt kort langst ned (fore Spara-knappen):
- "Hur var klimatet mellan oss idag?"
- Slider 1-5 (Slider-komponent)
- State: `climate` (number, default 3)
- Sparas i `daily_checks.climate`

### Graf under Daglig Check
Under korten, lagg till en linjegraf (Recharts) som visar fyra linjer:
- Turn Toward % (beraknad per dag)
- Uppskattningar (1/0 per dag)
- Paverkansgrad (1/0 per dag)
- Klimat (1-5)

Toggle: Vecka / Manad / Ar (ToggleGroup). Standard: Vecka.

Data hamntas fran `daily_checks` -- redan laddad eller ny query.
- Vecka: senaste 7 dagarna
- Manad: senaste 30 dagarna
- Ar: senaste 365 dagarna

Visa grafen efter det sparade tillstandet (dvs. aven for nya anvandare med historik).

---

## 4. Dashboard (Dashboard.tsx) -- Ny struktur

### Toggle hogst upp
Tva knappar (ToggleGroup): `[ Min utveckling ]` `[ Var utveckling ]`
State: `view` ("mine" | "ours"), default "mine".

### "Min utveckling"
Behall befintliga kort: Streak, Uppskattningar, Turn Toward, Paverkan.

Lagg till nytt kort: **Nard**
- Visa senaste totalvarde (summa av 4 scores)
- Trendpil: jamfor senaste tva veckorna, visa uppat/nedat/stabil med ikon (TrendingUp/TrendingDown/Minus)

Lagg till frivillig toggle (Switch-komponent):
- "Dela min utveckling med partner"
- Sparas i `profiles.share_development`
- Default: Av

### "Var utveckling"
Visa gemensamma kort:
- **Gemensam Turn Toward %** -- aggregera bada partners daily_checks
- **Totala uppskattningar** -- summa av badas gave_appreciation senaste 7 dagar
- **Veckosamtal genomforda** -- count fran weekly_conversations
- **Reparationsforsok** -- count fran repairs (bada partners)
- **Klimattrend** -- snitt av badas climate senaste 7 dagar

Data for "Var utveckling" kraver query mot bada partners data (via couple_id).

### Korrelationsinsikt (efter 14+ dagar)
Under korten (oavsett vy), visa en textrad med enkel insikt:
- Rakna ut: om dagar med lag NARD (t.ex. totalvarde under 20) korrelerar med farre Turn Toward
- Rakna ut: om veckor med veckosamtal har hogre klimatsnitt
- Visa som en kort textsats, t.ex. "Lag Nard forknippas med 35% farre Turn Toward"
- Visa bara om 14+ dagars data finns

### Veckosamtalsstatistik
Under quick actions, visa tva sma siffror:
- Antal veckosamtal totalt
- Samtalskontinuitet (veckor i rad med genomfort samtal)

---

## 5. Veckosamtal (WeeklyConversation.tsx) -- Tillagg

### Nytt falt: "Vad larde jag mig om min partner idag?"
Placering: i "Efter samtalet"-kortet (visas nar bothReady), under takeaway-faltet.
- Input med max 120 tecken
- State: `partnerLearning`
- Sparas i `weekly_entries.partner_learning`

---

## 6. Kvartalsvy -- Ny sektion

### Ny sida eller sektion pa Dashboard

Enklast: ny sektion pa Dashboard, under korten. Titel: "Var riktning"

Tre textfalt + checkboxar:
- Relationsmal (text + checkbox)
- Upplevelseemal (text + checkbox)
- Praktiskt mal (text + checkbox)

Data sparas i `quarterly_goals`. Kvartalsstart beraknas fran aktuellt datum.

Historik: under aktuellt kvartal, visa tidigare kvartal i en collapsible lista.

---

## Filandringar sammanfattning

| Fil | Andring |
|---|---|
| `src/pages/Evaluate.tsx` | Tva nya textfalt, linjegraf med toggle |
| `src/pages/DailyCheck.tsx` | Klimat-slider, linjegraf med toggle |
| `src/pages/Dashboard.tsx` | Toggle Min/Var, Nard-kort, korrelation, kvartalsmal, veckosamtalsstatistik, dela-toggle |
| `src/pages/WeeklyConversation.tsx` | Nytt "partner_learning"-falt |
| Databasmigrering | Nya kolumner + quarterly_goals-tabell |

### Beroenden
- Recharts ar redan installerat
- ToggleGroup ar redan installerat
- Switch ar redan installerat
- Inga nya paket behovs

### Designregler
- Endast en grafvy (vecka/manad/ar) synlig at gangen via ToggleGroup
- Inga roda varningsfarger -- grafer anvander teal och gold
- Ingen jamforelse mellan partners individuella data
- Ingen poangranking

