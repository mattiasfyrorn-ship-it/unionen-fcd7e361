

# Designuppdatering – Hamnen App

En genomgripande visuell uppgradering baserad på designguiden för att skapa en varm, lugn och taktil upplevelse.

---

## Sammanfattning

Uppdateringen berör CSS-variabler, komponentfiler och sidorna för att appen ska kännas som "ett rum, inte ett verktyg". Fokus: färgjusteringar, mjukare kort, terrakotta-accenter på relationella ikoner, mjukare progress bars, subtil bakgrundstextur, mer luft och varm input-fokus.

---

## Ändringar

### 1. Färger & CSS-variabler (`src/index.css`)
- Uppdatera `--card` till `#E8E1D8` (HSL ~34 15% 85%)
- Uppdatera `--hamnen-terracotta` och `--accent` till `#C17A50` (HSL ~18 52% 54%)
- Lägg till `--hamnen-terracotta-raw: 18 52% 54%` för enkel referens
- Lägg till subtil bakgrundstextur via CSS (radial-gradient med mycket låg opacitet) på `body`

### 2. Kort – mjukare (`src/components/ui/card.tsx`)
- Ändra `rounded-lg` → `rounded-xl` (12px)
- Ta bort `border` och ersätt med `border-none`
- Uppdatera shadow till `0 4px 12px rgba(0,0,0,0.05)`

### 3. Progress bars (`src/components/ui/progress.tsx`)
- Ändra höjd från `h-4` → `h-1.5` (6px)
- Lägg till gradient-bakgrund (olivgrön → ljusare grön) på indikatorn
- Rundade hörn `rounded-full` (redan finns)

### 4. Input-fält – varm fokus (`src/components/ui/input.tsx` + `src/components/ui/textarea.tsx`)
- Ändra `focus-visible:ring-ring` → `focus-visible:ring-[hsl(var(--hamnen-terracotta))]`
- Ändra `focus-visible:ring-offset-2` → `focus-visible:ring-offset-1` för subtilare effekt

### 5. Ikonfärgstrategi – terrakotta för relationella ikoner
Alla sidor uppdateras enligt principen:
- **Olivgrön** (`text-primary`): struktur/system (navigation, grafer, sparaknappar)
- **Terrakotta** (`text-accent`): relation/känsla

Sidor som berörs:
- **Dashboard.tsx**: Trendinsikter-ikon, Vår riktning, ikoner i trendkort → terrakotta. Byt label "Trendinsikter" → "Relationsinsikter"
- **DailyCheck.tsx**: Love Map, Uppskattning & Närvaro, Turn Toward, Klimat-ikoner → terrakotta
- **Evaluate.tsx**: Kropp, Sinne, Relationer, Mission-ikoner → terrakotta
- **Repair.tsx**: Hjärt-ikon, Shield ("Jag är triggad"), Handshake (Reparation) → terrakotta
- **WeeklyConversation.tsx**: Hjärt/dialog-ikoner → terrakotta

### 6. Spacing – mer luft
- Ändra `space-y-8` / `space-y-6` / `space-y-4` till `space-y-10` eller `space-y-12` på sidnivå för huvudsektioner
- Lägg till `py-8` på huvudcontainer i `AppLayout.tsx` (mobil)

### 7. Navigation – inaktiv färg
- Ändra inaktiva ikoner från `text-muted-foreground/60` till salviagrön `#A8B4A2` (via `text-hamnen-sage`)

### 8. Transitions
- Redan konfigurerade till ease-in-out. Verifiera att `transition-all duration-300` finns på interaktiva element

### 9. Subtil bakgrundstextur
- Lägg till en `::before` pseudo-element på `body` med en radial-gradient i sandtoner vid extremt låg opacitet för att bryta platthet

### 10. Tailwind-config (`tailwind.config.ts`)
- Uppdatera `shadow-hamnen` till `0 4px 12px rgba(0,0,0,0.05)`

---

## Filer som ändras

| Fil | Typ av ändring |
|-----|---------------|
| `src/index.css` | Färgvariabler, bakgrundstextur |
| `tailwind.config.ts` | Shadow-värde |
| `src/components/ui/card.tsx` | Border-radius, border, shadow |
| `src/components/ui/progress.tsx` | Höjd, gradient |
| `src/components/ui/input.tsx` | Fokus-ring terrakotta |
| `src/components/ui/textarea.tsx` | Fokus-ring terrakotta |
| `src/components/AppLayout.tsx` | Nav inaktiv färg, spacing |
| `src/pages/Dashboard.tsx` | Ikonfärger, labels, spacing |
| `src/pages/DailyCheck.tsx` | Ikonfärger, spacing |
| `src/pages/Evaluate.tsx` | Ikonfärger, spacing |
| `src/pages/Repair.tsx` | Ikonfärger, spacing |
| `src/pages/WeeklyConversation.tsx` | Ikonfärger, spacing |

---

## Vad ändras INTE
- Ingen ny funktionalitet eller databasändring
- Inga nya dependencies
- Befintlig navigationsstruktur bibehålls

