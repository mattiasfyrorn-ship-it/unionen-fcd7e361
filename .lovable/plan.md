

## Full visuell redesign: Hamnen Brand Board 2026

Komplett visuell uppdatering av hela appen enligt brand board. Ingen text eller funktionalitet andras (utom Unionen -> Hamnen i Install.tsx).

---

### 1. Fargsystem och typografi

**`src/index.css`** -- Ersatt helt:

| Token | Nuvarande | Nytt |
|---|---|---|
| --background | 30 26% 92% | #F2EDE5 (38 22% 92%) |
| --foreground / text | 24 14% 20% | #3A332D (24 12% 20%) |
| --card | 30 20% 88% | #E8E1D8 (30 16% 88%) |
| --primary (CTA) | 150 24% 24% (skogsgroen) | #556B4E (104 16% 36%) olivgroen |
| --accent | 18 45% 56% (terrakotta) | #C47A5A (18 50% 56%) terrakotta |
| --muted-foreground | 24 10% 45% | rgba(58,51,45,0.65) som HSL |
| --radius | 0.625rem | 0.625rem (10px, behalls) |
| --gold (salviagroen) | 18 45% 56% | #A8B4A2 (120 10% 67%) |

- Font: Byt Google Fonts-import fran Playfair Display till **Cormorant Garamond**
- Rubriker: `font-family: 'Cormorant Garamond', serif`
- Brodtext: Inter (behalls)
- Typstorlekar: H1=48px, H2=30px, H3=24px, H4=20px (via Tailwind klasser)
- Skugga: Global `box-shadow: 0 4px 20px rgba(58,51,45,0.06)` pa kort

**`tailwind.config.ts`**:
- Uppdatera serif-font till Cormorant Garamond
- Lagg till transition-duration utilities (300ms, 400ms, 500ms)

### 2. Favicon

**`public/favicon.svg`** -- Andras till olivgroen (#556B4E) hjartikon, transparent bakgrund. Bara hjartikonen, ingen text.

### 3. Mobil bottom navigation + desktop toppmeny

**`src/components/AppLayout.tsx`** -- Storsta andringen:

**Mobil (< 768px)**:
- Ta bort header och nav-rad helt pa mobil
- Lagg till en **bottom navigation bar** med 5 ikoner:
  - Oversikt (BarChart3) -> /
  - Relationskonto (Sun) -> /daily
  - Nard (Sparkles) -> /evaluate
  - Veckosamtal (CalendarCheck) -> /weekly
  - Reglering (Shield) -> /repair
- Aktiv ikon: olivgroen (#556B4E), inaktiv: 60% brungraa
- Stroke width 1.5px, rundad container
- Meddelanden, Partner, Konto narbara via header-ikoner (behalls liten toprad pa mobil med logotyp + konto-ikon)

**Desktop (>= 768px)**:
- Behall toppmeny men goer den luftigare: 24px padding vertikalt
- Aktiv flik: olivgroen underline (ingen solid bakgrund)
- Ta bort solid bakgrund bakom meny

### 4. Sidspecifika designandringen

**Alla sidor** -- Genomgaende:
- Kort: `shadow-[0_4px_20px_rgba(58,51,45,0.06)]` istallet for `shadow-sm`
- Transitions: `transition-all duration-300 ease-in-out` globalt
- Inga harda borders (redan `border-none` pa de flesta)
- Inputs: `rounded-lg` (8px)
- Knappar: `rounded-[12px]`

**Dashboard.tsx**:
- Progress bar: salviagron (#A8B4A2) istallet for primary
- Graflinjer: tunnare (strokeWidth 1.5), diskreta gridlines (opacity 0.3)
- CTA-knappar i olivgroen

**DailyCheck.tsx**:
- Klimat-slider: Gradient fran terrakotta -> beige -> olivgroen (via CSS)
- Progress bars i salviagron

**Evaluate.tsx**:
- Varje kategori som kort med stor siffra hogerjusterad
- Progress bar tunn (6px / h-1.5)
- Kommentarfalt med mjuk bakgrund

**WeeklyConversation.tsx**:
- H2-rubriker i serif (redan delvis)
- Sektioner med mer luft (60-80px via py-16/py-20)
- Primar CTA i olivgroen, sekundar som outline
- Kort: applicera ny skugga

**Repair.tsx**:
- Progressindikator overst (redan finns, goer tunnare)
- Stor whitespace
- Fade-transition 400ms (`transition-all duration-[400ms]`)
- Mjukare kontrastnivaer

**Messages.tsx**:
- Chat-bubblor mjukt rundade (redan rounded-2xl)
- Egen: olivgroen ton 10% opacity (`bg-primary/10 text-foreground`)
- Partner: beige ton (`bg-card`)
- Input langst ned med rundad container

**Account.tsx**:
- Sektioner som kort (redan)
- Toggle-switch i olivgroen (automatiskt via primary)
- Installera-sektion med mjuk container
- Kort med ny skugga

**Install.tsx**:
- Byt "Unionen" till "Hamnen"
- Kort med ny skugga

**Auth.tsx**:
- Logotypikon: Andras fran fylld rund cirkel till minimalistiskt linjehjarta
- Applicera nya farger automatiskt

### 5. Globala transitioner

Lagg till i `src/index.css`:
```css
* { transition-timing-function: ease-in-out; }
```
Anvand `duration-300` till `duration-500` pa interaktiva element.

### Sammanfattning av filer

| Fil | Andring |
|---|---|
| `src/index.css` | Ny fargpalett, ny font (Cormorant Garamond), global skugga, transitioner |
| `tailwind.config.ts` | Serif-font, transition utilities |
| `public/favicon.svg` | Olivgroen hjarta, transparent bakgrund |
| `src/components/AppLayout.tsx` | Bottom nav mobil, luftigare desktop-nav |
| `src/pages/Dashboard.tsx` | Salviagron progress, tunnare graflinjer, ny skugga |
| `src/pages/DailyCheck.tsx` | Klimat-slider gradient, ny skugga |
| `src/pages/Evaluate.tsx` | Tunn progress bar, stor siffra hogerjusterad |
| `src/pages/WeeklyConversation.tsx` | Mer luft, outline-knappar, ny skugga |
| `src/pages/Repair.tsx` | Tunnare progress, 400ms fade, ny skugga |
| `src/pages/Messages.tsx` | Olivgroen/beige bubblor, rundad input |
| `src/pages/Account.tsx` | Ny skugga pa kort |
| `src/pages/Install.tsx` | "Unionen" -> "Hamnen", ny skugga |
| `src/pages/Auth.tsx` | Linjehjarta istallet for fylld cirkel |

Inga texter andras (utom Unionen -> Hamnen i Install.tsx). Ingen funktionalitet andras. Charts behalls som line charts.

