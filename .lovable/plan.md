

## Tre andringar: Uppdatera omraden i Nard, ny SVG-favicon, ta bort Lovable-branding

### 1. Byt omraden i Evaluate.tsx och Priorities.tsx

Byt ut de fyra omradena (Halsa, Karriar, Ekonomi, Relationer) mot nya:

| Nyckel | Nytt namn | Ny beskrivning | Ikon |
|---|---|---|---|
| health | Kropp | Fysisk halsa, energi & avslappning | Heart |
| career | Sinne | Mental & emotionell balans | Brain (ny import) |
| economy | Relationer | Status i relationer generellt & hur pafylld du ar av dessa | Users |
| relationships | Mission | Meningsfullhet, bidragande karriar & ekonomi | Compass (ny import) |

**Filer:** `src/pages/Evaluate.tsx` och `src/pages/Priorities.tsx`

- I Evaluate.tsx: Uppdatera AREAS-arrayen med nya labels, beskrivningar och ikoner. Byt ut `Briefcase` och `DollarSign` mot `Brain` och `Compass` fran lucide-react.
- I Priorities.tsx: Uppdatera AREAS-arrayen med nya labels.
- Databasnycklar (health, career, economy, relationships) behalls oforandrade for bakatkompabilitet med befintlig data.

### 2. Skapa SVG-favicon med hjarta

Skapa en ny fil `public/favicon.svg` med ett hjarta i appens primarfarg (hsl(30, 50%, 45%) = ca #A67C3D).

Uppdatera `index.html`:
- Byt `<link rel="icon" href="/favicon.ico">` (om den finns) till `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
- Lagg till `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` om den saknas

### 3. Ta bort Lovable-branding

Tre platser att rensa:

- **index.html:** Ta bort `og:image` och `twitter:image` som pekar pa `lovable.dev`, ta bort `twitter:site` som ar `@Lovable`
- **vite.config.ts:** Ta bort `lovable-tagger`-importen och `componentTagger()`-anropet (den laggar till "Edit in Lovable"-badgen i dev)
- **supabase/functions/send-push-notification/index.ts:** Byt `mailto:noreply@unionen.lovable.app` till `mailto:noreply@mail1.fyrorn.se`

### Teknisk sammanfattning

| Fil | Andring |
|---|---|
| `src/pages/Evaluate.tsx` | Byt AREAS labels/beskrivningar/ikoner |
| `src/pages/Priorities.tsx` | Byt AREAS labels |
| `public/favicon.svg` | **Ny fil** — SVG-hjarta i primarfarg |
| `index.html` | Lagg till SVG favicon, ta bort Lovable OG/Twitter-taggar |
| `vite.config.ts` | Ta bort lovable-tagger import och anrop |
| `supabase/functions/send-push-notification/index.ts` | Byt mailto till mail1.fyrorn.se |

