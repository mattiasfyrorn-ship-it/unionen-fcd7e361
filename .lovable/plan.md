

# Daglig Check och Veckosamtal -- Uppgraderingar

## 1. Daglig Check: Turn Toward -- flerval med checkboxar

Nuvarande implementation anvander RadioGroup (bara ett val). Andras till checkboxar sa att anvandaren kan valja flera alternativ samtidigt (t.ex. bade "Tog initiativ" OCH "Tog emot positivt" = 2 poang).

**Databasandring:** Kolumnen `turn_toward` (text) behover stodja flera varden. Laggs till en ny kolumn `turn_toward_options` (text array) i `daily_checks`-tabellen. Den gamla kolumnen behalls for bakatkompabilitet.

**UI-andring:** Byt fran RadioGroup till tre Checkbox-komponenter. Visa poangraknarare (0-2 poang baserat pa antal valda "initiated"/"received_positively", "missed" ger 0).

## 2. Veckosamtal: Las upp-funktion

Lagga till en "Las upp"-knapp som visas nar `ready === true`, sa att anvandaren kan redigera sin agenda igen.

## 3. Veckosamtal: Motesvy nar bada last

Nar bada partners har last sin agenda:
- Visa badas agendor sida vid sida (eller i flikar)
- Varje sektion (Uppskattningar, Vad gick bra, Fragor) far ett extra textfalt for motesanteckningar/reflektioner
- Dessa anteckningar sparas i `weekly_entries` i ett nytt `meeting_notes`-falt (jsonb)

## 4. Veckosamtal: Nya falt

Tre nya sektioner laggs till:

**a) Praktiskt kommande vecka**
- Textfalt: "Nar ses vi?"
- Textfalt: "Vem tar hand om vad?"
- Textfalt: "Speciella behov att ta hansyn till"
- Sparas i `weekly_entries` i nytt `logistics`-falt (jsonb)

**b) Positiv intention**
- Textfalt: "Min positiva intention for veckan"
- Sparas i `weekly_entries` i nytt `intention`-falt (text)

**c) Utcheckning**
- Textfalt: "En kansla som lever i mig just nu"
- Sparas i `weekly_entries` i nytt `checkout_feeling`-falt (text)

## 5. Veckosamtal: Arkiv

En ny sektion langst upp pa sidan som visar tidigare veckors samtal. Klickbara for att se agendor och motesanteckningar fran tidigare veckor (read-only).

---

## Tekniska detaljer

### Databasmigrering

```sql
-- daily_checks: stodja flerval for turn_toward
ALTER TABLE daily_checks ADD COLUMN turn_toward_options text[] DEFAULT '{}';

-- weekly_entries: nya falt
ALTER TABLE weekly_entries ADD COLUMN meeting_notes jsonb DEFAULT '{}';
ALTER TABLE weekly_entries ADD COLUMN logistics jsonb DEFAULT '{}';
ALTER TABLE weekly_entries ADD COLUMN intention text;
ALTER TABLE weekly_entries ADD COLUMN checkout_feeling text;
```

### Filandringar

**`src/pages/DailyCheck.tsx`**
- Byt `turnToward` (string) till `turnTowardOptions` (string array)
- Byt RadioGroup till tre Checkbox-komponenter
- Visa poang: "initiated" + "received_positively" = 1 poang vardera, "missed" = 0
- Uppdatera save-payload att inkludera `turn_toward_options`
- Behall bakatkompabilitet med gamla `turn_toward`-kolumnen vid laddning

**`src/pages/WeeklyConversation.tsx`**
- Lagga till "Las upp"-knapp bredvid "Last"-knappen
- Nar bada last: visa partners agenda (ladda fran `weekly_entries` med `neq user_id`)
- Lagga till motesantecknings-falt under varje sektion i motesvyn
- Lagga till tre nya kort: Praktiskt kommande vecka, Positiv intention, Utcheckning
- Lagga till arkiv-sektion: lista tidigare `weekly_conversations` med klickbar expandering
- Uppdatera save-payload med nya falt

