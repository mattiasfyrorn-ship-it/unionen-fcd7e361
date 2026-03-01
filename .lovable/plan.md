

## "Nasta steg for att bygga er hamn" -- 90-dagars onboarding-progression

### Oversikt

En stegvis guide som visas hogst upp pa Oversikt-sidan. Visar 1 aktivt steg i taget med statusmeddelanden, partner-statusrad och prioritets-override vid regleringsbehov. Efter steg 16 overgars till roterande vanesteg dag 30-90.

---

### 1. Ny databastabell: `onboarding_steps`

Spar varje anvandares framsteg per steg.

```sql
CREATE TABLE onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid,
  step_number integer NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(user_id, step_number)
);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- RLS: read own + partner's steps
CREATE POLICY "Read own steps" ON onboarding_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Read partner steps" ON onboarding_steps FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "Insert own steps" ON onboarding_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own steps" ON onboarding_steps FOR UPDATE USING (auth.uid() = user_id);
```

---

### 2. Ny fil: `src/lib/onboardingSteps.ts`

Definiera stegkonfigurationen som en ren datastruktur:

```text
STEPS = [
  { number: 1, requires_both: true, title: "Koppla ihop er hamn", ... },
  { number: 2, requires_both: false, title: "Fyll i Nard", ... },
  ...steg 3-14, 16...
]
```

Varje steg har:
- `number`, `title`, `requires_both`
- `completionCopy` (objekt med varianter: `both_done`, `user_done_partner_not`, `partner_done_user_not`, `both_done_partial`)
- `checkCompletion(userId, coupleId, supabase)` -- async funktion som returnerar `{ userDone, partnerDone, progress? }`

Steg 15 utelamnas helt.

#### Kompletteringslogik per steg:

| Steg | Kontroll |
|------|----------|
| 1 | `profiles.couple_id` ar satt OCH partner finns i samma couple |
| 2 | `evaluations` har minst 1 rad for anvandaren |
| 3 | `daily_checks` har rad for dagens datum |
| 4 | Bada har `daily_checks` 3 konsekutiva dagar (samma dagar) |
| 5 | `repairs` har minst 1 rad for anvandaren |
| 6 | `weekly_conversations` har rad med status != 'preparing' |
| 7 | `weekly_conversations` status = 'completed' + bada bekraftar (ny kolumn `meeting_confirmed` i `weekly_entries` eller via metadata) |
| 8 | `repairs` eller `quick_repairs` har minst 1 initierad av anvandaren |
| 9 | `daily_checks` 5 av senaste 7 dagar for anvandaren |
| 10 | `daily_checks` med `love_map_completed = true` minst 1 gang |
| 11 | `quarterly_goals` med alla tre mal ifyllda for bada |
| 12 | `daily_checks` med `gave_appreciation = true` OCH 3 unika `appreciation_note` samma dag |
| 13 | Bada har skrivit kort reflektion -- ny kolumn `pattern_reflection` i `onboarding_steps` metadata |
| 14 | `repairs` initierad inom 24h efter lag klimatskattning |
| 16 | Bada svarar "ja" pa sarbarhetsfragen efter SOTU -- sparas i `onboarding_steps.metadata` |

---

### 3. Prioritets-override logik

Innan ordinarie steg visas, kontrollera triggers:

1. **Relationskonto sjunker 2 dagar i rad**: Berakna fran `daily_checks` senaste 3 dagarna
2. **Klimat skattat <=2**: Senaste `daily_checks.climate`
3. **Partner markerat "behover reparation"**: Kolla `prompts` med `type = 'repair'` senaste 48h
4. **Missad turn toward 2 av senaste 3 dagar**: `daily_checks.turn_toward_options` innehaller 'missed'

Om nagon trigger ar aktiv OCH anvandaren inte gjort reglering sedan triggern --> visa "Reglering/Reparation" som override-steg med lank till `/repair`.

Nar reglering ar gjord (ny `repairs`-rad efter triggertidpunkten) --> atergaa till ordinarie steg.

---

### 4. Pool av vanesteg (dag 30-90)

Efter steg 16 ar klart, valj 1 rotationsbaserat steg i taget fran en pool:

```text
HABIT_POOL = [
  { id: "sotu_monthly", title: "Genomfor State of the Union", requires_both: true },
  { id: "regulate_before_raise", title: "Reglera 2 ganger innan du tar upp nagot svart", requires_both: false },
  { id: "same_day_repair", title: "Initiera 1 reparation samma dag", requires_both: false },
  { id: "love_map_3", title: "Stall 3 Love Map-fragor denna vecka", requires_both: false },
  { id: "appreciation_5_3", title: "Ge 5 uppskattningar over 3 dagar", requires_both: false },
  { id: "let_partner_influence", title: "Lat partner paverka i en konkret sak", requires_both: false },
  { id: "relation_hour", title: "Planera en 60-min relationsstund", requires_both: false },
  { id: "90_day_reflection", title: "90-dagars reflektion: vad ar annorlunda?", requires_both: false },
]
```

Val av nasta steg baseras pa:
- Lag aktivitet (fa `daily_checks` senaste 7d) --> enklare steg
- Hog aktivitet --> fordjupande steg
- Aldrig valj samma steg tva ganger i rad

Spara i `onboarding_steps` med `step_number >= 100` (pool-steg).

---

### 5. Ny komponent: `src/components/OnboardingBanner.tsx`

Renderas hogst upp i Dashboard (fore solo-banner och trendinsikter).

**Layout:**
- Kort i samma stil som ovriga (`rounded-[10px] border-none shadow-hamnen`)
- Rubrik: "Nasta steg for att bygga er hamn"
- Visar aktuellt steg med titel och kort beskrivning
- CTA-knapp (lankar till relevant sida)
- Liten progressbar (steg X av 16)
- Vid klart: kort "Bra, du/ni har nu..." + "Nasta steg ar..." med fade-transition

**Partner-statusrad** (for `requires_both`-steg):
- Visas under huvudinnehallet
- "Din partner har inte gjort detta annu" / "Din partner ar klar -- nu ar det din tur"

**Override-banner** (vid regleringsbehov):
- Annan farg/ikon (Shield)
- "Nagonting verkar ha krockat. Borja med att reglera dig."
- Knapp till `/repair`

---

### 6. Ny hook: `src/hooks/useOnboarding.ts`

Centraliserar all logik:

```text
useOnboarding() returns {
  currentStep: Step | null,
  overrideActive: boolean,
  userCompleted: boolean,
  partnerCompleted: boolean,
  progress: string,  // t.ex "2/3 dagar"
  completionMessage: string,
  allDone: boolean,  // efter steg 16
  habitStep: HabitStep | null,
}
```

Gor alla databas-queries i en useEffect, cachat med useState.

---

### 7. Steg 7 och 16: Sma databastillagg

**Steg 7** (bada bekraftar motet): Lagg till kolumn `meeting_confirmed boolean DEFAULT false` i `weekly_entries`.

**Steg 13** (monsterreflektion): Anvand `onboarding_steps.metadata` med `{ reflection: "..." }`.

**Steg 16** (sarbarhetsfragen): Anvand `onboarding_steps.metadata` med `{ vulnerability_shared: true }`. Fragan visas i WeeklyConversation efter motet ar klart.

```sql
ALTER TABLE weekly_entries ADD COLUMN meeting_confirmed boolean DEFAULT false;
```

---

### 8. Andring i WeeklyConversation.tsx

Efter att motet markerats som genomfort, visa tva nya fragor:
- "Markera att motet ar genomfort" (checkbox --> satter `meeting_confirmed = true`)
- "Hande det idag att du delade nagot svart eller sarbart?" (Ja/Nej --> sparar i `onboarding_steps`)

---

### Sammanfattning av filer

| Fil | Andring |
|------|---------|
| **Ny** `src/lib/onboardingSteps.ts` | Stegdefinitioner, copy-varianter, kompletteringslogik |
| **Ny** `src/hooks/useOnboarding.ts` | Hook som beraknar aktuellt steg, override, status |
| **Ny** `src/components/OnboardingBanner.tsx` | UI-komponent for bannern |
| `src/pages/Dashboard.tsx` | Importera och rendera `OnboardingBanner` hogst upp |
| `src/pages/WeeklyConversation.tsx` | Lagg till meeting_confirmed checkbox + sarbarhetsfragen |
| **Migration** | Skapa `onboarding_steps`-tabell + `meeting_confirmed`-kolumn |

