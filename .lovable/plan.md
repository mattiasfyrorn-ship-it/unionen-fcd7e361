

## Omstrukturering av Närd-sidan

### Vad ändras

**1. Flytta "Idag"-rutan (behov & vilja) ovanför de fyra områdeskorten**
- Kortet med "Vad behöver jag idag?" och "Vad vill jag idag?" placeras direkt efter WeekDayPicker, före Kropp/Sinne/Relationer/Mission.
- Byt rubrik från "Idag" till "Idag" med en symbol (`Sun`-ikonen från Lucide, i samma stil som Heart/Brain/Users/Compass).

**2. Lägg till InfoButton på "Idag"-kortet**
- InfoButton med text som förklarar vikten av att lära känna sina behov, skilja behov från vilja, och att träna på att kommunicera dessa. Ungefär:
  > "Att lära känna sina behov är ett av de viktigaste stegen mot ett påfyllt liv. Behov handlar om vad du faktiskt behöver för att må bra – vila, närhet, gränser. Vilja handlar om vad du längtar efter och drömmer om. När du blir tydlig med skillnaden kan du börja ta hand om dig själv på riktigt, kommunicera ärligt med din partner, och skapa ett liv som inspirerar dig. Det är ett stort steg – och det börjar med medvetenhet."

**3. Egen liten spara-knapp i "Idag"-kortet**
- En kompakt spara-knapp (sekundär stil, liten storlek) i botten av kortet som sparar bara need_today/want_today utan att behöva skrolla ner till huvudknappen.

**4. Lägg till symbol-ikon på "Idag"-kortet**
- Använd `Sun`-ikonen (Lucide) i samma storlek och stil (w-5 h-5, text-primary, strokeWidth 1.5) som de övriga korten.

### Filer som ändras
- `src/pages/Evaluate.tsx` — omstrukturering av JSX-ordning, ny InfoButton, ny spara-knapp, ny ikon-import

