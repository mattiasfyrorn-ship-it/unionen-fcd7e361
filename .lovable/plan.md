
## Fixa header som täcks av telefonens statusbar

### Grundorsaken

`index.html` har `apple-mobile-web-app-status-bar-style: black-translucent`. Det gör statusbaren genomskinlig och appen "fyller ut" hela skärmen — inklusive under statusbaren. Utan kompensation hamnar headern bakom klockan och mottagningsstaplarna.

Den moderna CSS-lösningen heter **Safe Area Insets** (`env(safe-area-inset-top)`). Det är ett CSS-miljövariabel-värde som automatiskt anger hur många pixlar telefonens statusbar tar upp — oavsett om det är en iPhone med notch, Dynamic Island eller en vanlig Android.

### Lösning: två små ändringar

#### 1 — `index.css`: lägg till `padding-top: env(safe-area-inset-top)` på `body`

```css
body {
  padding-top: env(safe-area-inset-top);
}
```

Det ger hela appen ett grundavstånd som matchar exakt den aktuella telefonens statusbar. Eftersom headern är `sticky top-0` klibbar den korrekt direkt under statusbaren.

#### 2 — `AppLayout.tsx`: ta bort `sticky top-0` på headern *eller* håll den kvar

Med `padding-top` på `body` behövs inga ändringar i layoutkomponenten — headern klibbar automatiskt precis under statusbaren tack vare `sticky top-0`. Det är rent och korrekt.

### Tekniska detaljer

- `env(safe-area-inset-top)` returnerar `0px` på desktop och i webbläsare utan statusbar, så inga visuella sidoeffekter på dator.
- `viewport-fit=cover` finns redan i `index.html` — det krävs för att `env(safe-area-inset-top)` ska fungera, och det är redan satt korrekt.
- Ingen databasändring behövs.
- Ingen förändring för desktopanvändare.

### Påverkan

| Plattform | Förut | Efter |
|---|---|---|
| iPhone (installerad PWA) | Header bakom statusbar | Header synlig under statusbar |
| Android (installerad PWA) | Header bakom statusbar | Header synlig under statusbar |
| Desktop / webbläsare | Ingen förändring | Ingen förändring |

### Filer som ändras

- `src/index.css` — lägg till `padding-top: env(safe-area-inset-top)` på `body`
