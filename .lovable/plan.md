

## Ändringar i Veckosamtals-sidan

### 1. Ny sektion: "Vad kan jag göra för att du ska känna dig älskad?"
- Lägg till ett nytt kort **efter** "Frågor / Behov"-kortet med:
  - Rubrik: "Vad kan jag göra nästa vecka för att du ska känna dig älskad?"
  - Underrubrik inspirerad av SOTU: "Avsluta samtalet genom att dela en sak din partner kan göra för att du ska känna er mer sammankopplade kommande vecka. Var specifik och positiv."
  - InfoButton med mer detalj
  - Textarea-fält för svaret
- Spara i `weekly_entries` — nytt fält behövs: `love_action` (text)
- Visa även i mötesflödet som en egen sektion (före "Avslutning")

### 2. Nästa samtal-fält i sidans topp (under rubriken)
- Flytta/duplicera nästa mötestid så den visas direkt under sidans underrubrik "State of the Union"
- Visa datum+tid formaterat, med en "Ändra"-knapp som öppnar datetime-picker
- Vid ändring: spara till `weekly_conversations.next_meeting_at` + skicka systemmeddelande + push till partner (samma logik som redan finns)
- Behåll fältet i "Praktiskt"-sektionen också (synkat state)

### 3. Auto-uppdatering vid genomfört möte
- När `meetingConfirmed` markeras och det finns ett `next_meeting_at`-värde i "Praktiskt", kopiera det till **nästa veckas** conversation automatiskt (eller visa det som "schemalagt" i toppfältet)

### Databasändring
- Migration: lägg till `love_action` (text, nullable) i `weekly_entries`

### Fil som ändras
- `src/pages/WeeklyConversation.tsx` — ny sektion, toppfält för nästa samtal
- Migration för `love_action`-kolumn

