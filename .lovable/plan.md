

## Layout- och navigationsuppdateringar

### 1. Logotyp -- storre, samma hojd som texten "Hamnen"

**`src/components/AppLayout.tsx`**:
- Mobil: Logga fran `w-6 h-6` till `w-8 h-8`, text fran `text-lg` till `text-xl`
- Desktop: Logga fran `w-7 h-7` till `w-10 h-10`, text fran `text-xl` till `text-2xl`
- Sakerstall att bild och text ar vertikalt centrerade (`items-center`)

### 2. Desktop -- meny under loggan, konto/utloggning pa samma rad som loggan

**`src/components/AppLayout.tsx`** desktop-header:

Nuvarande layout: en rad med logga | nav | konto.

Ny layout:
```text
[ Logga + "Hamnen"               Konto + Logga ut ]   <-- rad 1
[         Nav-lankar centrerade                    ]   <-- rad 2
```

- Rad 1: `flex justify-between items-center`
- Rad 2: `flex justify-center` med nav-lankarna
- Hela headern `sticky top-0` som nu

### 3. Desktop responsivitet

- Nav-lankar: `flex-wrap` sa de bryter vid smalare skarmar
- Anvand `gap-2` istallet for `gap-1` for battre andning
- Textstorlek pa nav: `text-sm` (behalls)

### 4. Mobil bottom nav -- "Samtal" istallet for "Vecka"

**`src/components/AppLayout.tsx`** BOTTOM_NAV:
- Andras `{ to: "/weekly", label: "Vecka" }` till `{ to: "/weekly", label: "Samtal" }`

### 5. Mobil -- logga stannar kvar vid scroll (sticky header med safe area)

**`src/components/AppLayout.tsx`** mobil header:
- Andras fran `sticky top-0` till att inkludera `pt-[env(safe-area-inset-top)]` pa headern
- Ta bort `padding-top: env(safe-area-inset-top)` fran body i `src/index.css` och lagg det pa headern istallet
- Header forblir `sticky top-0 z-50` -- innehallet scrollar bakom/under den

### 6. Meddelanden -- input last langst ned

**`src/pages/Messages.tsx`**:
- Andras layout fran `h-[calc(100vh-10rem)]` till `h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))]` eller liknande for att fylla hela skarmhojden
- Input-containern: `sticky bottom-0` med bakgrund och padding for bottom nav (mobil: `pb-[calc(3.5rem+env(safe-area-inset-bottom))]`)
- Meddelandelistan: `flex-1 overflow-y-auto` (redan sa, men sakerstall att input alltid ar synlig)

### Filer som andras

| Fil | Andring |
|---|---|
| `src/components/AppLayout.tsx` | Storre logga, desktop 2-rads layout, "Samtal" i bottom nav |
| `src/pages/Messages.tsx` | Input last langst ned, full hojd |
| `src/index.css` | Flytta safe-area-inset fran body till header |

Ingen text (utom "Vecka" -> "Samtal" i bottom nav) eller funktionalitet andras.
