

# Reparation och Selvreglering -- Nytt floede

## Oeverblick

Ett stegvis reparationsverktyg med 7 steg som guidar anvandaren fran kansloreglering till ateranslutning. Floedet tar 3-6 minuter och ar designat med mycket luft, lugn och minimal text.

## Databasaendringar

### Ny tabell: `repairs`

Lagrar varje reparationsfoersoek. Privat data (steg 1-6) sparas haer men delas aldrig. Det genererade meddelandet (steg 7) skickas via `prompts`-tabellen.

Kolumner:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `couple_id` (uuid, NOT NULL)
- `status` (text, default 'in_progress') -- in_progress / ready_to_share / needs_time / shared / completed
- `feeling_body` (text) -- Steg 1: kansla och kropp (max 150)
- `story` (text) -- Steg 2: historien (max 200)
- `needs` (text[]) -- Steg 3: valda behov
- `needs_other` (text) -- Steg 3: fri text om "Annat"
- `ideal_outcome` (text) -- Steg 3: "hur hade det sett ut" (max 200)
- `observable_fact` (text) -- Steg 5: fakta (max 150)
- `interpretation` (text) -- Steg 5: tolkning (max 150)
- `self_responsibility` (text) -- Steg 6: vad kan jag goera annorlunda (max 200)
- `request` (text) -- Steg 6: vad vill jag be om (max 150)
- `needs_time_reason` (text) -- Om "behover mer tid" (steg 7)
- `learning` (text) -- Efter reparation: "vad larde jag mig" (max 120)
- `created_at` (timestamptz)
- `completed_at` (timestamptz)

RLS-policies:
- INSERT: `auth.uid() = user_id`
- SELECT: `auth.uid() = user_id` (privat -- bara egna reparationer)
- UPDATE: `auth.uid() = user_id`

### Ny tabell: `repair_responses`

Partnerns svar pa ett delat reparationsmeddelande.

Kolumner:
- `id` (uuid, PK)
- `repair_id` (uuid, FK -> repairs)
- `prompt_id` (uuid, FK -> prompts) -- referens till meddelandet
- `responder_id` (uuid, NOT NULL)
- `response` (text) -- 'receive' / 'need_time' / 'talk'
- `time_needed` (text) -- '20min' / '1h' / 'tonight'
- `learning` (text) -- "vad larde jag mig" (max 120)
- `created_at` (timestamptz)

RLS-policies:
- INSERT: `auth.uid() = responder_id`
- SELECT: kopplad till couple_id via repair
- UPDATE: `auth.uid() = responder_id`

## Nya filer

### `src/pages/Repair.tsx`

Huvudkomponenten. Hanterar ett flerstegsflode med lokal state. Sparar till databasen vid steg 7 (dela/behover tid).

**Stegstruktur:**

- **Steg 0: Start** -- Kort intro + "Borja"-knapp
- **Steg 1: Kansla och Kropp** -- Andningsanimation (30 sek, CSS pulsanimation, skip-knapp), sedan textfalt (max 150 tecken). Data sparas lokalt i state.
- **Steg 2: Historien** -- Textfalt (max 200 tecken)
- **Steg 3: Behovet** -- Multi-select checkboxar (6 foerdefinierade + "Annat" med fri text), sedan "Om jag hade fatt..." textfalt (max 200)
- **Steg 4: Hedrande och Reglering** -- Lugn text (ingen input), 4 val som visas som text (inte knappar), 45 sek tyst timer (cirkulaer progress), sedan 3 djupa andetag (animation)
- **Steg 5: Historia vs Fakta** -- Tva kolumner: "Observerbar fakta" och "Min tolkning", vardera max 150 tecken
- **Steg 6: Sjaelvansvar** -- Tva textfalt: "annorlunda naesta gang" (max 200) och "be min partner om" (max 150)
- **Steg 7: Ar du redo?** -- Tva stora knappar. Om "redo": generera strukturerat meddelande fran mall, redigerbart textfalt, skicka via `prompts`-tabellen (type: 'repair'). Om "behover tid": visa trygghetsval, skicka kort notis till partner.

### `src/components/BreathingAnimation.tsx`

Ateranvaendbar komponent: en cirkel som expanderar/kontraherar med CSS animation. Props: `duration` (sekunder), `onComplete`, `skippable`.

### `src/components/TimerCircle.tsx`

Cirkulaer nedrakning (45 sek) med SVG stroke-dashoffset animation.

## Aendringar i befintliga filer

### `src/App.tsx`
- Importera `Repair` page
- Lagg till route: `/repair`

### `src/components/AppLayout.tsx`
- Lagg till navigeringsobjekt: `{ to: "/repair", label: "Reparera", icon: Heart }` (med Heart-ikon i roed/primary)

### `src/pages/Dashboard.tsx`
- Lagg till quick-action-knapp: "Reparera"
- Lagg till statistikkort: Antal reparationsfoersoek, andel genomfoerda, snittid till aterkoppling
- Aldrig visa innehallet i svaren

### `src/pages/Prompts.tsx`
- Hantera `type: 'repair'` -- visa reparationsmeddelanden med tre svarsalternativ (ta emot / behover tid / prata)
- Lagg till svarsknappar for reparationsmeddelanden

## Designprinciper i implementation

- Varje steg anvander `animate-fade-in` for mjuk oevergang
- Steg 4 har extra padding, stoerre radhoejd, och langsammare transitions
- Alla textfalt har synlig `maxLength`-raknare
- Tva-kolumnslayout i steg 5 anvander `grid grid-cols-2 gap-4`
- Stora knappar i steg 7 anvander `size="lg"` och `w-full`
- Andningsanimation: CSS keyframes med scale(1) -> scale(1.3) -> scale(1) oever 4 sekunder, upprepas

## Floede foer data

1. Steg 1-6: all data lagras i React state (privat)
2. Steg 7 "Redo": Spara till `repairs`-tabellen, skicka genererat meddelande till `prompts` (type: 'repair')
3. Steg 7 "Behover tid": Spara till `repairs` med status 'needs_time', skicka kort notis via `prompts`
4. Partnerns svar: Sparas i `repair_responses`, uppdaterar `repairs.status`
5. Efter reparation: Bada far fragan "vad larde jag mig", sparas i respektive tabell
6. Dashboard: Raeknar bara antal reparationer och status, visar aldrig innehall

