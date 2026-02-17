

# Dashboard-grafer, Relationskonto-namnbyte, Trendinsikter och Veckosamtalsmote

## Oversikt

Fyra andringsomraden: (1) Byt namn "Daglig check" till "Relationskontot" i navigation, (2) Omstrukturera Dashboard med tva grafer och dynamiska trendinsikter, (3) Lagg till naring-graf med regleringar i Dashboard, (4) Forbattra veckosamtal med motesflode och anteckningar.

---

## 1. Byt namn: Daglig check till Relationskontot

### `src/components/AppLayout.tsx`
- Andra label fran "Daglig check" till "Relationskontot"

### `src/pages/DailyCheck.tsx`
- Andra rubrik h1 fran "Daglig check" till "Relationskontot"

### `src/pages/Dashboard.tsx`
- Andra quick action-knappen "Daglig check" till "Relationskontot"

---

## 2. Dashboard -- Tva grafer under Var riktning

Strukturen blir:
1. Var riktning (kvartalsmol) -- behalls overst
2. Min/Var-toggle
3. **Graf 1: Relationskontot** (beroende pa vy)
   - "mine": Mina insattningar (Turn Toward, Uppskattning, Paverkan, Klimat, Reparationer)
   - "ours": Vara insattningar (Gemensam Turn Toward, Uppskattningar, Klimat, Reparationer)
4. **Graf 2: Min naring over tid** (bara i "mine"-vy, med regleringar)
   - Linjegraf med Total NARD-poang per vecka
   - Extra linje: antal regleringar (fran `repairs`-tabellen) per vecka
   - Toggle: Vecka / Manad / Ar

### Datakallor for graferna:
- **Relationskontot mina**: `daily_checks` (user_id = mig) + `quick_repairs` + `repairs` (user_id = mig)
- **Relationskontot vara**: `daily_checks` (couple_id) + `quick_repairs` (couple_id) + `repairs` (couple_id)
- **Min naring**: `evaluations` (user_id = mig) grupperat per week_start + `repairs` (user_id = mig) per vecka

### Reparationer i graferna:
- Rakna antal `repairs` + `quick_repairs` per dag/vecka
- Visa som extra linje i graferna

---

## 3. Dynamiska trendinsikter (ersatter statiska kort)

Istallet for de fasta korten (Streak, Uppskattningar, Turn Toward, etc.) som alltid visas, visa **1-3 trenduppdateringar** som andras baserat pa data.

### Logik:
Jamfor senaste 7 dagarna med foregaende 7 dagar och generera insikter:

- "Denna vecka har du uppskattat **40% mer** an forra veckan"
- "Din Turn Toward har okat med **15%**"
- "Du har reparerat **3 ganger** denna vecka -- bra jobbat!"
- "Nar din naring ar nere anvander du oftare reglering" (korrelation)
- "Veckor med samtal har **20% hogre klimat**"

Visa max 3 insikter i snygga kort med ikoner. Positiv utveckling far teal-farg, negativ far gold (aldrig rott).

### Implementation:
- Berakna alla mojliga insikter
- Prioritera de mest intressanta (storst forandring forst)
- Visa 1-3 st i en lista under graferna

---

## 4. Veckosamtal -- Motesflode med anteckningar

### Nuvarande flode:
1. Forbered (fylla i uppskattningar, vinster, fragor etc.)
2. Markera "Klar"
3. Nar bada klara: se partners agenda + anteckningsfalt

### Nytt flode (nar bothReady):

Visa en **"Starta mote"**-knapp hogst upp. Nar den klickas, visa ett guidat motesflode med foljande sektioner:

1. **Uppskattningar** -- bada partners forifyllda uppskattningar visas + anteckningsfalt
2. **Vad gick bra** -- bada partners vinster + anteckningsfalt  
3. **Fragor/Problem** -- bada partners fragor + anteckningsfalt per fraga
4. **Praktiskt** -- logistics + anteckningsfalt
5. **Positiv intention** -- bada partners intentioner + anteckningsfalt
6. **Avslutning** -- takeaway, partner learning, utcheckning

Varje sektion har:
- Rubrik
- Forifyllt innehall fran bada partners
- Textarea for motesanteckningar (sparas i `meeting_notes` jsonb)

State: `meetingStarted` (boolean). Nar true, visa motesflode istallet for forberedelseformularet.

### Rubriker utan forifylt innehall:
Aven sektioner utan forifyllt innehall (t.ex. "Ovrigt") ska ha anteckningsutrymme.

---

## Teknisk sammanfattning

| Fil | Andring |
|---|---|
| `src/components/AppLayout.tsx` | Byt "Daglig check" till "Relationskontot" |
| `src/pages/DailyCheck.tsx` | Byt rubrik till "Relationskontot" |
| `src/pages/Dashboard.tsx` | Omstrukturera: tva grafer (Relationskonto + Naring med regleringar), dynamiska trendinsikter istallet for statiska kort, inkludera reparationer/regleringar i grafer |
| `src/pages/WeeklyConversation.tsx` | Lagg till "Starta mote"-knapp, guidat motesflode med anteckningar per sektion |

### Databasandringar
Inga nya tabeller eller kolumner behovs -- all data finns redan i befintliga tabeller (`daily_checks`, `evaluations`, `repairs`, `quick_repairs`, `weekly_entries.meeting_notes`).

### Designregler
- Inga roda varningsfarger -- negativ trend visas med gold
- Ingen jamforelse mellan partners individuella data
- Endast en grafvy (vecka/manad/ar) aktiv at gangen
- Trendinsikter ar positiva och uppmuntrande i tonen

