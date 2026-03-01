

## Analys: Varfor loggan ar for liten overallt

### Rotorsak

Logotypens PNG-fil (`hamnen-logo.png`) innehaller sannolikt mycket whitespace/padding runt sjalva ikonen. Nar bilden renderas med `object-contain` behalles proportionerna, men det synliga motivet (hjartat med blad) tar bara upp en brakdel av den tilldelade ytan. Aven om du satter `w-16 h-16` sa ar den synliga ikonen kanske bara 30-40% av den storleken.

Dessutom: favicon.svg har en viewBox (`5 5 90 88`) som klipper bort delar av hjartat (paths gar fran x=2 till x=98), vilket gor att ikonen inte fyller fliken ordentligt.

### Losning

#### 1. Favicon -- fixa viewBox sa ikonen fyller hela ytan

Uppdatera `public/favicon.svg` sa att viewBox omfattar hela innehallet: `viewBox="0 0 100 90"`. Det gor att hjartat fyller favicon-ytan istallet for att klippas.

Uppdatera ocksa `index.html` till att anvanda PNG som favicon istallet, via den uppladdade hogupplosta bilden kopierad till `public/favicon.png`. PNG fungerar battre som favicon i de flesta webblasare.

#### 2. Auth-sidan -- storre logga

I `src/pages/Auth.tsx`:
- Containern fran `w-16 h-16` till `w-28 h-28`
- Bilden fran `w-14 h-14` till `w-28 h-28`
- Detta kompenserar for whitespace i PNG:en och gor loggan tydligt synlig

#### 3. App-header -- storre logga med overflow

I `src/components/AppLayout.tsx`:
- **Desktop**: Fran `w-16 h-16 -my-3` till `w-20 h-20 -my-4` (storre ikon, negativ marginal sa headern inte vaxer)
- **Mobil**: Fran `w-10 h-10 -my-2` till `w-14 h-14 -my-3`

#### 4. Favicon som PNG (backup)

Kopiera den hogupplosta loggan till `public/favicon.png` och uppdatera `index.html` att referera till bade SVG och PNG:
```text
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### Filer som andras

| Fil | Andring |
|---|---|
| `src/components/AppLayout.tsx` | Storre logga: desktop w-20, mobil w-14, med negativa marginaler |
| `src/pages/Auth.tsx` | Logga-container och bild till w-28 h-28 |
| `public/favicon.svg` | Fixa viewBox till `0 0 100 90` |
| `public/favicon.png` | Kopiera hogupplost logga hit |
| `index.html` | Dubbla favicon-lankar (PNG + SVG) |

