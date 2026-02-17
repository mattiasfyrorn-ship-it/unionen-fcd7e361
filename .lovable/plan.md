

# V3 -- Kontosida, Partnerborttagning, Reglering/Reparation, Dashboard-grafer, Meddelanden

## Oversikt

Fem huvudomraden: (1) Kontosida, (2) Koppla bort partner, (3) Omdesignad Reglering/Reparation med Snabb Reparation, (4) Dashboard-grafer och reparationsinsikter, (5) Meddelandefunktion mellan partners.

---

## 1. Databasandringar

### Ny tabell: `messages`

For direkt kommunikation mellan partners.

Kolumner:
- `id` (uuid, PK)
- `couple_id` (uuid, NOT NULL)
- `sender_id` (uuid, NOT NULL)
- `content` (text, NOT NULL)
- `type` (text, default 'text') -- text / repair_quick / system
- `read` (boolean, default false)
- `created_at` (timestamptz, default now())

RLS-policies:
- INSERT: `auth.uid() = sender_id`
- SELECT: couple_id via profiles (som prompts)
- UPDATE: couple_id via profiles (for att markera read)

Realtime aktiveras: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`

### Ny tabell: `quick_repairs`

Lagrar snabba reparationsforsok (3-stegsfloedet).

Kolumner:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `couple_id` (uuid, NOT NULL)
- `category` (text) -- 'responsibility' / 'soften' / 'reconnect'
- `phrase` (text) -- vald eller egen fras
- `delivery` (text) -- 'app' / 'live'
- `partner_response` (text) -- 'receive' / 'need_time' / 'thanks'
- `created_at` (timestamptz, default now())

RLS-policies:
- INSERT: `auth.uid() = user_id`
- SELECT: couple_id via profiles
- UPDATE: couple_id via profiles

### Andringar i befintliga tabeller

Inga schemaandringar behovs for kontosidan -- den anvander befintliga `profiles` och `auth.updateUser`.

---

## 2. Kontosida (`src/pages/Account.tsx`) -- NY FIL

Placeras under anvandarikonknappen i headern (Link till `/account`).

### Innehall:
- **Profilinfo**: Visa namn, e-post (fran user.email)
- **Andra namn**: Input + spara (uppdaterar profiles.display_name)
- **Andra e-post**: Input + spara (anropar `supabase.auth.updateUser({ email })`)
- **Andra losenord**: Tva falt (nytt + bekrafta) + spara (anropar `supabase.auth.updateUser({ password })`)
- **Koppla bort partner**: Knapp med bekraftelsedialog (AlertDialog). Satter `profiles.couple_id = null` pa anvandaren. Visar varning: "Detta kopplar bort er. All gemensam data finns kvar men ni kan inte langre se varandras."
- **Logga ut**: Knapp (redan i header men ocksa har)

---

## 3. Reparera -> Reglering (`src/pages/Repair.tsx`) -- OMSKRIVNING

### Nytt startflode (Steg 0):

Rubrik: "Reglering"

Fraga: "Ar du triggad och behover reglera dig, eller ar du lugn och redo att reparera?"

Tva stora knappar:
- "Jag ar triggad" -> gar till befintligt 7-stegsflode (reglering, steg 1-7)
- "Jag ar lugn och vill reparera" -> gar till Snabb Reparation (3 steg)

### Snabb Reparation -- 3 steg (nya steg 10, 11, 12 i state)

**Steg 10 -- Vad vill du gora?**

Tre stora val (Cards):
- "Jag vill ta ansvar"
- "Jag vill mjuka upp"
- "Jag vill aterknyta"

**Steg 11 -- Valj formulering**

Beroende pa val i steg 10, visa 4-6 fraser som valbara kort:

Om "Ta ansvar":
- "Jag blev defensiv."
- "Jag ser min del."
- "Det dar var inte rattviskt sagt."
- "Jag vill gora det battre."
- "Jag ar ledsen."

Om "Mjuka upp":
- "Kan vi borja om?"
- "Du ar viktigare an att jag har ratt."
- "Jag vill forsta dig."
- "Jag vill inte att detta ska bli en mur mellan oss."

Om "Aterknyta":
- "Kan vi prata 10 min ikvall?"
- "Jag vill hitta tillbaka till oss."
- "Far jag borja om?"
- "Jag saknar kontakten."

Alternativ: Skriva egen fras (textfalt).

**Steg 12 -- Skicka eller sag live**

Tva val:
- "Skicka via app" -> skickar meddelande via `messages`-tabellen (type: 'repair_quick') + sparar i `quick_repairs`
- "Jag sager det direkt" -> loggar som genomfort i `quick_repairs` (delivery: 'live')

Visa mikroinsikt efter genomford reparation:
"Reparationsforsok ar den starkaste prediktorn for langsiktig relationshallsa."

### Partnerns respons (forenklad)

Nar partner tar emot snabb reparation (via meddelandevyn):
- Tre knappar: "Jag tar emot" / "Jag behover lite tid" / "Tack for att du sa det"
- Sparas i `quick_repairs.partner_response`

---

## 4. Dashboard -- Grafer och Reparation

### Grafer (samma stil som Daglig Check och Nard)

Lagg till tva grafer i Dashboard:

**Graf 1 -- Min utveckling (under "mine"-vy)**
Linjegraf med:
- Turn Toward %
- Uppskattningar
- Paverkan
- Klimat
Toggle: Vecka / Manad / Ar

**Graf 2 -- Var utveckling (under "ours"-vy)**
Linjegraf med:
- Gemensam Turn Toward %
- Uppskattningar
- Klimat
Toggle: Vecka / Manad / Ar

### Reparation i Dashboard

Under "Var utveckling", lagg till:
- **Initierade reparationer**: Antal reparationer jag startat (repairs + quick_repairs dar user_id = mig)
- **Mottagna reparationer**: Antal dar jag svarat (repair_responses + quick_repairs partner_response)
- Separata kort: "Initierade" och "Mottagna"

### Reparation-Klimat-insikt

Ny korrelation: efter reparation, jamfor klimat fore och efter.
Textinsikt: "Ni reparerar snabbare an forra manaden." (visas efter 3+ reparationer pa en manad)

### Flytta "Var riktning" hogst upp

Flytta quarterly goals-sektionen till overst i Dashboard (fore stats-korten).

---

## 5. Meddelandesida (`src/pages/Messages.tsx`) -- NY FIL

Ersatter/utvidgar nuvarande Prompts.tsx till en fullstandig meddelandevy.

### Innehall:
- Chatvy med bubblor (mina till hoger, partners till vanster)
- Inputfalt + skicka-knapp i botten
- Automatiska meddelanden (reparation, reglering) visas inline med sarskild styling
- Snabb-reparationsmeddelanden visar svarsknappar for partnern
- Realtime via Supabase channel pa `messages`-tabellen

### Navigationsobjekt
Uppdatera AppLayout: Byt ut "Prompts" mot "Meddelanden" med MessageCircle-ikon pa `/messages`.

---

## 6. Andringar i befintliga filer

### `src/App.tsx`
- Importera Account, Messages
- Lagg till routes: `/account`, `/messages`

### `src/components/AppLayout.tsx`
- Andra "Reparera" label till "Reglering"
- Byt navigeringsobjekt: lagg till `/messages` (Meddelanden), `/account` (Konto)
- Gor anvandarikonknappen i headern klickbar -> Link till `/account`

### `src/pages/Repair.tsx`
- Total omskrivning av steg 0 (valskarm: triggad/lugn)
- Lagg till snabb reparation (steg 10-12)
- Behall befintligt 7-stegsflode for "triggad"
- Behall arkivet

### `src/pages/Dashboard.tsx`
- Flytta "Var riktning" hogst upp
- Lagg till grafer (Recharts) med Toggle i bada vyerna
- Lagg till reparationskort (initierade/mottagna) i "Var utveckling"
- Lagg till reparation-klimat-insikt
- Lagg till positiv forstarkning: "Ni reparerar snabbare an forra manaden" efter 3+/manad

---

## Sammanfattning av nya filer

| Fil | Beskrivning |
|---|---|
| `src/pages/Account.tsx` | Kontosida: namn, email, losenord, koppla bort partner |
| `src/pages/Messages.tsx` | Chatvy mellan partners med realtime |

## Sammanfattning av andrade filer

| Fil | Andring |
|---|---|
| `src/pages/Repair.tsx` | Nytt startval (triggad/lugn), snabb reparation 3 steg |
| `src/pages/Dashboard.tsx` | Var riktning overst, grafer, reparationskort, insikter |
| `src/components/AppLayout.tsx` | Navigering: Reglering, Meddelanden, Konto-lank |
| `src/App.tsx` | Nya routes: /account, /messages |

## Databasmigreringar

| Tabell | Typ |
|---|---|
| `messages` | Ny tabell + realtime |
| `quick_repairs` | Ny tabell |

## Beroenden
Inga nya paket -- Recharts, ToggleGroup, AlertDialog, realtime redan tillgangliga.

## Designregler
- Inga roda varningsfarger
- Ingen jamforelse mellan partners individuella data
- Reparationsstatistik separeras i "initierade" och "mottagna" utan ranking
- Mikroinsikter ar positiva och uppmuntrande
- Endast en grafvy (vecka/manad/ar) aktiv at gangen

