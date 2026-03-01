

## Designuppdatering + Namnbyte: Unionen -> Hamnen

Samma designplan som tidigare (fargpalett, typografi, kortstyling, layout) PLUS namnbyte fran "Unionen" till "Hamnen" overallt i appen.

### 1. Namnbyte "Unionen" -> "Hamnen"

Alla forekomster av "Unionen" byts till "Hamnen" i foljande filer:

| Fil | Andring |
|---|---|
| `index.html` | Title, meta description, og:title, author |
| `vite.config.ts` | PWA manifest name och short_name |
| `src/components/AppLayout.tsx` | Logo-text i headern |
| `src/pages/Account.tsx` | "Installera Hamnen pa din hemskarm..." |
| `public/sw.js` | Push-notifikationstitlar |
| `supabase/functions/send-invitation/index.ts` | Avsandarnamn, e-posttext, rubriker |
| `supabase/functions/notify-partner-paired/index.ts` | Avsandarnamn, e-posttext, rubriker, lankar |
| `supabase/functions/daily-reminder/index.ts` | Eventuella forekomster |

### 2. Fargpalett (src/index.css)

Byt fran nuvarande varma orangebruna toner till Hamnen-paletten:

- **Primary**: 30 50% 45% (brun) -> 150 24% 24% (skogsgroen)
- **Accent**: 174 40% 38% -> 18 45% 56% (terrakotta)
- **Background**: 35 40% 95% -> 30 26% 92% (sand)
- **Card**: 30 35% 92% -> 30 20% 88%
- **Radius**: 0.75rem -> 0.625rem

Lagg till Playfair Display font-import och Hamnen-fargvariabler (sand, beige, forest, ocean, terracotta, sage).

### 3. Tailwind-konfiguration (tailwind.config.ts)

- Lagg till `fontFamily` med serif (Playfair Display) och sans
- Lagg till `hamnen`-fargvariabler

### 4. AppLayout (src/components/AppLayout.tsx)

- Byt "Unionen" -> "Hamnen" i logotypen
- Tunnare ikoner: `strokeWidth={1.5}`
- Mjukare borders, `font-serif` for logotyp

### 5. Kortstyling over hela appen

Genomgaende andringar pa alla sidor:
- Kort: `rounded-xl border-none shadow-sm`
- Rubriker: uppercase tracking-widest overlines (`text-[10px]`)
- Inputs: `rounded-lg border-border/30 bg-secondary/30`
- Knappar: `rounded-xl py-5 font-sans`
- Ikoner: `strokeWidth={1.5}`

**Filer som paverkas:**
- `src/pages/Dashboard.tsx`
- `src/pages/DailyCheck.tsx`
- `src/pages/Evaluate.tsx`
- `src/pages/WeeklyConversation.tsx`
- `src/pages/Repair.tsx`
- `src/pages/Messages.tsx`
- `src/pages/Account.tsx`

### 6. Layout-ordning pa Oversikten

Behalls som den ar (redan fixad i forra steget).

### Sammanfattning

| Kategori | Filer |
|---|---|
| Namnbyte Unionen -> Hamnen | `index.html`, `vite.config.ts`, `AppLayout.tsx`, `Account.tsx`, `sw.js`, 3 edge functions |
| Fargpalett + font | `src/index.css`, `tailwind.config.ts` |
| Komponent-styling | `AppLayout.tsx`, `Dashboard.tsx`, `DailyCheck.tsx`, `Evaluate.tsx`, `WeeklyConversation.tsx`, `Repair.tsx`, `Messages.tsx`, `Account.tsx` |

Inga funktioner eller datalogik andras. Charts behalls som line charts.

