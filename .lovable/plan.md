

## Två separata mötesdatum i Veckosamtal

### Problemet
Just nu finns bara ett datumfält (`next_meeting_at`), vilket gör att "nästa samtal" i toppen och i "Praktiskt"-sektionen pekar på samma värde. Användaren behöver kunna se *detta veckas möte* i toppen medan de i förberedelserna planerar *mötet efter det*.

### Lösning: Två fält

**Fält 1 — `next_meeting_at`** (befintligt): Tid för det möte paret förbereder just nu. Visas i header under "State of the Union".

**Fält 2 — `planned_next_meeting_at`** (nytt): Tid för mötet *efter* det nuvarande. Sätts i "Praktiskt"-sektionen. När mötet markeras som genomfört kopieras detta värde till nästa veckas `next_meeting_at`.

### Ändringar

#### 1. Databasmigration
- Lägg till `planned_next_meeting_at` (timestamptz, nullable) i `weekly_conversations`

#### 2. Header under "State of the Union" (rad 491-509)
- Visa `next_meeting_at` med datum/tid
- Om inget datum finns: visa "Inget samtal planerat" med en "Sätt tid"-knapp
- "Ändra"-knapp öppnar inline datetime-picker direkt i headern (inte scroll till Praktiskt)
- Vid ändring: spara till `next_meeting_at`, skicka systemmeddelande + push till partner: "Jag har ändrat datum för nästa State of the Union-samtal till [datum/tid]"

#### 3. "Praktiskt"-sektionen (rad 662-714)
- Byt label till "Nästa samtal efter detta möte"
- Binder till `planned_next_meeting_at` (nytt state: `plannedNextMeetingAt`)
- Vid sparande: samma logik (spara + meddelande + push)

#### 4. Auto-kopiering vid genomfört möte
- När `meetingConfirmed` kryssas: om `plannedNextMeetingAt` finns, skapa/uppdatera nästa veckas conversation med det värdet som `next_meeting_at`

### Filer som ändras
- `src/pages/WeeklyConversation.tsx` — header-fält med inline datetime, Praktiskt-sektion binds till nytt fält
- Ny migration för `planned_next_meeting_at`

