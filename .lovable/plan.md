

# 💫 Integritetsguiden – Relationsappen för gemensam utveckling

## Koncept
En vacker, mörk app i guld, teal och mörkgrått där du och din partner loggar in separat och tillsammans utvärderar hur väl ni lever enligt era standards – veckovis och månadsvis. Ni kan skicka prompts, uttrycka behov och följa er långsiktiga utveckling.

---

## 🔐 1. Autentisering & Profiler
- Registrering och inloggning med e-post
- Varje partner har en egen profil med namn och avatar
- Parkoppling: Länka ihop era konton genom en unik parningskod

## 📊 2. Veckovis utvärdering (Poängskala 1-10)
- Fyra livsområden: **Hälsa, Karriär, Ekonomi, Relationer**
- Varje vecka betygsätter båda partners varje område
- Valfri kommentar per område
- Se varandras poäng efter att båda har svarat

## 📅 3. Månadsprioritering
- Sätt 1-3 prioriteringar per månad inom valfritt livsområde
- Bocka av eller utvärdera i slutet av månaden
- Se partnerns prioriteringar

## 💬 4. Prompts & Behov
- Skicka korta meddelanden till din partner med:
  - **Längtan** – saker ni längtar efter
  - **Behov** – saker ni behöver från varandra
- Notifikation i appen när ett nytt meddelande kommer
- Historik över skickade prompts

## 📈 5. Långsiktig utveckling (Dashboard)
- Linjediagram som visar poäng per livsområde över tid (veckor/månader)
- Jämför din och din partners kurvor
- Genomsnittspoäng per månad
- Trendpil som visar om ni går uppåt eller nedåt

## 🎨 6. Design & Tema
- **Mörkt tema** med djupt mörkgrå bakgrund
- **Guld** för accenter, knappar och viktiga element
- **Teal** för grafer, badges och sekundära detaljer
- Elegant, lugn och romantisk känsla
- Mjuka animationer och övergångar

## ⚙️ Backend (Lovable Cloud)
- Supabase-databas för all data (profiler, utvärderingar, meddelanden, prioriteringar)
- Autentisering via Supabase Auth
- Row Level Security så varje par bara ser sin egen data

